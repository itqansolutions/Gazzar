import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  generateSessionToken,
  hashSessionToken,
  timingSafeCompareHashes,
  isValidTokenFormat
} from "../src/lib/auth/tokens.ts";
import {
  ABSOLUTE_LIFETIME_MS,
  IDLE_TIMEOUT_MS,
  UPDATE_THROTTLE_MS,
  calculateInitialExpiration,
  calculateRenewedExpiration,
  shouldTouchSession
} from "../src/lib/auth/session-rules.ts";
import { SessionService } from "../src/lib/auth/session-service.ts";

/**
 * Isolated In-Memory Test Double (Mock Repository)
 * Strictly zero database connections, zero network calls, zero writes to production.
 */
class InMemorySessionRepository {
  constructor() {
    this.sessions = new Map();
    this.users = new Map();
    this.shouldThrowOnFind = false;
    this.touchCalls = [];
  }

  seedUser(user) {
    this.users.set(user.id, user);
  }

  async findSessionByTokenHash(tokenHash) {
    if (this.shouldThrowOnFind) {
      throw new Error("Simulated Connection Pool Exhaustion");
    }
    const session = this.sessions.get(tokenHash);
    if (!session) return null;

    const user = this.users.get(session.userId) || null;
    return {
      ...session,
      user
    };
  }

  async createSession(data) {
    this.sessions.set(data.tokenHash, { ...data, revokedAt: null });
    return { ...data, revokedAt: null };
  }

  async updateSessionActivity(sessionId, lastUsedAt, newExpiresAt) {
    for (const [tokenHash, session] of this.sessions.entries()) {
      if (session.id === sessionId) {
        if (session.revokedAt !== null && session.revokedAt !== undefined) {
          // Atomic conditional update requires revokedAt = null
          return false;
        }
        this.touchCalls.push({ sessionId, lastUsedAt, newExpiresAt });
        this.sessions.set(tokenHash, {
          ...session,
          lastUsedAt,
          expiresAt: newExpiresAt
        });
        return true;
      }
    }
    return false;
  }

  async revokeSessionByTokenHash(tokenHash) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.revokedAt !== null) return false;
    this.sessions.set(tokenHash, { ...session, revokedAt: new Date() });
    return true;
  }

  async revokeAllUserSessions(userId, exceptSessionId) {
    let count = 0;
    for (const [tokenHash, session] of this.sessions.entries()) {
      if (session.userId === userId && session.revokedAt === null) {
        if (!exceptSessionId || session.id !== exceptSessionId) {
          this.sessions.set(tokenHash, { ...session, revokedAt: new Date() });
          count++;
        }
      }
    }
    return count;
  }
}

test("Milestone 1.3.1 – Session Service & Authentication Core Verification", async (t) => {
  const mockUser = {
    id: "user-test-uuid-1",
    email: "coach.alex@gxacademy.test",
    name: "Alex Coach",
    role: "COACH",
    avatar: null,
    phone: "+201000000000"
  };

  let repo;
  let service;

  t.beforeEach(() => {
    repo = new InMemorySessionRepository();
    repo.seedUser(mockUser);
    service = new SessionService(repo);
  });

  await t.test("1. Token Generation: 64-character lowercase hex string (256-bit entropy)", () => {
    const token = generateSessionToken();
    assert.equal(typeof token, "string");
    assert.equal(token.length, 64);
    assert.equal(isValidTokenFormat(token), true);
  });

  await t.test("2. Token Uniqueness: 1,000 generated tokens have zero collisions", () => {
    const tokens = new Set();
    for (let i = 0; i < 1000; i++) {
      tokens.add(generateSessionToken());
    }
    assert.equal(tokens.size, 1000);
  });

  await t.test("3. Token Hashing: Deterministic SHA-256 and timing-safe comparison", () => {
    const token = generateSessionToken();
    const hash1 = hashSessionToken(token);
    const hash2 = hashSessionToken(token);

    assert.equal(hash1, hash2);
    assert.notEqual(hash1, token);
    assert.equal(hash1.length, 64);
    assert.equal(timingSafeCompareHashes(hash1, hash2), true);
    assert.equal(timingSafeCompareHashes(hash1, "0".repeat(64)), false);
  });

  await t.test("4. Valid Session Lifecycle: createSession -> validateSession", async () => {
    const { sessionToken, sessionId, expiresAt } = await service.createSession({
      userId: mockUser.id,
      userAgent: "Mozilla/5.0 Test",
      ipAddress: "192.168.1.1"
    });

    assert.ok(sessionToken);
    assert.ok(sessionId);
    assert.ok(expiresAt > new Date());

    const result = await service.validateSession(sessionToken);
    assert.equal(result.valid, true);
    assert.equal(result.user.id, mockUser.id);
    assert.equal(result.user.email, mockUser.email);
    assert.equal(result.user.role, "COACH");
    assert.equal(result.needsTouch, false); // Recently created, no touch needed
  });

  await t.test("5. Expired Session: Rejects sessions past expiresAt", async () => {
    const { sessionToken } = await service.createSession({ userId: mockUser.id });

    // Simulate clock 49 hours in the future
    const futureTime = new Date(Date.now() + 49 * 60 * 60 * 1000);
    const result = await service.validateSession(sessionToken, futureTime);

    assert.equal(result.valid, false);
    assert.ok(result.reason === "EXPIRED" || result.reason === "IDLE_TIMEOUT");
  });

  await t.test("6. Idle Timeout: Rejects sessions inactive for >= 48 hours", async () => {
    const { sessionToken } = await service.createSession({ userId: mockUser.id });

    // Advance clock by exactly 48 hours + 1 second
    const idleTime = new Date(Date.now() + IDLE_TIMEOUT_MS + 1000);
    const result = await service.validateSession(sessionToken, idleTime);

    assert.equal(result.valid, false);
    assert.equal(result.reason, "IDLE_TIMEOUT");
  });

  await t.test("7. Revoked Session: Single session revocation on logout", async () => {
    const { sessionToken } = await service.createSession({ userId: mockUser.id });

    const revoked = await service.revokeSession(sessionToken);
    assert.equal(revoked, true);

    const result = await service.validateSession(sessionToken);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "REVOKED");
  });

  await t.test("8. Absolute Lifetime: Cannot extend past 14 days, even with continuous activity", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const activeAtDay13 = new Date("2026-01-14T00:00:00Z");

    // At Day 13, renewal calculation must cap at Day 14 (createdAt + 14d)
    const renewedExp = calculateRenewedExpiration(createdAt, activeAtDay13);
    const maxAllowedExp = new Date(createdAt.getTime() + ABSOLUTE_LIFETIME_MS);
    assert.equal(renewedExp.getTime(), maxAllowedExp.getTime());

    // Advance to Day 15 (past 14-day absolute lifetime)
    const day15 = new Date("2026-01-16T00:00:00Z");
    const { sessionToken } = await service.createSession({ userId: mockUser.id });
    
    // Inject custom createdAt to test absolute boundary
    for (const [tokenHash, session] of repo.sessions.entries()) {
      repo.sessions.set(tokenHash, {
        ...session,
        createdAt: createdAt,
        lastUsedAt: new Date(day15.getTime() - 1000) // Was active 1 second ago!
      });
    }

    const result = await service.validateSession(sessionToken, day15);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "EXPIRED");
  });

  await t.test("9. Session Renewal & Throttling: Throttles DB writes to once per 15 minutes", async () => {
    const { sessionToken } = await service.createSession({ userId: mockUser.id });

    // Request at +5 minutes: Should NOT trigger touch (throttle)
    const at5Min = new Date(Date.now() + 5 * 60 * 1000);
    const res5Min = await service.validateSession(sessionToken, at5Min);
    assert.equal(res5Min.valid, true);
    assert.equal(res5Min.needsTouch, false);
    assert.equal(repo.touchCalls.length, 0);

    // Request at +16 minutes: SHOULD trigger touch
    const at16Min = new Date(Date.now() + 16 * 60 * 1000);
    const res16Min = await service.validateSession(sessionToken, at16Min);
    assert.equal(res16Min.valid, true);
    assert.equal(res16Min.needsTouch, true);
    assert.equal(repo.touchCalls.length, 1);
    // REV-01 Regression Check: expiresAt returned to caller must match renewed expiration (not stale createdAt + 48h)
    assert.equal(res16Min.expiresAt.getTime(), repo.touchCalls[0].newExpiresAt.getTime());
    assert.equal(res16Min.lastUsedAt.getTime(), at16Min.getTime());
    assert.ok(res16Min.expiresAt.getTime() > res5Min.expiresAt.getTime());
  });

  await t.test("10. Concurrent Validations: Multiple concurrent requests handle safely", async () => {
    const { sessionToken } = await service.createSession({ userId: mockUser.id });

    // Execute 10 simultaneous validations
    const promises = Array.from({ length: 10 }, () => service.validateSession(sessionToken));
    const results = await Promise.all(promises);

    for (const res of results) {
      assert.equal(res.valid, true);
      assert.equal(res.user.id, mockUser.id);
    }
  });

  await t.test("11. Database Error Resilience: Graceful failure handling without crashing", async () => {
    const { sessionToken } = await service.createSession({ userId: mockUser.id });

    repo.shouldThrowOnFind = true; // Simulate database failure

    const result = await service.validateSession(sessionToken);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "DATABASE_ERROR");
  });

  await t.test("12. Deleted / Inactive User: Rejects session if user was deleted", async () => {
    const { sessionToken } = await service.createSession({ userId: mockUser.id });

    // Remove user from repository
    repo.users.delete(mockUser.id);

    const result = await service.validateSession(sessionToken);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "USER_NOT_FOUND");
  });

  await t.test("13. Atomic Conditional Renewal: Cannot renew or revive a revoked session", async () => {
    const { sessionToken, sessionId } = await service.createSession({ userId: mockUser.id });

    // 1. Revoke the session
    const revoked = await service.revokeSession(sessionToken);
    assert.equal(revoked, true);

    // 2. Direct attempt to update activity on the revoked session must fail
    const updateResult = await repo.updateSessionActivity(
      sessionId,
      new Date(),
      new Date(Date.now() + 48 * 60 * 60 * 1000)
    );
    assert.equal(updateResult, false, "updateSessionActivity must return false when session is revoked");

    // 3. Validation must still firmly reject as REVOKED
    const validation = await service.validateSession(sessionToken);
    assert.equal(validation.valid, false);
    assert.equal(validation.reason, "REVOKED");
  });

  await t.test("14. Client/Server Boundary Verification: AuthContext.tsx has zero server module leakage", async () => {
    const authContextPath = path.resolve("src/context/AuthContext.tsx");
    const content = fs.readFileSync(authContextPath, "utf8");

    // Must NOT import bcryptjs
    assert.equal(/from\s+["']bcryptjs["']/i.test(content), false, "AuthContext must not import bcryptjs");
    // Must NOT import crypto
    assert.equal(/from\s+["'](?:node:)?crypto["']/i.test(content), false, "AuthContext must not import crypto");
    // Must NOT import prisma
    assert.equal(/from\s+["'].*prisma["']/i.test(content), false, "AuthContext must not import prisma");
    // Must NOT import from @/lib/auth (server-side auth)
    assert.equal(/from\s+["']@\/lib\/auth["']/i.test(content), false, "AuthContext must not import from @/lib/auth");
    // Must NOT call verifyPassword
    assert.equal(/verifyPassword\s*\(/.test(content), false, "AuthContext must not call verifyPassword");
  });

  await t.test("15. Exact Expiration Boundary: 1ms before vs exact expiration", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const exact14Days = new Date(createdAt.getTime() + ABSOLUTE_LIFETIME_MS);
    const oneMsBefore14Days = new Date(exact14Days.getTime() - 1);

    const { sessionToken } = await service.createSession({ userId: mockUser.id });
    for (const [tokenHash, session] of repo.sessions.entries()) {
      repo.sessions.set(tokenHash, {
        ...session,
        createdAt,
        lastUsedAt: oneMsBefore14Days,
        expiresAt: exact14Days
      });
    }

    // 1ms before 14 days: should be valid
    const validResult = await service.validateSession(sessionToken, oneMsBefore14Days);
    assert.equal(validResult.valid, true, "1ms before absolute expiration must be valid");

    // At exact 14 days: must be rejected
    const expiredResult = await service.validateSession(sessionToken, exact14Days);
    assert.equal(expiredResult.valid, false, "At exact absolute expiration must be rejected");
    assert.equal(expiredResult.reason, "EXPIRED");
  });
});

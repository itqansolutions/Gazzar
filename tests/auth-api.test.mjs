import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { AuthService } from "../src/lib/auth/auth-service.ts";
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  getClearSessionCookieOptions
} from "../src/lib/auth/cookies.ts";
import {
  validateRequestOrigin,
  extractClientIp,
  extractUserAgent
} from "../src/lib/auth/request-security.ts";
import { SessionService } from "../src/lib/auth/session-service.ts";
import { generateSessionToken, hashSessionToken } from "../src/lib/auth/tokens.ts";
import { POST as loginRouteHandler } from "../src/app/api/auth/login/route.ts";
import { POST as logoutRouteHandler } from "../src/app/api/auth/logout/route.ts";
import { GET as meRouteHandler } from "../src/app/api/auth/me/route.ts";

/**
 * Isolated In-Memory User Repository (Test Double)
 * Strictly zero database connections, zero network calls, zero writes to Railway Production.
 */
class InMemoryUserRepository {
  constructor() {
    this.users = new Map();
    this.shouldThrow = false;
  }

  seedUser(user) {
    this.users.set(user.email.toLowerCase(), user);
    this.users.set(user.id, user);
  }

  async findUserByEmail(email) {
    if (this.shouldThrow) {
      throw new Error("Simulated Database Read Failure");
    }
    return this.users.get(email.toLowerCase()) || null;
  }

  async findUserById(id) {
    if (this.shouldThrow) {
      throw new Error("Simulated Database Read Failure");
    }
    return this.users.get(id) || null;
  }
}

/**
 * Isolated In-Memory Session Repository (Test Double)
 */
class InMemorySessionRepository {
  constructor() {
    this.sessions = new Map();
    this.shouldThrow = false;
    this.touchCalls = [];
  }

  async findSessionByTokenHash(tokenHash) {
    if (this.shouldThrow) {
      throw new Error("Simulated DB Failure");
    }
    const session = this.sessions.get(tokenHash);
    if (!session) return null;
    return { ...session };
  }

  async createSession(data) {
    if (this.shouldThrow) {
      throw new Error("Simulated DB Insert Failure");
    }
    this.sessions.set(data.tokenHash, { ...data, revokedAt: null });
    return { ...data, revokedAt: null };
  }

  async updateSessionActivity(sessionId, lastUsedAt, newExpiresAt) {
    for (const [tokenHash, session] of this.sessions.entries()) {
      if (session.id === sessionId) {
        if (session.revokedAt !== null) return false;
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
        if (exceptSessionId && session.id === exceptSessionId) continue;
        this.sessions.set(tokenHash, { ...session, revokedAt: new Date() });
        count++;
      }
    }
    return count;
  }
}

test("Milestone 1.3.2 – Centralized Authentication APIs Verification Suite", async (t) => {
  // Test User Setup
  const rawPassword = "SecurePassword#2026";
  const passwordHash = bcrypt.hashSync(rawPassword, 10);
  const testUser = {
    id: "usr-isolated-test-001",
    email: "captain.test@gxacademy.local",
    name: "Captain Test",
    passwordHash,
    role: "HEAD_COACH",
    avatar: "https://example.com/avatar.png",
    phone: "+201001234567",
    createdAt: new Date("2026-01-01T00:00:00Z")
  };

  let userRepo;
  let sessionRepo;
  let sessionService;
  let authService;

  t.beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    userRepo.seedUser(testUser);

    sessionRepo = new InMemorySessionRepository();
    sessionService = new SessionService(sessionRepo);
    authService = new AuthService(userRepo, sessionService);
  });

  // 1. Missing & Malformed Input
  await t.test("1. Missing & Malformed Input: Rejects empty, non-string, or oversized inputs", async () => {
    // Missing email
    const res1 = await authService.login({ email: "", password: rawPassword });
    assert.equal(res1.success, false);
    assert.equal(res1.reason, "INVALID_INPUT");

    // Missing password
    const res2 = await authService.login({ email: testUser.email, password: "" });
    assert.equal(res2.success, false);
    assert.equal(res2.reason, "INVALID_INPUT");

    // Malformed types (numbers/objects)
    const res3 = await authService.login({ email: 12345, password: {} });
    assert.equal(res3.success, false);
    assert.equal(res3.reason, "INVALID_INPUT");

    // Oversized password (> 128 chars, DoS mitigation against bcrypt)
    const longPassword = "A".repeat(129);
    const res4 = await authService.login({ email: testUser.email, password: longPassword });
    assert.equal(res4.success, false);
    assert.equal(res4.reason, "INVALID_INPUT");

    // Oversized email (> 255 chars)
    const longEmail = "a".repeat(250) + "@domain.com";
    const res5 = await authService.login({ email: longEmail, password: rawPassword });
    assert.equal(res5.success, false);
    assert.equal(res5.reason, "INVALID_INPUT");
  });

  // 2. Unknown Email
  await t.test("2. Unknown Email: Returns generic 401 error with timing mitigation", async () => {
    const res = await authService.login({
      email: "unknown.user@does-not-exist.com",
      password: "SomePassword123!"
    });
    assert.equal(res.success, false);
    assert.equal(res.reason, "INVALID_CREDENTIALS");
    assert.equal(res.message, "Invalid login credentials");
  });

  // 3. Wrong Password
  await t.test("3. Wrong Password: Returns identical generic error message", async () => {
    const res = await authService.login({
      email: testUser.email,
      password: "DefinitivelyWrongPassword#999"
    });
    assert.equal(res.success, false);
    assert.equal(res.reason, "INVALID_CREDENTIALS");
    assert.equal(res.message, "Invalid login credentials");
  });

  // 4. Successful Login
  await t.test("4. Successful Login: Issues 256-bit session token, stores SHA-256 hash", async () => {
    const res = await authService.login({
      email: testUser.email.toUpperCase(), // Case-insensitive test
      password: rawPassword,
      userAgent: "Mozilla/5.0 TestBrowser",
      ipAddress: "192.168.1.100"
    });

    assert.equal(res.success, true);
    assert.ok(res.sessionToken);
    assert.equal(res.sessionToken.length, 64);
    assert.ok(res.expiresAt instanceof Date);

    // Verify token stored in DB is hashed with SHA-256 (not raw token)
    const expectedHash = hashSessionToken(res.sessionToken);
    const storedSession = sessionRepo.sessions.get(expectedHash);
    assert.ok(storedSession, "Session must exist under SHA-256 hash");
    assert.equal(storedSession.userId, testUser.id);
    assert.equal(storedSession.userAgent, "Mozilla/5.0 TestBrowser");
    assert.equal(storedSession.ipAddress, "192.168.1.100");
  });

  // 5. User Response Sanitization
  await t.test("5. User Response Sanitization: Never exposes passwordHash, tokenHash, or internal secrets", async () => {
    const res = await authService.login({
      email: testUser.email,
      password: rawPassword
    });

    assert.equal(res.success, true);
    const user = res.user;

    // Check safe fields
    assert.equal(user.id, testUser.id);
    assert.equal(user.email, testUser.email);
    assert.equal(user.name, testUser.name);
    assert.equal(user.role, testUser.role);

    // Verify sensitive fields are strictly undefined
    assert.equal(user.passwordHash, undefined);
    assert.equal(user.password, undefined);
    assert.equal(user.tokenHash, undefined);
    assert.equal(user.token, undefined);
  });

  // 6. Cookie Attributes
  await t.test("6. Cookie Attributes: Enforces HttpOnly, SameSite=Lax, Path=/, explicit expiration", () => {
    const dummyToken = "a".repeat(64);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const cookie = getSessionCookieOptions(dummyToken, expiresAt);
    assert.equal(cookie.name, SESSION_COOKIE_NAME);
    assert.equal(cookie.value, dummyToken);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, "lax");
    assert.equal(cookie.path, "/");
    assert.ok(cookie.maxAge > 0);
    assert.equal(cookie.expires.getTime(), expiresAt.getTime());

    // Clear cookie options
    const clearCookie = getClearSessionCookieOptions();
    assert.equal(clearCookie.name, SESSION_COOKIE_NAME);
    assert.equal(clearCookie.value, "");
    assert.equal(clearCookie.httpOnly, true);
    assert.equal(clearCookie.maxAge, 0);
    assert.equal(clearCookie.expires.getTime(), 0);
  });

  // 7. Session Creation Failure (Fail-Closed)
  await t.test("7. Session Creation Failure: Database errors fail-closed with generic message", async () => {
    sessionRepo.shouldThrow = true; // Simulate DB insertion error

    const res = await authService.login({
      email: testUser.email,
      password: rawPassword
    });

    assert.equal(res.success, false);
    assert.equal(res.reason, "SERVER_ERROR");
  });

  // 8. Current User API (/api/auth/me) with Valid Session
  await t.test("8. Current User API: Retrieves sanitized user from active session cookie", async () => {
    const loginRes = await authService.login({
      email: testUser.email,
      password: rawPassword
    });

    // Provide user in session repo for findSessionByTokenHash join
    const tokenHash = hashSessionToken(loginRes.sessionToken);
    const sessionRecord = sessionRepo.sessions.get(tokenHash);
    sessionRepo.sessions.set(tokenHash, {
      ...sessionRecord,
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        avatar: testUser.avatar,
        phone: testUser.phone
      }
    });

    const userValidation = await authService.getCurrentUser(loginRes.sessionToken);
    assert.equal(userValidation.valid, true);
    assert.equal(userValidation.user.id, testUser.id);
    assert.equal(userValidation.user.email, testUser.email);
    assert.equal(userValidation.user.role, "HEAD_COACH");
  });

  // 9. Current User API with Missing, Expired, Revoked, and Malformed Session
  await t.test("9. Current User API: Rejects missing, expired, revoked, and malformed tokens", async () => {
    // Missing token
    const res1 = await authService.getCurrentUser(null);
    assert.equal(res1.valid, false);

    // Malformed token format (not 64 hex chars)
    const res2 = await authService.getCurrentUser("short-fake-token");
    assert.equal(res2.valid, false);

    // Expired token
    const loginRes = await authService.login({ email: testUser.email, password: rawPassword });
    const expiredTime = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const res3 = await sessionService.validateSession(loginRes.sessionToken, expiredTime);
    assert.equal(res3.valid, false);

    // Revoked token
    await authService.logout(loginRes.sessionToken);
    const res4 = await authService.getCurrentUser(loginRes.sessionToken);
    assert.equal(res4.valid, false);
  });

  // 10. Logout and Session Revocation
  await t.test("10. Logout and Session Revocation: Inactivates session server-side and clears cookie", async () => {
    const loginRes = await authService.login({ email: testUser.email, password: rawPassword });

    // Ensure session is active
    const tokenHash = hashSessionToken(loginRes.sessionToken);
    const activeSession = sessionRepo.sessions.get(tokenHash);
    assert.equal(activeSession.revokedAt, null);

    // Execute logout
    const logoutSuccess = await authService.logout(loginRes.sessionToken);
    assert.equal(logoutSuccess, true);

    // Verify session is marked revoked in DB
    const revokedSession = sessionRepo.sessions.get(tokenHash);
    assert.ok(revokedSession.revokedAt instanceof Date);

    // Subsequent validation must fail
    const postLogout = await authService.getCurrentUser(loginRes.sessionToken);
    assert.equal(postLogout.valid, false);
    assert.equal(postLogout.reason, "REVOKED");
  });

  // 11. Origin Validation
  await t.test("11. Origin Validation: Validates state-changing request origins against CSRF", () => {
    // 1. Same-origin match with Host header -> PASS
    const req1 = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000"
      }
    });
    assert.equal(validateRequestOrigin(req1), true);

    // 2. Production host match -> PASS
    const req2 = new Request("https://gazzar-production.up.railway.app/api/auth/login", {
      method: "POST",
      headers: {
        host: "gazzar-production.up.railway.app",
        origin: "https://gazzar-production.up.railway.app"
      }
    });
    assert.equal(validateRequestOrigin(req2), true);

    // 3. Spoofed attacker origin -> REJECT
    const req3 = new Request("https://gazzar-production.up.railway.app/api/auth/login", {
      method: "POST",
      headers: {
        host: "gazzar-production.up.railway.app",
        origin: "https://evil-phishing-site.com"
      }
    });
    assert.equal(validateRequestOrigin(req3), false);

    // 4. Malformed Origin header -> REJECT
    const req4 = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "not-a-valid-url"
      }
    });
    assert.equal(validateRequestOrigin(req4), false);
  });

  // 12. Client IP & User Agent Extraction
  await t.test("12. Client IP & User-Agent: Safely extracts and validates client metadata", () => {
    // Valid IPv4 in x-forwarded-for
    const req1 = new Request("http://localhost:3000", {
      headers: {
        "x-forwarded-for": "203.0.113.195, 70.41.3.18",
        "user-agent": "GX-Client/1.0"
      }
    });
    assert.equal(extractClientIp(req1), "203.0.113.195");
    assert.equal(extractUserAgent(req1), "GX-Client/1.0");

    // Invalid IP injection -> returns null
    const req2 = new Request("http://localhost:3000", {
      headers: {
        "x-forwarded-for": "<script>alert(1)</script>"
      }
    });
    assert.equal(extractClientIp(req2), null);
  });

  // 13. Route Handlers HTTP Integration
  await t.test("13. Route Handlers HTTP Integration: Verifies response codes, origin checks, and cookie clearing", async () => {
    // A. Login with spoofed origin -> 403 Forbidden
    const spoofedReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://attacker.evil.com",
        "content-type": "application/json"
      },
      body: JSON.stringify({ email: testUser.email, password: rawPassword })
    });
    const spoofedRes = await loginRouteHandler(spoofedReq);
    assert.equal(spoofedRes.status, 403);

    // B. Login with empty payload -> 400 Bad Request
    const emptyReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });
    const emptyRes = await loginRouteHandler(emptyReq);
    assert.equal(emptyRes.status, 400);

    // B2. Login with array payload [] -> 400 Bad Request
    const arrayReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
        "content-type": "application/json"
      },
      body: JSON.stringify([])
    });
    const arrayRes = await loginRouteHandler(arrayReq);
    assert.equal(arrayRes.status, 400);

    // C. Logout with spoofed origin -> 403 Forbidden
    const spoofedLogoutReq = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://attacker.evil.com"
      }
    });
    const spoofedLogoutRes = await logoutRouteHandler(spoofedLogoutReq);
    assert.equal(spoofedLogoutRes.status, 403);

    // D. Logout with valid origin -> 200 OK & clears cookie
    const validLogoutReq = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000"
      }
    });
    const validLogoutRes = await logoutRouteHandler(validLogoutReq);
    assert.equal(validLogoutRes.status, 200);
    const setCookie = validLogoutRes.headers.get("set-cookie") || "";
    assert.ok(setCookie.includes("gx_session="));
    assert.ok(setCookie.includes("Max-Age=0") || setCookie.includes("max-age=0") || setCookie.includes("Expires=Thu, 01 Jan 1970"));

    // E. Current user GET /api/auth/me without cookie -> 401 Unauthorized
    const noCookieMeReq = new Request("http://localhost:3000/api/auth/me", {
      method: "GET"
    });
    const noCookieMeRes = await meRouteHandler(noCookieMeReq);
    assert.equal(noCookieMeRes.status, 401);
  });

  // 14. Regression REV-01: Cookie Expiration Synchronization
  await t.test("14. Regression REV-01: Synchronizes cookie expiration with renewed session expiration on touch", async () => {
    const loginRes = await authService.login({
      email: testUser.email,
      password: rawPassword
    });
    assert.equal(loginRes.success, true);
    const rawToken = loginRes.sessionToken;

    // Seed session record with user in memory repository
    const tokenHash = hashSessionToken(rawToken);
    const sessionRecord = sessionRepo.sessions.get(tokenHash);
    sessionRepo.sessions.set(tokenHash, {
      ...sessionRecord,
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        avatar: testUser.avatar,
        phone: testUser.phone
      }
    });

    const initialExpiresAt = sessionRecord.expiresAt;

    // Simulate request 20 minutes later (exceeds 15m touch throttle)
    const at20Min = new Date(Date.now() + 20 * 60 * 1000);
    const validation = await sessionService.validateSession(rawToken, at20Min);

    assert.equal(validation.valid, true);
    assert.equal(validation.needsTouch, true);
    assert.ok(validation.expiresAt.getTime() > initialExpiresAt.getTime(), "Renewed expiresAt must be greater than initial expiresAt");

    // Compute updated cookie options as /api/auth/me does
    const updatedCookie = getSessionCookieOptions(rawToken, validation.expiresAt);
    assert.equal(updatedCookie.expires.getTime(), validation.expiresAt.getTime(), "Cookie expiration must exactly match newExpiresAt");
    assert.ok(updatedCookie.maxAge > 0);
  });
});

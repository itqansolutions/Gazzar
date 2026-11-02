import crypto from "crypto";
import type {
  CreateSessionParams,
  CreateSessionResult,
  ISessionRepository,
  SessionValidationResult
} from "./types";
import {
  generateSessionToken,
  hashSessionToken,
  isValidTokenFormat
} from "./tokens";
import {
  calculateInitialExpiration,
  calculateRenewedExpiration,
  isSessionAbsoluteExpired,
  isSessionExpired,
  isSessionIdleTimedOut,
  isSessionRevoked,
  shouldTouchSession
} from "./session-rules";
import { PrismaSessionRepository } from "./session-repository";

export class SessionService {
  private repository: ISessionRepository;

  constructor(repository: ISessionRepository = new PrismaSessionRepository()) {
    this.repository = repository;
  }

  /**
   * Mints and stores a new secure session.
   * - Generates 256-bit CSPRNG token
   * - Stores ONLY SHA-256 hash in DB
   * - Sets initial expiration (48h idle cap, 14d absolute cap)
   * - Returns plaintext token ONLY to caller for Cookie issuance (never logs it)
   */
  async createSession(params: CreateSessionParams): Promise<CreateSessionResult> {
    if (!params.userId || typeof params.userId !== "string") {
      throw new Error("Cannot create session: userId is required");
    }

    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = calculateInitialExpiration(now);

    await this.repository.createSession({
      id: sessionId,
      userId: params.userId,
      tokenHash,
      expiresAt,
      createdAt: now,
      lastUsedAt: now,
      userAgent: params.userAgent ?? null,
      ipAddress: params.ipAddress ?? null
    });

    return {
      sessionToken,
      sessionId,
      expiresAt
    };
  }

  /**
   * Validates a raw session token against the database:
   * 1. Syntactic format check (64 hex characters)
   * 2. SHA-256 hash lookup in database
   * 3. Revocation check (revokedAt)
   * 4. Absolute 14-day lifetime check
   * 5. 48-hour idle timeout check
   * 6. Scheduled expiration check
   * 7. User existence check
   * 8. Throttled activity refresh (only if > 15 minutes since last update)
   */
  async validateSession(rawToken: string, now: Date = new Date()): Promise<SessionValidationResult> {
    if (!isValidTokenFormat(rawToken)) {
      return { valid: false, reason: "INVALID_TOKEN" };
    }

    const tokenHash = hashSessionToken(rawToken);

    let sessionWithUser;
    try {
      sessionWithUser = await this.repository.findSessionByTokenHash(tokenHash);
    } catch {
      return { valid: false, reason: "DATABASE_ERROR" };
    }

    if (!sessionWithUser) {
      return { valid: false, reason: "SESSION_NOT_FOUND" };
    }

    // Check 1: Explicit Revocation
    if (isSessionRevoked(sessionWithUser.revokedAt)) {
      return { valid: false, reason: "REVOKED" };
    }

    // Check 2: Absolute 14-Day Lifetime (Hard Wall)
    if (isSessionAbsoluteExpired(sessionWithUser.createdAt, now)) {
      return { valid: false, reason: "EXPIRED" };
    }

    // Check 3: 48-Hour Idle Inactivity Timeout
    if (isSessionIdleTimedOut(sessionWithUser.lastUsedAt, now)) {
      return { valid: false, reason: "IDLE_TIMEOUT" };
    }

    // Check 4: Scheduled Expiration
    if (isSessionExpired(sessionWithUser.expiresAt, now)) {
      return { valid: false, reason: "EXPIRED" };
    }

    // Check 5: Associated User Integrity
    const user = sessionWithUser.user;
    if (!user) {
      return { valid: false, reason: "USER_NOT_FOUND" };
    }

    // Throttled Activity Touch:
    // Update lastUsedAt and extend sliding window ONLY if > 15 minutes elapsed
    const needsTouch = shouldTouchSession(sessionWithUser.lastUsedAt, now);
    if (needsTouch) {
      const newExpiresAt = calculateRenewedExpiration(sessionWithUser.createdAt, now);
      // Execute asynchronously in background to minimize request latency
      this.repository
        .updateSessionActivity(sessionWithUser.id, now, newExpiresAt)
        .catch(() => {
          // Non-blocking catch
        });
    }

    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone
      },
      sessionId: sessionWithUser.id,
      userId: sessionWithUser.userId,
      createdAt: sessionWithUser.createdAt,
      lastUsedAt: sessionWithUser.lastUsedAt,
      expiresAt: sessionWithUser.expiresAt,
      needsTouch
    };
  }

  /**
   * Explicitly revokes a single active session (used on logout).
   */
  async revokeSession(rawToken: string): Promise<boolean> {
    if (!isValidTokenFormat(rawToken)) {
      return false;
    }
    const tokenHash = hashSessionToken(rawToken);
    try {
      return await this.repository.revokeSessionByTokenHash(tokenHash);
    } catch {
      return false;
    }
  }

  /**
   * Revokes all active sessions for a specific user (Logout all devices or password change).
   */
  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    if (!userId || typeof userId !== "string") {
      return 0;
    }
    try {
      return await this.repository.revokeAllUserSessions(userId, exceptSessionId);
    } catch {
      return 0;
    }
  }

  /**
   * Helper to inspect whether a session requires sliding window renewal.
   */
  async shouldRefreshSession(rawToken: string, now: Date = new Date()): Promise<boolean> {
    if (!isValidTokenFormat(rawToken)) return false;
    const tokenHash = hashSessionToken(rawToken);
    try {
      const session = await this.repository.findSessionByTokenHash(tokenHash);
      if (!session || isSessionRevoked(session.revokedAt)) return false;
      return shouldTouchSession(session.lastUsedAt, now);
    } catch {
      return false;
    }
  }
}

// Default singleton instance using the standard Prisma repository
export const sessionService = new SessionService();

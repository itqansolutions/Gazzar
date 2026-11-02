import type { UserRole } from "../../types";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string | null;
  phone?: string | null;
  coachId?: string | null;
  clientId?: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface SessionRecordWithUser extends SessionRecord {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar?: string | null;
    phone?: string | null;
  } | null;
}

export type SessionValidationFailureReason =
  | "INVALID_TOKEN"
  | "SESSION_NOT_FOUND"
  | "REVOKED"
  | "EXPIRED"
  | "IDLE_TIMEOUT"
  | "USER_NOT_FOUND"
  | "DATABASE_ERROR";

export type SessionValidationResult =
  | {
      valid: true;
      user: SessionUser;
      sessionId: string;
      userId: string;
      createdAt: Date;
      lastUsedAt: Date;
      expiresAt: Date;
      needsTouch: boolean;
    }
  | {
      valid: false;
      reason: SessionValidationFailureReason;
      user?: never;
      sessionId?: never;
    };

export interface CreateSessionParams {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface CreateSessionResult {
  sessionToken: string;
  sessionId: string;
  expiresAt: Date;
}

export interface ISessionRepository {
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecordWithUser | null>;
  createSession(data: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    lastUsedAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<SessionRecord>;
  updateSessionActivity(sessionId: string, lastUsedAt: Date, newExpiresAt: Date): Promise<boolean>;
  revokeSessionByTokenHash(tokenHash: string): Promise<boolean>;
  revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number>;
}

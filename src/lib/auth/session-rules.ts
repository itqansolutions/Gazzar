/**
 * GX Academy – Centralized Session Rules Engine
 * Implements deterministic session lifecycle constants and validation logic.
 */

// 1. Session Duration Limits
export const ABSOLUTE_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000; // 14 Days (Hard Upper Bound)
export const IDLE_TIMEOUT_MS = 48 * 60 * 60 * 1000;           // 48 Hours Inactivity Limit
export const UPDATE_THROTTLE_MS = 15 * 60 * 1000;             // 15 Minutes Throttling for DB Writes

/**
 * Calculates initial expiration for a newly minted session:
 * Defaults to now + IDLE_TIMEOUT_MS, strictly capped at now + ABSOLUTE_LIFETIME_MS.
 */
export function calculateInitialExpiration(now: Date = new Date()): Date {
  const idleExp = new Date(now.getTime() + IDLE_TIMEOUT_MS);
  const absoluteMaxExp = new Date(now.getTime() + ABSOLUTE_LIFETIME_MS);
  return idleExp < absoluteMaxExp ? idleExp : absoluteMaxExp;
}

/**
 * Calculates renewed expiration upon active session usage:
 * Extends expiration to now + IDLE_TIMEOUT_MS, but NEVER past createdAt + ABSOLUTE_LIFETIME_MS.
 */
export function calculateRenewedExpiration(createdAt: Date, now: Date = new Date()): Date {
  const renewedIdleExp = new Date(now.getTime() + IDLE_TIMEOUT_MS);
  const absoluteMaxExp = new Date(createdAt.getTime() + ABSOLUTE_LIFETIME_MS);
  return renewedIdleExp < absoluteMaxExp ? renewedIdleExp : absoluteMaxExp;
}

/**
 * Determines whether a database update to lastUsedAt is warranted.
 * Throttle: Returns true ONLY if more than 15 minutes have elapsed since lastUsedAt.
 * This eliminates >99% of redundant database writes during user activity.
 */
export function shouldTouchSession(lastUsedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastUsedAt.getTime() >= UPDATE_THROTTLE_MS;
}

/**
 * Checks if a session has been explicitly revoked (logout or security incident).
 */
export function isSessionRevoked(revokedAt: Date | null): boolean {
  return revokedAt !== null && revokedAt !== undefined;
}

/**
 * Checks if a session has exceeded its scheduled expiration time.
 */
export function isSessionExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= expiresAt.getTime();
}

/**
 * Checks if a session has exceeded the 48-hour idle timeout.
 */
export function isSessionIdleTimedOut(lastUsedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastUsedAt.getTime() >= IDLE_TIMEOUT_MS;
}

/**
 * Checks if a session has exceeded the 14-day absolute lifetime cap.
 */
export function isSessionAbsoluteExpired(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() >= ABSOLUTE_LIFETIME_MS;
}

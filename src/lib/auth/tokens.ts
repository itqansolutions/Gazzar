import crypto from "crypto";

/**
 * Generates a cryptographically secure 256-bit random session token.
 * Output: 64-character lowercase hexadecimal string.
 * Entropy: 256 bits (CSPRNG via OpenSSL / OS entropy pool).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes a deterministic SHA-256 digest of the raw session token.
 * Output: 64-character hexadecimal hash.
 * Security: Raw tokens are NEVER stored in the database or printed in logs.
 */
export function hashSessionToken(rawToken: string): string {
  if (!rawToken || typeof rawToken !== "string") {
    throw new Error("Invalid token: token must be a non-empty string");
  }
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Timing-safe comparison of two hexadecimal hashes.
 * Prevents side-channel timing analysis attacks.
 */
export function timingSafeCompareHashes(hashA: string, hashB: string): boolean {
  if (!hashA || !hashB || typeof hashA !== "string" || typeof hashB !== "string") {
    return false;
  }

  const bufA = Buffer.from(hashA, "utf8");
  const bufB = Buffer.from(hashB, "utf8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates the syntactic structure of an incoming session token.
 * Expects exactly 64 hexadecimal characters.
 */
export function isValidTokenFormat(token: unknown): token is string {
  if (typeof token !== "string") return false;
  return /^[0-9a-f]{64}$/i.test(token);
}

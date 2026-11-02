import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Computes a secure bcrypt hash of a plaintext password.
 * Cost factor: 10 (~80ms computation, balanced security and DoS resilience).
 */
export function hashPassword(password: string): string {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  return bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Validates a plaintext password against a stored bcrypt hash.
 * Timing safe comparison via bcrypt.compareSync.
 */
export function verifyPassword(inputPassword: string, storedHash?: string | null): boolean {
  if (!inputPassword || !storedHash || typeof inputPassword !== "string" || typeof storedHash !== "string") {
    return false;
  }

  // Strictly enforce bcrypt hash signatures ($2a$, $2b$, $2y$)
  if (
    storedHash.startsWith("$2a$") ||
    storedHash.startsWith("$2b$") ||
    storedHash.startsWith("$2y$")
  ) {
    try {
      return bcrypt.compareSync(inputPassword, storedHash);
    } catch {
      return false;
    }
  }

  // Reject any non-bcrypt hash
  return false;
}

/**
 * Enforces strong password rules for administrative accounts:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one numeric digit
 * - At least one special symbol
 * - Maximum 128 characters (DoS mitigation against excessive hash computation)
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters long" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password cannot exceed 128 characters" };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" };
  }

  return { valid: true };
}

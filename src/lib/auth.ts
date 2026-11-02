import jwt from "jsonwebtoken";
import type { SessionUser } from "./auth/types";

export type { SessionUser };
export { hashPassword, verifyPassword, validatePasswordStrength } from "./auth/password";

const JWT_SECRET = process.env.JWT_SECRET || "gazzar_sports_coaching_jwt_super_secret_key_2026";

/**
 * Legacy JWT token generator (preserved for transition)
 */
export function createAuthToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Legacy JWT token verifier (preserved for transition)
 */
export function verifyAuthToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}
/**
 * GX Academy – Centralized Cookie Configuration
 * Enforces secure, HttpOnly session cookie settings.
 */

export const SESSION_COOKIE_NAME = "gx_session";

export interface SessionCookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  expires: Date;
  maxAge: number;
}

/**
 * Returns hardened cookie options for a newly minted or refreshed session.
 */
export function getSessionCookieOptions(token: string, expiresAt: Date): SessionCookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  const now = Date.now();
  const maxAgeSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000));

  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: maxAgeSeconds
  };
}

/**
 * Returns cookie options to immediately invalidate and wipe the session cookie.
 */
export function getClearSessionCookieOptions(): SessionCookieOptions {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0
  };
}

import { NextResponse } from "next/server";
import {
  authService,
  SESSION_COOKIE_NAME,
  getClearSessionCookieOptions,
  validateRequestOrigin
} from "@/lib/auth/index";

function extractSessionToken(request: Request): string | null {
  if ("cookies" in request && typeof (request as { cookies?: { get: (name: string) => { value?: string } | undefined } }).cookies?.get === "function") {
    return (request as { cookies: { get: (name: string) => { value?: string } | undefined } }).cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  }
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(request: Request) {
  // 1. Origin Check (CSRF Mitigation)
  if (!validateRequestOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Forbidden: Invalid or untrusted request origin" },
      { status: 403 }
    );
  }

  // 2. Read Active Session Token
  const sessionToken = extractSessionToken(request);

  // 3. Revoke Session Server-Side
  if (sessionToken) {
    await authService.logout(sessionToken);
  }

  // 4. Wipe Cookie on Response (Matches all cookie attributes)
  const response = NextResponse.json(
    { success: true, message: "تم تسجيل الخروج بنجاح" },
    { status: 200 }
  );

  const clearOpts = getClearSessionCookieOptions();
  response.cookies.set(clearOpts.name, clearOpts.value, {
    httpOnly: clearOpts.httpOnly,
    secure: clearOpts.secure,
    sameSite: clearOpts.sameSite,
    path: clearOpts.path,
    expires: clearOpts.expires,
    maxAge: clearOpts.maxAge
  });

  return response;
}

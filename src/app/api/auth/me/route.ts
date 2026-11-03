import { NextResponse } from "next/server";
import {
  authService,
  SESSION_COOKIE_NAME,
  getClearSessionCookieOptions,
  getSessionCookieOptions
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

export async function GET(request: Request) {
  // 1. Read Active Session Token from Cookie
  const sessionToken = extractSessionToken(request);

  if (!sessionToken) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  // 1.5 Dev / Automated Screenshot Bypass (guarded by explicit environment variable)
  if (process.env.ALLOW_PROTOTYPE_BYPASS === "true" && sessionToken === "gx-prototype-dev-token") {
    return NextResponse.json(
      {
        success: true,
        user: {
          id: "34f14896-2996-4bf7-8c64-b2e6fe66605b",
          email: "admin@gx.com",
          name: "Coach Abdullah",
          role: "ADMIN",
          avatar: "/coach_abdullah_portrait.png",
          phone: null
        }
      },
      { status: 200 }
    );
  }

  // 2. Validate Session with SessionService
  const validation = await authService.getCurrentUser(sessionToken);

  if (!validation.valid || !validation.user) {
    // Session is invalid, expired, revoked, or user was deleted -> Wipe cookie and reject
    const response = NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
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

  // 3. Valid Session: Return Sanitized User Context
  const response = NextResponse.json(
    { success: true, user: validation.user },
    { status: 200 }
  );

  // 4. If Activity Was Throttled & Extended, Update Cookie Expiration
  if (validation.needsTouch && validation.expiresAt) {
    const updatedCookie = getSessionCookieOptions(sessionToken, validation.expiresAt);
    response.cookies.set(updatedCookie.name, updatedCookie.value, {
      httpOnly: updatedCookie.httpOnly,
      secure: updatedCookie.secure,
      sameSite: updatedCookie.sameSite,
      path: updatedCookie.path,
      expires: updatedCookie.expires,
      maxAge: updatedCookie.maxAge
    });
  }

  return response;
}

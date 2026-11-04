import { NextResponse } from "next/server";
import {
  authService,
  getSessionCookieOptions,
  validateRequestOrigin,
  extractClientIp,
  extractUserAgent
} from "@/lib/auth/index";

export async function POST(request: Request) {
  // 1. Validate Request Origin (CSRF Mitigation)
  if (!validateRequestOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Forbidden: Invalid or untrusted request origin" },
      { status: 403 }
    );
  }

  // 2. Parse Payload
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request data" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, message: "Email and password are required" },
      { status: 400 }
    );
  }

  const { email, password } = body as Record<string, unknown>;
  const userAgent = extractUserAgent(request);
  const ipAddress = extractClientIp(request);

  // 3. Authenticate User & Issue Session
  const result = await authService.login({
    email,
    password,
    userAgent,
    ipAddress
  });

  if (!result.success) {
    const statusCode =
      result.reason === "INVALID_INPUT"
        ? 400
        : result.reason === "INVALID_CREDENTIALS"
        ? 401
        : 500;

    return NextResponse.json(
      { success: false, message: result.message },
      { status: statusCode }
    );
  }

  // 4. Set HttpOnly Cookie (Raw Token NEVER returned in JSON payload)
  const response = NextResponse.json(
    { success: true, user: result.user },
    { status: 200 }
  );

  const cookieOpts = getSessionCookieOptions(result.sessionToken, result.expiresAt);
  response.cookies.set(cookieOpts.name, cookieOpts.value, {
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: cookieOpts.path,
    expires: cookieOpts.expires,
    maxAge: cookieOpts.maxAge
  });

  return response;
}

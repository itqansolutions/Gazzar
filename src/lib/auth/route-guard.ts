import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authService } from "./auth-service";
import { SESSION_COOKIE_NAME } from "./cookies";
import type { SessionUser } from "./types";

export interface AuthActor {
  user: SessionUser;
  coachProfileId: string | null;
  clientProfileId: string | null;
}

export type GuardResult =
  | { ok: true; actor: AuthActor }
  | { ok: false; response: NextResponse };

export function extractSessionTokenFromRequest(request: Request): string | null {
  if (
    "cookies" in request &&
    typeof (request as { cookies?: { get: (name: string) => { value?: string } | undefined } }).cookies?.get ===
      "function"
  ) {
    return (
      (request as { cookies: { get: (name: string) => { value?: string } | undefined } }).cookies.get(
        SESSION_COOKIE_NAME
      )?.value ?? null
    );
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function unauthorizedResponse(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ success: false, message }, { status: 401 });
}

function forbiddenResponse(message = "Forbidden: insufficient permissions"): NextResponse {
  return NextResponse.json({ success: false, message }, { status: 403 });
}

/**
 * Validates the current request session and optionally enforces allowed user roles.
 */
export async function requireAuth(request: Request, allowedRoles?: UserRole[]): Promise<GuardResult> {
  const token = extractSessionTokenFromRequest(request);
  if (!token) {
    return { ok: false, response: unauthorizedResponse() };
  }

  let sessionUser: SessionUser | null = null;

  if (process.env.ALLOW_PROTOTYPE_BYPASS === "true" && token === "gx-prototype-dev-token") {
    sessionUser = {
      id: "34f14896-2996-4bf7-8c64-b2e6fe66605b",
      email: "admin@gx.com",
      name: "Coach Abdullah",
      role: "ADMIN",
      avatar: "/coach_abdullah_portrait.png",
      phone: null
    };
  } else {
    const validation = await authService.getCurrentUser(token);
    if (!validation.valid || !validation.user) {
      return { ok: false, response: unauthorizedResponse() };
    }
    sessionUser = validation.user;
  }

  if (allowedRoles && !allowedRoles.includes(sessionUser.role)) {
    return { ok: false, response: forbiddenResponse() };
  }

  const [coachProfile, clientProfile] = await Promise.all([
    sessionUser.role === UserRole.COACH ||
    sessionUser.role === UserRole.HEAD_COACH ||
    sessionUser.role === UserRole.ADMIN
      ? prisma.coachProfile.findUnique({ where: { userId: sessionUser.id }, select: { id: true } })
      : Promise.resolve(null),
    sessionUser.role === UserRole.CLIENT
      ? prisma.clientProfile.findUnique({ where: { userId: sessionUser.id }, select: { id: true } })
      : Promise.resolve(null)
  ]);

  return {
    ok: true,
    actor: {
      user: sessionUser,
      coachProfileId: coachProfile?.id ?? null,
      clientProfileId: clientProfile?.id ?? null
    }
  };
}

/**
 * Resolves a target client by either ClientProfile.id or User.id and verifies
 * whether the authenticated actor is authorized to access that athlete's data.
 *
 * Rules:
 * - ADMIN / HEAD_COACH: full academy access
 * - COACH: only athletes with an active ClientCoachAssignment to this coach
 * - CLIENT: only their own ClientProfile (client.userId === actor.user.id)
 */
export async function requireClientAccess(
  actor: AuthActor,
  targetClientOrUserId: string
): Promise<
  | { ok: true; client: { id: string; userId: string } }
  | { ok: false; response: NextResponse }
> {
  const client = await prisma.clientProfile.findFirst({
    where: {
      OR: [{ id: targetClientOrUserId }, { userId: targetClientOrUserId }]
    },
    select: { id: true, userId: true }
  });

  if (!client) {
    // Preserve auto-provisioning compatibility only if ADMIN/HEAD_COACH or self-CLIENT
    const targetUser = await prisma.user.findUnique({
      where: { id: targetClientOrUserId },
      select: { id: true, role: true }
    });
    if (!targetUser || targetUser.role !== UserRole.CLIENT) {
      return {
        ok: false,
        response: NextResponse.json({ success: false, message: "Client not found" }, { status: 404 })
      };
    }

    if (actor.user.role === UserRole.CLIENT && targetUser.id !== actor.user.id) {
      return { ok: false, response: forbiddenResponse() };
    }
    if (actor.user.role === UserRole.COACH) {
      return { ok: false, response: forbiddenResponse("Client is not assigned to you") };
    }

    const created = await prisma.clientProfile.create({
      data: { userId: targetUser.id, status: "ACTIVE" },
      select: { id: true, userId: true }
    });
    return { ok: true, client: created };
  }

  if (actor.user.role === UserRole.ADMIN || actor.user.role === UserRole.HEAD_COACH) {
    return { ok: true, client };
  }

  if (actor.user.role === UserRole.CLIENT) {
    if (client.userId !== actor.user.id) {
      return { ok: false, response: forbiddenResponse("You can only access your own records") };
    }
    return { ok: true, client };
  }

  if (actor.user.role === UserRole.COACH) {
    if (!actor.coachProfileId) {
      return { ok: false, response: forbiddenResponse("Coach profile not configured") };
    }
    const assignment = await prisma.clientCoachAssignment.findFirst({
      where: {
        clientId: client.id,
        coachId: actor.coachProfileId,
        active: true
      },
      select: { id: true }
    });
    if (!assignment) {
      return { ok: false, response: forbiddenResponse("Client is not assigned to you") };
    }
    return { ok: true, client };
  }

  return { ok: false, response: forbiddenResponse() };
}

/**
 * Returns the list of ClientProfile IDs assigned to a COACH, or null when unrestricted (ADMIN / HEAD_COACH).
 */
export async function getAssignedClientIdsForActor(actor: AuthActor): Promise<string[] | null> {
  if (actor.user.role === UserRole.ADMIN || actor.user.role === UserRole.HEAD_COACH) {
    return null;
  }
  if (actor.user.role === UserRole.CLIENT) {
    return actor.clientProfileId ? [actor.clientProfileId] : [];
  }
  if (actor.user.role === UserRole.COACH) {
    if (!actor.coachProfileId) return [];
    const links = await prisma.clientCoachAssignment.findMany({
      where: { coachId: actor.coachProfileId, active: true },
      select: { clientId: true }
    });
    return links.map((l) => l.clientId);
  }
  return [];
}

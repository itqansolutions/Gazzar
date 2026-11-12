import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { membershipService } from "@/server/services/membership.service";
import { getAssignedClientIdsForActor, requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const packages = membershipService.getPackages();
    const allMemberships = await membershipService.getMemberships();
    const allowedClientIds = await getAssignedClientIdsForActor(auth.actor);
    const memberships =
      allowedClientIds !== null
        ? allMemberships.filter((m) => allowedClientIds.includes(m.clientId))
        : allMemberships;

    return NextResponse.json({ success: true, data: { packages, memberships } });
  } catch (error: any) {
    console.error("[GET /api/memberships] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const membership = await membershipService.createMembership(body);
    return NextResponse.json({ success: true, data: membership }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/memberships] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

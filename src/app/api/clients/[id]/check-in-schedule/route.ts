import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";
import { checkInScheduleService } from "@/server/services/checkin-schedule.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const access = await requireClientAccess(auth.actor, params.id);
    if (!access.ok) return access.response;

    const result = await checkInScheduleService.getSchedule(access.client.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[GET /api/clients/[id]/check-in-schedule] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch check-in schedule" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const access = await requireClientAccess(auth.actor, params.id);
    if (!access.ok) return access.response;

    const body = await req.json();
    const result = await checkInScheduleService.upsertSchedule(
      access.client.id,
      body,
      auth.actor.coachProfileId
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/check-in-schedule] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update check-in schedule" },
      { status: 400 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return POST(req, { params });
}

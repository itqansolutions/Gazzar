import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { monitoringService, MonitoringServiceError } from "@/server/services/monitoring.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const periodDays = searchParams.get("periodDays") ? parseInt(searchParams.get("periodDays")!, 10) : 30;
    const coachId = searchParams.get("coachId") || undefined;
    const athleteId = searchParams.get("athleteId") || undefined;

    const data = await monitoringService.getCoachMonitoring(
      { periodDays, coachId, athleteId },
      auth.actor
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[GET /api/coach/monitoring] Error:", error);
    const status = error instanceof MonitoringServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

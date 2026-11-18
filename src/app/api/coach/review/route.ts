import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { monitoringService, MonitoringServiceError } from "@/server/services/monitoring.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();

    if (!body?.workoutLogId) {
      return NextResponse.json(
        { success: false, error: "workoutLogId is required" },
        { status: 400 }
      );
    }

    const updated = await monitoringService.submitCoachReview(
      {
        workoutLogId: body.workoutLogId,
        coachFeedback: body.coachFeedback,
        setReviews: body.setReviews
      },
      auth.actor
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[POST /api/coach/review] Error:", error);
    const status = error instanceof MonitoringServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

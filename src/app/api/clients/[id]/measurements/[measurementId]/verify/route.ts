import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/route-guard";
import {
  checkInSubmissionService,
  CheckInSubmissionServiceError
} from "@/server/services/checkin-submission.service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; measurementId: string }> | { id: string; measurementId: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { measurementId } = await Promise.resolve(params);
    const body = await req.json();

    if (!body.verificationStatus || !["VERIFIED", "REJECTED"].includes(body.verificationStatus)) {
      return NextResponse.json(
        { success: false, error: "verificationStatus must be either 'VERIFIED' or 'REJECTED'" },
        { status: 400 }
      );
    }

    const updated = await checkInSubmissionService.verifyMeasurement(measurementId, body, auth.actor);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH .../measurements/[id]/verify] Error:", error);
    const status = error instanceof CheckInSubmissionServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

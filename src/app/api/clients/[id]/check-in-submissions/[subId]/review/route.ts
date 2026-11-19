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
  { params }: { params: Promise<{ id: string; subId: string }> | { id: string; subId: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { subId } = await Promise.resolve(params);
    const body = await req.json();

    const updated = await checkInSubmissionService.reviewSubmission(subId, body, auth.actor);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH .../review] Error:", error);
    const status = error instanceof CheckInSubmissionServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

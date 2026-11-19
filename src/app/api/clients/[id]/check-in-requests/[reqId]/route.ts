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
  { params }: { params: Promise<{ id: string; reqId: string }> | { id: string; reqId: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { reqId } = await Promise.resolve(params);
    const body = await req.json();

    const updated = await checkInSubmissionService.cancelCheckInRequest(reqId, body.reason, auth.actor);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/clients/[id]/check-in-requests/[reqId]] Error:", error);
    const status = error instanceof CheckInSubmissionServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

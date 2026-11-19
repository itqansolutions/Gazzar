import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/route-guard";
import {
  checkInSubmissionService,
  CheckInSubmissionServiceError
} from "@/server/services/checkin-submission.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const requests = await checkInSubmissionService.getCheckInRequests(id, auth.actor);

    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    console.error("[GET /api/clients/[id]/check-in-requests] Error:", error);
    const status = error instanceof CheckInSubmissionServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const body = await req.json();

    const request = await checkInSubmissionService.createCheckInRequest(
      {
        ...body,
        clientId: id
      },
      auth.actor
    );

    return NextResponse.json({ success: true, data: request }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/check-in-requests] Error:", error);
    const status = error instanceof CheckInSubmissionServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

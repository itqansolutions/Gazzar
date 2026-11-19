import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";
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
    const submissions = await checkInSubmissionService.getSubmissions(id, auth.actor);

    return NextResponse.json({ success: true, data: submissions });
  } catch (error: any) {
    console.error("[GET /api/clients/[id]/check-in-submissions] Error:", error);
    const status = error instanceof CheckInSubmissionServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const body = await req.json();

    const submission = await checkInSubmissionService.createSubmission(
      {
        ...body,
        clientId: id
      },
      auth.actor
    );

    return NextResponse.json({ success: true, data: submission }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/check-in-submissions] Error:", error);
    const status = error instanceof CheckInSubmissionServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

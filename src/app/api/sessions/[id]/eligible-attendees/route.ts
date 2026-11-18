import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { sessionService, SessionServiceError } from "@/server/services/session.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const attendees = await sessionService.getEligibleAttendees(params.id);
    return NextResponse.json({ success: true, data: attendees });
  } catch (error: any) {
    console.error("[GET /api/sessions/[id]/eligible-attendees] Error:", error);
    const status = error instanceof SessionServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

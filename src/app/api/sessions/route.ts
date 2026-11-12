import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { sessionService } from "@/server/services/session.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const sessions = await sessionService.getSessions();
    return NextResponse.json({ success: true, data: sessions });
  } catch (error: any) {
    console.error("[GET /api/sessions] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const session = await sessionService.createSession(body);
    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/sessions] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const attendance = await sessionService.updateAttendance(
      body.sessionId,
      body.clientId,
      body.status,
      body.notes
    );
    return NextResponse.json({ success: true, data: attendance });
  } catch (error: any) {
    console.error("[PATCH /api/sessions] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

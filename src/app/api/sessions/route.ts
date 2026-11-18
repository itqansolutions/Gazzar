import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { sessionService, SessionServiceError } from "@/server/services/session.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const coachId = searchParams.get("coachId") || undefined;
    const sportId = searchParams.get("sportId") || undefined;

    const sessions = await sessionService.getSessions({
      startDate,
      endDate,
      coachId,
      sportId
    });

    return NextResponse.json({ success: true, data: sessions });
  } catch (error: any) {
    console.error("[GET /api/sessions] Error:", error);
    const status = error instanceof SessionServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();

    const session = await sessionService.createSession(body, auth.actor);
    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/sessions] Error:", error);
    const status = error instanceof SessionServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    if (!body?.sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }

    // 1. If updating attendance for a specific client:
    if (body.clientId) {
      const access = await requireClientAccess(auth.actor, body.clientId);
      if (!access.ok) return access.response;

      const attendance = await sessionService.updateAttendance(
        body.sessionId,
        access.client.id,
        body.status,
        body.notes,
        auth.actor
      );
      return NextResponse.json({ success: true, data: attendance });
    }

    // 2. If updating session metadata:
    const updated = await sessionService.updateSession(body.sessionId, body, auth.actor);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/sessions] Error:", error);
    const status = error instanceof SessionServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id") || searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId query parameter is required" }, { status: 400 });
    }

    const result = await sessionService.deleteSession(sessionId, auth.actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[DELETE /api/sessions] Error:", error);
    const status = error instanceof SessionServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

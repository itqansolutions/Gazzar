import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { sessionService } from "@/server/services/session.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

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

    // If COACH, ensure coachId is assigned to their own coach profile if not explicitly provided
    let coachId = body.coachId;
    if (auth.actor.user.role === UserRole.COACH) {
      if (!coachId && auth.actor.coachProfileId) {
        coachId = auth.actor.coachProfileId;
      }
    }

    const session = await sessionService.createSession({
      ...body,
      coachId: coachId || body.coachId
    });
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
    if (!body?.sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }

    // 1. If updating attendance for a specific client:
    if (body.clientId) {
      const access = await requireClientAccess(auth.actor, body.clientId);
      if (!access.ok) return access.response;

      const attendance = await sessionService.updateAttendance(
        body.sessionId,
        body.clientId,
        body.status,
        body.notes
      );
      return NextResponse.json({ success: true, data: attendance });
    }

    // 2. If updating session metadata (title, timing, location, etc.):
    const session = await prisma.sessionCalendar.findUnique({
      where: { id: body.sessionId },
      include: { coach: true }
    });

    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    if (auth.actor.user.role === UserRole.COACH) {
      const isOwner =
        session.coachId === auth.actor.coachProfileId ||
        session.coach?.userId === auth.actor.user.id;
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You may only modify session details for sessions you coach" },
          { status: 403 }
        );
      }
    }

    const updated = await sessionService.updateSession(body.sessionId, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/sessions] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

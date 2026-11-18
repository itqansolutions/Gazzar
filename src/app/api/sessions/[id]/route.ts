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
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const session = await sessionService.getSessionById(params.id);
    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    console.error("[GET /api/sessions/[id]] Error:", error);
    const status = error instanceof SessionServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const updated = await sessionService.updateSession(params.id, body, auth.actor);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/sessions/[id]] Error:", error);
    const status = error instanceof SessionServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const result = await sessionService.deleteSession(params.id, auth.actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[DELETE /api/sessions/[id]] Error:", error);
    const status = error instanceof SessionServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

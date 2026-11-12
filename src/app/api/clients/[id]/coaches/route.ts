import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { clientService } from "@/server/services/client.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { coachId, role, notes } = body;
    if (!coachId) {
      return NextResponse.json({ success: false, message: "coachId is required" }, { status: 400 });
    }
    const assignment = await clientService.assignCoachToClient(params.id, coachId, role, notes);
    return NextResponse.json({ success: true, data: assignment });
  } catch (err: any) {
    console.error("[API_CLIENT_COACH_POST_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get("coachId");
    if (!coachId) {
      return NextResponse.json({ success: false, message: "coachId is required" }, { status: 400 });
    }
    await clientService.removeCoachFromClient(params.id, coachId);
    return NextResponse.json({ success: true, message: "Coach unassigned successfully" });
  } catch (err: any) {
    console.error("[API_CLIENT_COACH_DELETE_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

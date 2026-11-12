import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { coachService } from "@/server/services/coach.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const coach = await coachService.getCoachById(params.id);
    if (!coach) {
      return NextResponse.json({ success: false, message: "Coach not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: coach });
  } catch (err: any) {
    console.error("[API_COACH_ID_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const updated = await coachService.updateCoach(params.id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[API_COACH_ID_PATCH_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    await coachService.deleteCoach(params.id);
    return NextResponse.json({ success: true, message: "Coach deleted successfully" });
  } catch (err: any) {
    console.error("[API_COACH_ID_DELETE_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

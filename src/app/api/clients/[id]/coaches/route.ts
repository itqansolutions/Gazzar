import { NextResponse } from "next/server";
import { clientService } from "@/server/services/client.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
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

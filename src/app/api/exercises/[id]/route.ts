import { NextResponse } from "next/server";
import { exerciseService } from "@/server/services/exercise.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const ex = await exerciseService.getExerciseById(params.id);
    if (!ex) {
      return NextResponse.json({ success: false, message: "Exercise not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: ex });
  } catch (err: any) {
    console.error("[API_EXERCISE_ID_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = await exerciseService.updateExercise(params.id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[API_EXERCISE_ID_PATCH_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await exerciseService.deleteExercise(params.id);
    return NextResponse.json({ success: true, message: "Exercise deleted successfully" });
  } catch (err: any) {
    console.error("[API_EXERCISE_ID_DELETE_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

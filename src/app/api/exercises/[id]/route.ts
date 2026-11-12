import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { exerciseService, ExerciseServiceError } from "@/server/services/exercise.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const ex = await exerciseService.getExerciseById(id);
    if (!ex) {
      return NextResponse.json({ success: false, error: "Exercise not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: ex });
  } catch (err: any) {
    console.error("[API_EXERCISE_ID_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const updated = await exerciseService.updateExercise(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[API_EXERCISE_ID_PATCH_ERROR]:", err);
    const status = err instanceof ExerciseServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    await exerciseService.deleteExercise(id);
    return NextResponse.json({ success: true, message: "Exercise deleted successfully" });
  } catch (err: any) {
    console.error("[API_EXERCISE_ID_DELETE_ERROR]:", err);
    const status = err instanceof ExerciseServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

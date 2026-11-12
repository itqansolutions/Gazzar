import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { exerciseService, ExerciseServiceError } from "@/server/services/exercise.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const sportId = searchParams.get("sportId") || undefined;
    const sportIdsParam = searchParams.get("sportIds");
    const sportIds = sportIdsParam
      ? sportIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const muscleId = searchParams.get("muscleId") || undefined;
    const difficulty = (searchParams.get("difficulty") || "ALL") as any;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const exercises = await exerciseService.getExercises({
      search,
      sportId,
      sportIds,
      muscleId,
      difficulty,
      activeOnly
    });
    return NextResponse.json({ success: true, data: exercises });
  } catch (err: any) {
    console.error("[API_EXERCISES_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const newEx = await exerciseService.createExercise(body);
    return NextResponse.json({ success: true, data: newEx }, { status: 201 });
  } catch (err: any) {
    console.error("[API_EXERCISES_POST_ERROR]:", err);
    const status = err instanceof ExerciseServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
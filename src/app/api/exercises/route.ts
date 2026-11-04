import { NextResponse } from "next/server";
import { exerciseService } from "@/server/services/exercise.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const sportId = searchParams.get("sportId") || undefined;
    const muscleId = searchParams.get("muscleId") || undefined;
    const difficulty = (searchParams.get("difficulty") || "ALL") as any;

    const exercises = await exerciseService.getExercises({ search, sportId, muscleId, difficulty });
    return NextResponse.json({ success: true, data: exercises });
  } catch (err: any) {
    console.error("[API_EXERCISES_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newEx = await exerciseService.createExercise(body);
    return NextResponse.json({ success: true, data: newEx }, { status: 201 });
  } catch (err: any) {
    console.error("[API_EXERCISES_POST_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
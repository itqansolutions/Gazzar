import { NextResponse } from "next/server";
import { workoutService } from "@/server/services/workout.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") || undefined;
    const assignments = await workoutService.getAssignments(clientId);
    const templates = await workoutService.getTemplates();
    return NextResponse.json({ success: true, data: { templates, assignments } });
  } catch (err: any) {
    console.error("[API_WORKOUTS_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const assignment = await workoutService.assignWorkout(body);
    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (err: any) {
    console.error("[API_WORKOUTS_POST_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { workoutService } from "@/server/services/workout.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignment = await workoutService.getAssignmentById(id);
    if (!assignment) {
      return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    console.error("[GET /api/workouts/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await workoutService.saveWorkoutExecution(id, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[POST /api/workouts/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { workoutService } from "@/server/services/workout.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const assignment = await workoutService.getAssignmentById(id);
    if (!assignment) {
      return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    }

    const access = await requireClientAccess(auth.actor, assignment.clientId);
    if (!access.ok) return access.response;

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    console.error("[GET /api/workouts/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleWorkoutMutation(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const assignment = await workoutService.getAssignmentById(id);
    if (!assignment) {
      return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    }

    const access = await requireClientAccess(auth.actor, assignment.clientId);
    if (!access.ok) return access.response;

    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action.toUpperCase() : "COMPLETE";

    if (action === "RESET_TO_MASTER") {
      const reset = await workoutService.resetAssignmentToMaster(id, auth.actor);
      return NextResponse.json({ success: true, data: reset });
    }

    if (action === "CUSTOMIZE" || (body?.blocks && !["COMPLETE", "SAVE_PROGRESS", "SKIP", "COACH_FEEDBACK"].includes(action))) {
      const customized = await workoutService.customizeAssignment(id, body, auth.actor);
      return NextResponse.json({ success: true, data: customized });
    }

    if (action === "SKIP") {
      const skipped = await workoutService.skipWorkout(id, body.reason, auth.actor);
      return NextResponse.json({ success: true, data: skipped });
    }

    if (action === "COACH_FEEDBACK") {
      if (auth.actor.user.role === UserRole.CLIENT) {
        return NextResponse.json(
          { success: false, error: "Only coaches or admins can add coach feedback" },
          { status: 403 }
        );
      }
      const updated = await workoutService.saveCoachFeedback(id, body.coachFeedback ?? null);
      return NextResponse.json({ success: true, data: updated });
    }

    const mode = action === "SAVE_PROGRESS" ? "SAVE_PROGRESS" : "COMPLETE";
    const result = await workoutService.saveWorkoutExecution(
      id,
      {
        ...body,
        mode
      },
      auth.actor
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[MUTATE /api/workouts/[id]] Error:", error);
    const status =
      error?.name === "WorkoutServiceError" && typeof error.statusCode === "number"
        ? error.statusCode
        : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleWorkoutMutation(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleWorkoutMutation(req, context);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const assignment = await workoutService.getAssignmentById(id);
    if (!assignment) {
      return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    }

    const access = await requireClientAccess(auth.actor, assignment.clientId);
    if (!access.ok) return access.response;

    await workoutService.deleteAssignment(id, auth.actor);
    return NextResponse.json({ success: true, message: "Assignment deleted" });
  } catch (error: any) {
    console.error("[DELETE /api/workouts/[id]] Error:", error);
    const status =
      error?.name === "WorkoutServiceError" && typeof error.statusCode === "number"
        ? error.statusCode
        : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}


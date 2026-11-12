import { NextResponse } from "next/server";
import { AssignmentSourceType, UserRole } from "@prisma/client";
import { EffectiveAssignmentStatus, workoutService } from "@/server/services/workout.service";
import {
  getAssignedClientIdsForActor,
  requireAuth,
  requireClientAccess
} from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const requestedClientId = searchParams.get("clientId") || undefined;
    const coachId = searchParams.get("coachId") || undefined;
    const sourceType = (searchParams.get("sourceType") || undefined) as AssignmentSourceType | "ALL" | undefined;
    const status = (searchParams.get("status") || undefined) as EffectiveAssignmentStatus | "ALL" | undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const search = searchParams.get("search") || undefined;

    if (requestedClientId && requestedClientId !== "ALL") {
      const access = await requireClientAccess(auth.actor, requestedClientId);
      if (!access.ok) return access.response;
      const [assignments, templates] = await Promise.all([
        workoutService.getAssignments({
          clientId: access.client.id,
          coachId,
          sourceType,
          status,
          dateFrom,
          dateTo,
          search
        }),
        workoutService.getTemplates()
      ]);
      return NextResponse.json({ success: true, data: { templates, assignments } });
    }

    const allowedClientIds = await getAssignedClientIdsForActor(auth.actor);
    const [assignments, templates] = await Promise.all([
      workoutService.getAssignments({
        allowedClientIds: allowedClientIds ?? undefined,
        coachId,
        sourceType,
        status,
        dateFrom,
        dateTo,
        search
      }),
      workoutService.getTemplates()
    ]);

    return NextResponse.json({ success: true, data: { templates, assignments } });
  } catch (err: any) {
    console.error("[API_WORKOUTS_GET_ERROR]:", err);
    const status = err?.name === "WorkoutServiceError" && typeof err.statusCode === "number" ? err.statusCode : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (!body.clientId) {
      return NextResponse.json({ success: false, error: "clientId is required" }, { status: 400 });
    }

    const access = await requireClientAccess(auth.actor, body.clientId);
    if (!access.ok) return access.response;

    const assignment = await workoutService.assignWorkout({
      ...body,
      clientId: access.client.id,
      coachId: body.coachId || auth.actor.coachProfileId || undefined
    });
    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (err: any) {
    console.error("[API_WORKOUTS_POST_ERROR]:", err);
    const status = err?.name === "WorkoutServiceError" && typeof err.statusCode === "number" ? err.statusCode : 400;
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        ...(err?.conflicts ? { conflicts: err.conflicts } : {})
      },
      { status }
    );
  }
}
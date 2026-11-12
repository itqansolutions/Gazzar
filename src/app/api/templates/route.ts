import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { workoutService, WorkoutServiceError } from "@/server/services/workout.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const sportId = searchParams.get("sportId") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";
    const search = searchParams.get("search") || undefined;

    const templates = await workoutService.getTemplates({ sportId, activeOnly, search });
    return NextResponse.json({ success: true, data: templates });
  } catch (err: any) {
    console.error("[API_TEMPLATES_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const newTemplate = await workoutService.createTemplate({
      ...body,
      creatorId: body.creatorId || auth.actor.coachProfileId || undefined
    });
    return NextResponse.json({ success: true, data: newTemplate }, { status: 201 });
  } catch (err: any) {
    console.error("[API_TEMPLATES_POST_ERROR]:", err);
    const status = err instanceof WorkoutServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

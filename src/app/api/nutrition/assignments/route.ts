import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import {
  getAssignedClientIdsForActor,
  requireAuth,
  requireClientAccess
} from "@/lib/auth/route-guard";
import {
  nutritionProgramService,
  NutritionProgramServiceError
} from "@/server/services/nutrition-program.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const requestedClientId = searchParams.get("clientId") || undefined;
    const coachId = searchParams.get("coachId") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";
    const mode = (searchParams.get("mode") as any) || undefined;

    if (requestedClientId && requestedClientId !== "ALL") {
      const access = await requireClientAccess(auth.actor, requestedClientId);
      if (!access.ok) return access.response;

      const assignments = await nutritionProgramService.getClientNutritionAssignments({
        clientId: access.client.id,
        coachId,
        activeOnly,
        mode
      });
      return NextResponse.json({ success: true, data: assignments });
    }

    // If client is requesting without clientId param, return own assignments
    if (auth.actor.user.role === UserRole.CLIENT) {
      if (!auth.actor.clientProfileId) {
        return NextResponse.json({ success: true, data: [] });
      }
      const assignments = await nutritionProgramService.getClientNutritionAssignments({
        clientId: auth.actor.clientProfileId,
        activeOnly,
        mode
      });
      return NextResponse.json({ success: true, data: assignments });
    }

    // Coach or Admin requesting academy-wide or scoped
    const allowedClientIds = await getAssignedClientIdsForActor(auth.actor);
    const allAssignments = await nutritionProgramService.getClientNutritionAssignments({
      coachId,
      activeOnly,
      mode
    });

    if (allowedClientIds !== null) {
      const allowedSet = new Set(allowedClientIds);
      const filtered = allAssignments.filter((a) => allowedSet.has(a.clientId));
      return NextResponse.json({ success: true, data: filtered });
    }

    return NextResponse.json({ success: true, data: allAssignments });
  } catch (err: any) {
    console.error("[GET /api/nutrition/assignments] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    if (!body.clientId) {
      return NextResponse.json({ success: false, error: "clientId is required" }, { status: 400 });
    }

    const access = await requireClientAccess(auth.actor, body.clientId);
    if (!access.ok) return access.response;

    const created = await nutritionProgramService.assignNutritionProgramToClient({
      ...body,
      clientId: access.client.id,
      coachId: body.coachId || auth.actor.coachProfileId || undefined
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/nutrition/assignments] Error:", err);
    const status = err instanceof NutritionProgramServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

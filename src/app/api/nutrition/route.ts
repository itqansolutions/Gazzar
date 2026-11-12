import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { nutritionService } from "@/server/services/nutrition.service";
import {
  getAssignedClientIdsForActor,
  requireAuth,
  requireClientAccess
} from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const requestedClientId = searchParams.get("clientId") || undefined;

    if (requestedClientId && requestedClientId !== "ALL") {
      const access = await requireClientAccess(auth.actor, requestedClientId);
      if (!access.ok) return access.response;
      const plans = await nutritionService.getMealPlans(access.client.id);
      return NextResponse.json({ success: true, data: plans });
    }

    const allowedClientIds = await getAssignedClientIdsForActor(auth.actor);
    const plans = await nutritionService.getMealPlans(undefined, allowedClientIds ?? undefined);
    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    console.error("[GET /api/nutrition] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    const plan = await nutritionService.createMealPlan({
      ...body,
      clientId: access.client.id,
      coachId: body.coachId || auth.actor.coachProfileId || undefined
    });
    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/nutrition] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

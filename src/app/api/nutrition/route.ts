import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { nutritionService } from "@/server/services/nutrition.service";
import {
  getAssignedClientIdsForActor,
  requireAuth,
  requireClientAccess
} from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

/**
 * @deprecated MealPlan API (/api/nutrition) is DEPRECATED in Phase 4.
 * Replaced by:
 * - /api/nutrition-programs (reusable library templates)
 * - /api/nutrition/assignments (athlete assignments with snapshots)
 * Do NOT use for new features.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const requestedClientId = searchParams.get("clientId") || undefined;

    let plans: any[] = [];
    if (requestedClientId && requestedClientId !== "ALL") {
      const access = await requireClientAccess(auth.actor, requestedClientId);
      if (!access.ok) return access.response;
      plans = await nutritionService.getMealPlans(access.client.id);
    } else {
      const allowedClientIds = await getAssignedClientIdsForActor(auth.actor);
      plans = await nutritionService.getMealPlans(undefined, allowedClientIds ?? undefined);
    }

    const res = NextResponse.json({ success: true, data: plans });
    res.headers.set("X-API-Deprecated", "true");
    res.headers.set("Warning", '299 - "MealPlan API (/api/nutrition) is deprecated. Use /api/nutrition-programs and /api/nutrition/assignments instead."');
    return res;
  } catch (error: any) {
    console.error("[GET /api/nutrition] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * @deprecated MealPlan creation is DEPRECATED. Use POST /api/nutrition/assignments instead.
 */
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

    const res = NextResponse.json({ success: true, data: plan }, { status: 201 });
    res.headers.set("X-API-Deprecated", "true");
    res.headers.set("Warning", '299 - "MealPlan API (/api/nutrition) is deprecated. Use /api/nutrition/assignments instead."');
    return res;
  } catch (error: any) {
    console.error("[POST /api/nutrition] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

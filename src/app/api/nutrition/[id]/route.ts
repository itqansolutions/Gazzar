import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { nutritionService } from "@/server/services/nutrition.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

/**
 * @deprecated MealPlan API is DEPRECATED in Phase 4.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const existing = await prisma.mealPlan.findUnique({ where: { id }, select: { clientId: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Meal plan not found" }, { status: 404 });
    }

    const access = await requireClientAccess(auth.actor, existing.clientId);
    if (!access.ok) return access.response;

    const body = await req.json();
    const updated = await nutritionService.updateMealPlan(id, body);
    const res = NextResponse.json({ success: true, data: updated });
    res.headers.set("X-API-Deprecated", "true");
    res.headers.set("Warning", '299 - "MealPlan API is deprecated. Use /api/nutrition/assignments instead."');
    return res;
  } catch (error: any) {
    console.error("[PATCH /api/nutrition/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * @deprecated MealPlan API is DEPRECATED in Phase 4.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const existing = await prisma.mealPlan.findUnique({ where: { id }, select: { clientId: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Meal plan not found" }, { status: 404 });
    }

    const access = await requireClientAccess(auth.actor, existing.clientId);
    if (!access.ok) return access.response;

    await nutritionService.deleteMealPlan(id);
    const res = NextResponse.json({ success: true, message: "Meal plan deleted successfully" });
    res.headers.set("X-API-Deprecated", "true");
    res.headers.set("Warning", '299 - "MealPlan API is deprecated. Use /api/nutrition/assignments instead."');
    return res;
  } catch (error: any) {
    console.error("[DELETE /api/nutrition/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

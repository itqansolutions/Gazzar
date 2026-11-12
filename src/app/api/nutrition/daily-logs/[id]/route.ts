import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";
import {
  nutritionTrackingService,
  NutritionTrackingServiceError
} from "@/server/services/nutrition-tracking.service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const existing = await prisma.dailyNutritionLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Daily nutrition log not found" }, { status: 404 });
    }

    const access = await requireClientAccess(auth.actor, existing.clientId);
    if (!access.ok) return access.response;

    const body = await req.json();

    if (body.action === "COACH_FEEDBACK") {
      if (auth.actor.user.role === UserRole.CLIENT) {
        return NextResponse.json(
          { success: false, error: "Only coaches or admins can submit coach review feedback" },
          { status: 403 }
        );
      }
      const updated = await nutritionTrackingService.saveCoachFeedback(id, body.coachFeedback ?? null);
      return NextResponse.json({ success: true, data: updated });
    }

    // General update to daily log
    const updated = await nutritionTrackingService.saveDailyNutritionLog({
      ...body,
      clientId: existing.clientId,
      date: existing.date
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[PATCH /api/nutrition/daily-logs/[id]] Error:", err);
    const status = err instanceof NutritionTrackingServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";
import {
  nutritionTrackingService,
  NutritionTrackingServiceError
} from "@/server/services/nutrition-tracking.service";
import { getCairoDateKey, addCalendarDaysKey } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const requestedClientId = searchParams.get("clientId");
    const targetClientId =
      requestedClientId && requestedClientId !== "ALL"
        ? requestedClientId
        : auth.actor.user.role === UserRole.CLIENT
        ? auth.actor.clientProfileId
        : undefined;

    if (!targetClientId) {
      return NextResponse.json({ success: false, error: "clientId is required" }, { status: 400 });
    }

    const access = await requireClientAccess(auth.actor, targetClientId);
    if (!access.ok) return access.response;

    const action = searchParams.get("action");
    const date = searchParams.get("date");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (action === "ADHERENCE") {
      const today = getCairoDateKey();
      const defaultFrom = addCalendarDaysKey(today, -6);
      const adherence = await nutritionTrackingService.getNutritionAdherence(
        access.client.id,
        dateFrom || defaultFrom,
        dateTo || today
      );
      return NextResponse.json({ success: true, data: adherence });
    }

    if (date) {
      const log = await nutritionTrackingService.getDailyNutritionLog(access.client.id, date);
      return NextResponse.json({ success: true, data: log });
    }

    const limit = Number(searchParams.get("limit")) || 60;
    const logs = await nutritionTrackingService.getDailyNutritionLogs(access.client.id, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (err: any) {
    console.error("[GET /api/nutrition/daily-logs] Error:", err);
    const status = err instanceof NutritionTrackingServiceError ? err.statusCode : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const targetClientId =
      body.clientId || (auth.actor.user.role === UserRole.CLIENT ? auth.actor.clientProfileId : undefined);

    if (!targetClientId) {
      return NextResponse.json({ success: false, error: "clientId is required" }, { status: 400 });
    }

    const access = await requireClientAccess(auth.actor, targetClientId);
    if (!access.ok) return access.response;

    const saved = await nutritionTrackingService.saveDailyNutritionLog({
      ...body,
      clientId: access.client.id
    });

    return NextResponse.json({ success: true, data: saved }, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/nutrition/daily-logs] Error:", err);
    const status = err instanceof NutritionTrackingServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

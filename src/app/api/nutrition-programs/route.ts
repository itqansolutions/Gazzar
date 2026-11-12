import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/route-guard";
import {
  nutritionProgramService,
  NutritionProgramServiceError
} from "@/server/services/nutrition-program.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const search = searchParams.get("search") || undefined;

    const programs = await nutritionProgramService.getNutritionPrograms({ activeOnly, search });
    return NextResponse.json({ success: true, data: programs });
  } catch (err: any) {
    console.error("[GET /api/nutrition-programs] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const created = await nutritionProgramService.createNutritionProgram({
      ...body,
      creatorId: body.creatorId || auth.actor.coachProfileId || undefined
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/nutrition-programs] Error:", err);
    const status = err instanceof NutritionProgramServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

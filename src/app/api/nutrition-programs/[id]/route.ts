import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/route-guard";
import {
  nutritionProgramService,
  NutritionProgramServiceError
} from "@/server/services/nutrition-program.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const program = await nutritionProgramService.getNutritionProgramById(id);
    if (!program) {
      return NextResponse.json({ success: false, error: "Nutrition program not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: program });
  } catch (err: any) {
    console.error("[GET /api/nutrition-programs/[id]] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const body = await req.json();
    const updated = await nutritionProgramService.updateNutritionProgram(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[PATCH /api/nutrition-programs/[id]] Error:", err);
    const status = err instanceof NutritionProgramServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    await nutritionProgramService.deleteNutritionProgram(id);
    return NextResponse.json({ success: true, message: "Nutrition program deleted successfully" });
  } catch (err: any) {
    console.error("[DELETE /api/nutrition-programs/[id]] Error:", err);
    const status = err instanceof NutritionProgramServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";
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
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const assignment = await nutritionProgramService.getNutritionAssignmentById(id);
    if (!assignment) {
      return NextResponse.json({ success: false, error: "Nutrition assignment not found" }, { status: 404 });
    }

    const access = await requireClientAccess(auth.actor, assignment.clientId);
    if (!access.ok) return access.response;

    return NextResponse.json({ success: true, data: assignment });
  } catch (err: any) {
    console.error("[GET /api/nutrition/assignments/[id]] Error:", err);
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
    const existing = await nutritionProgramService.getNutritionAssignmentById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Nutrition assignment not found" }, { status: 404 });
    }

    const access = await requireClientAccess(auth.actor, existing.clientId);
    if (!access.ok) return access.response;

    const body = await req.json();
    if (body.action === "ARCHIVE") {
      const archived = await nutritionProgramService.archiveNutritionAssignment(id);
      return NextResponse.json({ success: true, data: archived });
    }

    const updated = await nutritionProgramService.updateNutritionAssignment(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[PATCH /api/nutrition/assignments/[id]] Error:", err);
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
    const existing = await nutritionProgramService.getNutritionAssignmentById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Nutrition assignment not found" }, { status: 404 });
    }

    const access = await requireClientAccess(auth.actor, existing.clientId);
    if (!access.ok) return access.response;

    await nutritionProgramService.deleteNutritionAssignment(id);
    return NextResponse.json({ success: true, message: "Nutrition assignment deleted successfully" });
  } catch (err: any) {
    console.error("[DELETE /api/nutrition/assignments/[id]] Error:", err);
    const status = err instanceof NutritionProgramServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

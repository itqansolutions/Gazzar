import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { healthService } from "@/server/services/health.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const existing = await prisma.clientAssessment.findUnique({ where: { id }, select: { clientId: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Assessment not found" }, { status: 404 });
    }
    const access = await requireClientAccess(auth.actor, existing.clientId);
    if (!access.ok) return access.response;

    const body = await req.json();
    const updated = await healthService.updateAssessment(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/assessments/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const existing = await prisma.clientAssessment.findUnique({ where: { id }, select: { clientId: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Assessment not found" }, { status: 404 });
    }
    const access = await requireClientAccess(auth.actor, existing.clientId);
    if (!access.ok) return access.response;

    await healthService.deleteAssessment(id);
    return NextResponse.json({ success: true, message: "Assessment deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/assessments/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

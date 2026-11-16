import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { programService, ProgramServiceError } from "@/server/services/program.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const program = await programService.getProgramById(id);
    if (!program) {
      return NextResponse.json({ success: false, error: "Training program not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: program });
  } catch (error: any) {
    console.error("[GET /api/programs/[id]] Error:", error);
    const status = error instanceof ProgramServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
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
    const updated = await programService.updateProgram(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/programs/[id]] Error:", error);
    const status = error instanceof ProgramServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
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

    if (auth.actor.user.role === UserRole.COACH) {
      const existing = await prisma.trainingProgram.findUnique({
        where: { id },
        select: { creatorId: true, creator: { select: { userId: true } } }
      });
      if (!existing) {
        return NextResponse.json({ success: false, error: "Training program not found" }, { status: 404 });
      }
      const isOwner =
        existing.creatorId === auth.actor.coachProfileId ||
        existing.creator?.userId === auth.actor.user.id;
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You may only delete training programs you created" },
          { status: 403 }
        );
      }
    }

    await programService.deleteProgram(id);
    return NextResponse.json({ success: true, message: "Program deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/programs/[id]] Error:", error);
    const status = error instanceof ProgramServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

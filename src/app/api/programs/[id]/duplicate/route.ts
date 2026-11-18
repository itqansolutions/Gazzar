import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { programService, ProgramServiceError } from "@/server/services/program.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const duplicate = await programService.duplicateProgram(id, auth.actor);
    return NextResponse.json({ success: true, data: duplicate }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/programs/[id]/duplicate] Error:", error);
    const status = error instanceof ProgramServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

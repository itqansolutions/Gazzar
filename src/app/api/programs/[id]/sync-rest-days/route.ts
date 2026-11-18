import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
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
    const { searchParams } = new URL(req.url);
    const programAssignmentId = searchParams.get("programAssignmentId");

    if (!programAssignmentId) {
      return NextResponse.json(
        { success: false, error: "programAssignmentId query parameter is required" },
        { status: 400 }
      );
    }

    const preview = await programService.previewRestDaySync(id, programAssignmentId);
    return NextResponse.json({ success: true, data: preview });
  } catch (error: any) {
    console.error("[GET /api/programs/[id]/sync-rest-days] Error:", error);
    const status = error instanceof ProgramServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const body = await req.json();
    const programAssignmentId = body?.programAssignmentId;

    if (!programAssignmentId) {
      return NextResponse.json(
        { success: false, error: "programAssignmentId is required in request body" },
        { status: 400 }
      );
    }

    const result = await programService.applyRestDaySync(id, programAssignmentId, auth.actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[POST /api/programs/[id]/sync-rest-days] Error:", error);
    const status = error instanceof ProgramServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

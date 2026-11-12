import { NextRequest, NextResponse } from "next/server";
import { Difficulty, UserRole } from "@prisma/client";
import {
  programService,
  ProgramLifecycleStatus,
  ProgramServiceError
} from "@/server/services/program.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as ProgramLifecycleStatus | null;
    const sportId = searchParams.get("sportId") || undefined;
    const difficultyParam = searchParams.get("difficulty") as Difficulty | null;
    const search = searchParams.get("search") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const programs = await programService.getPrograms({
      ...(statusParam && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(statusParam)
        ? { status: statusParam }
        : {}),
      sportId,
      ...(difficultyParam && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficultyParam)
        ? { difficulty: difficultyParam }
        : {}),
      search,
      activeOnly
    });

    return NextResponse.json({ success: true, data: programs });
  } catch (error: any) {
    console.error("[GET /api/programs] Error:", error);
    const status = error instanceof ProgramServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();

    if (body.action === "PREVIEW_APPLY") {
      if (!body.programId || !body.clientId) {
        return NextResponse.json(
          { success: false, error: "programId and clientId are required" },
          { status: 400 }
        );
      }

      const access = await requireClientAccess(auth.actor, body.clientId);
      if (!access.ok) return access.response;

      const preview = await programService.previewProgramApplication(
        body.programId,
        access.client.id,
        body.startDate
      );

      return NextResponse.json({
        success: true,
        data: {
          programId: preview.program.id,
          programTitle: preview.program.titleEn || preview.program.titleAr,
          startDate: preview.startDate,
          endDate: preview.endDate,
          restDaysCount: preview.restDaysCount,
          restDays: preview.restDays,
          trainingSessionsCount: preview.trainingSessionsCount,
          plannedWorkouts: preview.plannedWorkouts.map((pw) => ({
            weekNumber: pw.weekNumber,
            dayNumber: pw.dayNumber,
            dayTitle: pw.dayTitle,
            templateId: pw.templateId,
            templateTitle: pw.templateTitle,
            orderIndex: pw.orderIndex,
            date: pw.dateKey
          })),
          nutritionProgram: preview.program.nutritionProgram,
          duplicateProgramAssignments: preview.duplicateProgramAssignments,
          dateConflicts: preview.dateConflicts,
          hasConflicts: preview.hasConflicts
        }
      });
    }

    if (body.action === "APPLY") {
      if (!body.programId || !body.clientId) {
        return NextResponse.json(
          { success: false, error: "programId and clientId are required" },
          { status: 400 }
        );
      }

      const access = await requireClientAccess(auth.actor, body.clientId);
      if (!access.ok) return access.response;

      const result = await programService.applyProgramToClient(
        body.programId,
        access.client.id,
        body.coachId || auth.actor.coachProfileId || undefined,
        body.startDate,
        {
          conflictStrategy: body.conflictStrategy,
          notes: body.notes,
          includeNutrition: body.includeNutrition,
          nutritionOverride: body.nutritionOverride
        }
      );

      return NextResponse.json(
        {
          success: true,
          data: result.workoutAssignments,
          programAssignment: result.programAssignment,
          nutritionAssignment: result.nutritionAssignment,
          restDaysSkipped: result.restDaysSkipped,
          skippedConflicts: result.skippedConflicts
        },
        { status: 201 }
      );
    }

    const program = await programService.createProgram({
      ...body,
      creatorId: body.creatorId || auth.actor.coachProfileId || undefined
    });
    return NextResponse.json({ success: true, data: program }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/programs] Error:", error);
    const status = error instanceof ProgramServiceError ? error.statusCode : 400;
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        ...(error instanceof ProgramServiceError && error.details ? { details: error.details } : {})
      },
      { status }
    );
  }
}

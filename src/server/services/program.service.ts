import prisma from "@/lib/prisma";
import {
  AssignmentSourceType,
  AssignmentStatus,
  Difficulty,
  GoalType,
  NutritionAssignmentMode,
  Prisma
} from "@prisma/client";
import { buildAssignmentSnapshotData, toOptionalFloat, toOptionalInt, toOptionalText } from "./assignment-snapshot";
import { addCalendarDays, parseCalendarDate, toCalendarDateKey } from "@/lib/date-utils";

export type ProgramLifecycleStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type ConflictStrategy = "BLOCK" | "SKIP_CONFLICTS";

export class ProgramServiceError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "ProgramServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface ProgramDayInput {
  dayNumber?: number;
  dayName?: string;
  titleAr?: string;
  titleEn?: string;
  isRestDay?: boolean;
  templateId?: string | null;
  workouts?: Array<{
    templateId: string;
    orderIndex?: number;
  }>;
}

export interface ProgramWeekInput {
  weekNumber?: number;
  focusNotes?: string | null;
  focusAr?: string | null;
  focusEn?: string | null;
  days?: ProgramDayInput[];
}

export interface NutritionOverrideInput {
  title?: string;
  description?: string | null;
  dailyCalories?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatsGrams?: number | null;
  waterLiters?: number | null;
  breakfast?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  snacks?: string | null;
  notes?: string | null;
  mealsJson?: Prisma.InputJsonValue | null;
}

export function deriveProgramStatus(program: { isActive: boolean; isTemplate: boolean }): ProgramLifecycleStatus {
  if (!program.isActive) return "ARCHIVED";
  return program.isTemplate ? "ACTIVE" : "DRAFT";
}

function resolveStatusFlags(
  status?: ProgramLifecycleStatus,
  isActive?: boolean,
  isTemplate?: boolean,
  fallback: { isActive: boolean; isTemplate: boolean } = { isActive: true, isTemplate: true }
): { isActive: boolean; isTemplate: boolean } {
  if (status === "ARCHIVED") return { isActive: false, isTemplate: false };
  if (status === "DRAFT") return { isActive: true, isTemplate: false };
  if (status === "ACTIVE") return { isActive: true, isTemplate: true };

  return {
    isActive: isActive !== undefined ? Boolean(isActive) : fallback.isActive,
    isTemplate: isTemplate !== undefined ? Boolean(isTemplate) : fallback.isTemplate
  };
}

function parseUTCDateOnly(input?: string | Date): Date {
  try {
    return parseCalendarDate(input);
  } catch (err: any) {
    throw new ProgramServiceError(err?.message || "Invalid startDate format", 400);
  }
}

function addDaysUTC(base: Date, days: number): Date {
  return addCalendarDays(base, days);
}

function toISODateKey(date: Date): string {
  return toCalendarDateKey(date);
}

const programInclude = {
  sport: true,
  nutritionProgram: true,
  creator: {
    include: {
      user: { select: { id: true, name: true, avatar: true } }
    }
  },
  _count: {
    select: {
      weeks: true,
      assignments: true,
      programAssignments: true
    }
  },
  weeks: {
    include: {
      days: {
        include: {
          workouts: {
            include: {
              template: {
                include: {
                  sport: true,
                  exercises: {
                    include: {
                      exercise: {
                        include: {
                          sport: true,
                          exerciseSports: { include: { sport: true } }
                        }
                      }
                    },
                    orderBy: { orderIndex: "asc" as const }
                  }
                }
              }
            },
            orderBy: { orderIndex: "asc" as const }
          }
        },
        orderBy: { dayNumber: "asc" as const }
      }
    },
    orderBy: { weekNumber: "asc" as const }
  }
};

type NormalizedWeek = {
  weekNumber: number;
  focusEn: string | null;
  focusAr: string | null;
  days: Array<{
    dayNumber: number;
    titleEn: string;
    titleAr: string;
    isRestDay: boolean;
    workouts: Array<{ templateId: string; orderIndex: number }>;
  }>;
};

async function normalizeAndValidateWeeks(
  tx: Prisma.TransactionClient,
  weeksInput?: ProgramWeekInput[]
): Promise<NormalizedWeek[]> {
  if (!weeksInput || weeksInput.length === 0) return [];

  const allTemplateIds = new Set<string>();
  const normalized: NormalizedWeek[] = weeksInput.map((w, wIdx) => {
    const focus = toOptionalText(w.focusEn ?? w.focusAr ?? w.focusNotes);
    const days = (w.days || []).map((d, dIdx) => {
      const isRestDay = Boolean(d.isRestDay);
      const rawTitle =
        toOptionalText(d.titleEn ?? d.titleAr ?? d.dayName) ||
        (isRestDay ? "Rest & Recovery" : `Day ${dIdx + 1}`);

      const workouts: Array<{ templateId: string; orderIndex: number }> = [];
      if (!isRestDay) {
        if (Array.isArray(d.workouts) && d.workouts.length > 0) {
          d.workouts.forEach((pw, idx) => {
            if (pw.templateId && pw.templateId.trim()) {
              allTemplateIds.add(pw.templateId.trim());
              workouts.push({ templateId: pw.templateId.trim(), orderIndex: idx });
            }
          });
        } else if (d.templateId && d.templateId.trim()) {
          allTemplateIds.add(d.templateId.trim());
          workouts.push({ templateId: d.templateId.trim(), orderIndex: 0 });
        }
      }

      return {
        dayNumber: dIdx + 1,
        titleEn: rawTitle,
        titleAr: toOptionalText(d.titleAr) || rawTitle,
        isRestDay,
        workouts
      };
    });

    return {
      weekNumber: wIdx + 1,
      focusEn: focus,
      focusAr: toOptionalText(w.focusAr) || focus,
      days
    };
  });

  if (allTemplateIds.size > 0) {
    const existingTemplates = await tx.workoutTemplate.findMany({
      where: { id: { in: Array.from(allTemplateIds) } },
      select: { id: true }
    });
    const foundSet = new Set(existingTemplates.map((t) => t.id));
    for (const tid of Array.from(allTemplateIds)) {
      if (!foundSet.has(tid)) {
        throw new ProgramServiceError(`Referenced workout template "${tid}" does not exist`, 400);
      }
    }
  }

  return normalized;
}

async function persistWeeksTree(
  tx: Prisma.TransactionClient,
  programId: string,
  weeks: NormalizedWeek[]
) {
  for (const w of weeks) {
    const createdWeek = await tx.programWeek.create({
      data: {
        programId,
        weekNumber: w.weekNumber,
        focusEn: w.focusEn,
        focusAr: w.focusAr
      }
    });

    for (const d of w.days) {
      const createdDay = await tx.programDay.create({
        data: {
          weekId: createdWeek.id,
          dayNumber: d.dayNumber,
          titleEn: d.titleEn,
          titleAr: d.titleAr,
          isRestDay: d.isRestDay
        }
      });

      if (!d.isRestDay && d.workouts.length > 0) {
        await tx.programWorkout.createMany({
          data: d.workouts.map((pw) => ({
            dayId: createdDay.id,
            templateId: pw.templateId,
            orderIndex: pw.orderIndex
          }))
        });
      }
    }
  }
}

function decorateProgram<T extends { isActive: boolean; isTemplate: boolean }>(program: T) {
  return {
    ...program,
    status: deriveProgramStatus(program)
  };
}

export class ProgramService {
  /**
   * Get all training programs with sports, optional nutrition program, weeks, days, and status.
   */
  async getPrograms(filter?: {
    status?: ProgramLifecycleStatus;
    sportId?: string;
    difficulty?: Difficulty;
    search?: string;
    activeOnly?: boolean;
  }) {
    const where: Prisma.TrainingProgramWhereInput = {};

    if (filter?.status === "ARCHIVED") {
      where.isActive = false;
    } else if (filter?.status === "DRAFT") {
      where.isActive = true;
      where.isTemplate = false;
    } else if (filter?.status === "ACTIVE" || filter?.activeOnly) {
      where.isActive = true;
      where.isTemplate = true;
    }

    if (filter?.sportId) {
      where.sportId = filter.sportId;
    }
    if (filter?.difficulty) {
      where.difficulty = filter.difficulty;
    }
    if (filter?.search?.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { titleEn: { contains: q, mode: "insensitive" } },
        { titleAr: { contains: q, mode: "insensitive" } },
        { descriptionEn: { contains: q, mode: "insensitive" } },
        { descriptionAr: { contains: q, mode: "insensitive" } }
      ];
    }

    const programs = await prisma.trainingProgram.findMany({
      where,
      include: programInclude,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
    });

    return programs.map(decorateProgram);
  }

  /**
   * Get single program by ID with structured weeks, days, workout templates, and nutrition plan.
   */
  async getProgramById(id: string) {
    const program = await prisma.trainingProgram.findUnique({
      where: { id },
      include: programInclude
    });
    return program ? decorateProgram(program) : null;
  }

  /**
   * Create training program with structured weeks, days, optional multi-template workouts,
   * lifecycle status (DRAFT | ACTIVE | ARCHIVED), and optional nutrition linkage.
   */
  async createProgram(data: {
    titleAr?: string;
    titleEn?: string;
    descriptionAr?: string | null;
    descriptionEn?: string | null;
    durationWeeks?: number;
    sportId?: string;
    goalType?: GoalType;
    difficulty?: Difficulty;
    creatorId?: string;
    nutritionProgramId?: string | null;
    status?: ProgramLifecycleStatus;
    isActive?: boolean;
    isTemplate?: boolean;
    weeks?: ProgramWeekInput[];
  }) {
    const titleEn = toOptionalText(data.titleEn) || toOptionalText(data.titleAr);
    const titleAr = toOptionalText(data.titleAr) || titleEn;
    if (!titleEn || !titleAr) {
      throw new ProgramServiceError("Program title is required", 400);
    }

    let sportId = data.sportId;
    if (sportId) {
      const sportExists = await prisma.sport.findUnique({ where: { id: sportId }, select: { id: true } });
      if (!sportExists) {
        throw new ProgramServiceError("Selected sport does not exist", 400);
      }
    } else {
      const firstSport = await prisma.sport.findFirst({ where: { isActive: true }, select: { id: true } });
      if (!firstSport) throw new ProgramServiceError("No active sport found to associate with program", 400);
      sportId = firstSport.id;
    }

    const nutritionProgramId = toOptionalText(data.nutritionProgramId);
    if (nutritionProgramId) {
      const nutritionExists = await prisma.nutritionProgram.findUnique({
        where: { id: nutritionProgramId },
        select: { id: true }
      });
      if (!nutritionExists) {
        throw new ProgramServiceError("Selected nutrition program does not exist", 400);
      }
    }

    let creatorId = data.creatorId || null;
    if (creatorId) {
      const coach = await prisma.coachProfile.findUnique({ where: { id: creatorId }, select: { id: true } });
      if (!coach) creatorId = null;
    }

    const statusFlags = resolveStatusFlags(data.status, data.isActive, data.isTemplate, {
      isActive: true,
      isTemplate: true
    });

    const descEn = toOptionalText(data.descriptionEn) ?? toOptionalText(data.descriptionAr);
    const descAr = toOptionalText(data.descriptionAr) ?? descEn;

    const createdId = await prisma.$transaction(
      async (tx) => {
        const normalizedWeeks = await normalizeAndValidateWeeks(tx, data.weeks);
        const durationWeeks =
          normalizedWeeks.length > 0 ? normalizedWeeks.length : Math.max(1, Number(data.durationWeeks) || 4);

        const program = await tx.trainingProgram.create({
          data: {
            titleAr,
            titleEn,
            descriptionAr: descAr,
            descriptionEn: descEn,
            durationWeeks,
            sportId: sportId!,
            goalType: data.goalType || GoalType.GENERAL_FITNESS,
            difficulty: data.difficulty || Difficulty.BEGINNER,
            creatorId,
            nutritionProgramId: nutritionProgramId || null,
            isActive: statusFlags.isActive,
            isTemplate: statusFlags.isTemplate
          }
        });

        if (normalizedWeeks.length > 0) {
          await persistWeeksTree(tx, program.id, normalizedWeeks);
        }

        return program.id;
      },
      { maxWait: 10000, timeout: 30000 }
    );

    const created = await prisma.trainingProgram.findUniqueOrThrow({
      where: { id: createdId },
      include: programInclude
    });

    return decorateProgram(created);
  }

  /**
   * Update training program metadata, status, optional nutrition linkage, and full weekly schedule.
   */
  async updateProgram(
    id: string,
    data: {
      titleAr?: string;
      titleEn?: string;
      descriptionAr?: string | null;
      descriptionEn?: string | null;
      durationWeeks?: number;
      sportId?: string;
      goalType?: GoalType;
      difficulty?: Difficulty;
      nutritionProgramId?: string | null;
      status?: ProgramLifecycleStatus;
      isActive?: boolean;
      isTemplate?: boolean;
      weeks?: ProgramWeekInput[];
    }
  ) {
    const existing = await prisma.trainingProgram.findUnique({
      where: { id },
      select: { id: true, isActive: true, isTemplate: true, titleEn: true, titleAr: true }
    });
    if (!existing) {
      throw new ProgramServiceError("Training program not found", 404);
    }

    if (data.sportId !== undefined) {
      const sportExists = await prisma.sport.findUnique({ where: { id: data.sportId }, select: { id: true } });
      if (!sportExists) {
        throw new ProgramServiceError("Selected sport does not exist", 400);
      }
    }

    let resolvedNutritionId: string | null | undefined = undefined;
    if (data.nutritionProgramId !== undefined) {
      const trimmed = toOptionalText(data.nutritionProgramId);
      if (trimmed) {
        const nutritionExists = await prisma.nutritionProgram.findUnique({
          where: { id: trimmed },
          select: { id: true }
        });
        if (!nutritionExists) {
          throw new ProgramServiceError("Selected nutrition program does not exist", 400);
        }
        resolvedNutritionId = trimmed;
      } else {
        resolvedNutritionId = null;
      }
    }

    const nextTitleEn =
      data.titleEn !== undefined
        ? toOptionalText(data.titleEn) || toOptionalText(data.titleAr)
        : data.titleAr !== undefined
          ? toOptionalText(data.titleAr)
          : undefined;
    if (nextTitleEn === null) {
      throw new ProgramServiceError("Program title cannot be empty", 400);
    }

    const statusFlags =
      data.status !== undefined || data.isActive !== undefined || data.isTemplate !== undefined
        ? resolveStatusFlags(data.status, data.isActive, data.isTemplate, {
            isActive: existing.isActive,
            isTemplate: existing.isTemplate
          })
        : undefined;

    await prisma.$transaction(
      async (tx) => {
        const hasWeeks = Array.isArray(data.weeks);
        const normalizedWeeks = hasWeeks ? await normalizeAndValidateWeeks(tx, data.weeks) : [];

        const updateData: Prisma.TrainingProgramUncheckedUpdateInput = {
          ...(nextTitleEn && { titleEn: nextTitleEn }),
          ...(data.titleAr !== undefined && {
            titleAr: toOptionalText(data.titleAr) || nextTitleEn || existing.titleAr
          }),
          ...(data.descriptionEn !== undefined && { descriptionEn: toOptionalText(data.descriptionEn) }),
          ...(data.descriptionAr !== undefined && {
            descriptionAr: toOptionalText(data.descriptionAr)
          }),
          ...(data.descriptionEn === undefined &&
            data.descriptionAr !== undefined && { descriptionEn: toOptionalText(data.descriptionAr) }),
          ...(data.descriptionAr === undefined &&
            data.descriptionEn !== undefined && { descriptionAr: toOptionalText(data.descriptionEn) }),
          ...(data.sportId !== undefined && { sportId: data.sportId }),
          ...(data.goalType !== undefined && { goalType: data.goalType }),
          ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
          ...(resolvedNutritionId !== undefined && { nutritionProgramId: resolvedNutritionId }),
          ...(statusFlags && { isActive: statusFlags.isActive, isTemplate: statusFlags.isTemplate }),
          ...(hasWeeks
            ? { durationWeeks: Math.max(1, normalizedWeeks.length || Number(data.durationWeeks) || 1) }
            : data.durationWeeks !== undefined
              ? { durationWeeks: Math.max(1, Number(data.durationWeeks) || 1) }
              : {})
        };

        await tx.trainingProgram.update({
          where: { id },
          data: updateData
        });

        if (hasWeeks) {
          await tx.programWeek.deleteMany({ where: { programId: id } });
          if (normalizedWeeks.length > 0) {
            await persistWeeksTree(tx, id, normalizedWeeks);
          }
        }
      },
      { maxWait: 10000, timeout: 30000 }
    );

    const updated = await prisma.trainingProgram.findUniqueOrThrow({
      where: { id },
      include: programInclude
    });

    return decorateProgram(updated);
  }

  /**
   * Safe delete program: prevents silent corruption by returning 409 Conflict if linked to client assignments.
   */
  async deleteProgram(id: string) {
    const existing = await prisma.trainingProgram.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: true,
            programAssignments: true
          }
        }
      }
    });
    if (!existing) {
      throw new ProgramServiceError("Training program not found", 404);
    }

    const totalRefs = existing._count.assignments + existing._count.programAssignments;
    if (totalRefs > 0) {
      throw new ProgramServiceError(
        `Cannot delete "${existing.titleEn || existing.titleAr}" because it is linked to ${existing._count.programAssignments} program assignment(s) and ${existing._count.assignments} scheduled workout(s). Archive it instead to preserve athlete history.`,
        409
      );
    }

    return await prisma.trainingProgram.delete({
      where: { id }
    });
  }

  /**
   * Compute full calendar schedule preview and detect duplicate ProgramAssignments or
   * ClientWorkoutAssignment date collisions prior to persisting anything.
   */
  async previewProgramApplication(
    programId: string,
    clientId: string,
    startDate?: string | Date
  ) {
    const program = await prisma.trainingProgram.findUnique({
      where: { id: programId },
      include: {
        nutritionProgram: true,
        weeks: {
          orderBy: { weekNumber: "asc" },
          include: {
            days: {
              orderBy: { dayNumber: "asc" },
              include: {
                workouts: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    template: {
                      include: {
                        exercises: {
                          include: { exercise: true },
                          orderBy: { orderIndex: "asc" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!program) {
      throw new ProgramServiceError("Training program not found", 404);
    }

    const status = deriveProgramStatus(program);
    if (status === "ARCHIVED") {
      throw new ProgramServiceError("Cannot apply an archived training program. Activate it first.", 409);
    }
    if (status === "DRAFT") {
      throw new ProgramServiceError("Cannot apply a draft training program. Set its status to Active first.", 400);
    }

    const client = await prisma.clientProfile.findUnique({
      where: { id: clientId },
      select: { id: true, user: { select: { name: true } } }
    });
    if (!client) {
      throw new ProgramServiceError("Client profile not found", 404);
    }

    const baseDate = parseUTCDateOnly(startDate);
    let maxDayOffset = 0;
    let restDaysCount = 0;

    type PlannedWorkout = {
      weekNumber: number;
      dayNumber: number;
      dayTitle: string;
      templateId: string;
      templateTitle: string;
      templateDescription: string | null;
      orderIndex: number;
      scheduledDate: Date;
      dateKey: string;
      exercises: typeof program.weeks[number]["days"][number]["workouts"][number]["template"]["exercises"];
    };

    const plannedWorkouts: PlannedWorkout[] = [];
    const restDays: Array<{ weekNumber: number; dayNumber: number; dayTitle: string; dateKey: string }> = [];

    for (const week of program.weeks) {
      for (const day of week.days) {
        const dayOffset = (week.weekNumber - 1) * 7 + (day.dayNumber - 1);
        if (dayOffset > maxDayOffset) maxDayOffset = dayOffset;
        const dayDate = addDaysUTC(baseDate, dayOffset);
        const dateKey = toISODateKey(dayDate);

        if (day.isRestDay) {
          restDaysCount += 1;
          restDays.push({
            weekNumber: week.weekNumber,
            dayNumber: day.dayNumber,
            dayTitle: day.titleEn || day.titleAr,
            dateKey
          });
          continue;
        }

        if (day.workouts.length === 0) {
          continue;
        }

        for (const pw of day.workouts) {
          plannedWorkouts.push({
            weekNumber: week.weekNumber,
            dayNumber: day.dayNumber,
            dayTitle: day.titleEn || day.titleAr,
            templateId: pw.templateId,
            templateTitle: pw.template?.titleEn || pw.template?.titleAr || day.titleEn || "Workout Session",
            templateDescription: pw.template?.descriptionEn || pw.template?.descriptionAr || null,
            orderIndex: pw.orderIndex,
            scheduledDate: dayDate,
            dateKey,
            exercises: pw.template?.exercises || []
          });
        }
      }
    }

    const computedEndOffset = Math.max(maxDayOffset, Math.max(0, program.durationWeeks * 7 - 1));
    const endDate = addDaysUTC(baseDate, computedEndOffset);

    // 1. Check duplicate/overlapping active ProgramAssignment for same client + same program
    const existingProgramAssignments = await prisma.programAssignment.findMany({
      where: {
        clientId,
        programId,
        isActive: true
      },
      select: {
        id: true,
        startDate: true,
        endDate: true
      }
    });

    const overlappingProgramAssignments = existingProgramAssignments.filter((pa) => {
      const paStart = parseUTCDateOnly(pa.startDate).getTime();
      const paEnd = pa.endDate ? parseUTCDateOnly(pa.endDate).getTime() : paStart + computedEndOffset * 86400000;
      return baseDate.getTime() <= paEnd && endDate.getTime() >= paStart;
    });

    // 2. Check existing workout assignments on target dates (do not treat SKIPPED workouts as conflicts)
    const minDate = baseDate;
    const maxDatePlusOne = addDaysUTC(endDate, 1);
    const existingWorkouts = plannedWorkouts.length
      ? await prisma.clientWorkoutAssignment.findMany({
          where: {
            clientId,
            status: { not: AssignmentStatus.SKIPPED },
            scheduledDate: {
              gte: minDate,
              lt: maxDatePlusOne
            }
          },
          select: {
            id: true,
            title: true,
            scheduledDate: true,
            programId: true,
            programAssignmentId: true,
            templateId: true,
            status: true,
            template: { select: { titleEn: true, titleAr: true } }
          }
        })
      : [];

    const existingByDateKey = new Map<string, typeof existingWorkouts>();
    for (const ew of existingWorkouts) {
      const key = toISODateKey(ew.scheduledDate);
      const list = existingByDateKey.get(key) || [];
      list.push(ew);
      existingByDateKey.set(key, list);
    }

    const dateConflicts = plannedWorkouts
      .filter((pw) => existingByDateKey.has(pw.dateKey))
      .map((pw) => {
        const colliding = existingByDateKey.get(pw.dateKey)!;
        return {
          date: pw.dateKey,
          weekNumber: pw.weekNumber,
          dayNumber: pw.dayNumber,
          dayTitle: pw.dayTitle,
          incomingTemplateTitle: pw.templateTitle,
          existingAssignments: colliding.map((c) => ({
            id: c.id,
            title: c.title || c.template?.titleEn || c.template?.titleAr || "Scheduled Workout",
            status: c.status,
            sameProgram: c.programId === program.id
          }))
        };
      });

    return {
      program,
      client,
      startDate: toISODateKey(baseDate),
      endDate: toISODateKey(endDate),
      startDateObj: baseDate,
      endDateObj: endDate,
      restDaysCount,
      restDays,
      trainingSessionsCount: plannedWorkouts.length,
      plannedWorkouts,
      duplicateProgramAssignments: overlappingProgramAssignments.map((pa) => ({
        id: pa.id,
        startDate: toISODateKey(pa.startDate),
        endDate: pa.endDate ? toISODateKey(pa.endDate) : null
      })),
      dateConflicts,
      hasConflicts: overlappingProgramAssignments.length > 0 || dateConflicts.length > 0
    };
  }

  /**
   * Apply structured program to client:
   * - Validates lifecycle state & client/coach resolution
   * - Detects duplicate ProgramAssignments & date conflicts without silently overwriting
   * - Creates ProgramAssignment + traceable ClientWorkoutAssignment records with frozen exercise snapshots
   * - Skips rest days (no fake workout assignments created)
   * - Optionally attaches linked NutritionProgram (or client-specific CUSTOM_OVERRIDE) via ClientNutritionAssignment
   */
  async applyProgramToClient(
    programId: string,
    clientId: string,
    coachId?: string,
    startDate?: string | Date,
    options?: {
      conflictStrategy?: ConflictStrategy;
      notes?: string;
      includeNutrition?: boolean;
      nutritionOverride?: NutritionOverrideInput | null;
    }
  ) {
    let resolvedCoachId = coachId;
    if (resolvedCoachId) {
      const foundCoach = await prisma.coachProfile.findFirst({
        where: { OR: [{ id: resolvedCoachId }, { userId: resolvedCoachId }] },
        select: { id: true }
      });
      resolvedCoachId = foundCoach?.id;
    }
    if (!resolvedCoachId) {
      const defaultCoach = await prisma.coachProfile.findFirst({ select: { id: true } });
      if (!defaultCoach) throw new ProgramServiceError("No coach profile found to assign program", 400);
      resolvedCoachId = defaultCoach.id;
    }

    const preview = await this.previewProgramApplication(programId, clientId, startDate);
    const strategy: ConflictStrategy = options?.conflictStrategy || "BLOCK";

    if (strategy === "BLOCK" && preview.hasConflicts) {
      const conflictSummaryParts: string[] = [];
      if (preview.duplicateProgramAssignments.length > 0) {
        conflictSummaryParts.push(
          `athlete already has an active assignment for "${preview.program.titleEn}" overlapping ${preview.startDate}..${preview.endDate}`
        );
      }
      if (preview.dateConflicts.length > 0) {
        const sampleDates = preview.dateConflicts
          .slice(0, 3)
          .map((c) => c.date)
          .join(", ");
        conflictSummaryParts.push(
          `${preview.dateConflicts.length} workout date conflict(s) (${sampleDates}${preview.dateConflicts.length > 3 ? ", ..." : ""})`
        );
      }

      throw new ProgramServiceError(
        `Cannot apply program because ${conflictSummaryParts.join(" and ")}. Adjust the start date or resolve conflicting assignments instead of overwriting existing schedules.`,
        409,
        {
          duplicateProgramAssignments: preview.duplicateProgramAssignments,
          dateConflicts: preview.dateConflicts
        }
      );
    }

    if (
      strategy === "SKIP_CONFLICTS" &&
      preview.duplicateProgramAssignments.length > 0 &&
      preview.dateConflicts.length >= preview.plannedWorkouts.length
    ) {
      throw new ProgramServiceError(
        `All ${preview.plannedWorkouts.length} workout dates already exist for this overlapping program assignment. Pick a new start date instead.`,
        409,
        {
          duplicateProgramAssignments: preview.duplicateProgramAssignments,
          dateConflicts: preview.dateConflicts
        }
      );
    }

    const conflictingDateSet = new Set(preview.dateConflicts.map((c) => c.date));
    const workoutsToCreate =
      strategy === "SKIP_CONFLICTS"
        ? preview.plannedWorkouts.filter((pw) => !conflictingDateSet.has(pw.dateKey))
        : preview.plannedWorkouts;

    const txResult = await prisma.$transaction(
      async (tx) => {
        const programAssignment = await tx.programAssignment.create({
          data: {
            clientId,
            programId: preview.program.id,
            coachId: resolvedCoachId!,
            startDate: preview.startDateObj,
            endDate: preview.endDateObj,
            isActive: true,
            notes: toOptionalText(options?.notes)
          }
        });

        const createdIds: string[] = [];

        for (const pw of workoutsToCreate) {
          const assignment = await tx.clientWorkoutAssignment.create({
            data: {
              clientId,
              coachId: resolvedCoachId!,
              sourceType: AssignmentSourceType.PROGRAM,
              title: pw.templateTitle,
              description: pw.templateDescription,
              programId: preview.program.id,
              programAssignmentId: programAssignment.id,
              templateId: pw.templateId,
              programWeekNumber: pw.weekNumber,
              programDayNumber: pw.dayNumber,
              programDayTitle: pw.dayTitle,
              scheduledDate: pw.scheduledDate,
              status: AssignmentStatus.SCHEDULED,
              coachNotes: `Week ${pw.weekNumber} Day ${pw.dayNumber}: ${pw.dayTitle} (${preview.program.titleEn})`
            }
          });

          if (pw.exercises.length > 0) {
            await tx.clientWorkoutAssignmentExercise.createMany({
              data: buildAssignmentSnapshotData(assignment.id, pw.exercises)
            });
          }

          createdIds.push(assignment.id);
        }

        let nutritionAssignment = null;
        const shouldAttachNutrition =
          options?.includeNutrition !== false &&
          (Boolean(preview.program.nutritionProgram) || Boolean(options?.nutritionOverride));

        if (shouldAttachNutrition && (preview.program.nutritionProgram || options?.nutritionOverride)) {
          const baseNutrition = preview.program.nutritionProgram;
          const override = options?.nutritionOverride;
          const hasOverride = Boolean(
            override && Object.values(override).some((val) => val !== undefined)
          );

          nutritionAssignment = await tx.clientNutritionAssignment.create({
            data: {
              clientId,
              coachId: resolvedCoachId!,
              nutritionProgramId: baseNutrition?.id || null,
              programAssignmentId: programAssignment.id,
              mode: hasOverride ? NutritionAssignmentMode.CUSTOM_OVERRIDE : NutritionAssignmentMode.INHERITED,
              title:
                toOptionalText(override?.title) ||
                baseNutrition?.title ||
                `${preview.program.titleEn} Nutrition`,
              description:
                override?.description !== undefined
                  ? toOptionalText(override.description)
                  : baseNutrition?.description ?? null,
              dailyCalories:
                override?.dailyCalories !== undefined
                  ? toOptionalInt(override.dailyCalories)
                  : baseNutrition?.dailyCalories ?? null,
              proteinGrams:
                override?.proteinGrams !== undefined
                  ? toOptionalInt(override.proteinGrams)
                  : baseNutrition?.proteinGrams ?? null,
              carbsGrams:
                override?.carbsGrams !== undefined
                  ? toOptionalInt(override.carbsGrams)
                  : baseNutrition?.carbsGrams ?? null,
              fatsGrams:
                override?.fatsGrams !== undefined
                  ? toOptionalInt(override.fatsGrams)
                  : baseNutrition?.fatsGrams ?? null,
              waterLiters:
                override?.waterLiters !== undefined
                  ? toOptionalFloat(override.waterLiters)
                  : baseNutrition?.waterLiters ?? null,
              breakfast:
                override?.breakfast !== undefined
                  ? toOptionalText(override.breakfast)
                  : baseNutrition?.breakfast ?? null,
              lunch:
                override?.lunch !== undefined
                  ? toOptionalText(override.lunch)
                  : baseNutrition?.lunch ?? null,
              dinner:
                override?.dinner !== undefined
                  ? toOptionalText(override.dinner)
                  : baseNutrition?.dinner ?? null,
              snacks:
                override?.snacks !== undefined
                  ? toOptionalText(override.snacks)
                  : baseNutrition?.snacks ?? null,
              notes:
                override?.notes !== undefined
                  ? toOptionalText(override.notes)
                  : baseNutrition?.notes ?? null,
              mealsJson:
                override?.mealsJson !== undefined
                  ? override.mealsJson === null
                    ? Prisma.JsonNull
                    : override.mealsJson
                  : baseNutrition?.mealsJson ?? Prisma.JsonNull,
              startDate: preview.startDateObj,
              endDate: preview.endDateObj,
              isActive: true
            }
          });
        }

        return {
          programAssignment,
          createdIds,
          nutritionAssignment
        };
      },
      { maxWait: 10000, timeout: 30000 }
    );

    const workoutAssignments = txResult.createdIds.length
      ? await prisma.clientWorkoutAssignment.findMany({
          where: { id: { in: txResult.createdIds } },
          include: {
            exercises: { orderBy: { orderIndex: "asc" } }
          },
          orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }]
        })
      : [];

    return {
      programAssignment: txResult.programAssignment,
      workoutAssignments,
      nutritionAssignment: txResult.nutritionAssignment,
      restDaysSkipped: preview.restDaysCount,
      skippedConflicts: strategy === "SKIP_CONFLICTS" ? preview.dateConflicts : []
    };
  }
}

export const programService = new ProgramService();

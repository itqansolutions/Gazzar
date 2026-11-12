import prisma from "@/lib/prisma";
import { AssignmentSourceType, AssignmentStatus, Difficulty, MetricType } from "@prisma/client";
import {
  TargetExerciseInput,
  buildAssignmentSnapshotData,
  normalizeTemplateExerciseData,
  toOptionalFloat,
  toOptionalInt,
  toOptionalText
} from "./assignment-snapshot";
import { getCalendarDayBounds, parseCalendarDate, toCalendarDateKey } from "@/lib/date-utils";

export type TemplateExerciseInput = TargetExerciseInput;
export type EffectiveAssignmentStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "MISSED";

export class WorkoutServiceError extends Error {
  statusCode: number;
  conflicts?: any[];
  constructor(message: string, statusCode = 400, conflicts?: any[]) {
    super(message);
    this.name = "WorkoutServiceError";
    this.statusCode = statusCode;
    this.conflicts = conflicts;
  }
}

export function deriveEffectiveStatus(assignment: {
  status: AssignmentStatus;
  workoutLog?: { isCompleted?: boolean | null } | null;
}): EffectiveAssignmentStatus {
  if (assignment.status === AssignmentStatus.COMPLETED) return "COMPLETED";
  if (assignment.status === AssignmentStatus.SKIPPED) return "SKIPPED";
  if (assignment.status === AssignmentStatus.MISSED) return "MISSED";
  if (assignment.workoutLog && assignment.workoutLog.isCompleted === false) {
    return "IN_PROGRESS";
  }
  return "SCHEDULED";
}

export interface CreateTemplateInput {
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  sportId: string;
  difficulty?: Difficulty;
  creatorId?: string;
  isActive?: boolean;
  exercises?: TemplateExerciseInput[];
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {}

export interface GetTemplatesFilter {
  sportId?: string;
  activeOnly?: boolean;
  search?: string;
}

export interface GetAssignmentsFilter {
  clientId?: string;
  allowedClientIds?: string[];
  coachId?: string;
  sourceType?: AssignmentSourceType | "ALL";
  status?: EffectiveAssignmentStatus | "ALL";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface AssignWorkoutInput {
  clientId: string;
  coachId?: string;
  templateId?: string;
  programId?: string;
  title?: string;
  description?: string;
  scheduledDate: string | Date;
  coachNotes?: string;
  exercises?: TemplateExerciseInput[];
  allowConflict?: boolean;
}

const templateInclude = {
  sport: true,
  creator: {
    include: {
      user: { select: { id: true, name: true, avatar: true } }
    }
  },
  _count: {
    select: {
      programWorkouts: true,
      assignments: true,
      exercises: true
    }
  },
  exercises: {
    include: {
      exercise: {
        include: {
          sport: true,
          exerciseSports: { include: { sport: true } },
          primaryMuscle: true,
          equipment: true
        }
      }
    },
    orderBy: { orderIndex: "asc" as const }
  }
};

const assignmentExercisesInclude = {
  include: {
    exercise: {
      include: {
        sport: true,
        exerciseSports: { include: { sport: true } },
        primaryMuscle: true,
        equipment: true
      }
    }
  },
  orderBy: { orderIndex: "asc" as const }
};

export class WorkoutService {
  /**
   * Fetch all workout templates with optional sport, active status, and search filters.
   */
  async getTemplates(sportIdOrFilter?: string | GetTemplatesFilter) {
    const filter: GetTemplatesFilter =
      typeof sportIdOrFilter === "string"
        ? { sportId: sportIdOrFilter }
        : sportIdOrFilter || {};

    const where: any = {};
    if (filter.sportId && filter.sportId !== "ALL") {
      where.sportId = filter.sportId;
    }
    if (filter.activeOnly) {
      where.isActive = true;
    }
    if (filter.search?.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { titleEn: { contains: q, mode: "insensitive" } },
        { titleAr: { contains: q, mode: "insensitive" } },
        { descriptionEn: { contains: q, mode: "insensitive" } }
      ];
    }

    return await prisma.workoutTemplate.findMany({
      where,
      include: templateInclude,
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Fetch single template by ID.
   */
  async getTemplateById(id: string) {
    return await prisma.workoutTemplate.findUnique({
      where: { id },
      include: templateInclude
    });
  }

  private async resolveExerciseMetricsMap(exercises?: TemplateExerciseInput[]): Promise<Map<string, MetricType>> {
    const map = new Map<string, MetricType>();
    if (!exercises || exercises.length === 0) return map;

    const uniqueIds = Array.from(new Set(exercises.map((e) => e.exerciseId).filter(Boolean)));
    if (uniqueIds.length === 0) {
      throw new WorkoutServiceError("Each exercise entry must include a valid exerciseId", 400);
    }

    const found = await prisma.exercise.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, metricType: true }
    });
    if (found.length !== uniqueIds.length) {
      throw new WorkoutServiceError("One or more selected exercises no longer exist", 400);
    }
    for (const ex of found) {
      map.set(ex.id, ex.metricType);
    }
    return map;
  }

  /**
   * Create template with nested exercises atomically.
   */
  async createTemplate(data: CreateTemplateInput) {
    const titleEn = (data.titleEn || data.titleAr || "").trim();
    const titleAr = (data.titleAr || titleEn).trim();
    if (!titleEn) {
      throw new WorkoutServiceError("Template title is required", 400);
    }
    if (!data.sportId) {
      throw new WorkoutServiceError("Sport discipline is required", 400);
    }

    const sport = await prisma.sport.findUnique({ where: { id: data.sportId }, select: { id: true } });
    if (!sport) {
      throw new WorkoutServiceError("Selected sport does not exist", 400);
    }

    const metricMap = await this.resolveExerciseMetricsMap(data.exercises);

    const templateId = await prisma.$transaction(
      async (tx) => {
        let creatorId = data.creatorId;
        if (!creatorId) {
          const firstCoach = await tx.coachProfile.findFirst({ select: { id: true } });
          creatorId = firstCoach?.id;
        }

        const template = await tx.workoutTemplate.create({
          data: {
            titleAr,
            titleEn,
            descriptionAr: toOptionalText(data.descriptionAr) ?? toOptionalText(data.descriptionEn),
            descriptionEn: toOptionalText(data.descriptionEn) ?? toOptionalText(data.descriptionAr),
            sportId: data.sportId,
            difficulty: data.difficulty || Difficulty.INTERMEDIATE,
            isActive: data.isActive ?? true,
            creatorId: creatorId || undefined
          }
        });

        if (data.exercises && data.exercises.length > 0) {
          await tx.workoutTemplateExercise.createMany({
            data: normalizeTemplateExerciseData(template.id, data.exercises, metricMap)
          });
        }

        return template.id;
      },
      { maxWait: 10000, timeout: 30000 }
    );

    return await this.getTemplateById(templateId);
  }

  /**
   * Update template metadata, status, and ordered exercise list.
   * Existing ClientWorkoutAssignmentExercise snapshots remain completely immutable.
   */
  async updateTemplate(id: string, data: UpdateTemplateInput) {
    const existing = await prisma.workoutTemplate.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      throw new WorkoutServiceError("Template not found", 404);
    }

    if (data.sportId) {
      const sport = await prisma.sport.findUnique({ where: { id: data.sportId }, select: { id: true } });
      if (!sport) {
        throw new WorkoutServiceError("Selected sport does not exist", 400);
      }
    }

    const metricMap =
      data.exercises !== undefined ? await this.resolveExerciseMetricsMap(data.exercises) : undefined;

    await prisma.$transaction(
      async (tx) => {
        const updateData: any = {};
        if (data.titleEn !== undefined) {
          const cleanEn = data.titleEn.trim();
          if (!cleanEn) throw new WorkoutServiceError("Template title cannot be empty", 400);
          updateData.titleEn = cleanEn;
        }
        if (data.titleAr !== undefined) {
          updateData.titleAr = data.titleAr.trim() || updateData.titleEn;
        }
        if (data.descriptionEn !== undefined) {
          updateData.descriptionEn = toOptionalText(data.descriptionEn);
        }
        if (data.descriptionAr !== undefined) {
          updateData.descriptionAr = toOptionalText(data.descriptionAr);
          if (data.descriptionEn === undefined) {
            updateData.descriptionEn = toOptionalText(data.descriptionAr);
          }
        }
        if (data.sportId) updateData.sportId = data.sportId;
        if (data.difficulty) updateData.difficulty = data.difficulty;
        if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

        await tx.workoutTemplate.update({
          where: { id },
          data: updateData
        });

        if (data.exercises !== undefined) {
          await tx.workoutTemplateExercise.deleteMany({
            where: { templateId: id }
          });

          if (data.exercises.length > 0) {
            await tx.workoutTemplateExercise.createMany({
              data: normalizeTemplateExerciseData(id, data.exercises, metricMap)
            });
          }
        }
      },
      { maxWait: 10000, timeout: 30000 }
    );

    return await this.getTemplateById(id);
  }

  /**
   * Delete template safely; reject with 409 Conflict if linked to programs or assignments.
   */
  async deleteTemplate(id: string) {
    const existing = await prisma.workoutTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            programWorkouts: true,
            assignments: true
          }
        }
      }
    });
    if (!existing) {
      throw new WorkoutServiceError("Template not found", 404);
    }

    const blockers: string[] = [];
    if (existing._count.programWorkouts > 0) {
      blockers.push(`${existing._count.programWorkouts} program day(s)`);
    }
    if (existing._count.assignments > 0) {
      blockers.push(`${existing._count.assignments} client assignment(s)`);
    }
    if (blockers.length > 0) {
      throw new WorkoutServiceError(
        `Cannot delete "${existing.titleEn || existing.titleAr}" because it is referenced by ${blockers.join(", ")}. Archive it instead to preserve historical records.`,
        409
      );
    }

    await prisma.workoutTemplate.delete({ where: { id } });
    return true;
  }

  private hydrateAssignment<T extends { status: AssignmentStatus; workoutLog?: { isCompleted?: boolean | null } | null }>(
    assignment: T
  ): T & { effectiveStatus: EffectiveAssignmentStatus } {
    return {
      ...assignment,
      effectiveStatus: deriveEffectiveStatus(assignment)
    };
  }

  /**
   * Assign an individual workout, workout template, or program workout to an athlete
   * and freeze immutable exercise snapshots. Prevents duplicates and silent overwrites.
   */
  async assignWorkout(data: AssignWorkoutInput) {
    if (!data.clientId) {
      throw new WorkoutServiceError("clientId is required", 400);
    }

    const client = await prisma.clientProfile.findUnique({
      where: { id: data.clientId },
      select: { id: true }
    });
    if (!client) {
      throw new WorkoutServiceError("Selected athlete not found", 404);
    }

    let coachId = data.coachId;
    if (!coachId) {
      const coach = await prisma.coachProfile.findFirst({ select: { id: true } });
      if (!coach) throw new WorkoutServiceError("No coach found in database to assign workout", 400);
      coachId = coach.id;
    }

    let scheduledDate: Date;
    try {
      scheduledDate = parseCalendarDate(data.scheduledDate);
    } catch (err: any) {
      throw new WorkoutServiceError(err?.message || "Invalid scheduledDate", 400);
    }
    const dateKey = toCalendarDateKey(scheduledDate);
    const { start: dayStart, end: dayEnd } = getCalendarDayBounds(dateKey);

    const template = data.templateId
      ? await prisma.workoutTemplate.findUnique({
          where: { id: data.templateId },
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { orderIndex: "asc" }
            }
          }
        })
      : null;

    if (data.templateId && !template) {
      throw new WorkoutServiceError("Selected workout template not found", 404);
    }

    const sourceType: AssignmentSourceType = data.programId
      ? AssignmentSourceType.PROGRAM
      : data.templateId
      ? AssignmentSourceType.TEMPLATE
      : AssignmentSourceType.INDIVIDUAL;

    if (sourceType === AssignmentSourceType.INDIVIDUAL && (!data.exercises || data.exercises.length === 0)) {
      throw new WorkoutServiceError("At least one exercise is required for an individual workout", 400);
    }

    let individualMetaMap: Map<string, { id: string; nameEn: string; nameAr: string; metricType: MetricType }> | null =
      null;
    if (!template && data.exercises && data.exercises.length > 0) {
      const ids = Array.from(new Set(data.exercises.map((e) => e.exerciseId).filter(Boolean)));
      if (ids.length === 0) {
        throw new WorkoutServiceError("Each exercise entry must include a valid exerciseId", 400);
      }
      const metaRows = await prisma.exercise.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameEn: true, nameAr: true, metricType: true }
      });
      if (metaRows.length !== ids.length) {
        throw new WorkoutServiceError("One or more selected exercises no longer exist", 400);
      }
      individualMetaMap = new Map(metaRows.map((m) => [m.id, m]));
    }

    const resolvedTitle =
      toOptionalText(data.title) ||
      template?.titleEn ||
      template?.titleAr ||
      (sourceType === AssignmentSourceType.INDIVIDUAL ? "Individual Workout" : null);

    // Check existing non-skipped assignments on the same calendar date
    const existingOnDate = await prisma.clientWorkoutAssignment.findMany({
      where: {
        clientId: data.clientId,
        scheduledDate: { gte: dayStart, lte: dayEnd },
        status: { not: AssignmentStatus.SKIPPED }
      },
      select: {
        id: true,
        title: true,
        sourceType: true,
        templateId: true,
        status: true,
        scheduledDate: true
      }
    });

    const exactDuplicate = existingOnDate.find((ex) => {
      if (data.templateId && ex.templateId === data.templateId) return true;
      if (
        sourceType === AssignmentSourceType.INDIVIDUAL &&
        ex.sourceType === AssignmentSourceType.INDIVIDUAL &&
        resolvedTitle &&
        ex.title?.trim().toLowerCase() === resolvedTitle.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });

    if (exactDuplicate) {
      throw new WorkoutServiceError(
        `Duplicate assignment: "${exactDuplicate.title || "Workout"}" is already assigned to this athlete on ${dateKey}.`,
        409,
        [exactDuplicate]
      );
    }

    if (existingOnDate.length > 0 && !data.allowConflict) {
      throw new WorkoutServiceError(
        `Date conflict: this athlete already has ${existingOnDate.length} workout(s) scheduled on ${dateKey}. Confirm to assign alongside existing workout(s).`,
        409,
        existingOnDate
      );
    }

    const createdId = await prisma.$transaction(
      async (tx) => {
        const assignment = await tx.clientWorkoutAssignment.create({
          data: {
            clientId: data.clientId,
            coachId: coachId!,
            sourceType,
            title: resolvedTitle,
            description:
              toOptionalText(data.description) || template?.descriptionEn || template?.descriptionAr || null,
            templateId: data.templateId || null,
            programId: data.programId || null,
            scheduledDate,
            coachNotes: toOptionalText(data.coachNotes),
            status: AssignmentStatus.SCHEDULED
          }
        });

        if (template && template.exercises.length > 0) {
          await tx.clientWorkoutAssignmentExercise.createMany({
            data: buildAssignmentSnapshotData(assignment.id, template.exercises)
          });
        } else if (data.exercises && data.exercises.length > 0 && individualMetaMap) {
          await tx.clientWorkoutAssignmentExercise.createMany({
            data: buildAssignmentSnapshotData(
              assignment.id,
              data.exercises.map((item) => ({ ...item, exercise: individualMetaMap!.get(item.exerciseId) || null }))
            )
          });
        }

        return assignment.id;
      },
      { maxWait: 10000, timeout: 30000 }
    );

    const hydrated = await this.getAssignmentById(createdId);
    if (!hydrated) {
      throw new WorkoutServiceError("Failed to load created assignment", 500);
    }
    return hydrated;
  }

  /**
   * Get assignments with filtering (athlete, coach, date range, source, effective status, search).
   */
  async getAssignments(clientIdOrFilter?: string | GetAssignmentsFilter, allowedClientIdsArg?: string[]) {
    const filter: GetAssignmentsFilter =
      typeof clientIdOrFilter === "string"
        ? { clientId: clientIdOrFilter, allowedClientIds: allowedClientIdsArg }
        : {
            ...(clientIdOrFilter || {}),
            allowedClientIds: clientIdOrFilter?.allowedClientIds ?? allowedClientIdsArg
          };

    const where: any = {};
    const andClauses: any[] = [];

    if (filter.allowedClientIds !== undefined) {
      andClauses.push({ clientId: { in: filter.allowedClientIds } });
    }
    if (filter.clientId && filter.clientId !== "ALL") {
      andClauses.push({ OR: [{ clientId: filter.clientId }, { client: { userId: filter.clientId } }] });
    }
    if (filter.coachId && filter.coachId !== "ALL") {
      andClauses.push({ coachId: filter.coachId });
    }
    if (filter.sourceType && filter.sourceType !== "ALL") {
      andClauses.push({ sourceType: filter.sourceType });
    }
    if (filter.status && filter.status !== "ALL") {
      if (filter.status === "IN_PROGRESS") {
        andClauses.push({
          status: AssignmentStatus.SCHEDULED,
          workoutLog: { is: { isCompleted: false } }
        });
      } else if (filter.status === "SCHEDULED") {
        andClauses.push({
          status: AssignmentStatus.SCHEDULED,
          workoutLog: { is: null }
        });
      } else {
        andClauses.push({ status: filter.status });
      }
    }
    if (filter.dateFrom) {
      try {
        const { start } = getCalendarDayBounds(filter.dateFrom);
        andClauses.push({ scheduledDate: { gte: start } });
      } catch {
        throw new WorkoutServiceError("Invalid dateFrom filter", 400);
      }
    }
    if (filter.dateTo) {
      try {
        const { end } = getCalendarDayBounds(filter.dateTo);
        andClauses.push({ scheduledDate: { lte: end } });
      } catch {
        throw new WorkoutServiceError("Invalid dateTo filter", 400);
      }
    }
    if (filter.search?.trim()) {
      const q = filter.search.trim();
      andClauses.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { programDayTitle: { contains: q, mode: "insensitive" } },
          { coachNotes: { contains: q, mode: "insensitive" } },
          { template: { titleEn: { contains: q, mode: "insensitive" } } },
          { program: { titleEn: { contains: q, mode: "insensitive" } } },
          { client: { user: { name: { contains: q, mode: "insensitive" } } } },
          { coach: { user: { name: { contains: q, mode: "insensitive" } } } },
          { exercises: { some: { exerciseNameEn: { contains: q, mode: "insensitive" } } } }
        ]
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const rows = await prisma.clientWorkoutAssignment.findMany({
      where,
      include: {
        exercises: assignmentExercisesInclude,
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
              orderBy: { orderIndex: "asc" }
            }
          }
        },
        program: {
          select: { id: true, titleEn: true, titleAr: true }
        },
        client: {
          include: { user: true }
        },
        coach: {
          include: { user: true }
        },
        workoutLog: {
          include: {
            exercises: {
              include: {
                exercise: true,
                sets: { orderBy: { setNumber: "asc" } }
              }
            }
          }
        }
      },
      orderBy: { scheduledDate: "desc" }
    });

    return rows.map((row) => this.hydrateAssignment(row));
  }

  /**
   * Fetch single assignment by ID (including frozen exercise snapshots and execution logs).
   */
  async getAssignmentById(id: string) {
    const row = await prisma.clientWorkoutAssignment.findUnique({
      where: { id },
      include: {
        exercises: assignmentExercisesInclude,
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
              orderBy: { orderIndex: "asc" }
            }
          }
        },
        program: {
          select: { id: true, titleEn: true, titleAr: true }
        },
        client: {
          include: { user: true }
        },
        coach: {
          include: { user: true }
        },
        workoutLog: {
          include: {
            exercises: {
              include: {
                exercise: true,
                sets: { orderBy: { setNumber: "asc" } }
              }
            }
          }
        }
      }
    });

    return row ? this.hydrateAssignment(row) : null;
  }

  /**
   * Save in-progress or completed workout execution into PostgreSQL.
   * Replaces prior draft exercise/set logs cleanly so saving progress multiple times never duplicates rows.
   */
  async saveWorkoutExecution(
    assignmentId: string,
    data: {
      mode?: "SAVE_PROGRESS" | "COMPLETE";
      durationMinutes?: number;
      overallRpe?: number;
      clientFeedback?: string | null;
      coachFeedback?: string | null;
      exercises: Array<{
        exerciseId: string;
        notes?: string | null;
        sets: Array<{
          setNumber: number;
          targetReps?: string | null;
          targetWeightKg?: number | null;
          targetDistanceKm?: number | null;
          targetTimeSeconds?: number | null;
          targetPace?: string | null;
          targetRounds?: number | null;
          actualWeightKg?: number | null;
          actualReps?: number | null;
          actualDistanceKm?: number | null;
          actualTimeSeconds?: number | null;
          actualPace?: string | null;
          actualRounds?: number | null;
          actualRpe?: number | null;
          isCompleted?: boolean;
        }>;
      }>;
    }
  ) {
    const assignment = await prisma.clientWorkoutAssignment.findUnique({
      where: { id: assignmentId }
    });
    if (!assignment) throw new WorkoutServiceError("Assignment not found", 404);
    if (assignment.status === AssignmentStatus.SKIPPED) {
      throw new WorkoutServiceError("Cannot log execution on a skipped workout", 409);
    }

    const mode = data.mode === "SAVE_PROGRESS" ? "SAVE_PROGRESS" : "COMPLETE";
    const isCompleted = mode === "COMPLETE";
    const durationMinutes = toOptionalInt(data.durationMinutes) ?? 1;
    const overallRpe = toOptionalInt(data.overallRpe) ?? (isCompleted ? 8 : null);

    const logId = await prisma.$transaction(
      async (tx) => {
        if (isCompleted) {
          await tx.clientWorkoutAssignment.update({
            where: { id: assignmentId },
            data: {
              status: AssignmentStatus.COMPLETED,
              completedAt: new Date()
            }
          });
        }

        const log = await tx.workoutLog.upsert({
          where: { assignmentId },
          create: {
            assignmentId,
            clientId: assignment.clientId,
            coachId: assignment.coachId,
            completedAt: isCompleted ? new Date() : null,
            durationMinutes,
            overallRpe,
            clientFeedback: toOptionalText(data.clientFeedback),
            coachFeedback: toOptionalText(data.coachFeedback),
            isCompleted
          },
          update: {
            completedAt: isCompleted ? new Date() : null,
            durationMinutes,
            overallRpe,
            clientFeedback: toOptionalText(data.clientFeedback),
            ...(data.coachFeedback !== undefined ? { coachFeedback: toOptionalText(data.coachFeedback) } : {}),
            isCompleted
          }
        });

        await tx.workoutExerciseLog.deleteMany({
          where: { workoutLogId: log.id }
        });

        if (data.exercises && data.exercises.length > 0) {
          for (const ex of data.exercises) {
            const exLog = await tx.workoutExerciseLog.create({
              data: {
                workoutLogId: log.id,
                exerciseId: ex.exerciseId,
                notes: toOptionalText(ex.notes)
              }
            });

            if (ex.sets && ex.sets.length > 0) {
              await tx.setLog.createMany({
                data: ex.sets.map((s) => ({
                  exerciseLogId: exLog.id,
                  setNumber: s.setNumber,
                  targetReps: toOptionalText(s.targetReps),
                  targetWeightKg: toOptionalFloat(s.targetWeightKg),
                  targetDistanceKm: toOptionalFloat(s.targetDistanceKm),
                  targetTimeSeconds: toOptionalInt(s.targetTimeSeconds),
                  targetPace: toOptionalText(s.targetPace),
                  targetRounds: toOptionalInt(s.targetRounds),
                  actualWeightKg: toOptionalFloat(s.actualWeightKg),
                  actualReps: toOptionalInt(s.actualReps),
                  actualDistanceKm: toOptionalFloat(s.actualDistanceKm),
                  actualTimeSeconds: toOptionalInt(s.actualTimeSeconds),
                  actualPace: toOptionalText(s.actualPace),
                  actualRounds: toOptionalInt(s.actualRounds),
                  actualRpe: toOptionalInt(s.actualRpe),
                  isCompleted: s.isCompleted ?? isCompleted
                }))
              });
            }
          }
        }

        return log.id;
      },
      { maxWait: 10000, timeout: 30000 }
    );

    const updated = await this.getAssignmentById(assignmentId);
    return {
      id: logId,
      assignmentId,
      isCompleted,
      effectiveStatus: updated?.effectiveStatus || (isCompleted ? "COMPLETED" : "IN_PROGRESS"),
      assignment: updated
    };
  }

  /**
   * Mark a workout assignment as SKIPPED with an optional athlete reason.
   */
  async skipWorkout(assignmentId: string, reason?: string | null) {
    const assignment = await prisma.clientWorkoutAssignment.findUnique({
      where: { id: assignmentId }
    });
    if (!assignment) throw new WorkoutServiceError("Assignment not found", 404);
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new WorkoutServiceError("Cannot skip an already completed workout", 409);
    }

    const skipNote = toOptionalText(reason) || "Skipped by athlete";

    await prisma.$transaction(
      async (tx) => {
        await tx.clientWorkoutAssignment.update({
          where: { id: assignmentId },
          data: {
            status: AssignmentStatus.SKIPPED,
            completedAt: null
          }
        });

        await tx.workoutLog.upsert({
          where: { assignmentId },
          create: {
            assignmentId,
            clientId: assignment.clientId,
            coachId: assignment.coachId,
            completedAt: null,
            clientFeedback: skipNote,
            isCompleted: false
          },
          update: {
            completedAt: null,
            clientFeedback: skipNote,
            isCompleted: false
          }
        });
      },
      { maxWait: 10000, timeout: 30000 }
    );

    return await this.getAssignmentById(assignmentId);
  }

  /**
   * Save coach review feedback on a workout assignment log.
   */
  async saveCoachFeedback(assignmentId: string, coachFeedback: string | null) {
    const assignment = await prisma.clientWorkoutAssignment.findUnique({
      where: { id: assignmentId }
    });
    if (!assignment) throw new WorkoutServiceError("Assignment not found", 404);

    await prisma.workoutLog.upsert({
      where: { assignmentId },
      create: {
        assignmentId,
        clientId: assignment.clientId,
        coachId: assignment.coachId,
        coachFeedback: toOptionalText(coachFeedback),
        isCompleted: assignment.status === AssignmentStatus.COMPLETED
      },
      update: {
        coachFeedback: toOptionalText(coachFeedback)
      }
    });

    return await this.getAssignmentById(assignmentId);
  }
}

export const workoutService = new WorkoutService();

import prisma from "@/lib/prisma";
import {
  AssignmentSourceType,
  AssignmentStatus,
  Difficulty,
  MetricType,
  BlockType,
  BlockItemType,
  UserRole
} from "@prisma/client";
import type { AuthActor } from "@/lib/auth/route-guard";
import {
  TargetExerciseInput,
  buildAssignmentSnapshotData,
  normalizeTemplateExerciseData,
  toOptionalFloat,
  toOptionalInt,
  toOptionalText
} from "./assignment-snapshot";
import { getCalendarDayBounds, parseCalendarDate, toCalendarDateKey } from "@/lib/date-utils";
import { auditService } from "./audit.service";

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

export interface CreateTemplateBlockItemInput {
  orderIndex?: number;
  itemType?: BlockItemType;
  exerciseId?: string | null;
  targetSets?: number | null;
  targetReps?: string | null;
  targetWeightKg?: number | null;
  targetDistanceKm?: number | null;
  targetTimeSeconds?: number | null;
  targetPace?: string | null;
  targetRounds?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;
  instructions?: string | null;
}

export interface CreateTemplateBlockInput {
  orderIndex?: number;
  type?: BlockType;
  title?: string | null;
  rounds?: number | null;
  durationSeconds?: number | null;
  restBetweenRoundsSeconds?: number | null;
  workSeconds?: number | null;
  restSeconds?: number | null;
  intervalSeconds?: number | null;
  partLabel?: string | null;
  notes?: string | null;
  items: CreateTemplateBlockItemInput[];
}

export interface CreateTemplateInput {
  titleAr?: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  sportId: string;
  difficulty?: Difficulty;
  creatorId?: string;
  isActive?: boolean;
  exercises?: TemplateExerciseInput[];
  blocks?: CreateTemplateBlockInput[];
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
  blocks?: CreateTemplateBlockInput[];
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
      exercises: true,
      blocks: true
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
  },
  blocks: {
    include: {
      items: {
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

const assignmentBlocksInclude = {
  include: {
    items: {
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

  private validateTemplateBlocks(blocks?: CreateTemplateBlockInput[]) {
    if (!blocks || blocks.length === 0) return;

    const blockOrders = new Set<number>();

    for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
      const b = blocks[bIdx];
      const bOrder = b.orderIndex !== undefined && b.orderIndex !== null ? Number(b.orderIndex) : bIdx + 1;
      if (blockOrders.has(bOrder)) {
        throw new WorkoutServiceError(`Duplicate block order index: ${bOrder}`, 400);
      }
      blockOrders.add(bOrder);

      if (b.items && b.items.length > 0) {
        const itemOrders = new Set<number>();
        let exerciseCount = 0;

        for (let iIdx = 0; iIdx < b.items.length; iIdx++) {
          const it = b.items[iIdx];
          const iOrder = it.orderIndex !== undefined && it.orderIndex !== null ? Number(it.orderIndex) : iIdx + 1;
          if (itemOrders.has(iOrder)) {
            throw new WorkoutServiceError(`Duplicate item order index ${iOrder} in block "${b.title || bOrder}"`, 400);
          }
          itemOrders.add(iOrder);

          const itemType = it.itemType || BlockItemType.EXERCISE;
          if (itemType === BlockItemType.EXERCISE) {
            exerciseCount++;
            if (!it.exerciseId || typeof it.exerciseId !== "string" || !it.exerciseId.trim()) {
              throw new WorkoutServiceError("An EXERCISE item must have a valid exerciseId", 400);
            }
          } else if (itemType === BlockItemType.REST || itemType === BlockItemType.NOTE) {
            if (it.exerciseId) {
              throw new WorkoutServiceError("REST and NOTE items cannot have an exerciseId", 400);
            }
          }
        }

        if (b.type === BlockType.SUPERSET && exerciseCount < 2) {
          throw new WorkoutServiceError("A SUPERSET block must contain at least 2 exercise items", 400);
        }
      } else if (b.type === BlockType.SUPERSET) {
        throw new WorkoutServiceError("A SUPERSET block must contain at least 2 exercise items", 400);
      }
    }
  }

  /**
   * Create template with blocks and nested items atomically.
   */
  async createTemplate(data: CreateTemplateInput, actor?: any) {
    this.validateTemplateBlocks(data.blocks);
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

    // Extract all referenced exercise IDs
    const blockExerciseIds: string[] = [];
    if (data.blocks && data.blocks.length > 0) {
      for (const b of data.blocks) {
        if (b.items) {
          for (const item of b.items) {
            if ((!item.itemType || item.itemType === BlockItemType.EXERCISE) && item.exerciseId) {
              blockExerciseIds.push(item.exerciseId);
            }
          }
        }
      }
    }
    const legacyExerciseIds = (data.exercises || []).map((e) => e.exerciseId).filter(Boolean);
    const allUniqueExerciseIds = Array.from(new Set([...blockExerciseIds, ...legacyExerciseIds]));

    const metricMap = new Map<string, MetricType>();
    if (allUniqueExerciseIds.length > 0) {
      const found = await prisma.exercise.findMany({
        where: { id: { in: allUniqueExerciseIds } },
        select: { id: true, metricType: true }
      });
      if (found.length !== allUniqueExerciseIds.length) {
        throw new WorkoutServiceError("One or more selected exercises no longer exist", 400);
      }
      for (const ex of found) {
        metricMap.set(ex.id, ex.metricType);
      }
    }

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

        if (data.blocks && data.blocks.length > 0) {
          let globalOrder = 1;
          const legacyItems: any[] = [];

          for (let bIdx = 0; bIdx < data.blocks.length; bIdx++) {
            const b = data.blocks[bIdx];
            const block = await tx.workoutBlock.create({
              data: {
                templateId: template.id,
                orderIndex: toOptionalInt(b.orderIndex) ?? bIdx + 1,
                type: b.type || BlockType.SINGLE,
                title: toOptionalText(b.title),
                rounds: toOptionalInt(b.rounds),
                durationSeconds: toOptionalInt(b.durationSeconds),
                restBetweenRoundsSeconds: toOptionalInt(b.restBetweenRoundsSeconds),
                workSeconds: toOptionalInt(b.workSeconds),
                restSeconds: toOptionalInt(b.restSeconds),
                intervalSeconds: toOptionalInt(b.intervalSeconds),
                partLabel: toOptionalText(b.partLabel),
                notes: toOptionalText(b.notes)
              }
            });

            if (b.items && b.items.length > 0) {
              for (let iIdx = 0; iIdx < b.items.length; iIdx++) {
                const it = b.items[iIdx];
                const itemType = it.itemType || BlockItemType.EXERCISE;
                const exerciseId = itemType === BlockItemType.EXERCISE ? it.exerciseId || null : null;

                await tx.blockItem.create({
                  data: {
                    blockId: block.id,
                    orderIndex: toOptionalInt(it.orderIndex) ?? iIdx + 1,
                    itemType,
                    exerciseId,
                    targetSets: toOptionalInt(it.targetSets),
                    targetReps: toOptionalText(it.targetReps),
                    targetWeightKg: toOptionalFloat(it.targetWeightKg),
                    targetDistanceKm: toOptionalFloat(it.targetDistanceKm),
                    targetTimeSeconds: toOptionalInt(it.targetTimeSeconds),
                    targetPace: toOptionalText(it.targetPace),
                    targetRounds: toOptionalInt(it.targetRounds),
                    restSeconds: toOptionalInt(it.restSeconds),
                    tempo: toOptionalText(it.tempo),
                    instructions: toOptionalText(it.instructions)
                  }
                });

                if (itemType === BlockItemType.EXERCISE && exerciseId) {
                  legacyItems.push({
                    templateId: template.id,
                    exerciseId,
                    orderIndex: globalOrder++,
                    targetSets: toOptionalInt(it.targetSets),
                    targetReps: toOptionalText(it.targetReps),
                    targetWeightKg: toOptionalFloat(it.targetWeightKg),
                    targetDistanceKm: toOptionalFloat(it.targetDistanceKm),
                    targetTimeSeconds: toOptionalInt(it.targetTimeSeconds),
                    targetPace: toOptionalText(it.targetPace),
                    targetRounds: toOptionalInt(it.targetRounds),
                    restSeconds: toOptionalInt(it.restSeconds),
                    tempo: toOptionalText(it.tempo),
                    notes: toOptionalText(it.instructions)
                  });
                }
              }
            }
          }

          if (legacyItems.length > 0) {
            await tx.workoutTemplateExercise.createMany({ data: legacyItems });
          }
        } else if (data.exercises && data.exercises.length > 0) {
          await tx.workoutTemplateExercise.createMany({
            data: normalizeTemplateExerciseData(template.id, data.exercises, metricMap)
          });

          for (let eIdx = 0; eIdx < data.exercises.length; eIdx++) {
            const ex = data.exercises[eIdx];
            const block = await tx.workoutBlock.create({
              data: {
                templateId: template.id,
                orderIndex: eIdx + 1,
                type: BlockType.SINGLE,
                rounds: 1
              }
            });
            await tx.blockItem.create({
              data: {
                blockId: block.id,
                orderIndex: 1,
                itemType: BlockItemType.EXERCISE,
                exerciseId: ex.exerciseId,
                targetSets: toOptionalInt(ex.targetSets),
                targetReps: toOptionalText(ex.targetReps),
                targetWeightKg: toOptionalFloat(ex.targetWeightKg),
                targetDistanceKm: toOptionalFloat(ex.targetDistanceKm),
                targetTimeSeconds: toOptionalInt(ex.targetTimeSeconds),
                targetPace: toOptionalText(ex.targetPace),
                targetRounds: toOptionalInt(ex.targetRounds),
                restSeconds: toOptionalInt(ex.restSeconds),
                tempo: toOptionalText(ex.tempo),
                instructions: toOptionalText(ex.notes)
              }
            });
          }
        }

        return template.id;
      },
      { maxWait: 10000, timeout: 30000 }
    );

    await auditService.log({
      actor,
      action: "CREATE_TEMPLATE",
      entityType: "WorkoutTemplate",
      entityId: templateId,
      newValues: {
        titleEn,
        sportId: data.sportId,
        difficulty: data.difficulty,
        blocksCount: data.blocks?.length || 0
      }
    });

    return await this.getTemplateById(templateId);
  }

  /**
   * Update template metadata, status, blocks, and ordered items.
   * Existing ClientWorkoutAssignment snapshots remain completely immutable.
   */
  async updateTemplate(id: string, data: UpdateTemplateInput, actor?: any) {
    if (data.blocks) {
      this.validateTemplateBlocks(data.blocks);
    }
    const existing = await prisma.workoutTemplate.findUnique({
      where: { id },
      select: { id: true, titleEn: true, sportId: true, isActive: true, version: true }
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

    // Extract all referenced exercise IDs
    const blockExerciseIds: string[] = [];
    if (data.blocks && data.blocks.length > 0) {
      for (const b of data.blocks) {
        if (b.items) {
          for (const item of b.items) {
            if ((!item.itemType || item.itemType === BlockItemType.EXERCISE) && item.exerciseId) {
              blockExerciseIds.push(item.exerciseId);
            }
          }
        }
      }
    }
    const legacyExerciseIds = (data.exercises || []).map((e) => e.exerciseId).filter(Boolean);
    const allUniqueExerciseIds = Array.from(new Set([...blockExerciseIds, ...legacyExerciseIds]));

    const metricMap = new Map<string, MetricType>();
    if (allUniqueExerciseIds.length > 0) {
      const found = await prisma.exercise.findMany({
        where: { id: { in: allUniqueExerciseIds } },
        select: { id: true, metricType: true }
      });
      if (found.length !== allUniqueExerciseIds.length) {
        throw new WorkoutServiceError("One or more selected exercises no longer exist", 400);
      }
      for (const ex of found) {
        metricMap.set(ex.id, ex.metricType);
      }
    }

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
        updateData.version = { increment: 1 };

        await tx.workoutTemplate.update({
          where: { id },
          data: updateData
        });

        if (data.blocks !== undefined) {
          await tx.workoutBlock.deleteMany({ where: { templateId: id } });
          await tx.workoutTemplateExercise.deleteMany({ where: { templateId: id } });

          if (data.blocks.length > 0) {
            let globalOrder = 1;
            const legacyItems: any[] = [];

            for (let bIdx = 0; bIdx < data.blocks.length; bIdx++) {
              const b = data.blocks[bIdx];
              const block = await tx.workoutBlock.create({
                data: {
                  templateId: id,
                  orderIndex: toOptionalInt(b.orderIndex) ?? bIdx + 1,
                  type: b.type || BlockType.SINGLE,
                  title: toOptionalText(b.title),
                  rounds: toOptionalInt(b.rounds),
                  durationSeconds: toOptionalInt(b.durationSeconds),
                  restBetweenRoundsSeconds: toOptionalInt(b.restBetweenRoundsSeconds),
                  workSeconds: toOptionalInt(b.workSeconds),
                  restSeconds: toOptionalInt(b.restSeconds),
                  intervalSeconds: toOptionalInt(b.intervalSeconds),
                  partLabel: toOptionalText(b.partLabel),
                  notes: toOptionalText(b.notes)
                }
              });

              if (b.items && b.items.length > 0) {
                for (let iIdx = 0; iIdx < b.items.length; iIdx++) {
                  const it = b.items[iIdx];
                  const itemType = it.itemType || BlockItemType.EXERCISE;
                  const exerciseId = itemType === BlockItemType.EXERCISE ? it.exerciseId || null : null;

                  await tx.blockItem.create({
                    data: {
                      blockId: block.id,
                      orderIndex: toOptionalInt(it.orderIndex) ?? iIdx + 1,
                      itemType,
                      exerciseId,
                      targetSets: toOptionalInt(it.targetSets),
                      targetReps: toOptionalText(it.targetReps),
                      targetWeightKg: toOptionalFloat(it.targetWeightKg),
                      targetDistanceKm: toOptionalFloat(it.targetDistanceKm),
                      targetTimeSeconds: toOptionalInt(it.targetTimeSeconds),
                      targetPace: toOptionalText(it.targetPace),
                      targetRounds: toOptionalInt(it.targetRounds),
                      restSeconds: toOptionalInt(it.restSeconds),
                      tempo: toOptionalText(it.tempo),
                      instructions: toOptionalText(it.instructions)
                    }
                  });

                  if (itemType === BlockItemType.EXERCISE && exerciseId) {
                    legacyItems.push({
                      templateId: id,
                      exerciseId,
                      orderIndex: globalOrder++,
                      targetSets: toOptionalInt(it.targetSets),
                      targetReps: toOptionalText(it.targetReps),
                      targetWeightKg: toOptionalFloat(it.targetWeightKg),
                      targetDistanceKm: toOptionalFloat(it.targetDistanceKm),
                      targetTimeSeconds: toOptionalInt(it.targetTimeSeconds),
                      targetPace: toOptionalText(it.targetPace),
                      targetRounds: toOptionalInt(it.targetRounds),
                      restSeconds: toOptionalInt(it.restSeconds),
                      tempo: toOptionalText(it.tempo),
                      notes: toOptionalText(it.instructions)
                    });
                  }
                }
              }
            }

            if (legacyItems.length > 0) {
              await tx.workoutTemplateExercise.createMany({ data: legacyItems });
            }
          }
        } else if (data.exercises !== undefined) {
          await tx.workoutTemplateExercise.deleteMany({ where: { templateId: id } });
          await tx.workoutBlock.deleteMany({ where: { templateId: id } });

          if (data.exercises.length > 0) {
            await tx.workoutTemplateExercise.createMany({
              data: normalizeTemplateExerciseData(id, data.exercises, metricMap)
            });

            for (let eIdx = 0; eIdx < data.exercises.length; eIdx++) {
              const ex = data.exercises[eIdx];
              const block = await tx.workoutBlock.create({
                data: {
                  templateId: id,
                  orderIndex: eIdx + 1,
                  type: BlockType.SINGLE,
                  rounds: 1
                }
              });
              await tx.blockItem.create({
                data: {
                  blockId: block.id,
                  orderIndex: 1,
                  itemType: BlockItemType.EXERCISE,
                  exerciseId: ex.exerciseId,
                  targetSets: toOptionalInt(ex.targetSets),
                  targetReps: toOptionalText(ex.targetReps),
                  targetWeightKg: toOptionalFloat(ex.targetWeightKg),
                  targetDistanceKm: toOptionalFloat(ex.targetDistanceKm),
                  targetTimeSeconds: toOptionalInt(ex.targetTimeSeconds),
                  targetPace: toOptionalText(ex.targetPace),
                  targetRounds: toOptionalInt(ex.targetRounds),
                  restSeconds: toOptionalInt(ex.restSeconds),
                  tempo: toOptionalText(ex.tempo),
                  instructions: toOptionalText(ex.notes)
                }
              });
            }
          }
        }
      },
      { maxWait: 10000, timeout: 30000 }
    );

    await auditService.log({
      actor,
      action: data.isActive === false && existing.isActive !== false ? "ARCHIVE_TEMPLATE" : "UPDATE_TEMPLATE",
      entityType: "WorkoutTemplate",
      entityId: id,
      oldValues: {
        titleEn: existing.titleEn,
        isActive: existing.isActive,
        version: existing.version
      },
      newValues: {
        titleEn: data.titleEn ?? existing.titleEn,
        isActive: data.isActive ?? existing.isActive,
        version: existing.version + 1
      }
    });

    return await this.getTemplateById(id);
  }

  /**
   * Delete template safely; reject with 409 Conflict if linked to programs or assignments.
   */
  async deleteTemplate(id: string, actor?: any) {
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

    await auditService.log({
      actor,
      action: "DELETE_TEMPLATE",
      entityType: "WorkoutTemplate",
      entityId: id,
      oldValues: {
        titleEn: existing.titleEn,
        sportId: existing.sportId
      }
    });

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
            },
            blocks: {
              include: {
                items: {
                  include: { exercise: true },
                  orderBy: { orderIndex: "asc" }
                }
              },
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

    if (
      sourceType === AssignmentSourceType.INDIVIDUAL &&
      (!data.exercises || data.exercises.length === 0) &&
      (!data.blocks || data.blocks.length === 0)
    ) {
      throw new WorkoutServiceError("At least one exercise or block is required for an individual workout", 400);
    }

    let individualMetaMap: Map<string, { id: string; nameEn: string; nameAr: string; metricType: MetricType }> | null =
      null;
    const blockExIds: string[] = [];
    if (data.blocks && data.blocks.length > 0) {
      for (const b of data.blocks) {
        if (b.items) {
          for (const it of b.items) {
            if (it.exerciseId) blockExIds.push(it.exerciseId);
          }
        }
      }
    }
    const legacyExIds = (data.exercises || []).map((e) => e.exerciseId).filter(Boolean);
    const combinedIds = Array.from(new Set([...blockExIds, ...legacyExIds]));

    if (!template && combinedIds.length > 0) {
      const metaRows = await prisma.exercise.findMany({
        where: { id: { in: combinedIds } },
        select: { id: true, nameEn: true, nameAr: true, metricType: true }
      });
      if (metaRows.length !== combinedIds.length) {
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

        // 1. Populate normalized AssignmentBlock and AssignmentBlockItem
        if (template && template.blocks && template.blocks.length > 0) {
          for (const b of template.blocks) {
            const block = await tx.assignmentBlock.create({
              data: {
                assignmentId: assignment.id,
                orderIndex: b.orderIndex,
                type: b.type,
                title: b.title,
                rounds: b.rounds,
                durationSeconds: b.durationSeconds,
                restBetweenRoundsSeconds: b.restBetweenRoundsSeconds,
                workSeconds: b.workSeconds,
                restSeconds: b.restSeconds,
                intervalSeconds: b.intervalSeconds,
                partLabel: b.partLabel,
                notes: b.notes
              }
            });

            if (b.items && b.items.length > 0) {
              await tx.assignmentBlockItem.createMany({
                data: b.items.map((it: any) => ({
                  assignmentBlockId: block.id,
                  orderIndex: it.orderIndex,
                  itemType: it.itemType || BlockItemType.EXERCISE,
                  exerciseId: it.exerciseId || null,
                  exerciseNameSnapshot: it.exercise?.nameEn || it.exercise?.nameAr || (it.exerciseId ? "Exercise" : null),
                  metricTypeSnapshot: it.exercise?.metricType || MetricType.SETS_REPS_WEIGHT,
                  targetSets: it.targetSets,
                  targetReps: it.targetReps,
                  targetWeightKg: it.targetWeightKg,
                  targetDistanceKm: it.targetDistanceKm,
                  targetTimeSeconds: it.targetTimeSeconds,
                  targetPace: it.targetPace,
                  targetRounds: it.targetRounds,
                  restSeconds: it.restSeconds,
                  tempo: it.tempo,
                  instructions: it.instructions
                }))
              });
            }
          }
        } else if (data.blocks && data.blocks.length > 0) {
          for (let bIdx = 0; bIdx < data.blocks.length; bIdx++) {
            const b = data.blocks[bIdx];
            const block = await tx.assignmentBlock.create({
              data: {
                assignmentId: assignment.id,
                orderIndex: toOptionalInt(b.orderIndex) ?? bIdx + 1,
                type: b.type || BlockType.SINGLE,
                title: toOptionalText(b.title),
                rounds: toOptionalInt(b.rounds),
                durationSeconds: toOptionalInt(b.durationSeconds),
                restBetweenRoundsSeconds: toOptionalInt(b.restBetweenRoundsSeconds),
                workSeconds: toOptionalInt(b.workSeconds),
                restSeconds: toOptionalInt(b.restSeconds),
                intervalSeconds: toOptionalInt(b.intervalSeconds),
                partLabel: toOptionalText(b.partLabel),
                notes: toOptionalText(b.notes)
              }
            });

            if (b.items && b.items.length > 0) {
              await tx.assignmentBlockItem.createMany({
                data: b.items.map((it, iIdx) => {
                  const meta = it.exerciseId ? individualMetaMap?.get(it.exerciseId) : null;
                  return {
                    assignmentBlockId: block.id,
                    orderIndex: toOptionalInt(it.orderIndex) ?? iIdx + 1,
                    itemType: it.itemType || BlockItemType.EXERCISE,
                    exerciseId: it.exerciseId || null,
                    exerciseNameSnapshot: meta?.nameEn || meta?.nameAr || (it.exerciseId ? "Exercise" : null),
                    metricTypeSnapshot: meta?.metricType || MetricType.SETS_REPS_WEIGHT,
                    targetSets: toOptionalInt(it.targetSets),
                    targetReps: toOptionalText(it.targetReps),
                    targetWeightKg: toOptionalFloat(it.targetWeightKg),
                    targetDistanceKm: toOptionalFloat(it.targetDistanceKm),
                    targetTimeSeconds: toOptionalInt(it.targetTimeSeconds),
                    targetPace: toOptionalText(it.targetPace),
                    targetRounds: toOptionalInt(it.targetRounds),
                    restSeconds: toOptionalInt(it.restSeconds),
                    tempo: toOptionalText(it.tempo),
                    instructions: toOptionalText(it.instructions)
                  };
                })
              });
            }
          }
        } else if (data.exercises && data.exercises.length > 0 && individualMetaMap) {
          const block = await tx.assignmentBlock.create({
            data: {
              assignmentId: assignment.id,
              orderIndex: 1,
              type: BlockType.SINGLE,
              title: "Primary Block"
            }
          });

          await tx.assignmentBlockItem.createMany({
            data: data.exercises.map((item, iIdx) => {
              const meta = item.exerciseId ? individualMetaMap!.get(item.exerciseId) : null;
              return {
                assignmentBlockId: block.id,
                orderIndex: iIdx + 1,
                itemType: BlockItemType.EXERCISE,
                exerciseId: item.exerciseId || null,
                exerciseNameSnapshot: meta?.nameEn || meta?.nameAr || "Exercise",
                metricTypeSnapshot: meta?.metricType || MetricType.SETS_REPS_WEIGHT,
                targetSets: toOptionalInt(item.targetSets),
                targetReps: toOptionalText(item.targetReps),
                targetWeightKg: toOptionalFloat(item.targetWeightKg),
                targetDistanceKm: toOptionalFloat(item.targetDistanceKm),
                targetTimeSeconds: toOptionalInt(item.targetTimeSeconds),
                targetPace: toOptionalText(item.targetPace),
                targetRounds: toOptionalInt(item.targetRounds),
                restSeconds: toOptionalInt(item.restSeconds),
                tempo: toOptionalText(item.tempo),
                instructions: toOptionalText(item.notes)
              };
            })
          });
        }

        // 2. Legacy clientWorkoutAssignmentExercise compatibility
        if (template && template.exercises.length > 0) {
          await tx.clientWorkoutAssignmentExercise.createMany({
            data: buildAssignmentSnapshotData(assignment.id, template.exercises)
          });
        } else if (data.blocks && data.blocks.length > 0) {
          let legacyOrder = 0;
          const legacyItems: any[] = [];
          for (const b of data.blocks) {
            if (b.items) {
              for (const it of b.items) {
                if (it.exerciseId && (!it.itemType || it.itemType === BlockItemType.EXERCISE)) {
                  const meta = individualMetaMap?.get(it.exerciseId);
                  legacyItems.push({
                    exerciseId: it.exerciseId,
                    exercise: meta,
                    orderIndex: legacyOrder++,
                    targetSets: it.targetSets,
                    targetReps: it.targetReps,
                    targetWeightKg: it.targetWeightKg,
                    targetDistanceKm: it.targetDistanceKm,
                    targetTimeSeconds: it.targetTimeSeconds,
                    targetPace: it.targetPace,
                    targetRounds: it.targetRounds,
                    restSeconds: it.restSeconds,
                    tempo: it.tempo,
                    notes: it.instructions
                  });
                }
              }
            }
          }
          if (legacyItems.length > 0) {
            await tx.clientWorkoutAssignmentExercise.createMany({
              data: buildAssignmentSnapshotData(assignment.id, legacyItems)
            });
          }
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
        assignmentBlocks: assignmentBlocksInclude,
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
            },
            setLogs: {
              orderBy: [{ roundNumber: "asc" }, { setNumber: "asc" }]
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
        assignmentBlocks: assignmentBlocksInclude,
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
            },
            setLogs: {
              orderBy: [{ roundNumber: "asc" }, { setNumber: "asc" }]
            }
          }
        }
      }
    });

    return row ? this.hydrateAssignment(row) : null;
  }

  /**
   * Save in-progress or completed workout execution into PostgreSQL.
   * Uses atomic tx.setLog.upsert matching (workoutLogId, assignmentBlockItemId, roundNumber, setNumber).
   * Never wipes logs with deleteMany.
   * Enforces immutability: blocked with 409 Conflict if completed or skipped.
   * Emits COMPLETE_WORKOUT or SAVE_WORKOUT_PROGRESS audit log.
   */
  async saveWorkoutExecution(
    assignmentId: string,
    data: {
      mode?: "SAVE_PROGRESS" | "COMPLETE";
      durationMinutes?: number;
      overallRpe?: number;
      clientFeedback?: string | null;
      coachFeedback?: string | null;
      exercises?: Array<{
        exerciseId?: string;
        assignmentBlockItemId?: string | null;
        notes?: string | null;
        sets: Array<{
          id?: string;
          assignmentBlockItemId?: string | null;
          roundNumber?: number;
          setNumber: number;
          isCompleted?: boolean;
          isSkipped?: boolean;
          skipReason?: string | null;
          startedAt?: Date | string | null;
          finishedAt?: Date | string | null;
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
        }>;
      }>;
      blockItemLogs?: Array<{
        id?: string;
        assignmentBlockItemId: string;
        roundNumber?: number;
        setNumber?: number;
        isCompleted?: boolean;
        isSkipped?: boolean;
        skipReason?: string | null;
        startedAt?: Date | string | null;
        finishedAt?: Date | string | null;
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
      }>;
    },
    actor?: AuthActor
  ) {
    const assignment = await prisma.clientWorkoutAssignment.findUnique({
      where: { id: assignmentId }
    });
    if (!assignment) throw new WorkoutServiceError("Assignment not found", 404);
    if (assignment.status === AssignmentStatus.SKIPPED) {
      throw new WorkoutServiceError("Cannot log execution on a skipped workout", 409);
    }
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new WorkoutServiceError("Cannot overwrite or modify an already completed workout session. Completed sessions are immutable.", 409);
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

        // 1. Process blockItemLogs directly if provided
        if (data.blockItemLogs && data.blockItemLogs.length > 0) {
          for (const item of data.blockItemLogs) {
            const roundNum = item.roundNumber ?? 1;
            const setNum = item.setNumber ?? 1;
            await tx.setLog.upsert({
              where: {
                workoutLogId_assignmentBlockItemId_roundNumber_setNumber: {
                  workoutLogId: log.id,
                  assignmentBlockItemId: item.assignmentBlockItemId,
                  roundNumber: roundNum,
                  setNumber: setNum
                }
              },
              create: {
                workoutLogId: log.id,
                assignmentBlockItemId: item.assignmentBlockItemId,
                roundNumber: roundNum,
                setNumber: setNum,
                isCompleted: item.isCompleted ?? isCompleted,
                isSkipped: item.isSkipped ?? false,
                skipReason: toOptionalText(item.skipReason),
                startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
                finishedAt: item.finishedAt ? new Date(item.finishedAt) : undefined,
                targetReps: toOptionalText(item.targetReps),
                targetWeightKg: toOptionalFloat(item.targetWeightKg),
                targetDistanceKm: toOptionalFloat(item.targetDistanceKm),
                targetTimeSeconds: toOptionalInt(item.targetTimeSeconds),
                targetPace: toOptionalText(item.targetPace),
                targetRounds: toOptionalInt(item.targetRounds),
                actualWeightKg: toOptionalFloat(item.actualWeightKg),
                actualReps: toOptionalInt(item.actualReps),
                actualDistanceKm: toOptionalFloat(item.actualDistanceKm),
                actualTimeSeconds: toOptionalInt(item.actualTimeSeconds),
                actualPace: toOptionalText(item.actualPace),
                actualRounds: toOptionalInt(item.actualRounds),
                actualRpe: toOptionalInt(item.actualRpe)
              },
              update: {
                isCompleted: item.isCompleted ?? isCompleted,
                isSkipped: item.isSkipped ?? false,
                skipReason: toOptionalText(item.skipReason),
                startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
                finishedAt: item.finishedAt ? new Date(item.finishedAt) : undefined,
                targetReps: toOptionalText(item.targetReps),
                targetWeightKg: toOptionalFloat(item.targetWeightKg),
                targetDistanceKm: toOptionalFloat(item.targetDistanceKm),
                targetTimeSeconds: toOptionalInt(item.targetTimeSeconds),
                targetPace: toOptionalText(item.targetPace),
                targetRounds: toOptionalInt(item.targetRounds),
                actualWeightKg: toOptionalFloat(item.actualWeightKg),
                actualReps: toOptionalInt(item.actualReps),
                actualDistanceKm: toOptionalFloat(item.actualDistanceKm),
                actualTimeSeconds: toOptionalInt(item.actualTimeSeconds),
                actualPace: toOptionalText(item.actualPace),
                actualRounds: toOptionalInt(item.actualRounds),
                actualRpe: toOptionalInt(item.actualRpe)
              }
            });
          }
        }

        // 2. Process exercises array (supports both block items and legacy exercises)
        if (data.exercises && data.exercises.length > 0) {
          for (const ex of data.exercises) {
            let exLog: { id: string } | null = null;
            if (ex.exerciseId) {
              const existingExLog = await tx.workoutExerciseLog.findFirst({
                where: { workoutLogId: log.id, exerciseId: ex.exerciseId }
              });
              if (existingExLog) {
                exLog = existingExLog;
                if (ex.notes !== undefined) {
                  await tx.workoutExerciseLog.update({
                    where: { id: existingExLog.id },
                    data: { notes: toOptionalText(ex.notes) }
                  });
                }
              } else {
                exLog = await tx.workoutExerciseLog.create({
                  data: {
                    workoutLogId: log.id,
                    exerciseId: ex.exerciseId,
                    notes: toOptionalText(ex.notes)
                  }
                });
              }
            }

            if (ex.sets && ex.sets.length > 0) {
              for (const s of ex.sets) {
                const blockItemId = s.assignmentBlockItemId || ex.assignmentBlockItemId;
                if (blockItemId) {
                  const roundNum = s.roundNumber ?? 1;
                  const setNum = s.setNumber ?? 1;
                  await tx.setLog.upsert({
                    where: {
                      workoutLogId_assignmentBlockItemId_roundNumber_setNumber: {
                        workoutLogId: log.id,
                        assignmentBlockItemId: blockItemId,
                        roundNumber: roundNum,
                        setNumber: setNum
                      }
                    },
                    create: {
                      workoutLogId: log.id,
                      exerciseLogId: exLog?.id ?? null,
                      assignmentBlockItemId: blockItemId,
                      roundNumber: roundNum,
                      setNumber: setNum,
                      isCompleted: s.isCompleted ?? isCompleted,
                      isSkipped: s.isSkipped ?? false,
                      skipReason: toOptionalText(s.skipReason),
                      startedAt: s.startedAt ? new Date(s.startedAt) : undefined,
                      finishedAt: s.finishedAt ? new Date(s.finishedAt) : undefined,
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
                      actualRpe: toOptionalInt(s.actualRpe)
                    },
                    update: {
                      isCompleted: s.isCompleted ?? isCompleted,
                      isSkipped: s.isSkipped ?? false,
                      skipReason: toOptionalText(s.skipReason),
                      startedAt: s.startedAt ? new Date(s.startedAt) : undefined,
                      finishedAt: s.finishedAt ? new Date(s.finishedAt) : undefined,
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
                      actualRpe: toOptionalInt(s.actualRpe)
                    }
                  });
                } else if (exLog) {
                  const existingSet = await tx.setLog.findFirst({
                    where: { exerciseLogId: exLog.id, setNumber: s.setNumber }
                  });
                  if (existingSet) {
                    await tx.setLog.update({
                      where: { id: existingSet.id },
                      data: {
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
                        isCompleted: s.isCompleted ?? isCompleted,
                        isSkipped: s.isSkipped ?? false,
                        skipReason: toOptionalText(s.skipReason)
                      }
                    });
                  } else {
                    await tx.setLog.create({
                      data: {
                        exerciseLogId: exLog.id,
                        workoutLogId: log.id,
                        setNumber: s.setNumber,
                        roundNumber: s.roundNumber ?? 1,
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
                        isCompleted: s.isCompleted ?? isCompleted,
                        isSkipped: s.isSkipped ?? false,
                        skipReason: toOptionalText(s.skipReason)
                      }
                    });
                  }
                }
              }
            }
          }
        }

        return log.id;
      },
      { maxWait: 10000, timeout: 30000 }
    );

    // Audit trail
    if (actor?.user?.id) {
      await auditService.log({
        actor,
        action: isCompleted ? "COMPLETE_WORKOUT" : "SAVE_WORKOUT_PROGRESS",
        entityType: "ClientWorkoutAssignment",
        entityId: assignmentId,
        newValues: {
          mode,
          durationMinutes,
          overallRpe,
          isCompleted
        }
      });
    }

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
  async skipWorkout(assignmentId: string, reason?: string | null, actor?: AuthActor) {
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

    if (actor?.user?.id) {
      await auditService.log({
        actor,
        action: "SKIP_WORKOUT",
        entityType: "ClientWorkoutAssignment",
        entityId: assignmentId,
        newValues: { reason: skipNote }
      });
    }

    return await this.getAssignmentById(assignmentId);
  }

  /**
   * Record the start or finish of one workout part (assignment block).
   * START sets startedAt once (idempotent) and opens an in-progress workout log.
   * FINISH sets finishedAt (and startedAt if the athlete never tapped Start) plus optional AMRAP/For Time results.
   * Completed or skipped workouts are immutable.
   */
  async recordPartTiming(
    assignmentId: string,
    blockId: string,
    kind: "START" | "FINISH",
    data: { resultRounds?: unknown; resultReps?: unknown; resultTimeSeconds?: unknown } = {}
  ) {
    const assignment = await prisma.clientWorkoutAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new WorkoutServiceError("Assignment not found", 404);
    if (assignment.status === AssignmentStatus.SKIPPED) {
      throw new WorkoutServiceError("Cannot record timing on a skipped workout", 409);
    }
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new WorkoutServiceError("Completed sessions are immutable", 409);
    }
    const block = await prisma.assignmentBlock.findFirst({ where: { id: blockId, assignmentId } });
    if (!block) throw new WorkoutServiceError("Workout part not found on this assignment", 404);

    const now = new Date();
    return prisma.$transaction(async (tx) => {
      await tx.workoutLog.upsert({
        where: { assignmentId },
        create: { assignmentId, clientId: assignment.clientId, coachId: assignment.coachId, isCompleted: false },
        update: {}
      });
      if (kind === "START") {
        return tx.assignmentBlock.update({
          where: { id: blockId },
          data: { startedAt: block.startedAt ?? now, finishedAt: null }
        });
      }
      return tx.assignmentBlock.update({
        where: { id: blockId },
        data: {
          startedAt: block.startedAt ?? now,
          finishedAt: block.finishedAt ?? now,
          resultRounds: toOptionalInt(data.resultRounds),
          resultReps: toOptionalInt(data.resultReps),
          resultTimeSeconds: toOptionalInt(data.resultTimeSeconds)
        }
      });
    });
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

  /**
   * Customize a scheduled workout assignment for an athlete (modify blocks, items, targets, notes).
   * Enforces immutability: blocked with 409 Conflict if in-progress, completed, or skipped.
   * Modifies only the athlete instance; the master program remains completely untouched.
   */
  async customizeAssignment(
    id: string,
    data: {
      title?: string | null;
      description?: string | null;
      coachNotes?: string | null;
      scheduledDate?: string | Date;
      blocks?: Array<{
        orderIndex?: number;
        type?: BlockType;
        title?: string | null;
        rounds?: number | null;
        durationSeconds?: number | null;
        restBetweenRoundsSeconds?: number | null;
        workSeconds?: number | null;
        restSeconds?: number | null;
        intervalSeconds?: number | null;
        partLabel?: string | null;
        notes?: string | null;
        items: Array<{
          orderIndex?: number;
          itemType?: BlockItemType;
          exerciseId?: string | null;
          targetSets?: number | null;
          targetReps?: string | null;
          targetWeightKg?: number | null;
          targetDistanceKm?: number | null;
          targetTimeSeconds?: number | null;
          targetPace?: string | null;
          targetRounds?: number | null;
          restSeconds?: number | null;
          tempo?: string | null;
          instructions?: string | null;
        }>;
      }>;
    },
    actor?: AuthActor
  ) {
    if (actor?.user?.role === UserRole.CLIENT) {
      throw new WorkoutServiceError("Forbidden: Athletes cannot customize workout assignments", 403);
    }

    const assignment = await prisma.clientWorkoutAssignment.findUnique({
      where: { id },
      include: {
        workoutLog: true
      }
    });

    if (!assignment) {
      throw new WorkoutServiceError("Assignment not found", 404);
    }

    // IMMUTABILITY GUARD: 409 Conflict if in-progress or completed or skipped
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new WorkoutServiceError("Cannot modify a completed workout assignment", 409);
    }
    if (assignment.status === AssignmentStatus.SKIPPED) {
      throw new WorkoutServiceError("Cannot modify a skipped workout assignment", 409);
    }
    if (assignment.workoutLog !== null) {
      throw new WorkoutServiceError("Cannot modify a workout assignment that has already been started", 409);
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = toOptionalText(data.title);
      if (data.description !== undefined) updateData.description = toOptionalText(data.description);
      if (data.coachNotes !== undefined) updateData.coachNotes = toOptionalText(data.coachNotes);
      if (data.scheduledDate !== undefined) {
        updateData.scheduledDate = parseCalendarDate(data.scheduledDate);
      }

      await tx.clientWorkoutAssignment.update({
        where: { id },
        data: updateData
      });

      if (data.blocks !== undefined) {
        await tx.assignmentBlock.deleteMany({ where: { assignmentId: id } });
        await tx.clientWorkoutAssignmentExercise.deleteMany({ where: { assignmentId: id } });

        if (data.blocks && data.blocks.length > 0) {
          const exIds = new Set<string>();
          for (const b of data.blocks) {
            for (const it of b.items || []) {
              if (it.exerciseId) exIds.add(it.exerciseId);
            }
          }
          const exMap = new Map<string, { id: string; nameEn: string; nameAr: string; metricType: MetricType }>();
          if (exIds.size > 0) {
            const foundEx = await tx.exercise.findMany({
              where: { id: { in: Array.from(exIds) } },
              select: { id: true, nameEn: true, nameAr: true, metricType: true }
            });
            foundEx.forEach((e) => exMap.set(e.id, e));
          }

          let legacyOrder = 0;
          const legacyItems: any[] = [];

          for (let bIdx = 0; bIdx < data.blocks.length; bIdx++) {
            const b = data.blocks[bIdx];
            const createdBlock = await tx.assignmentBlock.create({
              data: {
                assignmentId: id,
                orderIndex: b.orderIndex !== undefined && b.orderIndex !== null ? Number(b.orderIndex) : bIdx + 1,
                type: b.type || BlockType.SINGLE,
                title: toOptionalText(b.title),
                rounds: toOptionalInt(b.rounds),
                durationSeconds: toOptionalInt(b.durationSeconds),
                restBetweenRoundsSeconds: toOptionalInt(b.restBetweenRoundsSeconds),
                workSeconds: toOptionalInt(b.workSeconds),
                restSeconds: toOptionalInt(b.restSeconds),
                intervalSeconds: toOptionalInt(b.intervalSeconds),
                partLabel: toOptionalText(b.partLabel),
                notes: toOptionalText(b.notes)
              }
            });

            if (b.items && b.items.length > 0) {
              await tx.assignmentBlockItem.createMany({
                data: b.items.map((it, iIdx) => {
                  const ex = it.exerciseId ? exMap.get(it.exerciseId) : null;
                  if (it.exerciseId && (!it.itemType || it.itemType === BlockItemType.EXERCISE)) {
                    legacyItems.push({
                      exerciseId: it.exerciseId,
                      exercise: ex,
                      orderIndex: legacyOrder++,
                      targetSets: toOptionalInt(it.targetSets),
                      targetReps: toOptionalText(it.targetReps),
                      targetWeightKg: toOptionalFloat(it.targetWeightKg),
                      targetDistanceKm: toOptionalFloat(it.targetDistanceKm),
                      targetTimeSeconds: toOptionalInt(it.targetTimeSeconds),
                      targetPace: toOptionalText(it.targetPace),
                      targetRounds: toOptionalInt(it.targetRounds),
                      restSeconds: toOptionalInt(it.restSeconds),
                      tempo: toOptionalText(it.tempo),
                      notes: toOptionalText(it.instructions)
                    });
                  }
                  return {
                    assignmentBlockId: createdBlock.id,
                    orderIndex: it.orderIndex !== undefined && it.orderIndex !== null ? Number(it.orderIndex) : iIdx + 1,
                    itemType: it.itemType || BlockItemType.EXERCISE,
                    exerciseId: it.exerciseId || null,
                    exerciseNameSnapshot: ex?.nameEn || ex?.nameAr || (it.exerciseId ? "Exercise" : null),
                    metricTypeSnapshot: ex?.metricType || MetricType.SETS_REPS_WEIGHT,
                    targetSets: toOptionalInt(it.targetSets),
                    targetReps: toOptionalText(it.targetReps),
                    targetWeightKg: toOptionalFloat(it.targetWeightKg),
                    targetDistanceKm: toOptionalFloat(it.targetDistanceKm),
                    targetTimeSeconds: toOptionalInt(it.targetTimeSeconds),
                    targetPace: toOptionalText(it.targetPace),
                    targetRounds: toOptionalInt(it.targetRounds),
                    restSeconds: toOptionalInt(it.restSeconds),
                    tempo: toOptionalText(it.tempo),
                    instructions: toOptionalText(it.instructions)
                  };
                })
              });
            }
          }

          if (legacyItems.length > 0) {
            await tx.clientWorkoutAssignmentExercise.createMany({
              data: buildAssignmentSnapshotData(id, legacyItems)
            });
          }
        }
      }
    });

    await auditService.log({
      actor,
      action: "CUSTOMIZE_ASSIGNMENT",
      entityType: "ClientWorkoutAssignment",
      entityId: id,
      newValues: {
        title: data.title,
        blocksCount: data.blocks?.length
      }
    });

    return await this.getAssignmentById(id);
  }

  /**
   * Reset an athlete's workout assignment to the master program workout.
   * Matches by (programId, weekNumber, dayNumber, programWorkoutOrder).
   * Enforces immutability: blocked with 409 Conflict if started, completed, or skipped.
   * Rebuilds AssignmentBlock & AssignmentBlockItem from Master, preserving coachNotes and athlete metadata.
   */
  async resetAssignmentToMaster(assignmentId: string, actor?: AuthActor) {
    if (actor?.user?.role === UserRole.CLIENT) {
      throw new WorkoutServiceError("Forbidden: Athletes cannot reset workout assignments", 403);
    }

    const assignment = await prisma.clientWorkoutAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        workoutLog: true,
        program: true
      }
    });

    if (!assignment) {
      throw new WorkoutServiceError("Assignment not found", 404);
    }

    // 1. IMMUTABILITY / EXECUTION BLOCKER: 409 Conflict if completed, skipped, or started
    if (assignment.status === AssignmentStatus.COMPLETED) {
      throw new WorkoutServiceError("Cannot reset a completed workout session", 409);
    }
    if (assignment.status === AssignmentStatus.SKIPPED) {
      throw new WorkoutServiceError("Cannot reset a skipped workout session", 409);
    }
    if (assignment.workoutLog !== null) {
      throw new WorkoutServiceError("Cannot reset a workout session that has already been started", 409);
    }

    if (!assignment.programId) {
      throw new WorkoutServiceError("Cannot reset to master: This assignment is not linked to a training program", 400);
    }

    // 2. Lookup source master workout:
    // Match by programId -> Week(weekNumber) -> Day(dayNumber) -> Workout(programWorkoutOrder)
    const masterProgram = await prisma.trainingProgram.findUnique({
      where: { id: assignment.programId },
      include: {
        weeks: {
          where: { weekNumber: assignment.programWeekNumber ?? -1 },
          include: {
            days: {
              where: { dayNumber: assignment.programDayNumber ?? -1 },
              include: {
                workouts: {
                  include: {
                    blocks: {
                      include: {
                        items: {
                          include: { exercise: true },
                          orderBy: { orderIndex: "asc" }
                        }
                      },
                      orderBy: { orderIndex: "asc" }
                    },
                    template: {
                      include: {
                        blocks: {
                          include: {
                            items: {
                              include: { exercise: true },
                              orderBy: { orderIndex: "asc" }
                            }
                          },
                          orderBy: { orderIndex: "asc" }
                        }
                      }
                    }
                  },
                  orderBy: { orderIndex: "asc" }
                }
              }
            }
          }
        }
      }
    });

    const targetWeek = masterProgram?.weeks[0];
    const targetDay = targetWeek?.days[0];
    if (!targetDay) {
      throw new WorkoutServiceError(
        "Original master workout has been removed from the master program. Cannot reset.",
        404
      );
    }

    if (targetDay.isRestDay) {
      throw new WorkoutServiceError(
        "Original master day is now configured as a Rest Day. Use Rest-Day Sync instead.",
        409
      );
    }

    const masterWorkout =
      targetDay.workouts.find((w) => w.orderIndex === (assignment.programWorkoutOrder ?? 0)) ||
      targetDay.workouts[0];

    if (!masterWorkout) {
      throw new WorkoutServiceError(
        "Original master workout has been removed from the master program. Cannot reset.",
        404
      );
    }

    const sourceBlocks =
      masterWorkout.blocks && masterWorkout.blocks.length > 0
        ? masterWorkout.blocks
        : masterWorkout.template?.blocks || [];

    // 3. Rebuild AssignmentBlock and AssignmentBlockItem, PRESERVING coachNotes and athlete metadata
    await prisma.$transaction(async (tx) => {
      await tx.clientWorkoutAssignment.update({
        where: { id: assignmentId },
        data: {
          title: masterWorkout.title || masterWorkout.template?.titleEn || targetDay.titleEn || "Workout Session",
          description: masterWorkout.template?.descriptionEn || null,
          templateId: masterWorkout.templateId || null,
          status: AssignmentStatus.SCHEDULED
        }
      });

      await tx.assignmentBlock.deleteMany({ where: { assignmentId } });
      await tx.clientWorkoutAssignmentExercise.deleteMany({ where: { assignmentId } });

      let legacyOrder = 0;
      const legacyItems: any[] = [];

      for (const b of sourceBlocks) {
        const createdBlock = await tx.assignmentBlock.create({
          data: {
            assignmentId,
            orderIndex: b.orderIndex,
            type: b.type,
            title: b.title,
            rounds: b.rounds,
            durationSeconds: b.durationSeconds,
            restBetweenRoundsSeconds: b.restBetweenRoundsSeconds,
            workSeconds: b.workSeconds,
            restSeconds: b.restSeconds,
            intervalSeconds: b.intervalSeconds,
            partLabel: b.partLabel,
            notes: b.notes
          }
        });

        if (b.items && b.items.length > 0) {
          await tx.assignmentBlockItem.createMany({
            data: b.items.map((it: any) => {
              if (it.exerciseId && (!it.itemType || it.itemType === BlockItemType.EXERCISE)) {
                legacyItems.push({
                  exerciseId: it.exerciseId,
                  exercise: it.exercise,
                  orderIndex: legacyOrder++,
                  targetSets: it.targetSets,
                  targetReps: it.targetReps,
                  targetWeightKg: it.targetWeightKg,
                  targetDistanceKm: it.targetDistanceKm,
                  targetTimeSeconds: it.targetTimeSeconds,
                  targetPace: it.targetPace,
                  targetRounds: it.targetRounds,
                  restSeconds: it.restSeconds,
                  tempo: it.tempo,
                  notes: it.instructions
                });
              }
              return {
                assignmentBlockId: createdBlock.id,
                orderIndex: it.orderIndex,
                itemType: it.itemType || BlockItemType.EXERCISE,
                exerciseId: it.exerciseId || null,
                exerciseNameSnapshot: it.exercise?.nameEn || it.exercise?.nameAr || (it.exerciseId ? "Exercise" : null),
                metricTypeSnapshot: it.exercise?.metricType || MetricType.SETS_REPS_WEIGHT,
                targetSets: it.targetSets,
                targetReps: it.targetReps,
                targetWeightKg: it.targetWeightKg,
                targetDistanceKm: it.targetDistanceKm,
                targetTimeSeconds: it.targetTimeSeconds,
                targetPace: it.targetPace,
                targetRounds: it.targetRounds,
                restSeconds: it.restSeconds,
                tempo: it.tempo,
                instructions: it.instructions
              };
            })
          });
        }
      }

      if (legacyItems.length > 0) {
        await tx.clientWorkoutAssignmentExercise.createMany({
          data: buildAssignmentSnapshotData(assignmentId, legacyItems)
        });
      }
    });

    await auditService.log({
      actor,
      action: "RESET_TO_MASTER",
      entityType: "ClientWorkoutAssignment",
      entityId: assignmentId,
      newValues: {
        masterVersion: masterProgram?.masterVersion,
        weekNumber: assignment.programWeekNumber,
        dayNumber: assignment.programDayNumber
      }
    });

    return await this.getAssignmentById(assignmentId);
  }

  /**
   * Delete a scheduled workout assignment.
   * Enforces immutability: blocked with 409 Conflict if started or completed.
   */
  async deleteAssignment(id: string, actor?: AuthActor) {
    if (actor?.user?.role === UserRole.CLIENT) {
      throw new WorkoutServiceError("Forbidden: Athletes cannot delete workout assignments", 403);
    }

    const existing = await prisma.clientWorkoutAssignment.findUnique({
      where: { id },
      include: { workoutLog: true }
    });
    if (!existing) {
      throw new WorkoutServiceError("Assignment not found", 404);
    }

    if (existing.status === AssignmentStatus.COMPLETED) {
      throw new WorkoutServiceError("Cannot delete a completed workout assignment", 409);
    }
    if (existing.workoutLog !== null) {
      throw new WorkoutServiceError("Cannot delete a workout assignment that has already been started", 409);
    }

    await prisma.$transaction(async (tx) => {
      await tx.assignmentBlock.deleteMany({ where: { assignmentId: id } });
      await tx.clientWorkoutAssignmentExercise.deleteMany({ where: { assignmentId: id } });
      await tx.clientWorkoutAssignment.delete({ where: { id } });
    });

    await auditService.log({
      actor,
      action: "DELETE_ASSIGNMENT",
      entityType: "ClientWorkoutAssignment",
      entityId: id,
      oldValues: {
        title: existing.title,
        scheduledDate: existing.scheduledDate
      }
    });

    return true;
  }
}

export const workoutService = new WorkoutService();

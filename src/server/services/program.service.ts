import prisma from "@/lib/prisma";
import {
  AssignmentSourceType,
  AssignmentStatus,
  Difficulty,
  GoalType,
  NutritionAssignmentMode,
  Prisma,
  BlockType,
  BlockItemType,
  MetricType
} from "@prisma/client";
import { buildAssignmentSnapshotData, toOptionalFloat, toOptionalInt, toOptionalText } from "./assignment-snapshot";
import { addCalendarDays, parseCalendarDate, toCalendarDateKey } from "@/lib/date-utils";
import { auditService } from "./audit.service";
import type { AuthActor } from "@/lib/auth/route-guard";

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

export interface ProgramBlockItemInput {
  id?: string;
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

export interface ProgramWorkoutBlockInput {
  id?: string;
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
  items?: ProgramBlockItemInput[];
}

export interface ProgramWorkoutInput {
  id?: string;
  templateId?: string | null;
  title?: string | null;
  orderIndex?: number;
  blocks?: ProgramWorkoutBlockInput[];
}

export interface ProgramDayInput {
  id?: string;
  dayNumber?: number;
  dayName?: string;
  titleAr?: string;
  titleEn?: string;
  isRestDay?: boolean;
  templateId?: string | null;
  workouts?: ProgramWorkoutInput[];
}

export interface ProgramWeekInput {
  id?: string;
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
                  },
                  blocks: {
                    include: {
                      items: {
                        include: { exercise: true },
                        orderBy: { orderIndex: "asc" as const }
                      }
                    },
                    orderBy: { orderIndex: "asc" as const }
                  }
                }
              },
              blocks: {
                include: {
                  items: {
                    include: { exercise: true },
                    orderBy: { orderIndex: "asc" as const }
                  }
                },
                orderBy: { orderIndex: "asc" as const }
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

type NormalizedBlockItem = {
  id?: string;
  orderIndex: number;
  itemType: BlockItemType;
  exerciseId: string | null;
  targetSets: number | null;
  targetReps: string | null;
  targetWeightKg: number | null;
  targetDistanceKm: number | null;
  targetTimeSeconds: number | null;
  targetPace: string | null;
  targetRounds: number | null;
  restSeconds: number | null;
  tempo: string | null;
  instructions: string | null;
};

type NormalizedBlock = {
  id?: string;
  orderIndex: number;
  type: BlockType;
  title: string | null;
  rounds: number | null;
  durationSeconds: number | null;
  restBetweenRoundsSeconds: number | null;
  workSeconds?: number | null;
  restSeconds?: number | null;
  intervalSeconds?: number | null;
  partLabel?: string | null;
  notes: string | null;
  items: NormalizedBlockItem[];
};

type NormalizedWorkout = {
  id?: string;
  templateId: string | null;
  title: string | null;
  orderIndex: number;
  blocks?: NormalizedBlock[];
};

type NormalizedDay = {
  id?: string;
  dayNumber: number;
  titleEn: string;
  titleAr: string;
  isRestDay: boolean;
  workouts: NormalizedWorkout[];
};

type NormalizedWeek = {
  id?: string;
  weekNumber: number;
  focusEn: string | null;
  focusAr: string | null;
  days: NormalizedDay[];
};

async function normalizeAndValidateWeeks(
  tx: Prisma.TransactionClient,
  weeksInput?: ProgramWeekInput[]
): Promise<NormalizedWeek[]> {
  if (!weeksInput || weeksInput.length === 0) return [];

  const allTemplateIds = new Set<string>();
  const allExerciseIds = new Set<string>();

  const normalized: NormalizedWeek[] = weeksInput.map((w, wIdx) => {
    const focus = toOptionalText(w.focusEn ?? w.focusAr ?? w.focusNotes);
    const days: NormalizedDay[] = (w.days || []).map((d, dIdx) => {
      const isRestDay = Boolean(d.isRestDay);
      const rawTitle =
        toOptionalText(d.titleEn ?? d.titleAr ?? d.dayName) ||
        (isRestDay ? "Rest & Recovery" : `Day ${dIdx + 1}`);

      const workouts: NormalizedWorkout[] = [];
      if (!isRestDay) {
        if (Array.isArray(d.workouts) && d.workouts.length > 0) {
          d.workouts.forEach((pw, idx) => {
            const templateId = pw.templateId && pw.templateId.trim() ? pw.templateId.trim() : null;
            if (templateId) {
              allTemplateIds.add(templateId);
            }

            let normalizedBlocks: NormalizedBlock[] | undefined = undefined;
            if (Array.isArray(pw.blocks)) {
              normalizedBlocks = pw.blocks.map((b, bIdx) => {
                const bOrder = b.orderIndex !== undefined && b.orderIndex !== null ? Number(b.orderIndex) : bIdx + 1;
                const items: NormalizedBlockItem[] = (b.items || []).map((it, iIdx) => {
                  const iOrder =
                    it.orderIndex !== undefined && it.orderIndex !== null ? Number(it.orderIndex) : iIdx + 1;
                  const itemType = it.itemType || BlockItemType.EXERCISE;
                  const exerciseId =
                    itemType === BlockItemType.EXERCISE && it.exerciseId && it.exerciseId.trim()
                      ? it.exerciseId.trim()
                      : null;
                  if (exerciseId) {
                    allExerciseIds.add(exerciseId);
                  }
                  return {
                    id: it.id || undefined,
                    orderIndex: iOrder,
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
                  };
                });

                return {
                  id: b.id || undefined,
                  orderIndex: bOrder,
                  type: b.type || BlockType.SINGLE,
                  title: toOptionalText(b.title),
                  rounds: toOptionalInt(b.rounds),
                  durationSeconds: toOptionalInt(b.durationSeconds),
                  restBetweenRoundsSeconds: toOptionalInt(b.restBetweenRoundsSeconds),
                  workSeconds: toOptionalInt(b.workSeconds),
                  restSeconds: toOptionalInt(b.restSeconds),
                  intervalSeconds: toOptionalInt(b.intervalSeconds),
                  partLabel: toOptionalText(b.partLabel),
                  notes: toOptionalText(b.notes),
                  items
                };
              });
            }

            workouts.push({
              id: pw.id || undefined,
              templateId,
              title: toOptionalText(pw.title),
              orderIndex: pw.orderIndex !== undefined && pw.orderIndex !== null ? Number(pw.orderIndex) : idx,
              blocks: normalizedBlocks
            });
          });
        } else if (d.templateId && d.templateId.trim()) {
          const tid = d.templateId.trim();
          allTemplateIds.add(tid);
          workouts.push({
            templateId: tid,
            title: null,
            orderIndex: 0
          });
        }
      }

      return {
        id: d.id || undefined,
        dayNumber: d.dayNumber !== undefined && d.dayNumber !== null ? Number(d.dayNumber) : dIdx + 1,
        titleEn: rawTitle,
        titleAr: toOptionalText(d.titleAr) || rawTitle,
        isRestDay,
        workouts
      };
    });

    return {
      id: w.id || undefined,
      weekNumber: w.weekNumber !== undefined && w.weekNumber !== null ? Number(w.weekNumber) : wIdx + 1,
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

  if (allExerciseIds.size > 0) {
    const existingExercises = await tx.exercise.findMany({
      where: { id: { in: Array.from(allExerciseIds) } },
      select: { id: true }
    });
    const foundExSet = new Set(existingExercises.map((e) => e.id));
    for (const eid of Array.from(allExerciseIds)) {
      if (!foundExSet.has(eid)) {
        throw new ProgramServiceError(`Referenced exercise "${eid}" does not exist`, 400);
      }
    }
  }

  return normalized;
}

/**
 * Detect whether incoming weeks payload contains structural alterations compared to existing database state.
 * Structural changes:
 * - Added/removed/reordered weeks, days, workouts, blocks, items
 * - Toggled isRestDay
 * - Changed workout templateId, block type/rounds/duration/rest, or item targets/metrics
 * Non-structural changes (do not increment version):
 * - Program/week/day/workout title or description changes, week focus notes
 */
function detectStructuralChange(
  existingWeeks: Array<{
    id: string;
    weekNumber: number;
    days: Array<{
      id: string;
      dayNumber: number;
      isRestDay: boolean;
      workouts: Array<{
        id: string;
        templateId: string | null;
        title: string | null;
        orderIndex: number;
        blocks: Array<{
          id: string;
          orderIndex: number;
          type: BlockType;
          rounds: number | null;
          durationSeconds: number | null;
          restBetweenRoundsSeconds: number | null;
          workSeconds?: number | null;
          restSeconds?: number | null;
          intervalSeconds?: number | null;
          partLabel?: string | null;
          items: Array<{
            id: string;
            orderIndex: number;
            itemType: BlockItemType;
            exerciseId: string | null;
            targetSets: number | null;
            targetReps: string | null;
            targetWeightKg: number | null;
            targetDistanceKm: number | null;
            targetTimeSeconds: number | null;
            targetPace: string | null;
            targetRounds: number | null;
            restSeconds: number | null;
            tempo: string | null;
            instructions: string | null;
          }>;
        }>;
      }>;
    }>;
  }>,
  incomingWeeks: NormalizedWeek[]
): boolean {
  if (existingWeeks.length !== incomingWeeks.length) return true;

  for (let wIdx = 0; wIdx < incomingWeeks.length; wIdx++) {
    const exW = existingWeeks[wIdx];
    const inW = incomingWeeks[wIdx];
    if (exW.weekNumber !== inW.weekNumber) return true;
    if (exW.days.length !== inW.days.length) return true;

    for (let dIdx = 0; dIdx < inW.days.length; dIdx++) {
      const exD = exW.days[dIdx];
      const inD = inW.days[dIdx];
      if (exD.dayNumber !== inD.dayNumber) return true;
      if (exD.isRestDay !== inD.isRestDay) return true;

      if (!inD.isRestDay) {
        if (exD.workouts.length !== inD.workouts.length) return true;

        for (let woIdx = 0; woIdx < inD.workouts.length; woIdx++) {
          const exWo = exD.workouts[woIdx];
          const inWo = inD.workouts[woIdx];

          if (exWo.templateId !== inWo.templateId) return true;
          if (exWo.orderIndex !== inWo.orderIndex) return true;

          if (inWo.blocks && inWo.blocks.length > 0) {
            if (exWo.blocks.length !== inWo.blocks.length) return true;

            for (let bIdx = 0; bIdx < inWo.blocks.length; bIdx++) {
              const exB = exWo.blocks[bIdx];
              const inB = inWo.blocks[bIdx];

              if (exB.type !== inB.type) return true;
              if (exB.orderIndex !== inB.orderIndex) return true;
              if ((exB.rounds ?? null) !== (inB.rounds ?? null)) return true;
              if ((exB.durationSeconds ?? null) !== (inB.durationSeconds ?? null)) return true;
              if ((exB.restBetweenRoundsSeconds ?? null) !== (inB.restBetweenRoundsSeconds ?? null)) return true;
              if (((exB as any).workSeconds ?? null) !== ((inB as any).workSeconds ?? null)) return true;
              if (((exB as any).restSeconds ?? null) !== ((inB as any).restSeconds ?? null)) return true;
              if (((exB as any).intervalSeconds ?? null) !== ((inB as any).intervalSeconds ?? null)) return true;
              if (((exB as any).partLabel ?? null) !== ((inB as any).partLabel ?? null)) return true;

              if (exB.items.length !== inB.items.length) return true;

              for (let iIdx = 0; iIdx < inB.items.length; iIdx++) {
                const exI = exB.items[iIdx];
                const inI = inB.items[iIdx];

                if (exI.orderIndex !== inI.orderIndex) return true;
                if (exI.itemType !== inI.itemType) return true;
                if ((exI.exerciseId ?? null) !== (inI.exerciseId ?? null)) return true;
                if ((exI.targetSets ?? null) !== (inI.targetSets ?? null)) return true;
                if ((exI.targetReps ?? null) !== (inI.targetReps ?? null)) return true;
                if ((exI.targetWeightKg ?? null) !== (inI.targetWeightKg ?? null)) return true;
                if ((exI.targetDistanceKm ?? null) !== (inI.targetDistanceKm ?? null)) return true;
                if ((exI.targetTimeSeconds ?? null) !== (inI.targetTimeSeconds ?? null)) return true;
                if ((exI.targetPace ?? null) !== (inI.targetPace ?? null)) return true;
                if ((exI.targetRounds ?? null) !== (inI.targetRounds ?? null)) return true;
                if ((exI.restSeconds ?? null) !== (inI.restSeconds ?? null)) return true;
                if ((exI.tempo ?? null) !== (inI.tempo ?? null)) return true;
              }
            }
          }
        }
      }
    }
  }

  return false;
}

/**
 * Structural Diff & Upsert:
 * Synchronizes the entire program hierarchy (weeks, days, workouts, blocks, items)
 * preserving stable database primary keys (UUIDs) without cascading delete wipes.
 */
async function syncWeeksTree(
  tx: Prisma.TransactionClient,
  programId: string,
  incomingWeeks: NormalizedWeek[]
) {
  const existingWeeks = await tx.programWeek.findMany({
    where: { programId },
    include: {
      days: {
        include: {
          workouts: {
            include: {
              blocks: {
                include: { items: true },
                orderBy: { orderIndex: "asc" }
              }
            },
            orderBy: { orderIndex: "asc" }
          }
        },
        orderBy: { dayNumber: "asc" }
      }
    },
    orderBy: { weekNumber: "asc" }
  });

  const existingWeekMap = new Map(existingWeeks.map((w) => [w.id, w]));
  const existingWeekByNumber = new Map(existingWeeks.map((w) => [w.weekNumber, w]));
  const usedWeekIds = new Set<string>();

  for (const inW of incomingWeeks) {
    let weekRecord = (inW.id && existingWeekMap.get(inW.id)) || existingWeekByNumber.get(inW.weekNumber);

    if (weekRecord) {
      usedWeekIds.add(weekRecord.id);
      weekRecord = await tx.programWeek.update({
        where: { id: weekRecord.id },
        data: {
          weekNumber: inW.weekNumber,
          focusEn: inW.focusEn,
          focusAr: inW.focusAr
        },
        include: {
          days: {
            include: {
              workouts: {
                include: {
                  blocks: {
                    include: { items: true }
                  }
                }
              }
            }
          }
        }
      });
    } else {
      weekRecord = await tx.programWeek.create({
        data: {
          programId,
          weekNumber: inW.weekNumber,
          focusEn: inW.focusEn,
          focusAr: inW.focusAr
        },
        include: {
          days: {
            include: {
              workouts: {
                include: {
                  blocks: {
                    include: { items: true }
                  }
                }
              }
            }
          }
        }
      });
      usedWeekIds.add(weekRecord.id);
    }

    const existingDays = weekRecord.days || [];
    const existingDayMap = new Map(existingDays.map((d) => [d.id, d]));
    const existingDayByNumber = new Map(existingDays.map((d) => [d.dayNumber, d]));
    const usedDayIds = new Set<string>();

    for (const inD of inW.days) {
      let dayRecord = (inD.id && existingDayMap.get(inD.id)) || existingDayByNumber.get(inD.dayNumber);

      if (dayRecord) {
        usedDayIds.add(dayRecord.id);
        dayRecord = await tx.programDay.update({
          where: { id: dayRecord.id },
          data: {
            dayNumber: inD.dayNumber,
            titleEn: inD.titleEn,
            titleAr: inD.titleAr,
            isRestDay: inD.isRestDay
          },
          include: {
            workouts: {
              include: {
                blocks: {
                  include: { items: true }
                }
              }
            }
          }
        });
      } else {
        dayRecord = await tx.programDay.create({
          data: {
            weekId: weekRecord.id,
            dayNumber: inD.dayNumber,
            titleEn: inD.titleEn,
            titleAr: inD.titleAr,
            isRestDay: inD.isRestDay
          },
          include: {
            workouts: {
              include: {
                blocks: {
                  include: { items: true }
                }
              }
            }
          }
        });
        usedDayIds.add(dayRecord.id);
      }

      const existingWorkouts = dayRecord.workouts || [];
      const existingWorkoutMap = new Map(existingWorkouts.map((wo) => [wo.id, wo]));
      const existingWorkoutByOrder = new Map(existingWorkouts.map((wo) => [wo.orderIndex, wo]));
      const usedWorkoutIds = new Set<string>();

      if (!inD.isRestDay && inD.workouts.length > 0) {
        for (const inWo of inD.workouts) {
          let workoutRecord =
            (inWo.id && existingWorkoutMap.get(inWo.id)) || existingWorkoutByOrder.get(inWo.orderIndex);

          if (workoutRecord) {
            usedWorkoutIds.add(workoutRecord.id);
            workoutRecord = await tx.programWorkout.update({
              where: { id: workoutRecord.id },
              data: {
                templateId: inWo.templateId,
                title: inWo.title,
                orderIndex: inWo.orderIndex
              },
              include: {
                blocks: {
                  include: { items: true }
                }
              }
            });
          } else {
            workoutRecord = await tx.programWorkout.create({
              data: {
                dayId: dayRecord.id,
                templateId: inWo.templateId,
                title: inWo.title,
                orderIndex: inWo.orderIndex
              },
              include: {
                blocks: {
                  include: { items: true }
                }
              }
            });
            usedWorkoutIds.add(workoutRecord.id);

            // If new workout was created from a template without explicit blocks,
            // copy blocks & items from template to create independent master content
            if (!inWo.blocks && inWo.templateId) {
              const tmplBlocks = await tx.workoutBlock.findMany({
                where: { templateId: inWo.templateId },
                include: { items: { orderBy: { orderIndex: "asc" } } },
                orderBy: { orderIndex: "asc" }
              });

              for (const tb of tmplBlocks) {
                const createdBlock = await tx.workoutBlock.create({
                  data: {
                    programWorkoutId: workoutRecord.id,
                    orderIndex: tb.orderIndex,
                    type: tb.type,
                    title: tb.title,
                    rounds: tb.rounds,
                    durationSeconds: tb.durationSeconds,
                    restBetweenRoundsSeconds: tb.restBetweenRoundsSeconds,
                    workSeconds: tb.workSeconds,
                    restSeconds: tb.restSeconds,
                    intervalSeconds: tb.intervalSeconds,
                    partLabel: tb.partLabel,
                    notes: tb.notes
                  }
                });

                if (tb.items.length > 0) {
                  await tx.blockItem.createMany({
                    data: tb.items.map((ti) => ({
                      blockId: createdBlock.id,
                      orderIndex: ti.orderIndex,
                      itemType: ti.itemType,
                      exerciseId: ti.exerciseId,
                      targetSets: ti.targetSets,
                      targetReps: ti.targetReps,
                      targetWeightKg: ti.targetWeightKg,
                      targetDistanceKm: ti.targetDistanceKm,
                      targetTimeSeconds: ti.targetTimeSeconds,
                      targetPace: ti.targetPace,
                      targetRounds: ti.targetRounds,
                      restSeconds: ti.restSeconds,
                      tempo: ti.tempo,
                      instructions: ti.instructions
                    }))
                  });
                }
              }
            }
          }

          // If explicit blocks were provided for this workout, sync them
          if (inWo.blocks && inWo.blocks.length > 0) {
            const existingBlocks = workoutRecord.blocks || [];
            const existingBlockMap = new Map(existingBlocks.map((b) => [b.id, b]));
            const existingBlockByOrder = new Map(existingBlocks.map((b) => [b.orderIndex, b]));
            const usedBlockIds = new Set<string>();

            for (const inB of inWo.blocks) {
              let blockRecord =
                (inB.id && existingBlockMap.get(inB.id)) || existingBlockByOrder.get(inB.orderIndex);

              if (blockRecord) {
                usedBlockIds.add(blockRecord.id);
                blockRecord = await tx.workoutBlock.update({
                  where: { id: blockRecord.id },
                  data: {
                    orderIndex: inB.orderIndex,
                    type: inB.type,
                    title: inB.title,
                    rounds: inB.rounds,
                    durationSeconds: inB.durationSeconds,
                    restBetweenRoundsSeconds: inB.restBetweenRoundsSeconds,
                    workSeconds: inB.workSeconds,
                    restSeconds: inB.restSeconds,
                    intervalSeconds: inB.intervalSeconds,
                    partLabel: inB.partLabel,
                    notes: inB.notes
                  },
                  include: { items: true }
                });
              } else {
                blockRecord = await tx.workoutBlock.create({
                  data: {
                    programWorkoutId: workoutRecord.id,
                    orderIndex: inB.orderIndex,
                    type: inB.type,
                    title: inB.title,
                    rounds: inB.rounds,
                    durationSeconds: inB.durationSeconds,
                    restBetweenRoundsSeconds: inB.restBetweenRoundsSeconds,
                    workSeconds: inB.workSeconds,
                    restSeconds: inB.restSeconds,
                    intervalSeconds: inB.intervalSeconds,
                    partLabel: inB.partLabel,
                    notes: inB.notes
                  },
                  include: { items: true }
                });
                usedBlockIds.add(blockRecord.id);
              }

              const existingItems = blockRecord.items || [];
              const existingItemMap = new Map(existingItems.map((i) => [i.id, i]));
              const existingItemByOrder = new Map(existingItems.map((i) => [i.orderIndex, i]));
              const usedItemIds = new Set<string>();

              for (const inI of inB.items) {
                let itemRecord =
                  (inI.id && existingItemMap.get(inI.id)) || existingItemByOrder.get(inI.orderIndex);

                if (itemRecord) {
                  usedItemIds.add(itemRecord.id);
                  await tx.blockItem.update({
                    where: { id: itemRecord.id },
                    data: {
                      orderIndex: inI.orderIndex,
                      itemType: inI.itemType,
                      exerciseId: inI.exerciseId,
                      targetSets: inI.targetSets,
                      targetReps: inI.targetReps,
                      targetWeightKg: inI.targetWeightKg,
                      targetDistanceKm: inI.targetDistanceKm,
                      targetTimeSeconds: inI.targetTimeSeconds,
                      targetPace: inI.targetPace,
                      targetRounds: inI.targetRounds,
                      restSeconds: inI.restSeconds,
                      tempo: inI.tempo,
                      instructions: inI.instructions
                    }
                  });
                } else {
                  const createdItem = await tx.blockItem.create({
                    data: {
                      blockId: blockRecord.id,
                      orderIndex: inI.orderIndex,
                      itemType: inI.itemType,
                      exerciseId: inI.exerciseId,
                      targetSets: inI.targetSets,
                      targetReps: inI.targetReps,
                      targetWeightKg: inI.targetWeightKg,
                      targetDistanceKm: inI.targetDistanceKm,
                      targetTimeSeconds: inI.targetTimeSeconds,
                      targetPace: inI.targetPace,
                      targetRounds: inI.targetRounds,
                      restSeconds: inI.restSeconds,
                      tempo: inI.tempo,
                      instructions: inI.instructions
                    }
                  });
                  usedItemIds.add(createdItem.id);
                }
              }

              for (const exI of existingItems) {
                if (!usedItemIds.has(exI.id)) {
                  await tx.blockItem.delete({ where: { id: exI.id } });
                }
              }
            }

            for (const exB of existingBlocks) {
              if (!usedBlockIds.has(exB.id)) {
                await tx.workoutBlock.delete({ where: { id: exB.id } });
              }
            }
          }
        }
      }

      for (const exWo of existingWorkouts) {
        if (!usedWorkoutIds.has(exWo.id)) {
          await tx.programWorkout.delete({ where: { id: exWo.id } });
        }
      }
    }

    for (const exD of existingDays) {
      if (!usedDayIds.has(exD.id)) {
        await tx.programDay.delete({ where: { id: exD.id } });
      }
    }
  }

  for (const exW of existingWeeks) {
    if (!usedWeekIds.has(exW.id)) {
      await tx.programWeek.delete({ where: { id: exW.id } });
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
   * Get all training programs with sports, optional nutrition program, weeks, days, blocks, items, and status.
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
   * Get single program by ID with structured weeks, days, workouts, blocks, items, and nutrition plan.
   */
  async getProgramById(id: string) {
    const program = await prisma.trainingProgram.findUnique({
      where: { id },
      include: programInclude
    });
    return program ? decorateProgram(program) : null;
  }

  /**
   * Create training program with structured weeks, days, workouts, blocks, items,
   * lifecycle status (DRAFT | ACTIVE | ARCHIVED), and optional nutrition linkage.
   * masterVersion initializes to 1.
   */
  async createProgram(
    data: {
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
    },
    actor?: AuthActor
  ) {
    if (actor?.user?.role === "CLIENT") {
      throw new ProgramServiceError("Forbidden: Clients cannot manage training programs", 403);
    }

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

    let creatorId = data.creatorId || actor?.coachProfileId || null;
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
            isTemplate: statusFlags.isTemplate,
            masterVersion: 1
          }
        });

        if (normalizedWeeks.length > 0) {
          await syncWeeksTree(tx, program.id, normalizedWeeks);
        }

        return program.id;
      },
      { maxWait: 10000, timeout: 30000 }
    );

    const created = await prisma.trainingProgram.findUniqueOrThrow({
      where: { id: createdId },
      include: programInclude
    });

    await auditService.log({
      actor,
      action: "CREATE_PROGRAM",
      entityType: "TrainingProgram",
      entityId: created.id,
      newValues: {
        titleEn: created.titleEn,
        durationWeeks: created.durationWeeks,
        sportId: created.sportId,
        creatorId: created.creatorId,
        masterVersion: created.masterVersion
      }
    });

    return decorateProgram(created);
  }

  /**
   * Update training program metadata, status, optional nutrition linkage, and weekly schedule.
   * Uses diff/upsert pattern to preserve stable IDs across weeks, days, workouts, blocks, and items.
   * Increments masterVersion by exactly 1 ONLY when structural changes occur (max 1 increment per save).
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
    },
    actor?: AuthActor
  ) {
    if (actor?.user?.role === "CLIENT") {
      throw new ProgramServiceError("Forbidden: Clients cannot manage training programs", 403);
    }

    const existing = await prisma.trainingProgram.findUnique({
      where: { id },
      select: {
        id: true,
        isActive: true,
        isTemplate: true,
        titleEn: true,
        titleAr: true,
        creatorId: true,
        creator: { select: { userId: true } },
        masterVersion: true,
        durationWeeks: true
      }
    });
    if (!existing) {
      throw new ProgramServiceError("Training program not found", 404);
    }

    if (actor?.user?.role === "COACH") {
      const isOwner =
        existing.creatorId === actor.coachProfileId ||
        existing.creator?.userId === actor.user.id ||
        existing.creatorId === actor.user.id;
      if (!isOwner) {
        throw new ProgramServiceError("Forbidden: Coaches may only modify their own training programs", 403);
      }
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

    let isStructuralChange = false;
    let nextMasterVersion = existing.masterVersion;

    await prisma.$transaction(
      async (tx) => {
        const hasWeeks = Array.isArray(data.weeks);
        let normalizedWeeks: NormalizedWeek[] = [];

        if (hasWeeks) {
          normalizedWeeks = await normalizeAndValidateWeeks(tx, data.weeks);

          const currentWeeksForDiff = await tx.programWeek.findMany({
            where: { programId: id },
            include: {
              days: {
                include: {
                  workouts: {
                    include: {
                      blocks: {
                        include: { items: true },
                        orderBy: { orderIndex: "asc" }
                      }
                    },
                    orderBy: { orderIndex: "asc" }
                  }
                },
                orderBy: { dayNumber: "asc" }
              }
            },
            orderBy: { weekNumber: "asc" }
          });

          isStructuralChange = detectStructuralChange(currentWeeksForDiff, normalizedWeeks);
        } else if (data.durationWeeks !== undefined && data.durationWeeks !== existing.durationWeeks) {
          isStructuralChange = true;
        }

        if (isStructuralChange) {
          nextMasterVersion = existing.masterVersion + 1;
        }

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
          ...(isStructuralChange && { masterVersion: nextMasterVersion }),
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
          await syncWeeksTree(tx, id, normalizedWeeks);
        }
      },
      { maxWait: 10000, timeout: 30000 }
    );

    if (isStructuralChange) {
      await auditService.log({
        actor,
        action: "UPDATE_PROGRAM_VERSION",
        entityType: "TrainingProgram",
        entityId: id,
        oldValues: { masterVersion: existing.masterVersion },
        newValues: { masterVersion: nextMasterVersion }
      });
    }

    await auditService.log({
      actor,
      action: "UPDATE_PROGRAM",
      entityType: "TrainingProgram",
      entityId: id,
      oldValues: {
        titleEn: existing.titleEn,
        masterVersion: existing.masterVersion
      },
      newValues: {
        titleEn: nextTitleEn || existing.titleEn,
        masterVersion: nextMasterVersion,
        isStructuralChange
      }
    });

    const updated = await prisma.trainingProgram.findUniqueOrThrow({
      where: { id },
      include: programInclude
    });

    return decorateProgram(updated);
  }

  /**
   * Safe delete program: prevents silent corruption by returning 409 Conflict if linked to client assignments.
   */
  async deleteProgram(id: string, actor?: AuthActor) {
    if (actor?.user?.role === "CLIENT") {
      throw new ProgramServiceError("Forbidden: Clients cannot manage training programs", 403);
    }

    const existing = await prisma.trainingProgram.findUnique({
      where: { id },
      include: {
        creator: { select: { userId: true } },
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

    if (actor?.user?.role === "COACH") {
      const isOwner =
        !existing.creatorId ||
        existing.creatorId === actor.coachProfileId ||
        existing.creator?.userId === actor.user.id;
      if (!isOwner) {
        throw new ProgramServiceError("Forbidden: Coaches may only delete their own training programs", 403);
      }
    }

    const totalRefs = existing._count.assignments + existing._count.programAssignments;
    if (totalRefs > 0) {
      throw new ProgramServiceError(
        `Cannot delete "${existing.titleEn || existing.titleAr}" because it is linked to ${existing._count.programAssignments} program assignment(s) and ${existing._count.assignments} scheduled workout(s). Archive it instead to preserve athlete history.`,
        409
      );
    }

    const deleted = await prisma.trainingProgram.delete({
      where: { id }
    });

    await auditService.log({
      actor,
      action: "DELETE_PROGRAM",
      entityType: "TrainingProgram",
      entityId: id,
      oldValues: {
        titleEn: existing.titleEn,
        masterVersion: existing.masterVersion
      }
    });

    return deleted;
  }

  /**
   * Duplicate training program with full hierarchy (weeks, days, workouts, blocks, items).
   * Sets masterVersion to 1 and appends "(Copy)" to the title.
   */
  async duplicateProgram(id: string, actor?: AuthActor) {
    if (actor?.user?.role === "CLIENT") {
      throw new ProgramServiceError("Forbidden: Clients cannot manage training programs", 403);
    }

    const source = await this.getProgramById(id);
    if (!source) {
      throw new ProgramServiceError("Training program not found", 404);
    }

    const newTitleEn = `${source.titleEn} (Copy)`;
    const newTitleAr = source.titleAr ? `${source.titleAr} (نسخة)` : newTitleEn;

    const weeksInput: ProgramWeekInput[] = (source.weeks || []).map((w) => ({
      weekNumber: w.weekNumber,
      focusEn: w.focusEn,
      focusAr: w.focusAr,
      days: (w.days || []).map((d) => ({
        dayNumber: d.dayNumber,
        titleEn: d.titleEn,
        titleAr: d.titleAr,
        isRestDay: d.isRestDay,
        workouts: (d.workouts || []).map((wo) => ({
          templateId: wo.templateId,
          title: wo.title,
          orderIndex: wo.orderIndex,
          blocks: (wo.blocks || []).map((b) => ({
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
            notes: b.notes,
            items: (b.items || []).map((it) => ({
              orderIndex: it.orderIndex,
              itemType: it.itemType,
              exerciseId: it.exerciseId,
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
          }))
        }))
      }))
    }));

    const duplicated = await this.createProgram(
      {
        titleEn: newTitleEn,
        titleAr: newTitleAr,
        descriptionEn: source.descriptionEn,
        descriptionAr: source.descriptionAr,
        durationWeeks: source.durationWeeks,
        sportId: source.sportId,
        goalType: source.goalType,
        difficulty: source.difficulty,
        creatorId: actor?.coachProfileId || source.creatorId || undefined,
        nutritionProgramId: source.nutritionProgramId,
        status: "DRAFT",
        isActive: true,
        isTemplate: false,
        weeks: weeksInput
      },
      actor
    );

    await auditService.log({
      actor,
      action: "DUPLICATE_PROGRAM",
      entityType: "TrainingProgram",
      entityId: duplicated.id,
      oldValues: { sourceProgramId: id, sourceMasterVersion: source.masterVersion },
      newValues: { duplicatedProgramId: duplicated.id, titleEn: duplicated.titleEn, masterVersion: 1 }
    });

    return duplicated;
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
      templateId: string | null;
      templateTitle: string;
      templateDescription: string | null;
      orderIndex: number;
      scheduledDate: Date;
      dateKey: string;
      exercises: any[];
      blocks: any[];
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
          const blocks =
            pw.blocks && pw.blocks.length > 0
              ? pw.blocks
              : pw.template?.blocks && pw.template.blocks.length > 0
              ? pw.template.blocks
              : [];

          let legacyExercises = pw.template?.exercises || [];
          if (legacyExercises.length === 0 && blocks.length > 0) {
            let orderIdx = 0;
            const derived: any[] = [];
            for (const b of blocks) {
              for (const it of b.items || []) {
                if (it.exerciseId && (!it.itemType || it.itemType === "EXERCISE")) {
                  derived.push({
                    exerciseId: it.exerciseId,
                    exercise: it.exercise,
                    orderIndex: orderIdx++,
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
            legacyExercises = derived;
          }

          plannedWorkouts.push({
            weekNumber: week.weekNumber,
            dayNumber: day.dayNumber,
            dayTitle: day.titleEn || day.titleAr,
            templateId: pw.templateId,
            templateTitle: pw.title || pw.template?.titleEn || pw.template?.titleAr || day.titleEn || "Workout Session",
            templateDescription: pw.template?.descriptionEn || pw.template?.descriptionAr || null,
            orderIndex: pw.orderIndex,
            scheduledDate: dayDate,
            dateKey,
            exercises: legacyExercises,
            blocks
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
   * - Creates ProgramAssignment with sourceMasterVersion snapshot + traceable ClientWorkoutAssignment records
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
    },
    actor?: AuthActor
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
      preview.plannedWorkouts.length > 0 &&
      preview.dateConflicts.length >= preview.plannedWorkouts.length
    ) {
      // Every planned date is taken: skipping would create an empty program
      // assignment shell with zero sessions (and block retries as a duplicate).
      throw new ProgramServiceError(
        preview.duplicateProgramAssignments.length > 0
          ? `All ${preview.plannedWorkouts.length} workout dates already exist for this overlapping program assignment. Pick a new start date instead.`
          : `All ${preview.plannedWorkouts.length} workout dates already have assigned workouts, so nothing would be created. Pick a different start date instead.`,
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
            notes: toOptionalText(options?.notes),
            sourceMasterVersion: preview.program.masterVersion,
            programTitleSnapshot: preview.program.titleEn || preview.program.titleAr
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
              programWorkoutOrder: pw.orderIndex,
              scheduledDate: pw.scheduledDate,
              status: AssignmentStatus.SCHEDULED,
              coachNotes: `Week ${pw.weekNumber} Day ${pw.dayNumber}: ${pw.dayTitle} (${preview.program.titleEn})`
            }
          });

          // 1. Populate normalized AssignmentBlock & AssignmentBlockItem
          if (pw.blocks && pw.blocks.length > 0) {
            for (const b of pw.blocks) {
              const createdBlock = await tx.assignmentBlock.create({
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
                    assignmentBlockId: createdBlock.id,
                    orderIndex: it.orderIndex,
                    itemType: it.itemType || "EXERCISE",
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
          }

          // 2. Legacy ClientWorkoutAssignmentExercise compatibility
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

    await auditService.log({
      actor: actor || { user: { id: resolvedCoachId } },
      action: "APPLY_PROGRAM",
      entityType: "ProgramAssignment",
      entityId: txResult.programAssignment.id,
      newValues: {
        programId: preview.program.id,
        clientId,
        sourceMasterVersion: preview.program.masterVersion,
        workoutsCount: txResult.createdIds.length
      }
    });

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

  /**
   * Preview rest-day sync when a master program day was toggled to Rest Day after assignment.
   * Returns unstarted scheduled workouts that would be removed, and any started/completed workouts that are protected.
   */
  async previewRestDaySync(programId: string, programAssignmentId: string) {
    const program = await prisma.trainingProgram.findUnique({
      where: { id: programId },
      include: {
        weeks: {
          include: {
            days: {
              where: { isRestDay: true },
              select: { dayNumber: true, week: { select: { weekNumber: true } } }
            }
          }
        }
      }
    });
    if (!program) {
      throw new ProgramServiceError("Training program not found", 404);
    }

    const restDayPairs = new Set<string>();
    for (const w of program.weeks) {
      for (const d of w.days) {
        restDayPairs.add(`${w.weekNumber}:${d.dayNumber}`);
      }
    }

    const assignments = await prisma.clientWorkoutAssignment.findMany({
      where: {
        programAssignmentId,
        programWeekNumber: { not: null },
        programDayNumber: { not: null }
      },
      include: {
        workoutLog: true
      }
    });

    const affected = assignments.filter((a) => restDayPairs.has(`${a.programWeekNumber}:${a.programDayNumber}`));

    const unstarted = affected.filter((a) => a.status === AssignmentStatus.SCHEDULED && a.workoutLog === null);
    const protectedOrCompleted = affected.filter((a) => a.status !== AssignmentStatus.SCHEDULED || a.workoutLog !== null);

    return {
      totalAffected: affected.length,
      unstartedWorkouts: unstarted,
      protectedWorkouts: protectedOrCompleted,
      canSync: unstarted.length > 0
    };
  }

  /**
   * Apply confirmed rest-day sync: removes unstarted scheduled workouts on days that are now rest days in master.
   * Emits REST_DAY_SYNC in AuditLog. Never silently removes started or completed sessions.
   */
  async applyRestDaySync(programId: string, programAssignmentId: string, actor?: AuthActor) {
    const preview = await this.previewRestDaySync(programId, programAssignmentId);

    if (preview.unstartedWorkouts.length === 0) {
      return { removedCount: 0, message: "No unstarted workouts to remove" };
    }

    const unstartedIds = preview.unstartedWorkouts.map((w) => w.id);

    await prisma.$transaction(async (tx) => {
      await tx.assignmentBlock.deleteMany({
        where: { assignmentId: { in: unstartedIds } }
      });
      await tx.clientWorkoutAssignmentExercise.deleteMany({
        where: { assignmentId: { in: unstartedIds } }
      });
      await tx.clientWorkoutAssignment.deleteMany({
        where: { id: { in: unstartedIds } }
      });
    });

    await auditService.log({
      actor,
      action: "REST_DAY_SYNC",
      entityType: "ProgramAssignment",
      entityId: programAssignmentId,
      newValues: {
        removedWorkoutIds: unstartedIds,
        removedCount: unstartedIds.length
      }
    });

    return {
      removedCount: unstartedIds.length,
      removedWorkoutIds: unstartedIds
    };
  }
}

export const programService = new ProgramService();

import { MetricType, Prisma } from "@prisma/client";

export interface TargetExerciseInput {
  exerciseId: string;
  orderIndex?: number | null;
  targetSets?: number | null;
  targetReps?: string | null;
  targetWeightKg?: number | null;
  targetDistanceKm?: number | null;
  targetTimeSeconds?: number | null;
  targetPace?: string | null;
  targetRounds?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
}

export interface SnapshotSourceExercise extends TargetExerciseInput {
  exerciseNameEn?: string | null;
  metricType?: MetricType | null;
  exercise?: {
    nameEn?: string | null;
    nameAr?: string | null;
    metricType?: MetricType | null;
  } | null;
}

export function toOptionalInt(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

export function toOptionalFloat(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

export function toOptionalText(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const trimmed = String(val).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeTemplateExerciseData(
  templateId: string,
  items: TargetExerciseInput[],
  metricMap?: Map<string, MetricType>
): Prisma.WorkoutTemplateExerciseCreateManyInput[] {
  return items.map((ex, idx) => {
    const metric = metricMap?.get(ex.exerciseId) ?? MetricType.SETS_REPS_WEIGHT;
    const isSetsBased = metric === MetricType.SETS_REPS_WEIGHT || metric === MetricType.TIME_HOLD;

    return {
      templateId,
      exerciseId: ex.exerciseId,
      orderIndex: toOptionalInt(ex.orderIndex) ?? idx + 1,
      targetSets: toOptionalInt(ex.targetSets) ?? (isSetsBased ? 3 : null),
      targetReps:
        ex.targetReps !== undefined
          ? toOptionalText(ex.targetReps)
          : metric === MetricType.SETS_REPS_WEIGHT
          ? "10-12"
          : null,
      targetWeightKg: toOptionalFloat(ex.targetWeightKg),
      targetDistanceKm: toOptionalFloat(ex.targetDistanceKm),
      targetTimeSeconds: toOptionalInt(ex.targetTimeSeconds),
      targetPace: toOptionalText(ex.targetPace),
      targetRounds: toOptionalInt(ex.targetRounds),
      restSeconds: toOptionalInt(ex.restSeconds) ?? 60,
      tempo: toOptionalText(ex.tempo),
      notes: toOptionalText(ex.notes)
    };
  });
}

export function buildAssignmentSnapshotData(
  assignmentId: string,
  items: SnapshotSourceExercise[]
): Prisma.ClientWorkoutAssignmentExerciseCreateManyInput[] {
  return items.map((item, idx) => ({
    assignmentId,
    exerciseId: item.exerciseId,
    exerciseNameEn:
      toOptionalText(item.exerciseNameEn) ||
      toOptionalText(item.exercise?.nameEn) ||
      toOptionalText(item.exercise?.nameAr),
    metricType: item.metricType || item.exercise?.metricType || MetricType.SETS_REPS_WEIGHT,
    orderIndex: toOptionalInt(item.orderIndex) ?? idx + 1,
    targetSets: toOptionalInt(item.targetSets),
    targetReps: toOptionalText(item.targetReps),
    targetWeightKg: toOptionalFloat(item.targetWeightKg),
    targetDistanceKm: toOptionalFloat(item.targetDistanceKm),
    targetTimeSeconds: toOptionalInt(item.targetTimeSeconds),
    targetPace: toOptionalText(item.targetPace),
    targetRounds: toOptionalInt(item.targetRounds),
    restSeconds: toOptionalInt(item.restSeconds),
    tempo: toOptionalText(item.tempo),
    notes: toOptionalText(item.notes)
  }));
}

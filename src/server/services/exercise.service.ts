import prisma from "@/lib/prisma";
import { Difficulty, MetricType, BodyPart } from "@prisma/client";

export class ExerciseServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ExerciseServiceError";
    this.statusCode = statusCode;
  }
}

export interface CreateExerciseInput {
  nameAr?: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  instructionsAr?: string;
  instructionsEn?: string;
  commonMistakesAr?: string;
  commonMistakesEn?: string;
  coachTipsAr?: string;
  coachTipsEn?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  difficulty?: Difficulty;
  metricType?: MetricType;
  isActive?: boolean;
  sportId?: string;
  sportIds?: string[];
  primaryMuscleId?: string | null;
  equipmentId?: string | null;
  contraindicatedBodyParts?: BodyPart[];
}

export interface UpdateExerciseInput extends Partial<CreateExerciseInput> {}

const EXERCISE_INCLUDE = {
  sport: true,
  exerciseSports: {
    include: { sport: true },
    orderBy: { assignedAt: "asc" as const }
  },
  primaryMuscle: true,
  equipment: true
};

function serializeExercise<T extends {
  sportId?: string | null;
  sport?: any;
  exerciseSports?: Array<{ sportId: string; sport: any; assignedAt: Date | string }>;
}>(exercise: T) {
  const joinedSports = (exercise.exerciseSports || [])
    .map((es) => es.sport)
    .filter(Boolean);

  const uniqueSportsMap = new Map<string, any>();
  for (const s of joinedSports) {
    uniqueSportsMap.set(s.id, s);
  }
  if (uniqueSportsMap.size === 0 && exercise.sport) {
    uniqueSportsMap.set(exercise.sport.id, exercise.sport);
  }

  const sports = Array.from(uniqueSportsMap.values());
  const sportIds = sports.map((s) => s.id);
  const primarySport = exercise.sport || sports[0] || null;
  const primarySportId = exercise.sportId || primarySport?.id || null;

  return {
    ...exercise,
    sportId: primarySportId,
    sport: primarySport,
    sports,
    sportIds
  };
}

function normalizeSportIdList(sportIds?: string[], fallbackSportId?: string | null): string[] {
  const raw = [
    ...(Array.isArray(sportIds) ? sportIds : []),
    ...(fallbackSportId ? [fallbackSportId] : [])
  ];
  return Array.from(new Set(raw.map((id) => String(id).trim()).filter(Boolean)));
}

export class ExerciseService {
  /**
   * Fetch exercises with multi-sport filtering and relational inclusion
   */
  async getExercises(filters?: {
    search?: string;
    sportId?: string;
    sportIds?: string[];
    muscleId?: string;
    difficulty?: Difficulty | "ALL";
    activeOnly?: boolean;
  }) {
    const andClauses: any[] = [];

    if (filters?.activeOnly) {
      andClauses.push({ isActive: true });
    }

    const requestedSportIds = filters?.sportIds?.filter((id) => id && id !== "ALL") || [];
    if (requestedSportIds.length > 0) {
      andClauses.push({
        OR: [
          { exerciseSports: { some: { sportId: { in: requestedSportIds } } } },
          { sportId: { in: requestedSportIds } }
        ]
      });
    } else if (filters?.sportId && filters.sportId !== "ALL") {
      andClauses.push({
        OR: [
          { exerciseSports: { some: { sportId: filters.sportId } } },
          { sportId: filters.sportId }
        ]
      });
    }

    if (filters?.muscleId && filters.muscleId !== "ALL") {
      andClauses.push({ primaryMuscleId: filters.muscleId });
    }

    if (filters?.difficulty && filters.difficulty !== "ALL") {
      andClauses.push({ difficulty: filters.difficulty });
    }

    if (filters?.search && filters.search.trim() !== "") {
      const q = filters.search.trim();
      andClauses.push({
        OR: [
          { nameAr: { contains: q, mode: "insensitive" } },
          { nameEn: { contains: q, mode: "insensitive" } },
          { descriptionAr: { contains: q, mode: "insensitive" } },
          { descriptionEn: { contains: q, mode: "insensitive" } }
        ]
      });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

    const rows = await prisma.exercise.findMany({
      where,
      include: EXERCISE_INCLUDE,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
    });

    return rows.map((row) => serializeExercise(row));
  }

  /**
   * Fetch single exercise by ID
   */
  async getExerciseById(id: string) {
    const row = await prisma.exercise.findUnique({
      where: { id },
      include: EXERCISE_INCLUDE
    });
    return row ? serializeExercise(row) : null;
  }

  private async validateSportsExist(sportIds: string[]) {
    if (sportIds.length === 0) {
      throw new ExerciseServiceError("At least one sport must be selected for an exercise", 400);
    }
    const existingSports = await prisma.sport.findMany({
      where: { id: { in: sportIds } },
      select: { id: true }
    });
    if (existingSports.length !== sportIds.length) {
      const foundSet = new Set(existingSports.map((s) => s.id));
      const missing = sportIds.filter((id) => !foundSet.has(id));
      throw new ExerciseServiceError(`Invalid sport ID(s): ${missing.join(", ")}`, 400);
    }
  }

  /**
   * Create a multi-sport exercise in PostgreSQL atomically
   */
  async createExercise(data: CreateExerciseInput) {
    const nameEn = (data.nameEn || data.nameAr || "").trim();
    const nameAr = (data.nameAr || data.nameEn || "").trim();

    if (!nameEn) {
      throw new ExerciseServiceError("Exercise name is required", 400);
    }

    const sportIds = normalizeSportIdList(data.sportIds, data.sportId);
    await this.validateSportsExist(sportIds);

    const primarySportId =
      data.sportId && sportIds.includes(data.sportId) ? data.sportId : sportIds[0];

    const created = await prisma.$transaction(
      async (tx) => {
        return await tx.exercise.create({
          data: {
            nameAr: nameAr || nameEn,
            nameEn,
            descriptionAr: data.descriptionAr?.trim() || null,
            descriptionEn: data.descriptionEn?.trim() || null,
            instructionsAr: data.instructionsAr?.trim() || null,
            instructionsEn: data.instructionsEn?.trim() || null,
            commonMistakesAr: data.commonMistakesAr?.trim() || null,
            commonMistakesEn: data.commonMistakesEn?.trim() || null,
            coachTipsAr: data.coachTipsAr?.trim() || null,
            coachTipsEn: data.coachTipsEn?.trim() || null,
            videoUrl: data.videoUrl?.trim() || null,
            thumbnailUrl: data.thumbnailUrl?.trim() || null,
            difficulty: data.difficulty || Difficulty.BEGINNER,
            metricType: data.metricType || MetricType.SETS_REPS_WEIGHT,
            isActive: data.isActive ?? true,
            sportId: primarySportId,
            primaryMuscleId: data.primaryMuscleId || null,
            equipmentId: data.equipmentId || null,
            contraindicatedBodyParts: data.contraindicatedBodyParts || [],
            exerciseSports: {
              createMany: {
                data: sportIds.map((sid) => ({ sportId: sid })),
                skipDuplicates: true
              }
            }
          },
          include: EXERCISE_INCLUDE
        });
      },
      { maxWait: 10000, timeout: 30000 }
    );

    return serializeExercise(created);
  }

  /**
   * Update an exercise and synchronize its multi-sport associations
   */
  async updateExercise(id: string, data: UpdateExerciseInput) {
    const existing = await prisma.exercise.findUnique({ where: { id } });
    if (!existing) {
      throw new ExerciseServiceError("Exercise not found", 404);
    }

    const hasSportIdsInput = data.sportIds !== undefined;
    let nextSportIds: string[] | undefined;
    let nextPrimarySportId: string | undefined;

    if (hasSportIdsInput) {
      nextSportIds = normalizeSportIdList(data.sportIds, undefined);
      await this.validateSportsExist(nextSportIds);
      nextPrimarySportId =
        data.sportId && nextSportIds.includes(data.sportId)
          ? data.sportId
          : existing.sportId && nextSportIds.includes(existing.sportId)
            ? existing.sportId
            : nextSportIds[0];
    } else if (data.sportId !== undefined && data.sportId) {
      await this.validateSportsExist([data.sportId]);
      nextPrimarySportId = data.sportId;
    }

    const updated = await prisma.$transaction(
      async (tx) => {
        if (nextSportIds !== undefined) {
          await tx.exerciseSport.deleteMany({
            where: {
              exerciseId: id,
              sportId: { notIn: nextSportIds }
            }
          });
          await tx.exerciseSport.createMany({
            data: nextSportIds.map((sid) => ({ exerciseId: id, sportId: sid })),
            skipDuplicates: true
          });
        } else if (nextPrimarySportId) {
          await tx.exerciseSport.upsert({
            where: {
              exerciseId_sportId: {
                exerciseId: id,
                sportId: nextPrimarySportId
              }
            },
            update: {},
            create: {
              exerciseId: id,
              sportId: nextPrimarySportId
            }
          });
        }

        return await tx.exercise.update({
          where: { id },
          data: {
            ...(data.nameAr !== undefined && { nameAr: data.nameAr.trim() || existing.nameAr }),
            ...(data.nameEn !== undefined && { nameEn: data.nameEn.trim() || existing.nameEn }),
            ...(data.descriptionAr !== undefined && { descriptionAr: data.descriptionAr?.trim() || null }),
            ...(data.descriptionEn !== undefined && { descriptionEn: data.descriptionEn?.trim() || null }),
            ...(data.instructionsAr !== undefined && { instructionsAr: data.instructionsAr?.trim() || null }),
            ...(data.instructionsEn !== undefined && { instructionsEn: data.instructionsEn?.trim() || null }),
            ...(data.commonMistakesAr !== undefined && { commonMistakesAr: data.commonMistakesAr?.trim() || null }),
            ...(data.commonMistakesEn !== undefined && { commonMistakesEn: data.commonMistakesEn?.trim() || null }),
            ...(data.coachTipsAr !== undefined && { coachTipsAr: data.coachTipsAr?.trim() || null }),
            ...(data.coachTipsEn !== undefined && { coachTipsEn: data.coachTipsEn?.trim() || null }),
            ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl?.trim() || null }),
            ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl?.trim() || null }),
            ...(data.difficulty && { difficulty: data.difficulty }),
            ...(data.metricType && { metricType: data.metricType }),
            ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
            ...(nextPrimarySportId && { sportId: nextPrimarySportId }),
            ...(data.primaryMuscleId !== undefined && { primaryMuscleId: data.primaryMuscleId || null }),
            ...(data.equipmentId !== undefined && { equipmentId: data.equipmentId || null }),
            ...(data.contraindicatedBodyParts && { contraindicatedBodyParts: data.contraindicatedBodyParts })
          },
          include: EXERCISE_INCLUDE
        });
      },
      { maxWait: 10000, timeout: 30000 }
    );

    return serializeExercise(updated);
  }

  /**
   * Delete an exercise only when not referenced by templates, assignments, or logs
   */
  async deleteExercise(id: string) {
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            templateExercises: true,
            assignmentExercises: true,
            loggedExercises: true
          }
        }
      }
    });

    if (!exercise) {
      throw new ExerciseServiceError("Exercise not found", 404);
    }

    const deps: string[] = [];
    if (exercise._count.templateExercises > 0) {
      deps.push(`${exercise._count.templateExercises} workout template(s)`);
    }
    if (exercise._count.assignmentExercises > 0) {
      deps.push(`${exercise._count.assignmentExercises} assignment snapshot(s)`);
    }
    if (exercise._count.loggedExercises > 0) {
      deps.push(`${exercise._count.loggedExercises} workout log(s)`);
    }

    if (deps.length > 0) {
      throw new ExerciseServiceError(
        `Cannot delete "${exercise.nameEn}" because it is referenced by ${deps.join(", ")}. Deactivate it instead to preserve historical records.`,
        409
      );
    }

    await prisma.exercise.delete({ where: { id } });
    return true;
  }

  /**
   * Get all muscle groups
   */
  async getMuscleGroups() {
    return await prisma.muscleGroup.findMany({
      orderBy: { nameEn: "asc" }
    });
  }

  /**
   * Get all equipment
   */
  async getEquipment() {
    return await prisma.equipment.findMany({
      orderBy: { nameEn: "asc" }
    });
  }
}

export const exerciseService = new ExerciseService();

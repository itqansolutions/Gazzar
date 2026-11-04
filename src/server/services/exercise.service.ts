import prisma from "@/lib/prisma";
import { Difficulty, MetricType, BodyPart } from "@prisma/client";

export interface CreateExerciseInput {
  nameAr: string;
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
  sportId: string;
  primaryMuscleId?: string;
  equipmentId?: string;
  contraindicatedBodyParts?: BodyPart[];
}

export interface UpdateExerciseInput extends Partial<CreateExerciseInput> {}

export class ExerciseService {
  /**
   * Fetch exercises with filtering and relational inclusion
   */
  async getExercises(filters?: {
    search?: string;
    sportId?: string;
    muscleId?: string;
    difficulty?: Difficulty | "ALL";
  }) {
    const where: any = {};

    if (filters?.sportId && filters.sportId !== "ALL") {
      where.sportId = filters.sportId;
    }

    if (filters?.muscleId && filters.muscleId !== "ALL") {
      where.primaryMuscleId = filters.muscleId;
    }

    if (filters?.difficulty && filters.difficulty !== "ALL") {
      where.difficulty = filters.difficulty;
    }

    if (filters?.search && filters.search.trim() !== "") {
      const q = filters.search.trim();
      where.OR = [
        { nameAr: { contains: q, mode: "insensitive" } },
        { nameEn: { contains: q, mode: "insensitive" } },
        { descriptionAr: { contains: q, mode: "insensitive" } },
        { descriptionEn: { contains: q, mode: "insensitive" } }
      ];
    }

    return await prisma.exercise.findMany({
      where,
      include: {
        sport: true,
        primaryMuscle: true,
        equipment: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Fetch single exercise by ID
   */
  async getExerciseById(id: string) {
    return await prisma.exercise.findUnique({
      where: { id },
      include: {
        sport: true,
        primaryMuscle: true,
        equipment: true
      }
    });
  }

  /**
   * Create an exercise in PostgreSQL
   */
  async createExercise(data: CreateExerciseInput) {
    return await prisma.exercise.create({
      data: {
        nameAr: data.nameAr.trim(),
        nameEn: data.nameEn.trim(),
        descriptionAr: data.descriptionAr?.trim(),
        descriptionEn: data.descriptionEn?.trim(),
        instructionsAr: data.instructionsAr?.trim(),
        instructionsEn: data.instructionsEn?.trim(),
        commonMistakesAr: data.commonMistakesAr?.trim(),
        commonMistakesEn: data.commonMistakesEn?.trim(),
        coachTipsAr: data.coachTipsAr?.trim(),
        coachTipsEn: data.coachTipsEn?.trim(),
        videoUrl: data.videoUrl?.trim() || null,
        thumbnailUrl: data.thumbnailUrl?.trim() || null,
        difficulty: data.difficulty || Difficulty.BEGINNER,
        metricType: data.metricType || MetricType.SETS_REPS_WEIGHT,
        sportId: data.sportId,
        primaryMuscleId: data.primaryMuscleId || null,
        equipmentId: data.equipmentId || null,
        contraindicatedBodyParts: data.contraindicatedBodyParts || []
      },
      include: {
        sport: true,
        primaryMuscle: true,
        equipment: true
      }
    });
  }

  /**
   * Update an exercise
   */
  async updateExercise(id: string, data: UpdateExerciseInput) {
    return await prisma.exercise.update({
      where: { id },
      data: {
        ...(data.nameAr && { nameAr: data.nameAr.trim() }),
        ...(data.nameEn && { nameEn: data.nameEn.trim() }),
        ...(data.descriptionAr !== undefined && { descriptionAr: data.descriptionAr?.trim() }),
        ...(data.descriptionEn !== undefined && { descriptionEn: data.descriptionEn?.trim() }),
        ...(data.instructionsAr !== undefined && { instructionsAr: data.instructionsAr?.trim() }),
        ...(data.instructionsEn !== undefined && { instructionsEn: data.instructionsEn?.trim() }),
        ...(data.commonMistakesAr !== undefined && { commonMistakesAr: data.commonMistakesAr?.trim() }),
        ...(data.commonMistakesEn !== undefined && { commonMistakesEn: data.commonMistakesEn?.trim() }),
        ...(data.coachTipsAr !== undefined && { coachTipsAr: data.coachTipsAr?.trim() }),
        ...(data.coachTipsEn !== undefined && { coachTipsEn: data.coachTipsEn?.trim() }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl?.trim() || null }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl?.trim() || null }),
        ...(data.difficulty && { difficulty: data.difficulty }),
        ...(data.metricType && { metricType: data.metricType }),
        ...(data.sportId && { sportId: data.sportId }),
        ...(data.primaryMuscleId !== undefined && { primaryMuscleId: data.primaryMuscleId || null }),
        ...(data.equipmentId !== undefined && { equipmentId: data.equipmentId || null }),
        ...(data.contraindicatedBodyParts && { contraindicatedBodyParts: data.contraindicatedBodyParts })
      },
      include: {
        sport: true,
        primaryMuscle: true,
        equipment: true
      }
    });
  }

  /**
   * Delete an exercise
   */
  async deleteExercise(id: string) {
    await prisma.exercise.delete({
      where: { id }
    });
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

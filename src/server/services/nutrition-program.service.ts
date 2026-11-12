import prisma from "@/lib/prisma";
import { GoalType, NutritionAssignmentMode, Prisma } from "@prisma/client";
import { toOptionalFloat, toOptionalInt, toOptionalText } from "./assignment-snapshot";
import { getCalendarDayBounds, parseCalendarDate } from "@/lib/date-utils";

export class NutritionProgramServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "NutritionProgramServiceError";
    this.statusCode = statusCode;
  }
}

export interface NutritionProgramInput {
  title: string;
  description?: string | null;
  goalType?: GoalType | null;
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
  isActive?: boolean;
  creatorId?: string | null;
}

export interface AssignNutritionInput {
  clientId: string;
  coachId?: string | null;
  nutritionProgramId?: string | null;
  programAssignmentId?: string | null;
  mode?: NutritionAssignmentMode;
  title?: string | null;
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
  startDate?: string | Date;
  endDate?: string | Date | null;
  replaceActive?: boolean;
}

/**
 * Calculates total macros from meals and food items without fabricating missing numbers.
 */
export function calculateNutritionTotals(meals: any[]): {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
} {
  let calories = 0;
  let proteinGrams = 0;
  let carbsGrams = 0;
  let fatsGrams = 0;

  if (!Array.isArray(meals)) {
    return { calories: 0, proteinGrams: 0, carbsGrams: 0, fatsGrams: 0 };
  }

  for (const meal of meals) {
    if (Array.isArray(meal.foodItems) && meal.foodItems.length > 0) {
      for (const item of meal.foodItems) {
        const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
        if (typeof item.calories === "number") calories += item.calories * qty;
        if (typeof item.proteinGrams === "number") proteinGrams += item.proteinGrams * qty;
        if (typeof item.carbsGrams === "number") carbsGrams += item.carbsGrams * qty;
        if (typeof item.fatsGrams === "number") fatsGrams += item.fatsGrams * qty;
      }
    } else {
      if (typeof meal.calories === "number") calories += meal.calories;
      if (typeof meal.proteinGrams === "number") proteinGrams += meal.proteinGrams;
      if (typeof meal.carbsGrams === "number") carbsGrams += meal.carbsGrams;
      if (typeof meal.fatsGrams === "number") fatsGrams += meal.fatsGrams;
    }
  }

  return {
    calories: Math.round(calories * 10) / 10,
    proteinGrams: Math.round(proteinGrams * 10) / 10,
    carbsGrams: Math.round(carbsGrams * 10) / 10,
    fatsGrams: Math.round(fatsGrams * 10) / 10
  };
}

/**
 * Manages reusable academy NutritionProgram templates and athlete nutrition assignments.
 */
export class NutritionProgramService {
  /* ================= LIBRARY CRUD ================= */

  async getNutritionPrograms(filter?: { activeOnly?: boolean; search?: string }) {
    const where: Prisma.NutritionProgramWhereInput = {};
    if (filter?.activeOnly) {
      where.isActive = true;
    }
    if (filter?.search?.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } }
      ];
    }

    return await prisma.nutritionProgram.findMany({
      where,
      include: {
        creator: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        },
        _count: {
          select: {
            trainingPrograms: true,
            clientAssignments: true
          }
        }
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
    });
  }

  async getNutritionProgramById(id: string) {
    return await prisma.nutritionProgram.findUnique({
      where: { id },
      include: {
        creator: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        },
        _count: {
          select: {
            trainingPrograms: true,
            clientAssignments: true
          }
        }
      }
    });
  }

  async createNutritionProgram(data: NutritionProgramInput) {
    const title = toOptionalText(data.title);
    if (!title) {
      throw new NutritionProgramServiceError("Nutrition program title is required", 400);
    }

    let creatorId = data.creatorId || null;
    if (creatorId) {
      const coach = await prisma.coachProfile.findUnique({ where: { id: creatorId }, select: { id: true } });
      if (!coach) creatorId = null;
    }

    return await prisma.nutritionProgram.create({
      data: {
        title,
        description: toOptionalText(data.description),
        goalType: data.goalType ?? null,
        dailyCalories: toOptionalInt(data.dailyCalories),
        proteinGrams: toOptionalInt(data.proteinGrams),
        carbsGrams: toOptionalInt(data.carbsGrams),
        fatsGrams: toOptionalInt(data.fatsGrams),
        waterLiters: toOptionalFloat(data.waterLiters),
        breakfast: toOptionalText(data.breakfast),
        lunch: toOptionalText(data.lunch),
        dinner: toOptionalText(data.dinner),
        snacks: toOptionalText(data.snacks),
        notes: toOptionalText(data.notes),
        mealsJson: data.mealsJson !== undefined && data.mealsJson !== null ? data.mealsJson : Prisma.JsonNull,
        isActive: data.isActive ?? true,
        creatorId
      }
    });
  }

  async updateNutritionProgram(id: string, data: Partial<NutritionProgramInput>) {
    const existing = await prisma.nutritionProgram.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NutritionProgramServiceError("Nutrition program not found", 404);
    }

    if (data.title !== undefined && !toOptionalText(data.title)) {
      throw new NutritionProgramServiceError("Nutrition program title cannot be empty", 400);
    }

    return await prisma.nutritionProgram.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: toOptionalText(data.description) }),
        ...(data.goalType !== undefined && { goalType: data.goalType ?? null }),
        ...(data.dailyCalories !== undefined && { dailyCalories: toOptionalInt(data.dailyCalories) }),
        ...(data.proteinGrams !== undefined && { proteinGrams: toOptionalInt(data.proteinGrams) }),
        ...(data.carbsGrams !== undefined && { carbsGrams: toOptionalInt(data.carbsGrams) }),
        ...(data.fatsGrams !== undefined && { fatsGrams: toOptionalInt(data.fatsGrams) }),
        ...(data.waterLiters !== undefined && { waterLiters: toOptionalFloat(data.waterLiters) }),
        ...(data.breakfast !== undefined && { breakfast: toOptionalText(data.breakfast) }),
        ...(data.lunch !== undefined && { lunch: toOptionalText(data.lunch) }),
        ...(data.dinner !== undefined && { dinner: toOptionalText(data.dinner) }),
        ...(data.snacks !== undefined && { snacks: toOptionalText(data.snacks) }),
        ...(data.notes !== undefined && { notes: toOptionalText(data.notes) }),
        ...(data.mealsJson !== undefined && {
          mealsJson: data.mealsJson === null ? Prisma.JsonNull : data.mealsJson
        }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) })
      }
    });
  }

  async deleteNutritionProgram(id: string) {
    const existing = await prisma.nutritionProgram.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            trainingPrograms: true,
            clientAssignments: true
          }
        }
      }
    });
    if (!existing) {
      throw new NutritionProgramServiceError("Nutrition program not found", 404);
    }

    const refs = existing._count.trainingPrograms + existing._count.clientAssignments;
    if (refs > 0) {
      throw new NutritionProgramServiceError(
        `Cannot delete "${existing.title}" because it is linked to ${existing._count.trainingPrograms} training program(s) and ${existing._count.clientAssignments} client assignment(s). Archive it instead.`,
        409
      );
    }

    return await prisma.nutritionProgram.delete({ where: { id } });
  }

  /* ================= ATHLETE ASSIGNMENT MODES ================= */

  /**
   * Assigns a nutrition program to an athlete in one of three modes:
   * Mode A: INHERITED (from Training Program)
   * Mode B: OVERRIDE (customized per athlete, preserves original program trace)
   * Mode C: MANUAL (direct standalone assignment or athlete-specific custom plan)
   *
   * Creates an immutable snapshot so athlete plan is decoupled from future library changes.
   */
  async assignNutritionProgramToClient(data: AssignNutritionInput) {
    if (!data.clientId) {
      throw new NutritionProgramServiceError("clientId is required", 400);
    }

    const client = await prisma.clientProfile.findUnique({
      where: { id: data.clientId },
      select: { id: true, userId: true }
    });
    if (!client) {
      throw new NutritionProgramServiceError("Athlete not found", 404);
    }

    let sourceProgram: any = null;
    if (data.nutritionProgramId) {
      sourceProgram = await prisma.nutritionProgram.findUnique({
        where: { id: data.nutritionProgramId }
      });
      if (!sourceProgram) {
        throw new NutritionProgramServiceError("Source nutrition program not found", 404);
      }
    }

    const mode: NutritionAssignmentMode = data.mode || (data.nutritionProgramId ? NutritionAssignmentMode.MANUAL : NutritionAssignmentMode.CUSTOM_OVERRIDE);

    const title = toOptionalText(data.title) || sourceProgram?.title || "Personalized Nutrition Plan";

    const startDate = data.startDate ? parseCalendarDate(data.startDate) : parseCalendarDate(new Date().toISOString());
    const endDate = data.endDate ? parseCalendarDate(data.endDate) : null;

    // Check for duplicate active assignment on the same start date
    const existingSame = await prisma.clientNutritionAssignment.findFirst({
      where: {
        clientId: data.clientId,
        startDate,
        isActive: true
      }
    });
    if (existingSame) {
      throw new NutritionProgramServiceError(
        `Athlete already has an active nutrition plan "${existingSame.title}" starting on ${data.startDate}.`,
        409
      );
    }

    // Build snapshot: use custom inputs if provided, otherwise snapshot from sourceProgram
    const dailyCalories = data.dailyCalories !== undefined ? toOptionalInt(data.dailyCalories) : sourceProgram?.dailyCalories ?? null;
    const proteinGrams = data.proteinGrams !== undefined ? toOptionalInt(data.proteinGrams) : sourceProgram?.proteinGrams ?? null;
    const carbsGrams = data.carbsGrams !== undefined ? toOptionalInt(data.carbsGrams) : sourceProgram?.carbsGrams ?? null;
    const fatsGrams = data.fatsGrams !== undefined ? toOptionalInt(data.fatsGrams) : sourceProgram?.fatsGrams ?? null;
    const waterLiters = data.waterLiters !== undefined ? toOptionalFloat(data.waterLiters) : sourceProgram?.waterLiters ?? null;
    const breakfast = data.breakfast !== undefined ? toOptionalText(data.breakfast) : sourceProgram?.breakfast ?? null;
    const lunch = data.lunch !== undefined ? toOptionalText(data.lunch) : sourceProgram?.lunch ?? null;
    const dinner = data.dinner !== undefined ? toOptionalText(data.dinner) : sourceProgram?.dinner ?? null;
    const snacks = data.snacks !== undefined ? toOptionalText(data.snacks) : sourceProgram?.snacks ?? null;
    const notes = data.notes !== undefined ? toOptionalText(data.notes) : sourceProgram?.notes ?? null;
    const mealsJson = data.mealsJson !== undefined && data.mealsJson !== null
      ? data.mealsJson
      : (sourceProgram?.mealsJson ?? Prisma.JsonNull);

    let coachId = data.coachId || null;
    if (coachId) {
      const coach = await prisma.coachProfile.findUnique({ where: { id: coachId }, select: { id: true } });
      if (!coach) coachId = null;
    }

    return await prisma.$transaction(
      async (tx) => {
        // If replaceActive requested, deactivate current active assignments cleanly
        if (data.replaceActive) {
          await tx.clientNutritionAssignment.updateMany({
            where: { clientId: data.clientId, isActive: true },
            data: { isActive: false, endDate: startDate }
          });
        }

        return await tx.clientNutritionAssignment.create({
          data: {
            clientId: data.clientId,
            coachId,
            nutritionProgramId: data.nutritionProgramId || null,
            programAssignmentId: data.programAssignmentId || null,
            mode,
            title,
            description: toOptionalText(data.description) || sourceProgram?.description || null,
            dailyCalories,
            proteinGrams,
            carbsGrams,
            fatsGrams,
            waterLiters,
            breakfast,
            lunch,
            dinner,
            snacks,
            notes,
            mealsJson,
            startDate,
            endDate,
            isActive: true
          },
          include: {
            nutritionProgram: true,
            coach: { include: { user: true } },
            client: { include: { user: true } }
          }
        });
      },
      { maxWait: 10000, timeout: 30000 }
    );
  }

  async getClientNutritionAssignments(filter: {
    clientId?: string;
    coachId?: string;
    activeOnly?: boolean;
    mode?: NutritionAssignmentMode;
  }) {
    const where: Prisma.ClientNutritionAssignmentWhereInput = {};
    if (filter.clientId) {
      where.clientId = filter.clientId;
    }
    if (filter.coachId) {
      where.coachId = filter.coachId;
    }
    if (filter.activeOnly) {
      where.isActive = true;
    }
    if (filter.mode) {
      where.mode = filter.mode;
    }

    return await prisma.clientNutritionAssignment.findMany({
      where,
      include: {
        nutritionProgram: {
          select: { id: true, title: true, goalType: true }
        },
        coach: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        },
        client: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      },
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }]
    });
  }

  async getClientActiveNutritionAssignment(clientId: string) {
    return await prisma.clientNutritionAssignment.findFirst({
      where: {
        clientId,
        isActive: true
      },
      include: {
        nutritionProgram: true,
        coach: { include: { user: true } }
      },
      orderBy: { startDate: "desc" }
    });
  }

  async getNutritionAssignmentById(id: string) {
    return await prisma.clientNutritionAssignment.findUnique({
      where: { id },
      include: {
        nutritionProgram: true,
        coach: { include: { user: true } },
        client: { include: { user: true } }
      }
    });
  }

  async updateNutritionAssignment(id: string, data: Partial<AssignNutritionInput>) {
    const existing = await prisma.clientNutritionAssignment.findUnique({ where: { id } });
    if (!existing) {
      throw new NutritionProgramServiceError("Nutrition assignment not found", 404);
    }

    return await prisma.clientNutritionAssignment.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title?.trim() || existing.title }),
        ...(data.description !== undefined && { description: toOptionalText(data.description) }),
        ...(data.dailyCalories !== undefined && { dailyCalories: toOptionalInt(data.dailyCalories) }),
        ...(data.proteinGrams !== undefined && { proteinGrams: toOptionalInt(data.proteinGrams) }),
        ...(data.carbsGrams !== undefined && { carbsGrams: toOptionalInt(data.carbsGrams) }),
        ...(data.fatsGrams !== undefined && { fatsGrams: toOptionalInt(data.fatsGrams) }),
        ...(data.waterLiters !== undefined && { waterLiters: toOptionalFloat(data.waterLiters) }),
        ...(data.breakfast !== undefined && { breakfast: toOptionalText(data.breakfast) }),
        ...(data.lunch !== undefined && { lunch: toOptionalText(data.lunch) }),
        ...(data.dinner !== undefined && { dinner: toOptionalText(data.dinner) }),
        ...(data.snacks !== undefined && { snacks: toOptionalText(data.snacks) }),
        ...(data.notes !== undefined && { notes: toOptionalText(data.notes) }),
        ...(data.mealsJson !== undefined && {
          mealsJson: data.mealsJson === null ? Prisma.JsonNull : data.mealsJson
        }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? parseCalendarDate(data.endDate) : null })
      },
      include: {
        nutritionProgram: true,
        coach: { include: { user: true } },
        client: { include: { user: true } }
      }
    });
  }

  async archiveNutritionAssignment(id: string) {
    const existing = await prisma.clientNutritionAssignment.findUnique({ where: { id } });
    if (!existing) {
      throw new NutritionProgramServiceError("Nutrition assignment not found", 404);
    }

    return await prisma.clientNutritionAssignment.update({
      where: { id },
      data: {
        isActive: false,
        endDate: new Date()
      }
    });
  }

  async deleteNutritionAssignment(id: string) {
    const existing = await prisma.clientNutritionAssignment.findUnique({ where: { id } });
    if (!existing) {
      throw new NutritionProgramServiceError("Nutrition assignment not found", 404);
    }

    return await prisma.clientNutritionAssignment.delete({ where: { id } });
  }
}

export const nutritionProgramService = new NutritionProgramService();

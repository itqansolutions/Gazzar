import prisma from "@/lib/prisma";

export class NutritionService {
  /**
   * Get meal plans
   */
  async getMealPlans(clientId?: string, allowedClientIds?: string[]) {
    const where: any = {};
    if (allowedClientIds !== undefined) {
      where.clientId = { in: allowedClientIds };
    }
    if (clientId && clientId !== "ALL") {
      where.AND = [
        ...(where.AND || []),
        { OR: [{ clientId }, { client: { userId: clientId } }] }
      ];
    }

    return await prisma.mealPlan.findMany({
      where,
      include: {
        client: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        },
        coach: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Create meal plan
   */
  async createMealPlan(data: {
    clientId: string;
    coachId?: string;
    title: string;
    dailyCalories?: number;
    proteinGrams?: number;
    carbsGrams?: number;
    fatsGrams?: number;
    waterLiters?: number;
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snacks?: string;
    notes?: string;
  }) {
    let coachId = data.coachId;
    if (!coachId) {
      const coach = await prisma.coachProfile.findFirst();
      if (!coach) throw new Error("No coach profile found");
      coachId = coach.id;
    }

    return await prisma.mealPlan.create({
      data: {
        clientId: data.clientId,
        coachId,
        title: data.title.trim(),
        dailyCalories: Number(data.dailyCalories) || 2000,
        proteinGrams: Number(data.proteinGrams) || 150,
        carbsGrams: Number(data.carbsGrams) || 200,
        fatsGrams: Number(data.fatsGrams) || 60,
        waterLiters: Number(data.waterLiters) || 3.0,
        breakfast: data.breakfast || null,
        lunch: data.lunch || null,
        dinner: data.dinner || null,
        snacks: data.snacks || null,
        notes: data.notes || null,
        isActive: true
      },
      include: {
        client: { include: { user: true } },
        coach: { include: { user: true } }
      }
    });
  }

  /**
   * Update meal plan
   */
  async updateMealPlan(id: string, data: any) {
    return await prisma.mealPlan.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title.trim() }),
        ...(data.dailyCalories !== undefined && { dailyCalories: Number(data.dailyCalories) }),
        ...(data.proteinGrams !== undefined && { proteinGrams: Number(data.proteinGrams) }),
        ...(data.carbsGrams !== undefined && { carbsGrams: Number(data.carbsGrams) }),
        ...(data.fatsGrams !== undefined && { fatsGrams: Number(data.fatsGrams) }),
        ...(data.waterLiters !== undefined && { waterLiters: Number(data.waterLiters) }),
        ...(data.breakfast !== undefined && { breakfast: data.breakfast }),
        ...(data.lunch !== undefined && { lunch: data.lunch }),
        ...(data.dinner !== undefined && { dinner: data.dinner }),
        ...(data.snacks !== undefined && { snacks: data.snacks }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) })
      }
    });
  }

  /**
   * Delete meal plan
   */
  async deleteMealPlan(id: string) {
    return await prisma.mealPlan.delete({
      where: { id }
    });
  }
}

export const nutritionService = new NutritionService();

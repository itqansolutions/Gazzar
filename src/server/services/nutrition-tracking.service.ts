import prisma from "@/lib/prisma";
import { getCalendarDayBounds, parseCalendarDate, toCalendarDateKey, addCalendarDaysKey } from "@/lib/date-utils";
import { calculateNutritionTotals } from "./nutrition-program.service";
import { toOptionalFloat, toOptionalText } from "./assignment-snapshot";

export class NutritionTrackingServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "NutritionTrackingServiceError";
    this.statusCode = statusCode;
  }
}

export interface SaveDailyNutritionLogInput {
  clientId: string;
  date: string | Date;
  nutritionAssignmentId?: string | null;
  isManualEntry?: boolean;
  calories?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatsGrams?: number | null;
  waterLiters?: number | null;
  loggedMeals?: any[] | null;
  clientNotes?: string | null;
  coachFeedback?: string | null;
}

export function formatDailyNutritionLog(log: any) {
  if (!log) return null;
  return {
    ...log,
    actualCalories: log.calories,
    actualProtein: log.proteinGrams,
    actualCarbs: log.carbsGrams,
    actualFats: log.fatsGrams,
    waterIntakeLiters: log.waterLiters
  };
}

export class NutritionTrackingService {
  /**
   * Save or update an athlete's daily nutrition tracking log.
   * Calculates totals from recorded food items where values are available,
   * or allows manual entry clearly distinguished by `isManualEntry: true`.
   * Never duplicates daily logs for the same athlete on the same date.
   */
  async saveDailyNutritionLog(data: SaveDailyNutritionLogInput) {
    if (!data.clientId) {
      throw new NutritionTrackingServiceError("clientId is required", 400);
    }
    if (!data.date) {
      throw new NutritionTrackingServiceError("date is required", 400);
    }

    const client = await prisma.clientProfile.findUnique({
      where: { id: data.clientId },
      select: { id: true }
    });
    if (!client) {
      throw new NutritionTrackingServiceError("Athlete not found", 404);
    }

    const calendarDate = parseCalendarDate(data.date);

    // Auto-link active assignment on that date if not provided
    let nutritionAssignmentId = data.nutritionAssignmentId || null;
    if (!nutritionAssignmentId) {
      const activeAssignment = await prisma.clientNutritionAssignment.findFirst({
        where: {
          clientId: data.clientId,
          isActive: true,
          startDate: { lte: calendarDate },
          OR: [{ endDate: null }, { endDate: { gte: calendarDate } }]
        },
        orderBy: { startDate: "desc" }
      });
      if (activeAssignment) {
        nutritionAssignmentId = activeAssignment.id;
      }
    }

    const anyData = data as any;
    const isManual = Boolean(data.isManualEntry);
    let calories = 0;
    let proteinGrams = 0;
    let carbsGrams = 0;
    let fatsGrams = 0;

    const loggedMeals = Array.isArray(data.loggedMeals)
      ? data.loggedMeals
      : Array.isArray(anyData.mealsJson)
      ? anyData.mealsJson
      : [];

    const rawCalories =
      typeof data.calories === "number"
        ? data.calories
        : typeof anyData.actualCalories === "number"
        ? anyData.actualCalories
        : undefined;
    const rawProtein =
      typeof data.proteinGrams === "number"
        ? data.proteinGrams
        : typeof anyData.actualProtein === "number"
        ? anyData.actualProtein
        : undefined;
    const rawCarbs =
      typeof data.carbsGrams === "number"
        ? data.carbsGrams
        : typeof anyData.actualCarbs === "number"
        ? anyData.actualCarbs
        : undefined;
    const rawFats =
      typeof data.fatsGrams === "number"
        ? data.fatsGrams
        : typeof anyData.actualFats === "number"
        ? anyData.actualFats
        : undefined;

    if (isManual) {
      calories = typeof rawCalories === "number" ? Math.max(0, rawCalories) : 0;
      proteinGrams = typeof rawProtein === "number" ? Math.max(0, rawProtein) : 0;
      carbsGrams = typeof rawCarbs === "number" ? Math.max(0, rawCarbs) : 0;
      fatsGrams = typeof rawFats === "number" ? Math.max(0, rawFats) : 0;
    } else if (loggedMeals.length > 0) {
      const calculated = calculateNutritionTotals(loggedMeals);
      calories = calculated.calories;
      proteinGrams = calculated.proteinGrams;
      carbsGrams = calculated.carbsGrams;
      fatsGrams = calculated.fatsGrams;
    } else {
      calories = typeof rawCalories === "number" ? Math.max(0, rawCalories) : 0;
      proteinGrams = typeof rawProtein === "number" ? Math.max(0, rawProtein) : 0;
      carbsGrams = typeof rawCarbs === "number" ? Math.max(0, rawCarbs) : 0;
      fatsGrams = typeof rawFats === "number" ? Math.max(0, rawFats) : 0;
    }

    const rawWater =
      typeof data.waterLiters === "number"
        ? data.waterLiters
        : typeof anyData.waterIntakeLiters === "number"
        ? anyData.waterIntakeLiters
        : 0;
    const waterLiters = Math.max(0, rawWater);

    const saved = await prisma.dailyNutritionLog.upsert({
      where: {
        clientId_date: {
          clientId: data.clientId,
          date: calendarDate
        }
      },
      create: {
        clientId: data.clientId,
        nutritionAssignmentId,
        date: calendarDate,
        calories,
        proteinGrams,
        carbsGrams,
        fatsGrams,
        waterLiters,
        isManualEntry: isManual,
        loggedMealsJson: loggedMeals.length > 0 ? (loggedMeals as any) : undefined,
        clientNotes: toOptionalText(data.clientNotes),
        coachFeedback: toOptionalText(data.coachFeedback)
      },
      update: {
        nutritionAssignmentId: nutritionAssignmentId ?? undefined,
        calories,
        proteinGrams,
        carbsGrams,
        fatsGrams,
        waterLiters,
        isManualEntry: isManual,
        loggedMealsJson: loggedMeals.length > 0 ? (loggedMeals as any) : undefined,
        clientNotes: data.clientNotes !== undefined ? toOptionalText(data.clientNotes) : undefined,
        coachFeedback: data.coachFeedback !== undefined ? toOptionalText(data.coachFeedback) : undefined
      },
      include: {
        nutritionAssignment: {
          select: { id: true, title: true, dailyCalories: true, proteinGrams: true, carbsGrams: true, fatsGrams: true, waterLiters: true }
        }
      }
    });

    return formatDailyNutritionLog(saved);
  }

  /**
   * Get single daily nutrition log for an athlete on a specific calendar date.
   */
  async getDailyNutritionLog(clientId: string, date: string | Date) {
    const calendarDate = parseCalendarDate(date);
    const log = await prisma.dailyNutritionLog.findUnique({
      where: {
        clientId_date: {
          clientId,
          date: calendarDate
        }
      },
      include: {
        nutritionAssignment: true
      }
    });
    return formatDailyNutritionLog(log);
  }

  /**
   * Get chronological daily nutrition logs within a date range.
   */
  async getDailyNutritionLogs(clientId: string, filter?: { dateFrom?: string; dateTo?: string; limit?: number }) {
    const where: any = { clientId };

    if (filter?.dateFrom) {
      const { start } = getCalendarDayBounds(filter.dateFrom);
      where.date = { ...where.date, gte: start };
    }
    if (filter?.dateTo) {
      const { end } = getCalendarDayBounds(filter.dateTo);
      where.date = { ...where.date, lte: end };
    }

    const logs = await prisma.dailyNutritionLog.findMany({
      where,
      include: {
        nutritionAssignment: {
          select: { id: true, title: true, dailyCalories: true, proteinGrams: true, carbsGrams: true, fatsGrams: true, waterLiters: true }
        }
      },
      orderBy: { date: "desc" },
      take: filter?.limit || 60
    });
    return logs.map(formatDailyNutritionLog);
  }

  /**
   * Allow coaches and admins to submit review feedback on an athlete's daily nutrition log.
   */
  async saveCoachFeedback(logId: string, coachFeedback: string | null) {
    const existing = await prisma.dailyNutritionLog.findUnique({ where: { id: logId } });
    if (!existing) {
      throw new NutritionTrackingServiceError("Daily nutrition log not found", 404);
    }

    const updated = await prisma.dailyNutritionLog.update({
      where: { id: logId },
      data: {
        coachFeedback: toOptionalText(coachFeedback)
      }
    });
    return formatDailyNutritionLog(updated);
  }

  /**
   * Calculates athlete nutrition adherence, planned vs actual intake, and missing logs over a date range.
   */
  async getNutritionAdherence(clientId: string, dateFrom: string, dateTo: string) {
    const { start: startDate } = getCalendarDayBounds(dateFrom);
    const { end: endDate } = getCalendarDayBounds(dateTo);

    // Active assignment targets
    const activeAssignment = await prisma.clientNutritionAssignment.findFirst({
      where: {
        clientId,
        isActive: true
      },
      orderBy: { startDate: "desc" }
    });

    const logs = await prisma.dailyNutritionLog.findMany({
      where: {
        clientId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: "asc" }
    });

    // Enumerate days in range to detect missing logs
    const loggedDateSet = new Set(logs.map((l) => toCalendarDateKey(l.date)));
    const missingLogDays: string[] = [];
    let currentKey = toCalendarDateKey(startDate);
    const endKey = toCalendarDateKey(endDate);
    let totalDays = 0;

    while (currentKey <= endKey && totalDays < 90) {
      totalDays++;
      if (!loggedDateSet.has(currentKey)) {
        missingLogDays.push(currentKey);
      }
      currentKey = addCalendarDaysKey(currentKey, 1);
    }

    const loggedDays = logs.length;
    let sumCalories = 0;
    let sumProtein = 0;
    let sumCarbs = 0;
    let sumFats = 0;
    let sumWater = 0;

    for (const log of logs) {
      sumCalories += log.calories;
      sumProtein += log.proteinGrams;
      sumCarbs += log.carbsGrams;
      sumFats += log.fatsGrams;
      sumWater += log.waterLiters;
    }

    const avgCalories = loggedDays > 0 ? Math.round(sumCalories / loggedDays) : 0;
    const avgProtein = loggedDays > 0 ? Math.round((sumProtein / loggedDays) * 10) / 10 : 0;
    const avgCarbs = loggedDays > 0 ? Math.round((sumCarbs / loggedDays) * 10) / 10 : 0;
    const avgFats = loggedDays > 0 ? Math.round((sumFats / loggedDays) * 10) / 10 : 0;
    const avgWater = loggedDays > 0 ? Math.round((sumWater / loggedDays) * 10) / 10 : 0;

    const plannedCalories = activeAssignment?.dailyCalories ?? null;
    const plannedProtein = activeAssignment?.proteinGrams ?? null;
    const plannedCarbs = activeAssignment?.carbsGrams ?? null;
    const plannedFats = activeAssignment?.fatsGrams ?? null;
    const plannedWater = activeAssignment?.waterLiters ?? null;

    let calorieAdherencePercentage: number | null = null;
    if (plannedCalories && plannedCalories > 0 && loggedDays > 0) {
      const diffRatio = Math.abs(avgCalories - plannedCalories) / plannedCalories;
      calorieAdherencePercentage = Math.max(0, Math.round((1 - diffRatio) * 100));
    }

    let proteinAdherencePercentage: number | null = null;
    if (plannedProtein && plannedProtein > 0 && loggedDays > 0) {
      const diffRatio = Math.abs(avgProtein - plannedProtein) / plannedProtein;
      proteinAdherencePercentage = Math.max(0, Math.round((1 - diffRatio) * 100));
    }

    let waterAdherencePercentage: number | null = null;
    if (plannedWater && plannedWater > 0 && loggedDays > 0) {
      const diffRatio = Math.abs(avgWater - plannedWater) / plannedWater;
      waterAdherencePercentage = Math.max(0, Math.round((1 - diffRatio) * 100));
    }

    // Overall compliance score: 50% consistency (loggedDays/totalDays) + 50% macro adherence
    const loggingConsistency = totalDays > 0 ? (loggedDays / totalDays) * 100 : 0;
    const macroScore = calorieAdherencePercentage ?? (loggedDays > 0 ? 100 : 0);
    const overallComplianceScore = Math.round((loggingConsistency * 0.5) + (macroScore * 0.5));

    return {
      clientId,
      dateFrom,
      dateTo,
      totalDays,
      loggedDays,
      missingLogDays,
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFats,
      avgWater,
      plannedDailyCalories: plannedCalories,
      plannedDailyProtein: plannedProtein,
      plannedDailyCarbs: plannedCarbs,
      plannedDailyFats: plannedFats,
      plannedDailyWater: plannedWater,
      calorieAdherencePercentage,
      proteinAdherencePercentage,
      waterAdherencePercentage,
      overallComplianceScore,
      adherenceScore: overallComplianceScore,
      loggedDaysCount: loggedDays
    };
  }
}

export const nutritionTrackingService = new NutritionTrackingService();

import prisma from "@/lib/prisma";
import {
  AssignmentStatus,
  AttendanceStatus,
  UserRole
} from "@prisma/client";
import type { AuthActor } from "@/lib/auth/route-guard";
import { getAssignedClientIdsForActor } from "@/lib/auth/route-guard";
import { checkInScheduleService } from "./checkin-schedule.service";
import { auditService } from "./audit.service";

export class MonitoringServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "MonitoringServiceError";
    this.statusCode = statusCode;
  }
}

export interface CoachMonitoringFilter {
  periodDays?: number;
  coachId?: string;
  athleteId?: string;
}

export interface SubmitCoachReviewInput {
  workoutLogId: string;
  coachFeedback?: string;
  setReviews?: Array<{
    setLogId: string;
    coachReview: string;
  }>;
}

export interface ReportsFilter {
  periodDays?: number;
  sportId?: string;
}

export class MonitoringService {
  /**
   * Resolves the list of client IDs the actor has permission to see.
   * Throws 403 for CLIENTs.
   * Scopes COACH to their active client coach assignments.
   * Allows ADMIN / HEAD_COACH full academy view (or filtered by coachId).
   */
  private async resolveScopedClientIds(
    actor: AuthActor,
    coachIdFilter?: string
  ): Promise<string[] | null> {
    if (actor.user.role === UserRole.CLIENT) {
      throw new MonitoringServiceError("Forbidden: Athletes cannot access monitoring dashboards", 403);
    }

    if (actor.user.role === UserRole.COACH) {
      if (!actor.coachProfileId) return [];
      const links = await prisma.clientCoachAssignment.findMany({
        where: { coachId: actor.coachProfileId, active: true },
        select: { clientId: true }
      });
      return links.map((l) => l.clientId);
    }

    // ADMIN or HEAD_COACH:
    if (coachIdFilter) {
      const links = await prisma.clientCoachAssignment.findMany({
        where: { coachId: coachIdFilter, active: true },
        select: { clientId: true }
      });
      return links.map((l) => l.clientId);
    }

    // Null means unrestricted (all academy athletes)
    return null;
  }

  /**
   * 1. Per-Athlete Adherence & Coach Monitoring Overview
   */
  async getCoachMonitoring(filter: CoachMonitoringFilter, actor: AuthActor) {
    const scopedClientIds = await this.resolveScopedClientIds(actor, filter.coachId);

    // If coach has zero assigned athletes, return empty dashboard
    if (scopedClientIds !== null && scopedClientIds.length === 0) {
      return {
        summary: {
          totalAthletes: 0,
          adherenceRate: 0,
          totalScheduled: 0,
          totalCompleted: 0,
          totalSkipped: 0,
          totalMissed: 0,
          overdueCheckInsCount: 0,
          pendingReviewsCount: 0,
          flaggedSessionsCount: 0
        },
        athletes: [],
        flaggedSessions: [],
        pendingReviews: []
      };
    }

    const periodDays = Math.max(1, filter.periodDays || 30);
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 86400000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const clientWhere: any = {};
    if (scopedClientIds !== null) {
      clientWhere.id = { in: scopedClientIds };
    }
    if (filter.athleteId) {
      clientWhere.id = filter.athleteId;
    }

    // 1. Fetch scoped athletes with their assignments in period and check-in schedules
    const clients = await prisma.clientProfile.findMany({
      where: clientWhere,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        sport: { select: { id: true, nameEn: true, nameAr: true } },
        workoutAssignments: {
          where: {
            scheduledDate: { gte: periodStart }
          },
          include: {
            workoutLog: {
              select: {
                id: true,
                isCompleted: true,
                completedAt: true,
                clientFeedback: true,
                coachFeedback: true
              }
            }
          },
          orderBy: { scheduledDate: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    let overallScheduled = 0;
    let overallCompleted = 0;
    let overallSkipped = 0;
    let overallMissed = 0;
    let overdueCheckInsCount = 0;

    const athleteSummaries = await Promise.all(
      clients.map(async (client) => {
        const assignments = client.workoutAssignments || [];
        let scheduledCount = assignments.length;
        let completedCount = 0;
        let skippedCount = 0;
        let missedCount = 0;
        let lastCompletedAt: string | null = null;

        for (const a of assignments) {
          const isDone = a.status === AssignmentStatus.COMPLETED || a.workoutLog?.isCompleted === true;
          if (isDone) {
            completedCount++;
            if (!lastCompletedAt && a.completedAt) {
              lastCompletedAt = a.completedAt.toISOString();
            } else if (!lastCompletedAt && a.workoutLog?.completedAt) {
              lastCompletedAt = a.workoutLog.completedAt.toISOString();
            }
          } else if (a.status === AssignmentStatus.SKIPPED) {
            skippedCount++;
          } else if (
            a.status === AssignmentStatus.MISSED ||
            (a.status === AssignmentStatus.SCHEDULED && new Date(a.scheduledDate) < startOfToday)
          ) {
            missedCount++;
          }
        }

        const adherenceRate = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

        overallScheduled += scheduledCount;
        overallCompleted += completedCount;
        overallSkipped += skippedCount;
        overallMissed += missedCount;

        // Check-in status from Phase 7 checkInScheduleService
        let checkInStatus: any = null;
        try {
          const schedRes = await checkInScheduleService.getSchedule(client.id);
          checkInStatus = schedRes.status;
          if (schedRes.status.overallStatus === "OVERDUE") {
            overdueCheckInsCount++;
          }
        } catch {
          checkInStatus = {
            overallStatus: "NOT_CONFIGURED",
            overdueCount: 0,
            dueSoonCount: 0
          };
        }

        return {
          client: {
            id: client.id,
            userId: client.user.id,
            name: client.user.name,
            email: client.user.email,
            avatar: client.user.avatar,
            sportName: client.sport?.nameEn || "General Fitness",
            preferredSportId: client.preferredSportId
          },
          scheduledCount,
          completedCount,
          skippedCount,
          missedCount,
          adherenceRate,
          lastCompletedAt,
          checkInStatus
        };
      })
    );

    // 2. Fetch Flagged Sessions (Skipped or Missed in period)
    const assignmentWhere: any = {
      scheduledDate: { gte: periodStart },
      OR: [
        { status: AssignmentStatus.SKIPPED },
        { status: AssignmentStatus.MISSED },
        {
          status: AssignmentStatus.SCHEDULED,
          scheduledDate: { lt: startOfToday },
          workoutLog: null
        }
      ]
    };
    if (scopedClientIds !== null) {
      assignmentWhere.clientId = { in: scopedClientIds };
    }
    if (filter.athleteId) {
      assignmentWhere.clientId = filter.athleteId;
    }

    const flaggedRaw = await prisma.clientWorkoutAssignment.findMany({
      where: assignmentWhere,
      take: 20,
      orderBy: { scheduledDate: "desc" },
      include: {
        client: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        },
        template: { select: { titleEn: true, titleAr: true } },
        workoutLog: { select: { clientFeedback: true } }
      }
    });

    const flaggedSessions = flaggedRaw.map((a) => {
      const isMissed =
        a.status === AssignmentStatus.MISSED ||
        (a.status === AssignmentStatus.SCHEDULED && new Date(a.scheduledDate) < startOfToday);
      return {
        assignmentId: a.id,
        clientId: a.clientId,
        clientName: a.client.user.name,
        clientAvatar: a.client.user.avatar,
        scheduledDate: a.scheduledDate.toISOString(),
        title: a.title || a.template?.titleEn || a.template?.titleAr || "Training Session",
        status: a.status === AssignmentStatus.SKIPPED ? "SKIPPED" : "MISSED",
        skipReason: a.workoutLog?.clientFeedback || null,
        coachNotes: a.coachNotes || null
      };
    });

    // 3. Fetch Pending Reviews (Completed WorkoutLog where coachFeedback is null OR setLog.coachReview is null)
    const workoutLogWhere: any = {
      isCompleted: true,
      completedAt: { gte: periodStart },
      OR: [
        { coachFeedback: null },
        {
          setLogs: {
            some: {
              isCompleted: true,
              coachReview: null
            }
          }
        }
      ]
    };
    if (scopedClientIds !== null) {
      workoutLogWhere.clientId = { in: scopedClientIds };
    }
    if (filter.athleteId) {
      workoutLogWhere.clientId = filter.athleteId;
    }

    const pendingLogsRaw = await prisma.workoutLog.findMany({
      where: workoutLogWhere,
      take: 20,
      orderBy: { completedAt: "desc" },
      include: {
        client: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        },
        assignment: {
          select: {
            id: true,
            title: true,
            template: { select: { titleEn: true, titleAr: true } }
          }
        },
        setLogs: {
          orderBy: [{ roundNumber: "asc" }, { setNumber: "asc" }],
          include: {
            assignmentBlockItem: {
              include: { exercise: { select: { nameEn: true, nameAr: true } } }
            },
            exerciseLog: {
              include: { exercise: { select: { nameEn: true, nameAr: true } } }
            }
          }
        }
      }
    });

    const pendingReviews = pendingLogsRaw.map((log) => {
      const unreviewedSets = log.setLogs.filter((s) => s.isCompleted && !s.coachReview);
      return {
        workoutLogId: log.id,
        assignmentId: log.assignmentId,
        clientId: log.clientId,
        clientName: log.client.user.name,
        clientAvatar: log.client.user.avatar,
        completedAt: log.completedAt ? log.completedAt.toISOString() : null,
        durationMinutes: log.durationMinutes,
        overallRpe: log.overallRpe,
        clientFeedback: log.clientFeedback,
        coachFeedback: log.coachFeedback,
        workoutTitle:
          log.assignment?.title ||
          log.assignment?.template?.titleEn ||
          log.assignment?.template?.titleAr ||
          "Completed Session",
        unreviewedSetsCount: unreviewedSets.length,
        sets: log.setLogs.map((s) => ({
          setLogId: s.id,
          exerciseName:
            s.assignmentBlockItem?.exercise?.nameEn ||
            s.exerciseLog?.exercise?.nameEn ||
            s.assignmentBlockItem?.exerciseNameSnapshot ||
            "Exercise",
          roundNumber: s.roundNumber,
          setNumber: s.setNumber,
          isCompleted: s.isCompleted,
          isSkipped: s.isSkipped,
          skipReason: s.skipReason,
          actualWeightKg: s.actualWeightKg,
          actualReps: s.actualReps,
          actualDistanceKm: s.actualDistanceKm,
          actualTimeSeconds: s.actualTimeSeconds,
          coachReview: s.coachReview,
          coachReviewedAt: s.coachReviewedAt ? s.coachReviewedAt.toISOString() : null
        }))
      };
    });

    const totalAthletes = clients.length;
    const overallAdherence = overallScheduled > 0 ? Math.round((overallCompleted / overallScheduled) * 100) : 0;

    return {
      summary: {
        totalAthletes,
        adherenceRate: overallAdherence,
        totalScheduled: overallScheduled,
        totalCompleted: overallCompleted,
        totalSkipped: overallSkipped,
        totalMissed: overallMissed,
        overdueCheckInsCount,
        pendingReviewsCount: pendingReviews.length,
        flaggedSessionsCount: flaggedSessions.length
      },
      athletes: athleteSummaries,
      flaggedSessions,
      pendingReviews
    };
  }

  /**
   * 2. Submit Coach Review on a completed WorkoutLog and/or specific SetLogs.
   * Restricted to assigned coach or admin. Fully audit-logged.
   */
  async submitCoachReview(input: SubmitCoachReviewInput, actor: AuthActor) {
    if (actor.user.role === UserRole.CLIENT) {
      throw new MonitoringServiceError("Forbidden: Athletes cannot submit coach reviews", 403);
    }

    if (!input.workoutLogId) {
      throw new MonitoringServiceError("workoutLogId is required", 400);
    }

    const workoutLog = await prisma.workoutLog.findUnique({
      where: { id: input.workoutLogId },
      include: {
        client: true,
        assignment: true,
        setLogs: true
      }
    });

    if (!workoutLog) {
      throw new MonitoringServiceError("Workout log not found", 404);
    }

    // Verify coach authorization:
    if (actor.user.role === UserRole.COACH) {
      if (!actor.coachProfileId) {
        throw new MonitoringServiceError("Forbidden: Coach profile missing", 403);
      }
      const isAssigned = await prisma.clientCoachAssignment.findFirst({
        where: {
          clientId: workoutLog.clientId,
          coachId: actor.coachProfileId,
          active: true
        }
      });
      const isLogCoach = workoutLog.coachId === actor.coachProfileId || workoutLog.assignment?.coachId === actor.coachProfileId;
      if (!isAssigned && !isLogCoach) {
        throw new MonitoringServiceError("Forbidden: You are not authorized to review this athlete's workout", 403);
      }
    }

    const reviewedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update WorkoutLog coach feedback if supplied
      const logUpdate: any = {};
      if (input.coachFeedback !== undefined) {
        logUpdate.coachFeedback = input.coachFeedback ? input.coachFeedback.trim() : null;
      }
      if (actor.coachProfileId) {
        logUpdate.coachId = actor.coachProfileId;
      }

      if (Object.keys(logUpdate).length > 0) {
        await tx.workoutLog.update({
          where: { id: input.workoutLogId },
          data: logUpdate
        });
      }

      // 2. Update individual SetLogs if supplied
      if (input.setReviews && input.setReviews.length > 0) {
        for (const sr of input.setReviews) {
          if (!sr.setLogId) continue;
          await tx.setLog.update({
            where: { id: sr.setLogId },
            data: {
              coachReview: sr.coachReview ? sr.coachReview.trim() : null,
              coachReviewedAt: reviewedAt
            }
          });
        }
      }

      return await tx.workoutLog.findUnique({
        where: { id: input.workoutLogId },
        include: {
          setLogs: {
            orderBy: [{ roundNumber: "asc" }, { setNumber: "asc" }]
          }
        }
      });
    });

    // 3. Emit AuditLog
    await auditService.log({
      actor,
      action: "COACH_REVIEW_WORKOUT",
      entityType: "WorkoutLog",
      entityId: input.workoutLogId,
      oldValues: {
        coachFeedback: workoutLog.coachFeedback
      },
      newValues: {
        coachFeedback: input.coachFeedback ?? workoutLog.coachFeedback,
        setsReviewedCount: input.setReviews?.length || 0,
        reviewedAt: reviewedAt.toISOString()
      }
    });

    return updated;
  }

  /**
   * 4. Real Aggregated Reports Data (replaces 0-value placeholders).
   * Aggregates adherence, attendance, sports distribution, and most-missed workouts.
   */
  async getAcademyReports(filter: ReportsFilter, actor: AuthActor) {
    const scopedClientIds = await this.resolveScopedClientIds(actor);

    const periodDays = Math.max(1, filter.periodDays || 180);
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 86400000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const clientWhere: any = {};
    if (scopedClientIds !== null) {
      clientWhere.id = { in: scopedClientIds };
    }
    if (filter.sportId && filter.sportId !== "ALL") {
      clientWhere.preferredSportId = filter.sportId;
    }

    // A. Basic counts
    const [totalAthletes, totalCoaches, sports] = await Promise.all([
      prisma.clientProfile.count({ where: clientWhere }),
      prisma.coachProfile.count(),
      prisma.sport.findMany({
        where: { isActive: true },
        select: { id: true, nameEn: true, nameAr: true }
      })
    ]);

    // B. Workout assignments adherence aggregation
    const assignmentWhere: any = {
      scheduledDate: { gte: periodStart }
    };
    if (scopedClientIds !== null) {
      assignmentWhere.clientId = { in: scopedClientIds };
    }
    if (filter.sportId && filter.sportId !== "ALL") {
      assignmentWhere.client = { preferredSportId: filter.sportId };
    }

    const assignments = await prisma.clientWorkoutAssignment.findMany({
      where: assignmentWhere,
      select: {
        id: true,
        clientId: true,
        status: true,
        title: true,
        scheduledDate: true,
        template: { select: { titleEn: true, sportId: true } },
        workoutLog: { select: { isCompleted: true } }
      }
    });

    let totalScheduled = assignments.length;
    let totalCompleted = 0;
    let totalSkipped = 0;
    let totalMissed = 0;

    // Track most missed/skipped by title
    const missedWorkoutCounts = new Map<string, number>();

    // Track per-athlete adherence distribution
    const athleteCounts = new Map<string, { scheduled: number; completed: number }>();

    for (const a of assignments) {
      const isDone = a.status === AssignmentStatus.COMPLETED || a.workoutLog?.isCompleted === true;
      if (isDone) {
        totalCompleted++;
      } else if (a.status === AssignmentStatus.SKIPPED) {
        totalSkipped++;
        const title = a.title || a.template?.titleEn || "Workout Session";
        missedWorkoutCounts.set(title, (missedWorkoutCounts.get(title) || 0) + 1);
      } else if (
        a.status === AssignmentStatus.MISSED ||
        (a.status === AssignmentStatus.SCHEDULED && new Date(a.scheduledDate) < startOfToday)
      ) {
        totalMissed++;
        const title = a.title || a.template?.titleEn || "Workout Session";
        missedWorkoutCounts.set(title, (missedWorkoutCounts.get(title) || 0) + 1);
      }

      if (!athleteCounts.has(a.clientId)) {
        athleteCounts.set(a.clientId, { scheduled: 0, completed: 0 });
      }
      const ac = athleteCounts.get(a.clientId)!;
      ac.scheduled++;
      if (isDone) ac.completed++;
    }

    const overallAdherenceRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    // Adherence bracket breakdown
    let highAdherence = 0; // >= 80%
    let mediumAdherence = 0; // 50% - 79%
    let lowAdherence = 0; // < 50%

    for (const ac of Array.from(athleteCounts.values())) {
      if (ac.scheduled === 0) continue;
      const pct = (ac.completed / ac.scheduled) * 100;
      if (pct >= 80) highAdherence++;
      else if (pct >= 50) mediumAdherence++;
      else lowAdherence++;
    }

    // Top missed workouts
    const mostMissedWorkouts = Array.from(missedWorkoutCounts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // C. Real SessionAttendance Aggregation
    const attendanceWhere: any = {
      session: {
        startTime: { gte: periodStart }
      }
    };
    if (scopedClientIds !== null) {
      attendanceWhere.clientId = { in: scopedClientIds };
    }

    const attendances = await prisma.sessionAttendance.findMany({
      where: attendanceWhere,
      select: {
        status: true,
        session: { select: { startTime: true } }
      }
    });

    const totalAttendanceMarks = attendances.length;
    const presentAttendanceMarks = attendances.filter(
      (att) => att.status === AttendanceStatus.PRESENT || att.status === AttendanceStatus.LATE
    ).length;
    const overallAttendanceRate =
      totalAttendanceMarks > 0 ? Math.round((presentAttendanceMarks / totalAttendanceMarks) * 100) : 0;

    // Monthly attendance trend for past 6 months
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyStats: Array<{ month: string; rate: number; total: number; present: number }> = [];

    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const mIdx = d.getMonth();
      const mYear = d.getFullYear();
      const mName = monthNames[mIdx];

      const monthAttendances = attendances.filter((att) => {
        const sDate = new Date(att.session.startTime);
        return sDate.getMonth() === mIdx && sDate.getFullYear() === mYear;
      });

      const mTotal = monthAttendances.length;
      const mPresent = monthAttendances.filter(
        (att) => att.status === AttendanceStatus.PRESENT || att.status === AttendanceStatus.LATE
      ).length;
      const mRate = mTotal > 0 ? Math.round((mPresent / mTotal) * 100) : 0;

      monthlyStats.push({
        month: mName,
        rate: mRate,
        total: mTotal,
        present: mPresent
      });
    }

    // D. Real Sport Distribution
    const athleteSports = await prisma.clientProfile.groupBy({
      by: ["preferredSportId"],
      where: clientWhere,
      _count: { id: true }
    });

    const sportColorPalette = [
      "#e11d48", // rose
      "#3b82f6", // blue
      "#f59e0b", // amber
      "#8b5cf6", // violet
      "#10b981", // emerald
      "#06b6d4"  // cyan
    ];

    const sportsDistMap = new Map<string, { sportId: string; name: string; value: number; color: string }>();
    athleteSports.forEach((as) => {
      const sp = sports.find((s) => s.id === as.preferredSportId);
      const name = sp?.nameEn || "General / Unassigned";
      const existing = sportsDistMap.get(name);
      if (existing) {
        existing.value += as._count.id;
      } else {
        sportsDistMap.set(name, {
          sportId: as.preferredSportId || "unassigned",
          name,
          value: as._count.id,
          color: sportColorPalette[sportsDistMap.size % sportColorPalette.length]
        });
      }
    });
    const sportsDistData = Array.from(sportsDistMap.values());

    return {
      kpi: {
        totalAthletes,
        activeCoaches: totalCoaches,
        completedWorkouts: totalCompleted,
        overallAdherenceRate,
        overallAttendanceRate,
        totalScheduledWorkouts: totalScheduled,
        totalSkippedWorkouts: totalSkipped,
        totalMissedWorkouts: totalMissed
      },
      attendanceTrend: monthlyStats,
      sportDistribution: sportsDistData,
      mostMissedWorkouts,
      adherenceBrackets: {
        high: highAdherence,
        medium: mediumAdherence,
        low: lowAdherence
      }
    };
  }
}

export const monitoringService = new MonitoringService();

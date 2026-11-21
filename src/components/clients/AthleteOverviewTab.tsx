"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ClientProfile, ClientWorkoutAssignment, ClientGoal } from "@/types";
import { getCairoDateKey, toCalendarDateKey, addCalendarDaysKey } from "@/lib/date-utils";
import {
  Dumbbell,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Play,
  Scale,
  Activity,
  Layers,
  Sparkles,
  Check,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Info,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

export interface AthleteOverviewTabProps {
  client: ClientProfile;
  isClient?: boolean;
  onSelectWorkout?: (workoutId: string) => void;
  onNavigateTab?: (tabId: string) => void;
}

export type EffectiveAssignmentStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "MISSED";

export default function AthleteOverviewTab({
  client,
  isClient = false,
  onSelectWorkout,
  onNavigateTab
}: AthleteOverviewTabProps) {
  // Check-in and compliance remote data state
  const [scheduleStatus, setScheduleStatus] = useState<any | null>(null);
  const [checkInRequests, setCheckInRequests] = useState<any[]>([]);
  const [checkInSubmissions, setCheckInSubmissions] = useState<any[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(true);
  const [checkInLoadError, setCheckInLoadError] = useState(false);

  const loadCheckInData = useCallback(() => {
    setLoadingCheckIns(true);
    setCheckInLoadError(false);

    Promise.all([
      fetch(`/api/clients/${client.id}/check-in-schedule`).then(async (r) => {
        if (!r.ok) throw new Error("Schedule request failed");
        return r.json();
      }),
      fetch(`/api/clients/${client.id}/check-in-requests`).then(async (r) => {
        if (!r.ok) throw new Error("Requests fetch failed");
        return r.json();
      }),
      fetch(`/api/clients/${client.id}/check-in-submissions`).then(async (r) => {
        if (!r.ok) throw new Error("Submissions fetch failed");
        return r.json();
      })
    ])
      .then(([schedRes, reqRes, subRes]) => {
        let hasError = false;

        if (schedRes.success && schedRes.data?.status) {
          setScheduleStatus(schedRes.data.status);
        } else {
          hasError = true;
        }

        if (reqRes.success && Array.isArray(reqRes.data)) {
          setCheckInRequests(reqRes.data);
        } else {
          hasError = true;
        }

        if (subRes.success && Array.isArray(subRes.data)) {
          setCheckInSubmissions(subRes.data);
        } else {
          hasError = true;
        }

        setCheckInLoadError(hasError);
      })
      .catch((err) => {
        console.error("[AthleteOverview] Check-in fetch error:", err);
        setCheckInLoadError(true);
      })
      .finally(() => {
        setLoadingCheckIns(false);
      });
  }, [client.id]);

  useEffect(() => {
    loadCheckInData();
  }, [loadCheckInData]);

  // 1. Current Active Training Program calculation
  const activeProgramAssignment = useMemo(() => {
    const list = client.programAssignments || [];
    return list.find((pa: any) => pa.isActive) || list[0] || null;
  }, [client.programAssignments]);

  const activeProgram = activeProgramAssignment?.program || null;

  // Program completion calculation:
  // Strictly scoped to activeProgramAssignment.id without unverified programId or date-range fallback.
  // If sessions are not explicitly linked to activeProgramAssignment.id, progress is marked unavailable.
  const { totalProgramWorkouts, completedProgramWorkouts, programCompletionPct, isProgramProgressAvailable } = useMemo(() => {
    if (!activeProgramAssignment?.id) {
      return { totalProgramWorkouts: 0, completedProgramWorkouts: 0, programCompletionPct: 0, isProgramProgressAvailable: false };
    }

    const programWorkouts = (client.workoutAssignments || []).filter(
      (w) => w.programAssignmentId === activeProgramAssignment.id
    );

    const total = programWorkouts.length;
    if (total === 0) {
      return { totalProgramWorkouts: 0, completedProgramWorkouts: 0, programCompletionPct: 0, isProgramProgressAvailable: false };
    }

    const completed = programWorkouts.filter(
      (w) => w.status === "COMPLETED" || w.workoutLog?.isCompleted === true
    ).length;
    const pct = Math.round((completed / total) * 100);

    return {
      totalProgramWorkouts: total,
      completedProgramWorkouts: completed,
      programCompletionPct: pct,
      isProgramProgressAvailable: true
    };
  }, [client.workoutAssignments, activeProgramAssignment?.id]);

  // 2. Canonical Date and Workout Categorization
  const todayKey = useMemo(() => getCairoDateKey(new Date()), []);
  const tomorrowKey = useMemo(() => addCalendarDaysKey(todayKey, 1), [todayKey]);
  const inTwoDaysKey = useMemo(() => addCalendarDaysKey(todayKey, 2), [todayKey]);

  // Derive effective status helper matching workout.service.ts
  const getEffectiveStatus = (assignment: ClientWorkoutAssignment): EffectiveAssignmentStatus => {
    if (assignment.status === "COMPLETED") return "COMPLETED";
    if (assignment.status === "SKIPPED") return "SKIPPED";
    if (assignment.status === "MISSED") return "MISSED";
    if (assignment.workoutLog && assignment.workoutLog.isCompleted === false) {
      return "IN_PROGRESS";
    }
    return "SCHEDULED";
  };

  // Find workouts scheduled today, sorted by programWorkoutOrder
  const todaysWorkouts = useMemo(() => {
    return (client.workoutAssignments || [])
      .filter((w) => toCalendarDateKey(w.scheduledDate) === todayKey)
      .sort((a, b) => (a.programWorkoutOrder || 0) - (b.programWorkoutOrder || 0));
  }, [client.workoutAssignments, todayKey]);

  // Future incomplete workouts (scheduled or in-progress only; skips SKIPPED, MISSED, and COMPLETED)
  const futureIncompleteWorkouts = useMemo(() => {
    return (client.workoutAssignments || [])
      .filter((w) => {
        const dateKey = toCalendarDateKey(w.scheduledDate);
        const effStatus = getEffectiveStatus(w);
        return (
          dateKey > todayKey &&
          (effStatus === "SCHEDULED" || effStatus === "IN_PROGRESS")
        );
      })
      .sort((a, b) => {
        const dateDiff = toCalendarDateKey(a.scheduledDate).localeCompare(toCalendarDateKey(b.scheduledDate));
        if (dateDiff !== 0) return dateDiff;
        return (a.programWorkoutOrder || 0) - (b.programWorkoutOrder || 0);
      });
  }, [client.workoutAssignments, todayKey]);

  // Primary Workout Resolution (Decision logic prioritizing incomplete today, else nearest upcoming)
  const { primaryWorkout, primaryWorkoutType, primaryWorkoutSubtitle } = useMemo(() => {
    // 1. Look for incomplete workout scheduled today (IN_PROGRESS or SCHEDULED)
    const incompleteToday = todaysWorkouts.find((w) => {
      const eff = getEffectiveStatus(w);
      return eff === "IN_PROGRESS" || eff === "SCHEDULED";
    });

    if (incompleteToday) {
      return {
        primaryWorkout: incompleteToday,
        primaryWorkoutType: "TODAY" as const,
        primaryWorkoutSubtitle: "Scheduled for Today"
      };
    }

    // 2. If no incomplete workout today, look for nearest future incomplete workout
    if (futureIncompleteWorkouts.length > 0) {
      const nearestFuture = futureIncompleteWorkouts[0];
      const futureDateKey = toCalendarDateKey(nearestFuture.scheduledDate);
      const relDay =
        futureDateKey === tomorrowKey
          ? "Tomorrow"
          : futureDateKey === inTwoDaysKey
          ? "In 2 days"
          : `On ${futureDateKey}`;

      return {
        primaryWorkout: nearestFuture,
        primaryWorkoutType: "NEXT_UPCOMING" as const,
        primaryWorkoutSubtitle: `Next Training Session • ${relDay}`
      };
    }

    // 3. If today had a workout that was already completed and no future incomplete
    if (todaysWorkouts.length > 0 && getEffectiveStatus(todaysWorkouts[0]) === "COMPLETED") {
      return {
        primaryWorkout: todaysWorkouts[0],
        primaryWorkoutType: "TODAY_COMPLETED" as const,
        primaryWorkoutSubtitle: "Completed Today"
      };
    }

    // 4. No workout today and no future incomplete workouts
    return {
      primaryWorkout: null,
      primaryWorkoutType: "NONE" as const,
      primaryWorkoutSubtitle: null
    };
  }, [todaysWorkouts, futureIncompleteWorkouts, tomorrowKey, inTwoDaysKey]);

  // Same-day remaining workouts: All other workouts scheduled today except primaryWorkout
  const todaysRemainingWorkouts = useMemo(() => {
    if (!primaryWorkout) return [];
    return todaysWorkouts.filter((w) => w.id !== primaryWorkout.id);
  }, [todaysWorkouts, primaryWorkout]);

  // 3. Upcoming Workouts: Compact preview of next 2-3 sessions, strictly future-dated
  const upcomingPreviewList = useMemo(() => {
    return futureIncompleteWorkouts
      .filter((w) => w.id !== primaryWorkout?.id)
      .slice(0, 3);
  }, [futureIncompleteWorkouts, primaryWorkout?.id]);

  // 4. Verified Measurements & Progress Snapshot:
  // Strictly accepts VERIFIED and LEGACY as trusted; never silently treats UNVERIFIED as verified
  const { latestTrustedWeight, weightChangeKg, totalCompletedAllTime, hasTrustedMeasurement } = useMemo(() => {
    const trusted = (client.measurements || []).filter(
      (m: any) => m.verificationStatus === "VERIFIED" || m.verificationStatus === "LEGACY"
    );

    const latest = trusted.length > 0 ? trusted[trusted.length - 1] : null;
    const initial = trusted.length > 1 ? trusted[0] : null;

    let change: number | null = null;
    if (latest && initial && typeof latest.weightKg === "number" && typeof initial.weightKg === "number") {
      change = Number((latest.weightKg - initial.weightKg).toFixed(1));
    }

    const completedCount = (client.workoutAssignments || []).filter(
      (w) => w.status === "COMPLETED" || w.workoutLog?.isCompleted === true
    ).length;

    return {
      latestTrustedWeight: latest ? latest.weightKg : null,
      weightChangeKg: change,
      totalCompletedAllTime: completedCount,
      hasTrustedMeasurement: Boolean(latest)
    };
  }, [client.measurements, client.workoutAssignments]);

  // 5. Active Goal:
  // Explicitly selects an IN_PROGRESS goal with deterministic sorting; never presents ACHIEVED/ABANDONED
  const activeGoal = useMemo(() => {
    const inProgress = (client.goals || []).filter((g) => g.status === "IN_PROGRESS");
    if (inProgress.length === 0) return null;

    return inProgress.sort((a, b) => {
      if (a.deadline && b.deadline) {
        return a.deadline.localeCompare(b.deadline);
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return (a.title || "").localeCompare(b.title || "");
    })[0];
  }, [client.goals]);

  // 6. Action Required (Check-in verification)
  const pendingCoachRequests = useMemo(() => {
    return checkInRequests.filter((r) => r.status === "PENDING");
  }, [checkInRequests]);

  const flaggedSubmissions = useMemo(() => {
    return checkInSubmissions.filter((s) => s.reviewStatus === "FLAGGED");
  }, [checkInSubmissions]);

  const isScheduleOverdue = scheduleStatus?.overallStatus === "OVERDUE";
  const isScheduleDueSoon = scheduleStatus?.overallStatus === "DUE_SOON";

  return (
    <div className="space-y-6">
      {/* HEADER GREETING */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
            <span>Welcome back, {client.user?.name || "Athlete"}</span>
            <Sparkles className="w-5 h-5 text-brand-crimson" />
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your training roadmap, today&apos;s workout focus, and performance progress at a glance.
          </p>
        </div>

        {/* Quick Program Navigation Shortcut */}
        {onNavigateTab && (
          <div className="flex items-center space-x-2 rtl:space-x-reverse self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onNavigateTab("program")}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-crimson dark:hover:text-brand-crimson transition-colors flex items-center space-x-1 rtl:space-x-reverse cursor-pointer"
            >
              <span>Full Program View</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* CHECK-IN ATTENTION OR ERROR BANNER */}
      {checkInLoadError && !loadingCheckIns && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="text-xs font-semibold">
              Unable to load check-in and compliance status at this moment.
            </span>
          </div>
          <button
            type="button"
            onClick={loadCheckInData}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors flex items-center space-x-1 rtl:space-x-reverse shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {!loadingCheckIns && !checkInLoadError && (pendingCoachRequests.length > 0 || flaggedSubmissions.length > 0 || isScheduleOverdue || isScheduleDueSoon) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start space-x-3 rtl:space-x-reverse">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-white uppercase tracking-wider">
                Action Required: Check-in & Compliance
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                {pendingCoachRequests.length > 0
                  ? `Coach requested check-in (${pendingCoachRequests[0].requestedMetrics?.join(", ") || "Physical Metrics"})`
                  : flaggedSubmissions.length > 0
                  ? `Your recent check-in was flagged with notes: "${flaggedSubmissions[0].coachReviewNotes || "Please review feedback"}"`
                  : isScheduleOverdue
                  ? `Routine check-in is overdue (${scheduleStatus?.overdueCount || 1} metric(s) pending update)`
                  : "Routine check-in is due soon"}
              </p>
            </div>
          </div>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("checkins")}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors shadow-sm self-end md:self-auto cursor-pointer"
            >
              Go to Check-ins
            </button>
          )}
        </div>
      )}

      {/* TOP GRID: CURRENT PROGRAM + TODAY'S/NEXT WORKOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. CURRENT TRAINING PROGRAM CARD (5 COLS) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse">
                <Layers className="w-3.5 h-3.5 text-brand-crimson" />
                <span>Current Training Program</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {activeProgramAssignment?.isActive ? "Active Program" : "Assigned"}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                {activeProgram?.titleEn || activeProgram?.titleAr || (activeProgram as any)?.name || "No Active Program"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {activeProgram?.descriptionEn ||
                  activeProgram?.descriptionAr ||
                  (activeProgram as any)?.description ||
                  "Structured training roadmap tailored to your athletic development."}
              </p>
            </div>

            <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs text-slate-600 dark:text-slate-300 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold">
                {activeProgram?.durationWeeks ? `${activeProgram.durationWeeks} Weeks` : "Flexible Duration"}
              </span>
              <span className="text-slate-400">
                {activeProgramAssignment?.startDate
                  ? `Started ${toCalendarDateKey(activeProgramAssignment.startDate)}`
                  : ""}
              </span>
            </div>
          </div>

          {/* Program Completion Progress */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Program Completion</span>
              <span className="font-extrabold text-brand-crimson text-sm">
                {isProgramProgressAvailable ? `${programCompletionPct}%` : "—"}
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-brand-crimson h-full rounded-full transition-all duration-500"
                style={{ width: isProgramProgressAvailable ? `${programCompletionPct}%` : "0%" }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>
                {isProgramProgressAvailable
                  ? `${completedProgramWorkouts} of ${totalProgramWorkouts} workouts completed`
                  : "Progress unavailable (sessions not linked to assignment cycle)"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. TODAY'S / NEXT WORKOUT (PRIMARY FOCUS CARD - 7 COLS) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse">
                <Dumbbell className="w-3.5 h-3.5 text-brand-crimson" />
                <span>
                  {primaryWorkoutType === "TODAY"
                    ? "Today's Workout"
                    : primaryWorkoutType === "TODAY_COMPLETED"
                    ? "Today's Workout (Completed)"
                    : primaryWorkoutType === "NEXT_UPCOMING"
                    ? "Next Upcoming Workout"
                    : "Today's Training Focus"}
                </span>
              </span>

              {primaryWorkout && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    getEffectiveStatus(primaryWorkout) === "COMPLETED"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : getEffectiveStatus(primaryWorkout) === "IN_PROGRESS"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse"
                      : getEffectiveStatus(primaryWorkout) === "MISSED"
                      ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                      : getEffectiveStatus(primaryWorkout) === "SKIPPED"
                      ? "bg-slate-500/15 text-slate-500 border-slate-500/30"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  }`}
                >
                  {getEffectiveStatus(primaryWorkout) === "COMPLETED"
                    ? "Completed ✓"
                    : getEffectiveStatus(primaryWorkout) === "IN_PROGRESS"
                    ? "In Progress"
                    : getEffectiveStatus(primaryWorkout) === "MISSED"
                    ? "Missed"
                    : getEffectiveStatus(primaryWorkout) === "SKIPPED"
                    ? "Skipped"
                    : "Scheduled"}
                </span>
              )}
            </div>

            {/* Workout Details or Empty State */}
            {primaryWorkout ? (
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {primaryWorkout.title || primaryWorkout.template?.titleEn || "Workout Session"}
                </h3>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {primaryWorkout.programWeekNumber && (
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Week {primaryWorkout.programWeekNumber} · Day {primaryWorkout.programDayNumber || 1}
                    </span>
                  )}
                  {primaryWorkout.programDayTitle && (
                    <>
                      <span>•</span>
                      <span>{primaryWorkout.programDayTitle}</span>
                    </>
                  )}
                  {todaysWorkouts.length > 1 && primaryWorkoutType === "TODAY" && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      Session {primaryWorkout.programWorkoutOrder || 1} of {todaysWorkouts.length} today
                    </span>
                  )}
                </div>

                {primaryWorkoutSubtitle && (
                  <p className="text-xs text-slate-400 italic pt-0.5">{primaryWorkoutSubtitle}</p>
                )}
              </div>
            ) : (
              /* No workout today and no future workouts: strictly no fake rest day */
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No Workout Scheduled Today
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Take time to recover, hydrate, and maintain your nutrition goals. Check upcoming workouts below.
                </p>
              </div>
            )}

            {/* MULTIPLE SESSIONS TODAY: Distinguishable list of remaining same-day sessions */}
            {todaysRemainingWorkouts.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Also Scheduled for Today
                </span>
                <div className="space-y-1.5">
                  {todaysRemainingWorkouts.map((rw) => {
                    const rwEff = getEffectiveStatus(rw);
                    return (
                      <div
                        key={rw.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {rw.title || rw.template?.titleEn || "Additional Workout"}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              (Session {rw.programWorkoutOrder || 2})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              rwEff === "COMPLETED"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : rwEff === "IN_PROGRESS"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            }`}
                          >
                            {rwEff === "COMPLETED" ? "Done ✓" : rwEff === "IN_PROGRESS" ? "Active" : "Scheduled"}
                          </span>
                          <button
                            type="button"
                            onClick={() => onSelectWorkout && onSelectWorkout(rw.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-brand-crimson hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            {rwEff === "COMPLETED" ? "Summary" : rwEff === "IN_PROGRESS" ? "Resume" : "Start"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Row for Primary Workout */}
          {primaryWorkout && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Workout details open in the dedicated runner.
              </span>

              {/* Only show Start / Resume / Summary for actionable statuses (never for MISSED/SKIPPED) */}
              {getEffectiveStatus(primaryWorkout) !== "MISSED" && getEffectiveStatus(primaryWorkout) !== "SKIPPED" ? (
                <button
                  type="button"
                  onClick={() => onSelectWorkout && onSelectWorkout(primaryWorkout.id)}
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center space-x-1.5 rtl:space-x-reverse transition-all shadow-md cursor-pointer ${
                    getEffectiveStatus(primaryWorkout) === "COMPLETED"
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      : "bg-brand-crimson hover:bg-[#FF2D3B] shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {getEffectiveStatus(primaryWorkout) === "COMPLETED"
                      ? "View Summary"
                      : getEffectiveStatus(primaryWorkout) === "IN_PROGRESS"
                      ? "Resume Workout"
                      : "Start Workout"}
                  </span>
                </button>
              ) : (
                <span className="text-xs font-bold text-slate-500 italic">
                  This workout was marked as {getEffectiveStatus(primaryWorkout).toLowerCase()}.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM GRID: UPCOMING WORKOUTS + PROGRESS SNAPSHOT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 3. UPCOMING WORKOUTS PREVIEW (7 COLS) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse">
              <Calendar className="w-3.5 h-3.5 text-brand-crimson" />
              <span>Upcoming Workouts</span>
            </h4>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab("workouts")}
                className="text-xs font-bold text-slate-500 hover:text-brand-crimson dark:text-slate-400 dark:hover:text-brand-crimson transition-colors cursor-pointer"
              >
                View All History
              </button>
            )}
          </div>

          {upcomingPreviewList.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-slate-400 text-xs">
              No further scheduled workouts in your queue.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingPreviewList.map((w) => {
                const wKey = toCalendarDateKey(w.scheduledDate);
                const relLabel =
                  wKey === tomorrowKey
                    ? "Tomorrow"
                    : wKey === inTwoDaysKey
                    ? "In 2 days"
                    : wKey;

                return (
                  <div
                    key={w.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                        {w.programDayNumber ? `D${w.programDayNumber}` : <Dumbbell className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {w.title || w.template?.titleEn || "Workout Session"}
                        </h5>
                        <p className="text-[11px] text-slate-400 flex items-center space-x-1.5 rtl:space-x-reverse mt-0.5">
                          {w.programWeekNumber && (
                            <>
                              <span>Week {w.programWeekNumber}</span>
                              <span>•</span>
                            </>
                          )}
                          <span className="font-semibold text-brand-crimson">{relLabel}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectWorkout && onSelectWorkout(w.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-brand-crimson hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. PROGRESS SNAPSHOT (5 COLS) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse">
              <Scale className="w-3.5 h-3.5 text-brand-crimson" />
              <span>Progress Snapshot</span>
            </h4>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab("measurements")}
                className="text-xs font-bold text-slate-500 hover:text-brand-crimson dark:text-slate-400 dark:hover:text-brand-crimson transition-colors cursor-pointer"
              >
                Log History
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Trusted Weight Metric Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  Current Weight
                </span>
                {hasTrustedMeasurement && (
                  <span className="text-[9px] font-bold text-emerald-500 flex items-center space-x-0.5 rtl:space-x-reverse">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                )}
              </div>

              <div className="flex items-baseline space-x-1.5 rtl:space-x-reverse">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {latestTrustedWeight !== null ? latestTrustedWeight : "--"}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {latestTrustedWeight !== null ? "KG" : ""}
                </span>
              </div>

              {hasTrustedMeasurement ? (
                weightChangeKg !== null ? (
                  <div
                    className={`flex items-center space-x-1 rtl:space-x-reverse text-[11px] font-bold ${
                      weightChangeKg < 0 ? "text-emerald-500" : "text-amber-500"
                    }`}
                  >
                    {weightChangeKg < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {weightChangeKg > 0 ? `+${weightChangeKg}` : weightChangeKg} kg overall
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic block">Baseline measurement</span>
                )
              ) : (
                <span className="text-[10px] text-slate-400 italic block">No verified measurement logged</span>
              )}
            </div>

            {/* Completed Workouts All Time */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                Completed Sessions
              </span>
              <div className="flex items-baseline space-x-1.5 rtl:space-x-reverse">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {totalCompletedAllTime}
                </span>
                <span className="text-xs font-bold text-slate-400">Done</span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center space-x-1 rtl:space-x-reverse">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Recorded in log</span>
              </p>
            </div>
          </div>

          {/* Explicit Active Goal Banner: strictly displays IN_PROGRESS, never achieved or abandoned */}
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
              <Activity className="w-4 h-4 text-brand-crimson shrink-0" />
              <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                {activeGoal
                  ? `Goal: ${activeGoal.title || activeGoal.goalType?.replace("_", " ")} (${activeGoal.targetValue || ""} ${activeGoal.unit || ""})`
                  : "No active goal set"}
              </span>
            </div>
            {activeGoal && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-crimson/15 text-brand-crimson shrink-0">
                In Progress
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

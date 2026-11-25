"use client";

import PartTimings from "@/components/workouts/PartTimings";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Dumbbell,
  Calendar,
  Play,
  MessageSquare,
  CheckCircle2,
  History,
  Sparkles,
  Filter,
  ExternalLink
} from "lucide-react";
import { toCalendarDateKey, getCairoDateKey, addCalendarDaysKey } from "@/lib/date-utils";
import {
  selectAthleteWorkouts,
  deriveEffectiveStatus,
  isExecutableStatus
} from "@/lib/athlete-selection";

interface WorkoutsTabProps {
  clientId: string;
  isClient?: boolean;
  onExecuteWorkout?: (workoutId: string) => void;
  refreshKey?: number;
}

function getRelativeDayLabel(scheduledDateStr: string | Date, todayKey: string): string {
  const dateKey = toCalendarDateKey(scheduledDateStr);
  const tomorrowKey = addCalendarDaysKey(todayKey, 1);
  const inTwoDaysKey = addCalendarDaysKey(todayKey, 2);

  if (dateKey === todayKey) return "Today";
  if (dateKey === tomorrowKey) return "Tomorrow";
  if (dateKey === inTwoDaysKey) return "In 2 days";
  return dateKey;
}

export default function WorkoutsTab({
  clientId,
  isClient = false,
  onExecuteWorkout,
  refreshKey
}: WorkoutsTabProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "TODAY" | "UPCOMING" | "HISTORY">("ALL");

  const loadAssignments = useCallback(() => {
    fetch(`/api/workouts?clientId=${clientId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.assignments) {
          setAssignments(json.data.assignments);
        }
      })
      .catch((err) => console.error("[WorkoutsTab] Error fetching assignments:", err))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments, refreshKey]);

  const todayKey = useMemo(() => getCairoDateKey(), []);

  const selection = useMemo(() => {
    return selectAthleteWorkouts(assignments, todayKey);
  }, [assignments, todayKey]);

  // Avoid duplicate workout cards between Section 1 and Section 2
  const upcomingToDisplay = useMemo(() => {
    if (filter === "UPCOMING") {
      return selection.upcomingActionableWorkouts;
    }
    const featuredId = selection.hasTodayWorkouts
      ? (selection.isTodayAllCompleted ? selection.nextIncompleteWorkout?.id : null)
      : selection.nextIncompleteWorkout?.id;

    return selection.upcomingActionableWorkouts.filter((w) => w.id !== featuredId);
  }, [selection, filter]);

  const renderWorkoutCard = (
    a: any,
    options: {
      sessionLabel?: string;
      isPrimary?: boolean;
      customBadgeLabel?: string;
      subtitle?: string;
    } = {}
  ) => {
    const effStatus = deriveEffectiveStatus(a);

    const badgeCls =
      effStatus === "COMPLETED"
        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
        : effStatus === "IN_PROGRESS"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
        : effStatus === "SKIPPED"
        ? "bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30"
        : effStatus === "MISSED"
        ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";

    const badgeLabel =
      options.customBadgeLabel ||
      (effStatus === "COMPLETED"
        ? "Completed ✓"
        : effStatus === "IN_PROGRESS"
        ? "In Progress"
        : effStatus === "SKIPPED"
        ? "Skipped"
        : effStatus === "MISSED"
        ? "Missed"
        : "Scheduled");

    const dateKey = a.scheduledDate ? toCalendarDateKey(a.scheduledDate) : null;
    const relDay = a.scheduledDate ? getRelativeDayLabel(a.scheduledDate, todayKey) : null;

    const hasSetReviews = a.workoutLog?.setLogs?.some((sl: any) => Boolean(sl.coachReview));
    const setReviewsCount = a.workoutLog?.setLogs?.filter((sl: any) => Boolean(sl.coachReview))?.length || 0;

    const isExecutable = isExecutableStatus(effStatus) || effStatus === "COMPLETED";

    return (
      <div
        key={a.id}
        className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm dark:shadow-xl flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-all ${
          options.isPrimary
            ? "border-brand-crimson/50 dark:border-brand-crimson/40 ring-1 ring-brand-crimson/20"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="flex items-start space-x-3.5 rtl:space-x-reverse flex-1 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 mt-0.5 ${
              effStatus === "COMPLETED"
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                : effStatus === "IN_PROGRESS"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "bg-brand-crimson/15 text-brand-crimson"
            }`}
          >
            {effStatus === "COMPLETED" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Dumbbell className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {a.title || a.template?.titleEn || a.template?.titleAr || "Custom Training Session"}
              </h4>

              {options.sessionLabel && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-brand-crimson/10 text-brand-crimson border border-brand-crimson/20">
                  {options.sessionLabel}
                </span>
              )}

              {a.programWeekNumber && a.programDayNumber && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Week {a.programWeekNumber} · Day {a.programDayNumber}
                  {a.programDayTitle ? ` (${a.programDayTitle})` : ""}
                </span>
              )}
            </div>

            {options.subtitle && (
              <p className="text-xs text-brand-crimson font-medium">{options.subtitle}</p>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 rtl:space-x-reverse">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Workout Date: {dateKey || "N/A"}
                {relDay && relDay !== dateKey ? ` (${relDay})` : ""}
              </span>
            </p>

            <PartTimings blocks={a.assignmentBlocks} />

            {effStatus === "SKIPPED" && a.workoutLog?.clientFeedback && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Skip reason: {a.workoutLog.clientFeedback}
              </p>
            )}

            {/* Coach Feedback Box */}
            {a.workoutLog?.coachFeedback && (
              <div className="mt-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Coach Review & Feedback</span>
                  {a.workoutLog.coachReviewedAt && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                      · {new Date(a.workoutLog.coachReviewedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  {a.workoutLog.coachFeedback}
                </p>
              </div>
            )}

            {/* Set-Level Coach Review Indicator */}
            {hasSetReviews && (
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                <MessageSquare className="w-3 h-3" />
                <span>Includes set-level coach notes ({setReviewsCount} set{setReviewsCount > 1 ? "s" : ""})</span>
              </div>
            )}

            {/* Athlete Post-Workout Feedback */}
            {a.workoutLog?.clientFeedback && effStatus !== "SKIPPED" && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 italic">
                Athlete note: &quot;{a.workoutLog.clientFeedback}&quot;
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse self-end sm:self-center shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badgeCls}`}>
            {badgeLabel}
          </span>

          {isExecutable && (
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
              {onExecuteWorkout ? (
                <button
                  type="button"
                  onClick={() => onExecuteWorkout(a.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition-transform hover:scale-105 shadow-md cursor-pointer ${
                    effStatus === "COMPLETED"
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      : "bg-brand-crimson hover:bg-[#FF2D3B] text-white shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {effStatus === "COMPLETED"
                      ? "View Summary"
                      : effStatus === "IN_PROGRESS"
                      ? "Resume"
                      : "Start Workout"}
                  </span>
                </button>
              ) : (
                <Link
                  href={`/workout/${a.id}/execute`}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition-transform hover:scale-105 shadow-md cursor-pointer ${
                    effStatus === "COMPLETED"
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      : "bg-brand-crimson hover:bg-[#FF2D3B] text-white shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {effStatus === "COMPLETED"
                      ? "View Summary"
                      : effStatus === "IN_PROGRESS"
                      ? "Resume"
                      : "Start Workout"}
                  </span>
                </Link>
              )}

              {/* Standalone Route Fallback */}
              <Link
                href={`/workout/${a.id}/execute`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in standalone page (fallback)"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
            <span>Assigned Workouts</span>
            <Sparkles className="w-4 h-4 text-brand-crimson" />
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current-first training roadmap: today&apos;s sessions, upcoming queue, and historical logs
          </p>
        </div>
        {!isClient && (
          <Link
            href={`/assignments?athleteId=${clientId}&mode=TEMPLATE`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold transition-all shadow-md self-start sm:self-auto cursor-pointer"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Assign Workout</span>
          </Link>
        )}
      </div>

      {/* Filter / Navigation Pills (Today / Upcoming / History) */}
      {!loading && assignments.length > 0 && (
        <div className="flex items-center space-x-2 rtl:space-x-reverse overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer ${
              filter === "ALL"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>All</span>
            <span className="text-[10px] opacity-75">({assignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("TODAY")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer ${
              filter === "TODAY"
                ? "bg-brand-crimson text-white shadow-md shadow-[0_0_15px_rgba(240,20,37,0.3)]"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>Today</span>
            <span className="text-[10px] opacity-75">({selection.metrics.todayTotal})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("UPCOMING")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer ${
              filter === "UPCOMING"
                ? "bg-brand-crimson text-white shadow-md shadow-[0_0_15px_rgba(240,20,37,0.3)]"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>Upcoming</span>
            <span className="text-[10px] opacity-75">({selection.metrics.upcomingExecutable})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("HISTORY")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer ${
              filter === "HISTORY"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>History</span>
            <span className="text-[10px] opacity-75">({selection.metrics.historyTotal})</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-crimson" />
          <p className="font-semibold">Loading athlete training roadmap...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs space-y-3">
          <Dumbbell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="font-bold text-slate-700 dark:text-slate-300">No workouts assigned yet.</p>
          <p className="text-[11px] max-w-sm mx-auto">
            Workouts assigned by your coach will appear here organized by today&apos;s focus, upcoming sessions, and history.
          </p>
          {!isClient && (
            <Link
              href={`/assignments?athleteId=${clientId}&mode=TEMPLATE`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold transition-all shadow-md cursor-pointer mt-2"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Assign First Workout</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: TODAY'S TRAINING / CURRENT ACTIONABLE FOCUS */}
          {(filter === "ALL" || filter === "TODAY") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-crimson animate-pulse" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {selection.hasTodayWorkouts ? "Today's Training" : "Next Training Session"}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({todayKey})
                  </span>
                </div>
                {selection.hasTodayWorkouts && (
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {selection.metrics.todayCompleted} of {selection.metrics.todayTotal} completed
                  </span>
                )}
              </div>

              {selection.hasTodayWorkouts ? (
                <div className="space-y-3">
                  {selection.todayWorkouts.map((a, idx) =>
                    renderWorkoutCard(a, {
                      sessionLabel:
                        selection.todayWorkouts.length > 1
                          ? `Session ${idx + 1} of ${selection.todayWorkouts.length}`
                          : undefined,
                      isPrimary: deriveEffectiveStatus(a) !== "COMPLETED"
                    })
                  )}

                  {/* If all workouts today are completed, celebrate and surface nearest upcoming */}
                  {selection.isTodayAllCompleted && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="font-bold">
                          All workouts completed for today! Excellent work!
                        </span>
                      </div>
                    </div>
                  )}

                  {selection.isTodayAllCompleted && selection.nextIncompleteWorkout && (
                    <div className="pt-2 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Up Next in Schedule
                      </span>
                      {renderWorkoutCard(selection.nextIncompleteWorkout, {
                        subtitle: "Nearest Upcoming Actionable Workout"
                      })}
                    </div>
                  )}
                </div>
              ) : selection.nextIncompleteWorkout ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    No workout scheduled for today. Here is your next upcoming session:
                  </div>
                  {renderWorkoutCard(selection.nextIncompleteWorkout, {
                    isPrimary: true,
                    subtitle: "Next Upcoming Actionable Workout"
                  })}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  No active workouts scheduled. Check back later or review your history below.
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: UPCOMING WORKOUTS QUEUE */}
          {(filter === "ALL" || filter === "UPCOMING") && upcomingToDisplay.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Calendar className="w-3.5 h-3.5 text-brand-crimson" />
                  <span>Upcoming Workouts ({upcomingToDisplay.length})</span>
                </h4>
              </div>

              <div className="space-y-3">
                {upcomingToDisplay.map((a) => renderWorkoutCard(a))}
              </div>
            </div>
          )}

          {/* SECTION 3: WORKOUT HISTORY (PAST SESSIONS, NEWEST FIRST) */}
          {(filter === "ALL" || filter === "HISTORY") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Workout History ({selection.historyWorkouts.length})</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  Sorted newest first
                </span>
              </div>

              {selection.historyWorkouts.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  No past workout history recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {selection.historyWorkouts.map((a) => renderWorkoutCard(a))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

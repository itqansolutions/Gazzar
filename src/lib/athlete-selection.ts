/**
 * Athlete Experience: Unified Selection Utility
 *
 * Establishes one pure, side-effect-free business rule for partitioning
 * and selecting Current / Today, Upcoming, and Historical athlete workouts.
 *
 * Adheres strictly to:
 * - Canonical Africa/Cairo calendar date utilities (getCairoDateKey, toCalendarDateKey)
 * - Repository effective status determination (deriveEffectiveStatus)
 * - Intra-day sequence preservation (programWorkoutOrder -> createdAt -> id)
 * - Zero mutation of input data
 */

import { getCairoDateKey, toCalendarDateKey } from "@/lib/date-utils";
import type { ClientWorkoutAssignment, EffectiveAssignmentStatus } from "@/types";

/**
 * Derives the effective execution status of a workout assignment.
 * Reusable and pure — safe for both client and server contexts.
 */
export function deriveEffectiveStatus(assignment: {
  status: string;
  workoutLog?: { isCompleted?: boolean | null } | null;
  effectiveStatus?: EffectiveAssignmentStatus;
}): EffectiveAssignmentStatus {
  if (assignment.effectiveStatus) return assignment.effectiveStatus;
  if (assignment.status === "COMPLETED") return "COMPLETED";
  if (assignment.status === "SKIPPED") return "SKIPPED";
  if (assignment.status === "MISSED") return "MISSED";
  if (assignment.workoutLog && assignment.workoutLog.isCompleted === false) {
    return "IN_PROGRESS";
  }
  return "SCHEDULED";
}

/**
 * Checks whether an effective status is executable / actionable by an athlete.
 * SKIPPED, MISSED, and COMPLETED are not executable upcoming items.
 */
export function isExecutableStatus(status: EffectiveAssignmentStatus): boolean {
  return status === "IN_PROGRESS" || status === "SCHEDULED";
}

/**
 * Compares two assignments scheduled on the same date to preserve defined intra-day order:
 * 1. programWorkoutOrder (ascending, lower numbers first)
 * 2. createdAt timestamp (ascending, earliest created first)
 * 3. id string (ascending, deterministic stable fallback)
 */
export function compareSameDayWorkoutOrder(
  a: ClientWorkoutAssignment,
  b: ClientWorkoutAssignment
): number {
  const orderA = a.programWorkoutOrder;
  const orderB = b.programWorkoutOrder;

  const hasOrderA = typeof orderA === "number" && !Number.isNaN(orderA);
  const hasOrderB = typeof orderB === "number" && !Number.isNaN(orderB);

  if (hasOrderA && hasOrderB) {
    if (orderA !== orderB) return orderA - orderB;
  } else if (hasOrderA) {
    return -1; // Explicit program order takes priority over unspecified
  } else if (hasOrderB) {
    return 1;
  }

  // Fallback to creation date if present in data
  const rawA = a as { createdAt?: string | Date };
  const rawB = b as { createdAt?: string | Date };
  const timeA = rawA.createdAt ? new Date(rawA.createdAt).getTime() : 0;
  const timeB = rawB.createdAt ? new Date(rawB.createdAt).getTime() : 0;
  if (timeA !== timeB && !Number.isNaN(timeA) && !Number.isNaN(timeB)) {
    return timeA - timeB;
  }

  // Deterministic stable tie-breaker
  return (a.id || "").localeCompare(b.id || "");
}

export type PrimaryWorkoutReason =
  | "TODAY_IN_PROGRESS"
  | "TODAY_SCHEDULED"
  | "NEAREST_UPCOMING"
  | "TODAY_COMPLETED"
  | "NONE";

export interface AthleteWorkoutSelection {
  /**
   * Reference calendar date used for evaluation (YYYY-MM-DD in Africa/Cairo).
   */
  referenceDateKey: string;

  /**
   * All workouts scheduled for today (reference calendar date), in stable intra-day order.
   * Includes both incomplete and completed workouts.
   */
  todayWorkouts: ClientWorkoutAssignment[];

  /**
   * Incomplete workouts scheduled for today (IN_PROGRESS or SCHEDULED).
   */
  todayIncompleteWorkouts: ClientWorkoutAssignment[];

  /**
   * Completed workouts scheduled for today (COMPLETED).
   */
  todayCompletedWorkouts: ClientWorkoutAssignment[];

  /**
   * The primary featured workout to highlight:
   * 1. If there is an incomplete workout today -> earliest incomplete today
   * 2. If no incomplete workout today -> nearest future incomplete workout (executable)
   * 3. If no incomplete workout today or in future, but today has completed workout -> today's completed workout
   * 4. Otherwise -> null
   */
  primaryWorkout: ClientWorkoutAssignment | null;

  /**
   * Whether the primary workout is scheduled for today (reference date).
   */
  isToday: boolean;

  /**
   * Classification of the primary workout source.
   */
  primaryReason: PrimaryWorkoutReason;

  /**
   * Nearest future incomplete executable workout (scheduledDate > referenceDateKey,
   * effectiveStatus is SCHEDULED or IN_PROGRESS). Excludes SKIPPED and MISSED.
   */
  nextIncompleteWorkout: ClientWorkoutAssignment | null;

  /**
   * All future workouts (scheduledDate > referenceDateKey), sorted chronological ascending.
   * Preserves intra-day order for multiple workouts on the same date.
   * Contains complete future schedule including any SKIPPED or MISSED entries.
   */
  upcomingWorkouts: ClientWorkoutAssignment[];

  /**
   * Actionable future workouts (scheduledDate > referenceDateKey,
   * effectiveStatus is SCHEDULED or IN_PROGRESS). Strictly excludes SKIPPED, MISSED, and COMPLETED.
   */
  upcomingActionableWorkouts: ClientWorkoutAssignment[];

  /**
   * Actionable upcoming workouts excluding primaryWorkout (when primaryWorkout is from upcoming).
   * Strictly contains only executable (SCHEDULED / IN_PROGRESS) assignments.
   * Prevents duplicate display between the primary hero card and the upcoming schedule list.
   */
  upcomingPreviewWorkouts: ClientWorkoutAssignment[];

  /**
   * Historical workouts (scheduledDate < referenceDateKey), sorted reverse-chronological (newest first).
   * Preserves intra-day order within the same past date.
   */
  historyWorkouts: ClientWorkoutAssignment[];

  /**
   * Status flags and summary metrics.
   */
  hasTodayWorkouts: boolean;
  hasIncompleteToday: boolean;
  isTodayAllCompleted: boolean;
  metrics: {
    todayTotal: number;
    todayIncomplete: number;
    todayCompleted: number;
    upcomingTotal: number;
    upcomingExecutable: number;
    historyTotal: number;
  };
}

/**
 * Pure, side-effect-free partitioner and selector for athlete workouts.
 *
 * @param assignments Raw list of client workout assignments
 * @param referenceDateKey Optional YYYY-MM-DD string. Defaults to getCairoDateKey()
 */
export function selectAthleteWorkouts(
  assignments: ClientWorkoutAssignment[] = [],
  referenceDateKey?: string
): AthleteWorkoutSelection {
  const todayKey = referenceDateKey || getCairoDateKey();

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return {
      referenceDateKey: todayKey,
      todayWorkouts: [],
      todayIncompleteWorkouts: [],
      todayCompletedWorkouts: [],
      primaryWorkout: null,
      isToday: false,
      primaryReason: "NONE",
      nextIncompleteWorkout: null,
      upcomingWorkouts: [],
      upcomingActionableWorkouts: [],
      upcomingPreviewWorkouts: [],
      historyWorkouts: [],
      hasTodayWorkouts: false,
      hasIncompleteToday: false,
      isTodayAllCompleted: false,
      metrics: {
        todayTotal: 0,
        todayIncomplete: 0,
        todayCompleted: 0,
        upcomingTotal: 0,
        upcomingExecutable: 0,
        historyTotal: 0
      }
    };
  }

  // 1. Partition assignments into Today, Upcoming, and History without mutating the input
  const todayRaw: ClientWorkoutAssignment[] = [];
  const upcomingRaw: ClientWorkoutAssignment[] = [];
  const historyRaw: ClientWorkoutAssignment[] = [];

  for (const item of assignments) {
    if (!item || !item.scheduledDate) continue;
    const itemDateKey = toCalendarDateKey(item.scheduledDate);
    if (!itemDateKey) continue;

    if (itemDateKey === todayKey) {
      todayRaw.push(item);
    } else if (itemDateKey > todayKey) {
      upcomingRaw.push(item);
    } else {
      historyRaw.push(item);
    }
  }

  // 2. Sort Today: intra-day order
  const todayWorkouts = [...todayRaw].sort(compareSameDayWorkoutOrder);

  // 3. Sort Upcoming: chronological ASC, then intra-day order
  const upcomingWorkouts = [...upcomingRaw].sort((a, b) => {
    const dateComp = toCalendarDateKey(a.scheduledDate).localeCompare(toCalendarDateKey(b.scheduledDate));
    if (dateComp !== 0) return dateComp;
    return compareSameDayWorkoutOrder(a, b);
  });

  // 4. Sort History: reverse-chronological DESC, then intra-day order
  const historyWorkouts = [...historyRaw].sort((a, b) => {
    const dateComp = toCalendarDateKey(b.scheduledDate).localeCompare(toCalendarDateKey(a.scheduledDate));
    if (dateComp !== 0) return dateComp;
    return compareSameDayWorkoutOrder(a, b);
  });

  // 5. Partition Today by completion
  const todayIncompleteWorkouts = todayWorkouts.filter((a) => isExecutableStatus(deriveEffectiveStatus(a)));
  const todayCompletedWorkouts = todayWorkouts.filter((a) => deriveEffectiveStatus(a) === "COMPLETED");

  // 6. Find nearest upcoming incomplete workout (ignoring SKIPPED / MISSED)
  const nextIncompleteWorkout =
    upcomingWorkouts.find((a) => isExecutableStatus(deriveEffectiveStatus(a))) || null;

  // 7. Resolve primary workout and reason
  let primaryWorkout: ClientWorkoutAssignment | null = null;
  let isToday = false;
  let primaryReason: PrimaryWorkoutReason = "NONE";

  if (todayIncompleteWorkouts.length > 0) {
    // In-progress workout today gets highest priority, otherwise first incomplete today
    const inProgress = todayIncompleteWorkouts.find((a) => deriveEffectiveStatus(a) === "IN_PROGRESS");
    const chosen = inProgress || todayIncompleteWorkouts[0];
    primaryWorkout = chosen;
    isToday = true;
    primaryReason = deriveEffectiveStatus(chosen) === "IN_PROGRESS" ? "TODAY_IN_PROGRESS" : "TODAY_SCHEDULED";
  } else if (nextIncompleteWorkout !== null) {
    // No incomplete workouts today -> surface nearest future incomplete workout
    primaryWorkout = nextIncompleteWorkout;
    isToday = false;
    primaryReason = "NEAREST_UPCOMING";
  } else if (todayCompletedWorkouts.length > 0) {
    // Today's workouts are all completed and no future incomplete workouts exist
    primaryWorkout = todayCompletedWorkouts[todayCompletedWorkouts.length - 1];
    isToday = true;
    primaryReason = "TODAY_COMPLETED";
  }

  // 8. Filter upcoming actionable and preview to avoid duplicating primary card when primary is from upcoming
  // and strictly exclude non-executable (SKIPPED, MISSED, COMPLETED) assignments.
  const upcomingActionableWorkouts = upcomingWorkouts.filter((w) =>
    isExecutableStatus(deriveEffectiveStatus(w))
  );

  const upcomingPreviewWorkouts =
    !isToday && primaryWorkout !== null
      ? upcomingActionableWorkouts.filter((w) => w.id !== primaryWorkout!.id)
      : upcomingActionableWorkouts;

  // 9. Compute status flags and summary metrics
  const hasTodayWorkouts = todayWorkouts.length > 0;
  const hasIncompleteToday = todayIncompleteWorkouts.length > 0;
  const isTodayAllCompleted = hasTodayWorkouts && !hasIncompleteToday && todayCompletedWorkouts.length > 0;

  const upcomingExecutableCount = upcomingActionableWorkouts.length;

  return {
    referenceDateKey: todayKey,
    todayWorkouts,
    todayIncompleteWorkouts,
    todayCompletedWorkouts,
    primaryWorkout,
    isToday,
    primaryReason,
    nextIncompleteWorkout,
    upcomingWorkouts,
    upcomingActionableWorkouts,
    upcomingPreviewWorkouts,
    historyWorkouts,
    hasTodayWorkouts,
    hasIncompleteToday,
    isTodayAllCompleted,
    metrics: {
      todayTotal: todayWorkouts.length,
      todayIncomplete: todayIncompleteWorkouts.length,
      todayCompleted: todayCompletedWorkouts.length,
      upcomingTotal: upcomingWorkouts.length,
      upcomingExecutable: upcomingExecutableCount,
      historyTotal: historyWorkouts.length
    }
  };
}

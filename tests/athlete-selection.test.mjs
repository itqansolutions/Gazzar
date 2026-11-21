import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveEffectiveStatus,
  isExecutableStatus,
  compareSameDayWorkoutOrder,
  selectAthleteWorkouts
} from "../src/lib/athlete-selection.ts";

test("Milestone: Pure Athlete Workout Selection Utility", async (t) => {
  const TODAY = "2026-11-22";

  await t.test("1. Incomplete workout today (SCHEDULED) has priority as primaryWorkout", () => {
    const assignments = [
      {
        id: "w-today-sched",
        title: "Upper Body Hypertrophy",
        scheduledDate: "2026-11-22T12:00:00.000Z",
        status: "SCHEDULED"
      },
      {
        id: "w-future-1",
        title: "Leg Day",
        scheduledDate: "2026-11-24T12:00:00.000Z",
        status: "SCHEDULED"
      }
    ];

    const result = selectAthleteWorkouts(assignments, TODAY);

    assert.equal(result.isToday, true);
    assert.equal(result.primaryReason, "TODAY_SCHEDULED");
    assert.equal(result.primaryWorkout?.id, "w-today-sched");
    assert.equal(result.todayWorkouts.length, 1);
    assert.equal(result.todayIncompleteWorkouts.length, 1);
    assert.equal(result.todayCompletedWorkouts.length, 0);
    assert.equal(result.nextIncompleteWorkout?.id, "w-future-1");
    assert.equal(result.upcomingPreviewWorkouts.length, 1);
    assert.equal(result.upcomingPreviewWorkouts[0].id, "w-future-1");
  });

  await t.test("2. In-progress workout today takes precedence over scheduled today", () => {
    const assignments = [
      {
        id: "w-today-sched",
        title: "Post-Workout Stretching",
        scheduledDate: "2026-11-22T12:00:00.000Z",
        programWorkoutOrder: 2,
        status: "SCHEDULED"
      },
      {
        id: "w-today-prog",
        title: "Heavy Bench & Incline",
        scheduledDate: "2026-11-22T12:00:00.000Z",
        programWorkoutOrder: 1,
        status: "SCHEDULED",
        workoutLog: { isCompleted: false }
      }
    ];

    const result = selectAthleteWorkouts(assignments, TODAY);

    assert.equal(result.isToday, true);
    assert.equal(result.primaryReason, "TODAY_IN_PROGRESS");
    assert.equal(result.primaryWorkout?.id, "w-today-prog");
    assert.equal(result.todayWorkouts.length, 2);
    assert.equal(result.todayIncompleteWorkouts.length, 2);
    // Preserves intra-day program order in todayWorkouts
    assert.equal(result.todayWorkouts[0].id, "w-today-prog");
    assert.equal(result.todayWorkouts[1].id, "w-today-sched");
  });

  await t.test("3. Completed workout today with future workout: shows today completed & selects future as primary", () => {
    const assignments = [
      {
        id: "w-today-done",
        title: "Morning Cardio",
        scheduledDate: "2026-11-22T12:00:00.000Z",
        status: "COMPLETED",
        workoutLog: { isCompleted: true }
      },
      {
        id: "w-tomorrow-incomplete",
        title: "Legs & Abs",
        scheduledDate: "2026-11-23T12:00:00.000Z",
        status: "SCHEDULED"
      }
    ];

    const result = selectAthleteWorkouts(assignments, TODAY);

    // Today's workout remains visible with completed status
    assert.equal(result.hasTodayWorkouts, true);
    assert.equal(result.hasIncompleteToday, false);
    assert.equal(result.isTodayAllCompleted, true);
    assert.equal(result.todayWorkouts.length, 1);
    assert.equal(result.todayWorkouts[0].id, "w-today-done");
    assert.equal(deriveEffectiveStatus(result.todayWorkouts[0]), "COMPLETED");

    // Primary workout falls back to nearest future incomplete workout
    assert.equal(result.isToday, false);
    assert.equal(result.primaryReason, "NEAREST_UPCOMING");
    assert.equal(result.primaryWorkout?.id, "w-tomorrow-incomplete");
    assert.equal(result.nextIncompleteWorkout?.id, "w-tomorrow-incomplete");

    // Upcoming preview excludes the primary workout to avoid duplicate display
    assert.equal(result.upcomingWorkouts.length, 1);
    assert.equal(result.upcomingPreviewWorkouts.length, 0);
  });

  await t.test("4. Multiple workouts on the same day preserve defined order (programWorkoutOrder)", () => {
    const assignments = [
      {
        id: "w-session-3",
        title: "Session C: Conditioning",
        scheduledDate: "2026-11-22T12:00:00.000Z",
        programWorkoutOrder: 3,
        status: "SCHEDULED"
      },
      {
        id: "w-session-1",
        title: "Session A: Strength",
        scheduledDate: "2026-11-22T12:00:00.000Z",
        programWorkoutOrder: 1,
        status: "SCHEDULED"
      },
      {
        id: "w-session-2",
        title: "Session B: Mobility",
        scheduledDate: "2026-11-22T12:00:00.000Z",
        programWorkoutOrder: 2,
        status: "SCHEDULED"
      }
    ];

    const result = selectAthleteWorkouts(assignments, TODAY);

    assert.equal(result.todayWorkouts.length, 3);
    assert.equal(result.todayWorkouts[0].id, "w-session-1");
    assert.equal(result.todayWorkouts[1].id, "w-session-2");
    assert.equal(result.todayWorkouts[2].id, "w-session-3");
    assert.equal(result.primaryWorkout?.id, "w-session-1");
  });

  await t.test("5. Stable same-day fallback when programWorkoutOrder is absent (createdAt ASC, then id)", () => {
    const assignments = [
      {
        id: "w-later-created",
        title: "Second Created Workout",
        scheduledDate: "2026-11-22T12:00:00.000Z",
        createdAt: "2026-11-20T15:00:00.000Z",
        status: "SCHEDULED"
      },
      {
        id: "w-earlier-created",
        title: "First Created Workout",
        scheduledDate: "2026-11-22T12:00:00.000Z",
        createdAt: "2026-11-20T10:00:00.000Z",
        status: "SCHEDULED"
      }
    ];

    const result = selectAthleteWorkouts(assignments, TODAY);

    assert.equal(result.todayWorkouts[0].id, "w-earlier-created");
    assert.equal(result.todayWorkouts[1].id, "w-later-created");
  });

  await t.test("6. No workouts today: selects nearest future incomplete workout", () => {
    const assignments = [
      {
        id: "w-next-week",
        title: "Pull Day",
        scheduledDate: "2026-11-25T12:00:00.000Z",
        status: "SCHEDULED"
      },
      {
        id: "w-later-week",
        title: "Shoulders Day",
        scheduledDate: "2026-11-27T12:00:00.000Z",
        status: "SCHEDULED"
      }
    ];

    const result = selectAthleteWorkouts(assignments, TODAY);

    assert.equal(result.hasTodayWorkouts, false);
    assert.equal(result.todayWorkouts.length, 0);
    assert.equal(result.isToday, false);
    assert.equal(result.primaryReason, "NEAREST_UPCOMING");
    assert.equal(result.primaryWorkout?.id, "w-next-week");
    assert.equal(result.nextIncompleteWorkout?.id, "w-next-week");
    assert.equal(result.upcomingWorkouts.length, 2);
    // Preview excludes the primary workout (w-next-week)
    assert.equal(result.upcomingPreviewWorkouts.length, 1);
    assert.equal(result.upcomingPreviewWorkouts[0].id, "w-later-week");
  });

  await t.test("7. SKIPPED and MISSED assignments must not be presented as executable upcoming workouts", () => {
    const assignments = [
      {
        id: "w-future-skipped",
        title: "Restructured Session",
        scheduledDate: "2026-11-23T12:00:00.000Z",
        status: "SKIPPED"
      },
      {
        id: "w-future-missed",
        title: "Expired Scheduled Class",
        scheduledDate: "2026-11-24T12:00:00.000Z",
        status: "MISSED"
      },
      {
        id: "w-future-executable",
        title: "Actual Executable Training",
        scheduledDate: "2026-11-25T12:00:00.000Z",
        status: "SCHEDULED"
      }
    ];

    const result = selectAthleteWorkouts(assignments, TODAY);

    // Full upcoming list still contains all future records (e.g. for audit/raw view)
    assert.equal(result.upcomingWorkouts.length, 3);
    assert.equal(result.metrics.upcomingExecutable, 1);
    assert.equal(result.primaryWorkout?.id, "w-future-executable");
    assert.equal(result.nextIncompleteWorkout?.id, "w-future-executable");

    // Actionable upcoming list strictly contains executable workouts (SCHEDULED/IN_PROGRESS)
    assert.equal(result.upcomingActionableWorkouts.length, 1);
    assert.equal(result.upcomingActionableWorkouts[0].id, "w-future-executable");

    // Upcoming preview strictly contains actionable workouts excluding primaryWorkout
    // (w-future-executable is primary, so preview has 0 items; SKIPPED & MISSED are never in preview)
    assert.equal(result.upcomingPreviewWorkouts.length, 0);
  });

  await t.test("8. Historical assignments are sorted newest first (DESC) and isolated from upcoming", () => {
    const assignments = [
      {
        id: "w-oldest",
        title: "First Ever Workout",
        scheduledDate: "2026-11-01T12:00:00.000Z",
        status: "COMPLETED"
      },
      {
        id: "w-yesterday",
        title: "Yesterday Squats",
        scheduledDate: "2026-11-21T12:00:00.000Z",
        status: "COMPLETED"
      },
      {
        id: "w-mid-week",
        title: "Mid-week Push",
        scheduledDate: "2026-11-15T12:00:00.000Z",
        status: "COMPLETED"
      }
    ];

    const result = selectAthleteWorkouts(assignments, TODAY);

    assert.equal(result.historyWorkouts.length, 3);
    assert.equal(result.historyWorkouts[0].id, "w-yesterday"); // Newest historical first
    assert.equal(result.historyWorkouts[1].id, "w-mid-week");
    assert.equal(result.historyWorkouts[2].id, "w-oldest");   // Oldest last
    assert.equal(result.hasTodayWorkouts, false);
    assert.equal(result.upcomingWorkouts.length, 0);
  });

  await t.test("9. Empty assignments array and undefined handle gracefully without throwing", () => {
    const emptyResult = selectAthleteWorkouts([], TODAY);
    assert.equal(emptyResult.primaryWorkout, null);
    assert.equal(emptyResult.isToday, false);
    assert.equal(emptyResult.primaryReason, "NONE");
    assert.equal(emptyResult.todayWorkouts.length, 0);
    assert.equal(emptyResult.upcomingWorkouts.length, 0);
    assert.equal(emptyResult.historyWorkouts.length, 0);

    const undefinedResult = selectAthleteWorkouts(undefined, TODAY);
    assert.equal(undefinedResult.primaryWorkout, null);
    assert.equal(undefinedResult.metrics.todayTotal, 0);
  });

  await t.test("10. Zero side effects: Input array and objects are never mutated", () => {
    const originalAssignment = {
      id: "w-freeze-check",
      title: "Immutable Workout",
      scheduledDate: "2026-11-22T12:00:00.000Z",
      status: "SCHEDULED"
    };

    // Deep freeze to guarantee runtime mutation protection
    Object.freeze(originalAssignment);
    const originalList = Object.freeze([originalAssignment]);

    // Should not throw attempting to sort or modify frozen objects/array
    assert.doesNotThrow(() => {
      const result = selectAthleteWorkouts(originalList, TODAY);
      assert.equal(result.primaryWorkout?.id, "w-freeze-check");
    });
  });
});

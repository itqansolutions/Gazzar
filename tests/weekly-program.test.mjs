import assert from "node:assert/strict";
import test from "node:test";
import { buildWeeklyProgram } from "../src/lib/weekly-program.ts";

const mk = (id, wk, day, order, status = "SCHEDULED") => ({
  id, programWeekNumber: wk, programDayNumber: day, programWorkoutOrder: order, status,
  scheduledDate: new Date(Date.UTC(2026, 10, 23 + (wk - 1) * 7 + (day - 1), 12)).toISOString()
});

test("weekly program shows every week and all 7 days, rest days empty", () => {
  const ws = [mk("a", 1, 1, 0), mk("b", 1, 1, 1, "COMPLETED"), mk("c", 1, 3, 0), mk("d", 2, 2, 0), mk("e", 3, 7, 0)];
  const { weeks, currentWeek } = buildWeeklyProgram(ws, "2026-11-23", 3, "2026-11-25");
  assert.equal(weeks.length, 3);
  assert.ok(weeks.every((w) => w.days.length === 7));
  assert.equal(weeks[0].days[0].workouts.map((w) => w.id).join(), "a,b");
  assert.equal(weeks[0].days[1].workouts.length, 0);
  assert.equal(weeks[0].days[0].dateKey, "2026-11-23");
  assert.equal(weeks[0].done, 1);
  assert.equal(weeks[0].total, 3);
  assert.equal(currentWeek, 1);
  assert.equal(weeks[2].days[6].workouts[0].id, "e");
});

test("current week follows today; extends beyond durationWeeks if data has more", () => {
  const ws = [mk("a", 1, 1, 0), mk("z", 5, 1, 0)];
  const { weeks, currentWeek } = buildWeeklyProgram(ws, "2026-11-23", 2, "2026-12-08");
  assert.equal(weeks.length, 5);
  assert.equal(currentWeek, 3);
});

test("anchor derived from workouts when startDate missing", () => {
  const { weeks } = buildWeeklyProgram([mk("a", 2, 3, 0)], null, 2, "2026-11-23");
  assert.equal(weeks[0].days[0].dateKey, "2026-11-23");
});

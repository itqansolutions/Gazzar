import { addCalendarDaysKey, toCalendarDateKey } from "./date-utils";
import { deriveEffectiveStatus, compareSameDayWorkoutOrder } from "./athlete-selection";

export type DayCell = { dayNumber: number; dateKey: string; workouts: any[] };
export type WeekBlock = { weekNumber: number; days: DayCell[]; total: number; done: number };

/** Pure helper: builds all weeks and all 7 days per week, current week resolved by Cairo date. */
export function buildWeeklyProgram(
  workouts: any[],
  startDate: string | Date | null | undefined,
  durationWeeks: number | null | undefined,
  todayKey: string
): { weeks: WeekBlock[]; currentWeek: number } {
  const dated = workouts
    .map((w) => ({ w, key: w.scheduledDate ? toCalendarDateKey(w.scheduledDate) : "" }))
    .filter((x) => x.key);

  // Resolve week-1/day-1 calendar anchor.
  let anchor = startDate ? toCalendarDateKey(startDate) : "";
  if (!anchor) {
    const first = dated.find((x) => x.w.programWeekNumber && x.w.programDayNumber);
    if (first) {
      const off = (first.w.programWeekNumber - 1) * 7 + (first.w.programDayNumber - 1);
      anchor = addCalendarDaysKey(first.key, -off);
    } else if (dated.length) {
      anchor = dated.map((x) => x.key).sort()[0];
    }
  }

  let maxWeek = Math.max(1, Number(durationWeeks) || 1);
  for (const w of workouts) if (w.programWeekNumber && w.programWeekNumber > maxWeek) maxWeek = w.programWeekNumber;

  const weeks: WeekBlock[] = [];
  for (let wk = 1; wk <= maxWeek; wk++) {
    const days: DayCell[] = [];
    for (let d = 1; d <= 7; d++) {
      const dateKey = anchor ? addCalendarDaysKey(anchor, (wk - 1) * 7 + (d - 1)) : "";
      const list = workouts
        .filter((w) => {
          if (w.programWeekNumber && w.programDayNumber) return w.programWeekNumber === wk && w.programDayNumber === d;
          return dateKey !== "" && w.scheduledDate && toCalendarDateKey(w.scheduledDate) === dateKey;
        })
        .sort(compareSameDayWorkoutOrder);
      days.push({ dayNumber: d, dateKey, workouts: list });
    }
    const all = days.flatMap((d) => d.workouts);
    const done = all.filter((w) => deriveEffectiveStatus(w) === "COMPLETED").length;
    weeks.push({ weekNumber: wk, days, total: all.length, done });
  }

  let currentWeek = weeks[0]?.weekNumber ?? 1;
  const hit = weeks.find((wk) => wk.days.some((d) => d.dateKey === todayKey));
  if (hit) currentWeek = hit.weekNumber;
  else if (anchor && todayKey > anchor) currentWeek = weeks[weeks.length - 1]?.weekNumber ?? 1;
  return { weeks, currentWeek };
}


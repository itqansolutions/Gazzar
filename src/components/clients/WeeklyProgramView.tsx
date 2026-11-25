"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Play, CheckCircle, Moon, ChevronDown, ChevronUp } from "lucide-react";
import { getCairoDateKey } from "@/lib/date-utils";
import { deriveEffectiveStatus } from "@/lib/athlete-selection";
import { buildWeeklyProgram } from "@/lib/weekly-program";

interface WeeklyProgramViewProps {
  /** Workout assignments that belong to the program (all days, all weeks). */
  workouts: any[];
  /** First calendar day of the program (YYYY-MM-DD or Date). Falls back to the earliest scheduled workout. */
  startDate?: string | Date | null;
  /** Total program weeks (used to show empty trailing weeks). */
  durationWeeks?: number | null;
}

const DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

function statusStyle(status: string) {
  if (status === "COMPLETED") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (status === "IN_PROGRESS") return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (status === "SKIPPED" || status === "MISSED") return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
  return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
}

function statusLabel(status: string) {
  if (status === "COMPLETED") return "Done";
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "SKIPPED") return "Skipped";
  if (status === "MISSED") return "Missed";
  return "Pending";
}

export default function WeeklyProgramView({ workouts, startDate, durationWeeks }: WeeklyProgramViewProps) {
  const todayKey = useMemo(() => getCairoDateKey(), []);
  const { weeks, currentWeek } = useMemo(
    () => buildWeeklyProgram(workouts, startDate, durationWeeks, todayKey),
    [workouts, startDate, durationWeeks, todayKey]
  );
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({ [currentWeek]: true });

  // Current week first, then the remaining weeks in order.
  const ordered = useMemo(() => {
    const cur = weeks.find((w) => w.weekNumber === currentWeek);
    return [...(cur ? [cur] : []), ...weeks.filter((w) => w.weekNumber !== currentWeek)];
  }, [weeks, currentWeek]);

  return (
    <div className="space-y-4" data-testid="weekly-program-view">
      {ordered.map((wk) => {
        const isOpen = openWeeks[wk.weekNumber] ?? false;
        const isCurrent = wk.weekNumber === currentWeek;
        return (
          <section
            key={wk.weekNumber}
            data-testid={`program-week-${wk.weekNumber}`}
            className={`rounded-2xl border bg-white dark:bg-slate-900 shadow-sm ${
              isCurrent ? "border-brand-crimson/50" : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenWeeks((s) => ({ ...s, [wk.weekNumber]: !isOpen }))}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-start"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">Week {wk.weekNumber}</span>
                {isCurrent && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-crimson/15 text-brand-crimson">
                    Current week
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {wk.done}/{wk.total} done
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 px-3 pb-3">
                {wk.days.map((day) => {
                  const isToday = day.dateKey === todayKey;
                  return (
                    <div
                      key={day.dayNumber}
                      data-testid={`program-day-${wk.weekNumber}-${day.dayNumber}`}
                      className={`rounded-xl border p-2.5 min-h-[88px] ${
                        isToday
                          ? "border-brand-crimson bg-brand-crimson/5"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          {DAY_LABELS[day.dayNumber - 1]}
                          {isToday && <span className="ms-1 text-brand-crimson">· Today</span>}
                        </span>
                        <span className="text-[10px] text-slate-400">{day.dateKey ? day.dateKey.slice(5) : ""}</span>
                      </div>

                      {day.workouts.length === 0 ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
                          <Moon className="w-3.5 h-3.5" />
                          <span>Rest day</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {day.workouts.map((w) => {
                            const st = deriveEffectiveStatus(w);
                            return (
                              <div key={w.id} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5">
                                <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight break-words">
                                  {w.title || w.template?.titleEn || "Workout Session"}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${statusStyle(st)}`}>
                                    {st === "COMPLETED" && <CheckCircle className="w-2.5 h-2.5 inline me-0.5" />}
                                    {statusLabel(st)}
                                  </span>
                                  <Link
                                    href={`/workout/${w.id}/execute`}
                                    className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-brand-crimson hover:text-white text-slate-600 dark:text-slate-300"
                                    aria-label="Open workout"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

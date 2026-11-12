"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Dumbbell, Calendar, Play } from "lucide-react";
import { toCalendarDateKey } from "@/lib/date-utils";

interface WorkoutsTabProps {
  clientId: string;
}

export default function WorkoutsTab({ clientId }: WorkoutsTabProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Assigned Workouts
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Scheduled training sessions and active workout tracking
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          Loading assigned workouts...
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          No workouts assigned yet.
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const effStatus =
              a.effectiveStatus ||
              (a.status === "SCHEDULED" && a.workoutLog && a.workoutLog.isCompleted === false
                ? "IN_PROGRESS"
                : a.status);

            const badgeCls =
              effStatus === "COMPLETED"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : effStatus === "IN_PROGRESS"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : effStatus === "SKIPPED"
                ? "bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";

            const badgeLabel =
              effStatus === "COMPLETED"
                ? "Completed ✓"
                : effStatus === "IN_PROGRESS"
                ? "In Progress"
                : effStatus === "SKIPPED"
                ? "Skipped"
                : "Scheduled";

            return (
              <div
                key={a.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-10 h-10 rounded-xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center font-bold">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>{a.title || a.template?.titleEn || a.template?.titleAr || "Custom Training Session"}</span>
                      {a.programWeekNumber && a.programDayNumber && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Week {a.programWeekNumber} · Day {a.programDayNumber}
                          {a.programDayTitle ? ` (${a.programDayTitle})` : ""}
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 rtl:space-x-reverse mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>Workout Date: {a.scheduledDate ? toCalendarDateKey(a.scheduledDate) : "N/A"}</span>
                    </p>
                    {effStatus === "SKIPPED" && a.workoutLog?.clientFeedback && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                        Skip reason: {a.workoutLog.clientFeedback}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${badgeCls}`}>
                    {badgeLabel}
                  </span>

                  <Link
                    href={`/workout/${a.id}/execute`}
                    className="px-3 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold flex items-center space-x-1 rtl:space-x-reverse transition-transform hover:scale-105 shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

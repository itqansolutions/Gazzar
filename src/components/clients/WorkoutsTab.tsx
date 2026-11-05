"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Dumbbell, Calendar, Play } from "lucide-react";

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
          {assignments.map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-10 h-10 rounded-xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center font-bold">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {a.template?.titleEn || a.template?.titleAr || "Custom Training Session"}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 rtl:space-x-reverse mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>Workout Date: {a.scheduledDate ? new Date(a.scheduledDate).toISOString().slice(0, 10) : "N/A"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    a.status === "COMPLETED"
                      ? "bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  }`}
                >
                  {a.status === "COMPLETED" ? "Completed ✓" : "Scheduled"}
                </span>

                <Link
                  href={`/workout/${a.id}/execute`}
                  className="px-3 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold flex items-center space-x-1 rtl:space-x-reverse transition-transform hover:scale-105 shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Workout</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

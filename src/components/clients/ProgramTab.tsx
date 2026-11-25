"use client";

import React from "react";
import Link from "next/link";
import { Dumbbell, Calendar, Apple, CheckCircle, ArrowRight, Play, Award, Layers } from "lucide-react";
import WeeklyProgramView from "@/components/clients/WeeklyProgramView";
import { toCalendarDateKey } from "@/lib/date-utils";

interface ProgramTabProps {
  clientId: string;
  isClient?: boolean;
  programAssignments?: any[];
  workoutAssignments?: any[];
}

export default function ProgramTab({
  clientId,
  isClient = false,
  programAssignments = [],
  workoutAssignments = []
}: ProgramTabProps) {
  const activeAssignment = programAssignments.find((p) => p.status === "ACTIVE") || programAssignments[0] || null;
  const program = activeAssignment?.program;

  if (!activeAssignment || !program) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Training Program</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Structured multi-week periodized training roadmap
          </p>
        </div>

        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs space-y-3">
          <p>No active training program assigned to this athlete yet.</p>
          {!isClient && (
            <Link
              href={`/assignments?athleteId=${clientId}&mode=PROGRAM`}
              className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold transition-transform hover:scale-105 shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Assign Training Program</span>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Calculate progress
  const totalWorkouts = workoutAssignments.filter((w) => w.programId === program.id).length;
  const completedWorkouts = workoutAssignments.filter(
    (w) => w.programId === program.id && (w.status === "COMPLETED" || w.workoutLog?.isCompleted)
  ).length;
  const progressPct = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Training Program</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Structured multi-week periodized training roadmap
        </p>
      </div>

      {/* Program Summary Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center font-bold flex-shrink-0">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{program.name}</h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {activeAssignment.status || "ACTIVE"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                {program.description || "Comprehensive physical training protocol tailored to athlete goals."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="text-right rtl:text-left">
              <span className="text-[10px] text-slate-400 block">Completion</span>
              <span className="text-lg font-black text-brand-crimson">{progressPct}%</span>
            </div>
            <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-brand-crimson h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total Duration</span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {program.durationWeeks || 4} Weeks
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Start Date</span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {activeAssignment.startDate ? toCalendarDateKey(activeAssignment.startDate) : "N/A"}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Workouts Done</span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {completedWorkouts} / {totalWorkouts} Sessions
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Nutrition Plan</span>
            <span className="text-xs sm:text-sm font-bold text-brand-crimson truncate block">
              {activeAssignment.nutritionProgramId ? "Integrated Plan ✓" : "Standard"}
            </span>
          </div>
        </div>
      </div>

      {/* Program Workouts List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>Assigned Workouts in this Program</span>
          <span className="text-slate-400 text-[11px] font-normal">{totalWorkouts} Total Sessions</span>
        </h4>

        {totalWorkouts === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
            No session instances generated for this program.
          </div>
        ) : (
          <WeeklyProgramView
            workouts={workoutAssignments.filter((w) => w.programId === program.id)}
            startDate={activeAssignment.startDate}
            durationWeeks={program.durationWeeks}
          />
        )}
      </div>
    </div>
  );
}

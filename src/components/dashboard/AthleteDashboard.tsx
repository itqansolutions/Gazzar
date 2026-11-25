"use client";

import React from "react";
import { resolveAvatar, DEFAULT_AVATAR } from "@/lib/avatars";
import Link from "next/link";
import {
  Dumbbell,
  Calendar,
  Apple,
  Activity,
  Award,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Scale,
  Camera,
  Layers,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { toCalendarDateKey, getCairoDateKey } from "@/lib/date-utils";
import SubscriptionCard from "./SubscriptionCard";

interface AthleteDashboardProps {
  athleteData: any;
  user: any;
}

export default function AthleteDashboard({ athleteData, user }: AthleteDashboardProps) {
  const clientProfile = athleteData?.clientProfile;
  const todayWorkout = athleteData?.todayWorkout;
  const activeProgram = athleteData?.activeProgram;
  const programAssignment = athleteData?.programAssignment;
  const nutritionPlan = athleteData?.nutritionPlan;
  const checkInSchedule = athleteData?.checkInSchedule;
  const recentAssessment = athleteData?.recentAssessment;

  const primaryCoach =
    clientProfile?.coachAssignments?.find((c: any) => c.role === "PRIMARY")?.coach ||
    clientProfile?.coachAssignments?.[0]?.coach ||
    null;

  const profileHref = clientProfile?.id ? `/clients/${clientProfile.id}` : "/dashboard";

  // Determine workout status
  const effStatus =
    todayWorkout?.effectiveStatus ||
    (todayWorkout?.status === "SCHEDULED" && todayWorkout?.workoutLog && !todayWorkout?.workoutLog?.isCompleted
      ? "IN_PROGRESS"
      : todayWorkout?.status || "NONE");

  return (
    <div className="space-y-6">
      {/* 1. Athlete Hero Welcome Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-crimson/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <img
              src={resolveAvatar(user?.avatar)}
              alt={user?.name || "Athlete"}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-brand-crimson shadow-lg shadow-[0_0_15px_rgba(240,20,37,0.3)]"
            />
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  Welcome, {user?.name || "Athlete"}! 👋
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  {clientProfile?.status || "Active Member"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 rtl:space-x-reverse">
                <span>{clientProfile?.sport?.nameEn || clientProfile?.sport?.nameAr || "Fitness / Bodybuilding"}</span>
                {primaryCoach && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1 rtl:space-x-reverse text-brand-crimson font-semibold">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Coach: {primaryCoach.user?.name}</span>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Today's Workout Feature Card (Hero Action) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-brand-crimson text-white tracking-wide uppercase">
                {effStatus === "COMPLETED"
                  ? "Workout Completed ✓"
                  : effStatus === "IN_PROGRESS"
                  ? "Workout In Progress ⚡"
                  : todayWorkout?.scheduledDate && toCalendarDateKey(todayWorkout.scheduledDate) > getCairoDateKey()
                  ? "Next Scheduled Training"
                  : "Scheduled Training Today"}
              </span>

              {todayWorkout?.scheduledDate && (
                <span className="text-xs text-slate-400 flex items-center space-x-1.5 rtl:space-x-reverse font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{toCalendarDateKey(todayWorkout.scheduledDate)}</span>
                </span>
              )}
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {todayWorkout?.title || todayWorkout?.template?.titleEn || "Custom Athlete Training Session"}
              </h2>
              {todayWorkout?.template?.descriptionEn && (
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  {todayWorkout.template.descriptionEn}
                </p>
              )}
            </div>

            {todayWorkout?.exercises && todayWorkout.exercises.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {todayWorkout.exercises.slice(0, 4).map((ex: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300 font-medium"
                  >
                    {ex.exerciseNameEn || ex.exercise?.nameEn || `Exercise #${idx + 1}`}
                  </span>
                ))}
                {todayWorkout.exercises.length > 4 && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/40 text-[11px] text-slate-400">
                    +{todayWorkout.exercises.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              {todayWorkout
                ? `${todayWorkout.exercises?.length || 0} exercises assigned in this session`
                : "No active workout scheduled for today. Enjoy your rest day!"}
            </div>

            {todayWorkout && (
              <Link
                href={`/workout/${todayWorkout.id}/execute`}
                className="px-6 py-3 rounded-2xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-black text-sm flex items-center justify-center space-x-2 rtl:space-x-reverse transition-transform hover:scale-105 shadow-xl shadow-[0_0_25px_rgba(240,20,37,0.45)] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {effStatus === "COMPLETED"
                    ? "View Workout Summary"
                    : effStatus === "IN_PROGRESS"
                    ? "Resume Workout"
                    : "Start Today's Workout"}
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* 3. Active Training Program Widget */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Program</span>
              <Layers className="w-4 h-4 text-brand-crimson" />
            </div>

            {activeProgram ? (
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{activeProgram.name || activeProgram.titleEn || activeProgram.titleAr}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {activeProgram.description || "Structured training roadmap tailored for performance development."}
                </p>
                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activeProgram.durationWeeks} Weeks</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No multi-week program currently active.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 4. Nutrition & Macros + Check-in Compliance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Nutrition Plan Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Apple className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Daily Nutrition Plan</h3>
            </div>
            <Link href="/nutrition" className="text-[11px] font-bold text-brand-crimson hover:underline">
              View Meals
            </Link>
          </div>

          {nutritionPlan ? (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">Target Calories</span>
                <span className="text-xl font-black text-rose-700 dark:text-rose-300">
                  {nutritionPlan.dailyCalorieTarget || 2400} <span className="text-xs font-normal">kcal</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Protein</span>
                  <span className="font-bold text-slate-900 dark:text-white">{nutritionPlan.dailyProteinTargetGrams || 160}g</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Carbs</span>
                  <span className="font-bold text-slate-900 dark:text-white">{nutritionPlan.dailyCarbsTargetGrams || 220}g</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Fats</span>
                  <span className="font-bold text-slate-900 dark:text-white">{nutritionPlan.dailyFatsTargetGrams || 65}g</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No active nutrition plan assigned.
            </div>
          )}
        </div>

        {/* Check-ins Status Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Check-in Schedule</h3>
            </div>
            <Link href={profileHref} className="text-[11px] font-bold text-brand-crimson hover:underline">
              Log Progress
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Scale className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Weigh-in</span>
              </div>
              <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                {checkInSchedule?.nextWeightDueAt
                  ? `Due ${new Date(checkInSchedule.nextWeightDueAt).toLocaleDateString()}`
                  : "Weekly"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Camera className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Progress Photos</span>
              </div>
              <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                {checkInSchedule?.nextPhotoDueAt
                  ? `Due ${new Date(checkInSchedule.nextPhotoDueAt).toLocaleDateString()}`
                  : "Monthly"}
              </span>
            </div>
          </div>
        </div>

        {/* Physical Assessment Benchmark Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-xl bg-brand-crimson/10 text-brand-crimson flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Physical Benchmark</h3>
            </div>
            <Link href="/assessments" className="text-[11px] font-bold text-brand-crimson hover:underline">
              History
            </Link>
          </div>

          {recentAssessment ? (
            <div className="space-y-2 text-xs">
              <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                {recentAssessment.title}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Pushups</span>
                  <span className="font-bold text-slate-900 dark:text-white">{recentAssessment.pushupsCount ?? "—"}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Plank</span>
                  <span className="font-bold text-slate-900 dark:text-white">{recentAssessment.plankSeconds ? `${recentAssessment.plankSeconds}s` : "—"}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">VO2 Max</span>
                  <span className="font-bold text-brand-crimson">{recentAssessment.vo2Max ?? "—"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              No assessment recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* 5. Subscription & Membership Status */}
      <SubscriptionCard clientId={clientProfile?.id} />
    </div>
  );
}

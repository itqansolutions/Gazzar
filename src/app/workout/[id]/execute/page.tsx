"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ClientWorkoutAssignment, Exercise } from "@/types";
import {
  Dumbbell,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Flame,
  MessageSquare,
  AlertTriangle
} from "lucide-react";

interface LocalSet {
  setNumber: number;
  targetWeight: number;
  targetReps: string;
  actualWeight: number;
  actualReps: number;
  isCompleted: boolean;
}

interface LocalExerciseLog {
  exerciseId: string;
  exercise: Exercise;
  sets: LocalSet[];
  notes: string;
}

export default function WorkoutExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params?.id as string;
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<ClientWorkoutAssignment | null>(null);
  const [exerciseLogs, setExerciseLogs] = useState<LocalExerciseLog[]>([]);

  // Workout Timer
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Rest Timer
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [isRestActive, setIsRestActive] = useState(false);

  // Completion Form
  const [overallRpe, setOverallRpe] = useState(8);
  const [clientFeedback, setClientFeedback] = useState("");
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/workouts/${assignmentId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const data = json.data;
          setAssignment(data);

          // Initialize sets from template
          const template = data.template;
          if (template && template.exercises) {
            const initialLogs: LocalExerciseLog[] = template.exercises.map((te: any) => {
              const setsCount = te.targetSets || 3;
              const targetWt = te.targetWeightKg || 50;
              const targetRp = te.targetReps || "10";

              const sets: LocalSet[] = [];
              for (let i = 1; i <= setsCount; i++) {
                sets.push({
                  setNumber: i,
                  targetWeight: targetWt,
                  targetReps: targetRp,
                  actualWeight: targetWt,
                  actualReps: parseInt(targetRp) || 10,
                  isCompleted: false
                });
              }

              return {
                exerciseId: te.exerciseId,
                exercise: te.exercise,
                sets,
                notes: te.notes || ""
              };
            });

            setExerciseLogs(initialLogs);
          }
        }
      })
      .catch((err) => console.error("[WorkoutExecution] Error loading assignment:", err));
  }, [assignmentId]);

  // Workout duration ticker
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => setWorkoutSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Rest timer ticker
  useEffect(() => {
    let interval: any = null;
    if (isRestActive && restSecondsLeft > 0) {
      interval = setInterval(() => setRestSecondsLeft(s => s - 1), 1000);
    } else if (restSecondsLeft === 0) {
      setIsRestActive(false);
    }
    return () => clearInterval(interval);
  }, [isRestActive, restSecondsLeft]);

  const startRestTimer = (seconds: number = 60) => {
    setRestSecondsLeft(seconds);
    setIsRestActive(true);
  };

  const handleToggleSet = (exIdx: number, setIdx: number) => {
    const next = [...exerciseLogs];
    const targetSet = next[exIdx].sets[setIdx];
    targetSet.isCompleted = !targetSet.isCompleted;
    setExerciseLogs(next);

    if (targetSet.isCompleted) {
      startRestTimer(60);
    }
  };

  const handleUpdateActual = (exIdx: number, setIdx: number, field: "actualWeight" | "actualReps", val: number) => {
    const next = [...exerciseLogs];
    next[exIdx].sets[setIdx][field] = val;
    setExerciseLogs(next);
  };

  const handleFinishWorkout = async () => {
    const durationMin = Math.max(1, Math.round(workoutSeconds / 60));

    try {
      await fetch(`/api/workouts/${assignment?.id || assignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: durationMin,
          overallRpe,
          clientFeedback,
          exercises: exerciseLogs.map((el) => ({
            exerciseId: el.exerciseId,
            sets: el.sets.map((s) => ({
              setNumber: s.setNumber,
              actualWeightKg: s.actualWeight,
              actualReps: s.actualReps,
              actualRpe: overallRpe,
              isCompleted: s.isCompleted
            }))
          }))
        })
      });
    } catch (err) {
      console.error("[WorkoutExecution] Error saving execution:", err);
    }

    setIsCompletedModalOpen(true);
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const getRpeDescription = (rpe: number) => {
    if (rpe <= 4) return "Very Easy";
    if (rpe <= 6) return "Moderate Effort";
    if (rpe === 7) return "Good Challenge (3 RIR)";
    if (rpe === 8) return "Heavy (2 RIR)";
    if (rpe === 9) return "Near Max (1 RIR)";
    return "Absolute Max (0 RIR)";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header with Live Timer */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 z-30">
        <div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-crimson/20 text-brand-crimson border border-brand-crimson/40">
              Live Session
            </span>
            <span className="text-xs text-slate-400">
              {assignment?.client?.user.name}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white">
            {assignment?.template?.titleEn || assignment?.template?.titleAr || "Today's Workout"}
          </h1>
        </div>

        {/* Live Elapsed & Rest Timers */}
        <div className="flex items-center gap-2">
          {/* Workout Elapsed Timer */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-brand-crimson text-sm font-bold">
            <Clock className="w-4 h-4" />
            <span>{formatTimer(workoutSeconds)}</span>
          </div>

          {/* Rest Timer Floating Pill */}
          {isRestActive && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-pulse">
              <span>Rest: {restSecondsLeft}s</span>
            </div>
          )}

          <button
            onClick={handleFinishWorkout}
            className="px-4 py-2 rounded-2xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all scale-100 active:scale-95"
          >
            {t("finishWorkout")} 🏆
          </button>
        </div>
      </div>

      {/* Exercises Set Loggers List */}
      <div className="space-y-6">
        {exerciseLogs.map((el, exIdx) => (
          <div
            key={el.exerciseId || exIdx}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4"
          >
            {/* Exercise Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-brand-crimson">
                  {exIdx + 1}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">{el.exercise?.nameEn || el.exercise?.nameAr}</h3>
                </div>
              </div>

              {el.exercise?.contraindicatedBodyParts?.length > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/40 text-red-300 border border-red-500/30 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span>Injury Alert</span>
                </span>
              )}
            </div>

            {/* Sets Touch Table (Mobile-First) */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 px-3 pb-1">
                <span className="col-span-2 text-start">Set</span>
                <span className="col-span-3 text-center">Target</span>
                <span className="col-span-3 text-center">Actual Weight (KG)</span>
                <span className="col-span-2 text-center">Actual Reps</span>
                <span className="col-span-2 text-center">Status</span>
              </div>

              {el.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className={`grid grid-cols-12 items-center p-2.5 rounded-2xl border transition-all ${
                    set.isCompleted
                      ? "bg-[#141416] border-brand-crimson/40 text-brand-crimson"
                      : "bg-slate-950/70 border-slate-800 text-white"
                  }`}
                >
                  {/* Set # */}
                  <span className="col-span-2 font-bold text-xs ps-2">
                    Set {set.setNumber}
                  </span>

                  {/* Target reference */}
                  <span className="col-span-3 text-center text-xs text-slate-400 font-semibold">
                    {set.targetWeight}kg × {set.targetReps}
                  </span>

                  {/* Actual Weight Input */}
                  <div className="col-span-3 px-1">
                    <input
                      type="number"
                      value={set.actualWeight}
                      onChange={e => handleUpdateActual(exIdx, setIdx, "actualWeight", Number(e.target.value))}
                      className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson"
                    />
                  </div>

                  {/* Actual Reps Input */}
                  <div className="col-span-2 px-1">
                    <input
                      type="number"
                      value={set.actualReps}
                      onChange={e => handleUpdateActual(exIdx, setIdx, "actualReps", Number(e.target.value))}
                      className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson"
                    />
                  </div>

                  {/* Complete Touch Checkmark Button */}
                  <div className="col-span-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleToggleSet(exIdx, setIdx)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        set.isCompleted
                          ? "bg-brand-crimson text-white shadow-md shadow-[0_0_15px_rgba(240,20,37,0.35)]"
                          : "bg-slate-800 text-slate-500 hover:text-slate-200 border border-slate-700"
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Rest Timer Shortcuts */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-400 font-medium">Quick Rest Timer:</span>
              <div className="flex space-x-1.5">
                <button
                  type="button"
                  onClick={() => startRestTimer(45)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300"
                >
                  45s
                </button>
                <button
                  type="button"
                  onClick={() => startRestTimer(60)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-brand-crimson"
                >
                  60s
                </button>
                <button
                  type="button"
                  onClick={() => startRestTimer(90)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300"
                >
                  90s
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rate of Perceived Exertion (RPE) & Feedback Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>{t("rpeScale")}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{t("rpeHelp")}</p>
        </div>

        {/* RPE Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-brand-crimson text-base">RPE: {overallRpe} / 10</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{getRpeDescription(overallRpe)}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={overallRpe}
            onChange={e => setOverallRpe(Number(e.target.value))}
            className="w-full accent-[#F01425] h-2 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Workout Feedback & Notes
          </label>
          <textarea
            rows={2}
            value={clientFeedback}
            onChange={e => setClientFeedback(e.target.value)}
            placeholder="e.g. Felt strong on bench press, form was clean..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-brand-crimson"
          />
        </div>

        <button
          onClick={handleFinishWorkout}
          className="w-full py-3.5 rounded-2xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-extrabold text-sm shadow-xl shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all scale-100 hover:scale-[1.01] active:scale-95"
        >
          {t("finishWorkout")} 🏆
        </button>
      </div>

      {/* Celebration Completion Modal */}
      {isCompletedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30 flex items-center justify-center text-white mx-auto shadow-xl shadow-[0_0_20px_rgba(240,20,37,0.38)] animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">Great job! Workout Completed 🏆</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{t("workoutCompletedSuccess")}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">Total Time</span>
                <span className="text-xs font-bold text-white">{formatTimer(workoutSeconds)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">RPE Level</span>
                <span className="text-xs font-bold text-brand-crimson">{overallRpe}/10</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Completed Sets</span>
                <span className="text-xs font-bold text-teal-400">
                  {exerciseLogs.reduce((acc, el) => acc + el.sets.filter(s => s.isCompleted).length, 0)} Sets
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full py-3 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-md"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push(`/clients/${assignment?.clientId || "client-1"}`)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                View Progress & Stats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ClientWorkoutAssignment, Exercise, MetricType } from "@/types";
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
  targetWeight: number | null;
  targetReps: string;
  targetDistanceKm: number | null;
  targetTimeSeconds: number | null;
  targetPace: string | null;
  targetRounds: number | null;
  actualWeight: number;
  actualReps: number;
  actualDistanceKm: number;
  actualTimeSeconds: number;
  actualPace: string;
  actualRounds: number;
  isCompleted: boolean;
}

interface LocalExerciseLog {
  exerciseId: string;
  exerciseName: string;
  metricType: MetricType;
  restSeconds: number;
  tempo?: string | null;
  exercise?: Exercise;
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

  // Completion / Progress / Skip Form
  const [overallRpe, setOverallRpe] = useState(8);
  const [clientFeedback, setClientFeedback] = useState("");
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [savingAction, setSavingAction] = useState<"SAVE_PROGRESS" | "COMPLETE" | "SKIP" | null>(null);
  const [actionToast, setActionToast] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    fetch(`/api/workouts/${assignmentId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const data = json.data;
          setAssignment(data);

          if (data.workoutLog) {
            if (typeof data.workoutLog.overallRpe === "number") {
              setOverallRpe(data.workoutLog.overallRpe);
            }
            if (data.workoutLog.clientFeedback) {
              setClientFeedback(data.workoutLog.clientFeedback);
            }
            if (typeof data.workoutLog.durationMinutes === "number" && data.workoutLog.durationMinutes > 0) {
              setWorkoutSeconds(data.workoutLog.durationMinutes * 60);
            }
          }

          if (data.status === "COMPLETED" || data.status === "SKIPPED") {
            setIsTimerRunning(false);
          }

          // Prefer immutable assignment exercise snapshots; fallback to template exercises
          const sourceExercises: any[] =
            Array.isArray(data.exercises) && data.exercises.length > 0
              ? data.exercises
              : data.template?.exercises || [];

          const savedExercises: any[] = data.workoutLog?.exercises || [];

          if (sourceExercises.length > 0) {
            const initialLogs: LocalExerciseLog[] = sourceExercises.map((te: any) => {
              const metricType: MetricType =
                te.metricType || te.exercise?.metricType || "SETS_REPS_WEIGHT";
              const savedEx = savedExercises.find((se: any) => se.exerciseId === te.exerciseId);
              const savedSets: any[] = savedEx?.sets || [];
              const setsCount =
                savedSets.length > 0
                  ? savedSets.length
                  : metricType === "DISTANCE_TIME_PACE" ||
                    metricType === "LAPS_TIME" ||
                    metricType === "ROUNDS_REPS_TIME"
                  ? te.targetSets || 1
                  : te.targetSets || 3;
              const targetWt = te.targetWeightKg ?? null;
              const targetRp = te.targetReps || (metricType === "SETS_REPS_WEIGHT" ? "10" : "");

              const sets: LocalSet[] = [];
              for (let i = 1; i <= setsCount; i++) {
                const prior = savedSets.find((s: any) => s.setNumber === i);
                sets.push({
                  setNumber: i,
                  targetWeight: targetWt,
                  targetReps: targetRp,
                  targetDistanceKm: te.targetDistanceKm ?? null,
                  targetTimeSeconds: te.targetTimeSeconds ?? null,
                  targetPace: te.targetPace ?? null,
                  targetRounds: te.targetRounds ?? null,
                  actualWeight: prior?.actualWeightKg ?? targetWt ?? 0,
                  actualReps: prior?.actualReps ?? (parseInt(targetRp, 10) || 10),
                  actualDistanceKm: prior?.actualDistanceKm ?? te.targetDistanceKm ?? 0,
                  actualTimeSeconds: prior?.actualTimeSeconds ?? te.targetTimeSeconds ?? 0,
                  actualPace: prior?.actualPace ?? te.targetPace ?? "",
                  actualRounds: prior?.actualRounds ?? te.targetRounds ?? 1,
                  isCompleted: prior ? Boolean(prior.isCompleted) : false
                });
              }

              return {
                exerciseId: te.exerciseId,
                exerciseName:
                  te.exerciseNameEn || te.exercise?.nameEn || te.exercise?.nameAr || "Exercise",
                metricType,
                restSeconds: te.restSeconds || 60,
                tempo: te.tempo || null,
                exercise: te.exercise,
                sets,
                notes: te.notes || te.exercise?.instructionsEn || ""
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
      startRestTimer(next[exIdx].restSeconds || 60);
    }
  };

  const handleUpdateActual = (
    exIdx: number,
    setIdx: number,
    field: "actualWeight" | "actualReps" | "actualDistanceKm" | "actualTimeSeconds" | "actualRounds" | "actualPace",
    val: number | string
  ) => {
    const next = [...exerciseLogs];
    (next[exIdx].sets[setIdx] as any)[field] = val;
    setExerciseLogs(next);
  };

  const buildExecutionPayload = (action: "SAVE_PROGRESS" | "COMPLETE") => {
    const durationMin = Math.max(1, Math.round(workoutSeconds / 60));
    return {
      action,
      durationMinutes: durationMin,
      overallRpe,
      clientFeedback,
      exercises: exerciseLogs.map((el) => ({
        exerciseId: el.exerciseId,
        sets: el.sets.map((s) => ({
          setNumber: s.setNumber,
          targetReps: s.targetReps || null,
          targetWeightKg: s.targetWeight,
          targetDistanceKm: s.targetDistanceKm,
          targetTimeSeconds: s.targetTimeSeconds,
          targetPace: s.targetPace,
          targetRounds: s.targetRounds,
          actualWeightKg:
            el.metricType === "SETS_REPS_WEIGHT" || el.metricType === "TIME_HOLD" ? s.actualWeight : null,
          actualReps:
            el.metricType === "SETS_REPS_WEIGHT" || el.metricType === "ROUNDS_REPS_TIME"
              ? s.actualReps
              : null,
          actualDistanceKm:
            el.metricType === "DISTANCE_TIME_PACE" || el.metricType === "LAPS_TIME"
              ? s.actualDistanceKm
              : null,
          actualTimeSeconds:
            el.metricType === "DISTANCE_TIME_PACE" ||
            el.metricType === "LAPS_TIME" ||
            el.metricType === "ROUNDS_REPS_TIME" ||
            el.metricType === "TIME_HOLD"
              ? s.actualTimeSeconds
              : null,
          actualPace: el.metricType === "DISTANCE_TIME_PACE" ? s.actualPace || null : null,
          actualRounds: el.metricType === "ROUNDS_REPS_TIME" ? s.actualRounds : null,
          actualRpe: overallRpe,
          isCompleted: s.isCompleted
        }))
      }))
    };
  };

  const handleSaveProgress = async () => {
    setActionError("");
    setSavingAction("SAVE_PROGRESS");
    try {
      const res = await fetch(`/api/workouts/${assignment?.id || assignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildExecutionPayload("SAVE_PROGRESS"))
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.error || "Failed to save progress");
        return;
      }
      if (json.data?.assignment) setAssignment(json.data.assignment);
      setActionToast("Progress saved! You can resume anytime without losing your sets.");
      setTimeout(() => setActionToast(""), 4000);
    } catch (err: any) {
      setActionError(err?.message || "Error saving progress");
    } finally {
      setSavingAction(null);
    }
  };

  const handleFinishWorkout = async () => {
    setActionError("");
    setSavingAction("COMPLETE");
    try {
      const res = await fetch(`/api/workouts/${assignment?.id || assignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildExecutionPayload("COMPLETE"))
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.error || "Failed to complete workout");
        return;
      }
      if (json.data?.assignment) setAssignment(json.data.assignment);
      setIsTimerRunning(false);
      setIsCompletedModalOpen(true);
    } catch (err: any) {
      console.error("[WorkoutExecution] Error saving execution:", err);
      setActionError(err?.message || "Error completing workout");
    } finally {
      setSavingAction(null);
    }
  };

  const handleSkipWorkout = async () => {
    setActionError("");
    setSavingAction("SKIP");
    try {
      const res = await fetch(`/api/workouts/${assignment?.id || assignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SKIP",
          reason: skipReason
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.error || "Failed to skip workout");
        return;
      }
      if (json.data) setAssignment(json.data);
      setIsTimerRunning(false);
      setIsSkipModalOpen(false);
      setActionToast("Workout marked as skipped.");
    } catch (err: any) {
      setActionError(err?.message || "Error skipping workout");
    } finally {
      setSavingAction(null);
    }
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
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-crimson/20 text-brand-crimson border border-brand-crimson/40">
              {assignment?.effectiveStatus === "COMPLETED"
                ? "Completed"
                : assignment?.effectiveStatus === "SKIPPED"
                ? "Skipped"
                : assignment?.effectiveStatus === "IN_PROGRESS"
                ? "In Progress"
                : "Live Session"}
            </span>
            <span className="text-xs text-slate-400">
              {assignment?.client?.user?.name}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white">
            {assignment?.title || assignment?.template?.titleEn || assignment?.template?.titleAr || "Today's Workout"}
          </h1>
          {assignment?.coachNotes && (
            <p className="text-[11px] text-slate-400 mt-1">Coach notes: {assignment.coachNotes}</p>
          )}
        </div>

        {/* Live Elapsed & Rest Timers + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-brand-crimson text-sm font-bold">
            <Clock className="w-4 h-4" />
            <span>{formatTimer(workoutSeconds)}</span>
          </div>

          {isRestActive && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-pulse">
              <span>Rest: {restSecondsLeft}s</span>
            </div>
          )}

          {assignment?.effectiveStatus !== "SKIPPED" && assignment?.effectiveStatus !== "COMPLETED" && (
            <>
              <button
                type="button"
                disabled={savingAction !== null}
                onClick={handleSaveProgress}
                className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 disabled:opacity-50"
              >
                {savingAction === "SAVE_PROGRESS" ? "Saving..." : "Save Progress"}
              </button>
              <button
                type="button"
                disabled={savingAction !== null}
                onClick={() => setIsSkipModalOpen(true)}
                className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 disabled:opacity-50"
              >
                Skip
              </button>
            </>
          )}

          {assignment?.effectiveStatus !== "SKIPPED" && (
            <button
              type="button"
              disabled={savingAction !== null}
              onClick={handleFinishWorkout}
              className="px-4 py-2 rounded-2xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all scale-100 active:scale-95 disabled:opacity-50"
            >
              {savingAction === "COMPLETE" ? "Saving..." : `${t("finishWorkout")} 🏆`}
            </button>
          )}
        </div>
      </div>

      {actionToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
          {actionToast}
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold">
          {actionError}
        </div>
      )}
      {assignment?.effectiveStatus === "SKIPPED" && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <strong>Workout Skipped:</strong> {assignment.workoutLog?.clientFeedback || "No reason provided."}
        </div>
      )}

      {/* Exercises Set Loggers List */}
      <div className="space-y-6">
        {exerciseLogs.map((el, exIdx) => {
          const isDistance = el.metricType === "DISTANCE_TIME_PACE" || el.metricType === "LAPS_TIME";
          const isRounds = el.metricType === "ROUNDS_REPS_TIME";
          const isTimeHold = el.metricType === "TIME_HOLD";

          return (
          <div
            key={`${el.exerciseId}-${exIdx}`}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4"
          >
            {/* Exercise Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-brand-crimson">
                  {exIdx + 1}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">{el.exerciseName}</h3>
                  {(el.tempo || el.notes) && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {el.tempo ? `Tempo: ${el.tempo}` : ""}
                      {el.tempo && el.notes ? " • " : ""}
                      {el.notes}
                    </p>
                  )}
                </div>
              </div>

              {(el.exercise?.contraindicatedBodyParts?.length || 0) > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/40 text-red-300 border border-red-500/30 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span>Injury Alert</span>
                </span>
              )}
            </div>

            {/* Sets / Intervals Touch Table (Mobile-First) */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 px-3 pb-1">
                <span className="col-span-2 text-start">{isRounds ? "Block" : "Set"}</span>
                <span className="col-span-3 text-center">Target</span>
                <span className="col-span-3 text-center">
                  {isDistance ? "Distance (km)" : isRounds ? "Rounds" : isTimeHold ? "Hold (sec)" : "Actual Weight (KG)"}
                </span>
                <span className="col-span-2 text-center">
                  {isDistance ? "Time (sec)" : isTimeHold ? "Load (kg)" : "Actual Reps"}
                </span>
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
                  <span className="col-span-2 font-bold text-xs ps-2">
                    #{set.setNumber}
                  </span>

                  <span className="col-span-3 text-center text-xs text-slate-400 font-semibold">
                    {isDistance
                      ? `${set.targetDistanceKm ?? 0}km • ${set.targetTimeSeconds ?? 0}s${set.targetPace ? ` @ ${set.targetPace}` : ""}`
                      : isRounds
                      ? `${set.targetRounds ?? 1} rds × ${set.targetReps || "-"}`
                      : isTimeHold
                      ? `${set.targetTimeSeconds ?? 30}s hold${set.targetWeight ? ` @ ${set.targetWeight}kg` : ""}`
                      : `${set.targetWeight ?? 0}kg × ${set.targetReps || "-"}`}
                  </span>

                  <div className="col-span-3 px-1">
                    {isDistance ? (
                      <input
                        type="number"
                        step="0.1"
                        value={set.actualDistanceKm}
                        onChange={e => handleUpdateActual(exIdx, setIdx, "actualDistanceKm", Number(e.target.value))}
                        className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson"
                      />
                    ) : isRounds ? (
                      <input
                        type="number"
                        value={set.actualRounds}
                        onChange={e => handleUpdateActual(exIdx, setIdx, "actualRounds", Number(e.target.value))}
                        className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson"
                      />
                    ) : isTimeHold ? (
                      <input
                        type="number"
                        value={set.actualTimeSeconds}
                        onChange={e => handleUpdateActual(exIdx, setIdx, "actualTimeSeconds", Number(e.target.value))}
                        className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson"
                      />
                    ) : (
                      <input
                        type="number"
                        value={set.actualWeight}
                        onChange={e => handleUpdateActual(exIdx, setIdx, "actualWeight", Number(e.target.value))}
                        className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson"
                      />
                    )}
                  </div>

                  <div className="col-span-2 px-1">
                    {isDistance ? (
                      <input
                        type="number"
                        value={set.actualTimeSeconds}
                        onChange={e => handleUpdateActual(exIdx, setIdx, "actualTimeSeconds", Number(e.target.value))}
                        className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson"
                      />
                    ) : isTimeHold ? (
                      <input
                        type="number"
                        value={set.actualWeight}
                        onChange={e => handleUpdateActual(exIdx, setIdx, "actualWeight", Number(e.target.value))}
                        className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson"
                      />
                    ) : (
                      <input
                        type="number"
                        value={set.actualReps}
                        onChange={e => handleUpdateActual(exIdx, setIdx, "actualReps", Number(e.target.value))}
                        className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson"
                      />
                    )}
                  </div>

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
          );
        })}
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

        {assignment?.effectiveStatus !== "SKIPPED" && (
          <div className="flex flex-col sm:flex-row gap-2.5">
            {assignment?.effectiveStatus !== "COMPLETED" && (
              <>
                <button
                  type="button"
                  disabled={savingAction !== null}
                  onClick={handleSaveProgress}
                  className="sm:w-1/3 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 disabled:opacity-50"
                >
                  {savingAction === "SAVE_PROGRESS" ? "Saving..." : "Save Progress"}
                </button>
                <button
                  type="button"
                  disabled={savingAction !== null}
                  onClick={() => setIsSkipModalOpen(true)}
                  className="sm:w-1/4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-sm border border-slate-700 disabled:opacity-50"
                >
                  Skip Workout
                </button>
              </>
            )}
            <button
              type="button"
              disabled={savingAction !== null}
              onClick={handleFinishWorkout}
              className="flex-1 py-3.5 rounded-2xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-extrabold text-sm shadow-xl shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all scale-100 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
            >
              {savingAction === "COMPLETE" ? "Saving..." : `${t("finishWorkout")} 🏆`}
            </button>
          </div>
        )}
      </div>

      {/* Skip Workout Modal */}
      {isSkipModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">Skip Workout</h3>
            <p className="text-xs text-slate-400">
              Add an optional reason so your coach knows why this session was skipped.
            </p>
            <textarea
              rows={3}
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="e.g., Travel, soreness, schedule conflict..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-crimson"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSkipModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction === "SKIP"}
                onClick={handleSkipWorkout}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold disabled:opacity-50"
              >
                {savingAction === "SKIP" ? "Skipping..." : "Confirm Skip"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => router.push("/assignments")}
                className="w-full py-3 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-md"
              >
                Back to My Workouts
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
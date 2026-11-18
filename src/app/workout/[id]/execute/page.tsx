"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ClientWorkoutAssignment, Exercise, MetricType, BlockType } from "@/types";
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
  AlertTriangle,
  Layers,
  FastForward,
  Info,
  Lock
} from "lucide-react";

interface LocalSet {
  setNumber: number;
  roundNumber: number;
  assignmentBlockItemId?: string | null;
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
  isSkipped: boolean;
  skipReason: string;
}

interface LocalExerciseLog {
  assignmentBlockItemId?: string | null;
  exerciseId: string;
  exerciseName: string;
  metricType: MetricType;
  restSeconds: number;
  tempo?: string | null;
  exercise?: Exercise;
  sets: LocalSet[];
  notes: string;
}

interface LocalBlockLog {
  id: string;
  orderIndex: number;
  type: BlockType;
  title?: string | null;
  rounds: number;
  durationSeconds?: number | null;
  restBetweenRoundsSeconds?: number | null;
  notes?: string | null;
  exercises: LocalExerciseLog[];
}

export default function WorkoutExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params?.id as string;
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<ClientWorkoutAssignment | null>(null);
  const [blocks, setBlocks] = useState<LocalBlockLog[]>([]);

  // Workout Elapsed Timer
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Rest Countdown Timer
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [isRestActive, setIsRestActive] = useState(false);

  // Completion / Progress / Workout Skip Form
  const [overallRpe, setOverallRpe] = useState(8);
  const [clientFeedback, setClientFeedback] = useState("");
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [savingAction, setSavingAction] = useState<"SAVE_PROGRESS" | "COMPLETE" | "SKIP" | null>(null);
  const [actionToast, setActionToast] = useState("");
  const [actionError, setActionError] = useState("");

  // Item-level skip modal state
  const [itemSkipTarget, setItemSkipTarget] = useState<{
    bIdx: number;
    exIdx: number;
    setIdx: number;
  } | null>(null);
  const [itemSkipReason, setItemSkipReason] = useState("Fatigued / Pain");

  useEffect(() => {
    fetch(`/api/workouts/${assignmentId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const data: ClientWorkoutAssignment = json.data;
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

          const savedSetLogs: any[] = (data.workoutLog as any)?.setLogs || [];
          const savedExercises: any[] = data.workoutLog?.exercises || [];

          // 1. If assignmentBlocks exist, build block-first hierarchy
          if (Array.isArray(data.assignmentBlocks) && data.assignmentBlocks.length > 0) {
            const parsedBlocks: LocalBlockLog[] = data.assignmentBlocks.map((b: any, bIdx: number) => {
              const blockRounds = b.rounds && b.rounds > 1 ? b.rounds : 1;
              const isMultiRound = b.type === "CIRCUIT" || b.type === "SUPERSET" || blockRounds > 1;

              const blockExercises: LocalExerciseLog[] = (b.items || [])
                .filter((item: any) => item.itemType === "EXERCISE" || !item.itemType)
                .map((item: any) => {
                  const metricType: MetricType =
                    item.metricTypeSnapshot || item.exercise?.metricType || "SETS_REPS_WEIGHT";
                  const targetSetsCount = isMultiRound ? blockRounds : item.targetSets || 3;
                  const targetWt = item.targetWeightKg ?? null;
                  const targetRp = item.targetReps || (metricType === "SETS_REPS_WEIGHT" ? "10" : "");

                  const sets: LocalSet[] = [];
                  for (let i = 1; i <= targetSetsCount; i++) {
                    const roundNum = isMultiRound ? i : 1;
                    const setNum = isMultiRound ? 1 : i;

                    const priorSetLog = savedSetLogs.find(
                      (sl: any) =>
                        sl.assignmentBlockItemId === item.id &&
                        (sl.roundNumber ?? 1) === roundNum &&
                        (sl.setNumber ?? 1) === setNum
                    );

                    sets.push({
                      setNumber: setNum,
                      roundNumber: roundNum,
                      assignmentBlockItemId: item.id,
                      targetWeight: targetWt,
                      targetReps: targetRp,
                      targetDistanceKm: item.targetDistanceKm ?? null,
                      targetTimeSeconds: item.targetTimeSeconds ?? null,
                      targetPace: item.targetPace ?? null,
                      targetRounds: item.targetRounds ?? null,
                      actualWeight: priorSetLog?.actualWeightKg ?? targetWt ?? 0,
                      actualReps: priorSetLog?.actualReps ?? (parseInt(targetRp, 10) || 10),
                      actualDistanceKm: priorSetLog?.actualDistanceKm ?? item.targetDistanceKm ?? 0,
                      actualTimeSeconds: priorSetLog?.actualTimeSeconds ?? item.targetTimeSeconds ?? 0,
                      actualPace: priorSetLog?.actualPace ?? item.targetPace ?? "",
                      actualRounds: priorSetLog?.actualRounds ?? item.targetRounds ?? 1,
                      isCompleted: priorSetLog ? Boolean(priorSetLog.isCompleted) : false,
                      isSkipped: priorSetLog ? Boolean(priorSetLog.isSkipped) : false,
                      skipReason: priorSetLog?.skipReason || ""
                    });
                  }

                  return {
                    assignmentBlockItemId: item.id,
                    exerciseId: item.exerciseId || item.id,
                    exerciseName:
                      item.exerciseNameSnapshot ||
                      item.exercise?.nameEn ||
                      item.exercise?.nameAr ||
                      "Exercise",
                    metricType,
                    restSeconds: item.restSeconds || 60,
                    tempo: item.tempo || null,
                    exercise: item.exercise,
                    sets,
                    notes: item.instructions || item.exercise?.instructionsEn || ""
                  };
                });

              return {
                id: b.id,
                orderIndex: b.orderIndex ?? bIdx,
                type: (b.type as BlockType) || "SINGLE",
                title: b.title || `Block ${bIdx + 1}: ${b.type || "SINGLE"}`,
                rounds: blockRounds,
                durationSeconds: b.durationSeconds,
                restBetweenRoundsSeconds: b.restBetweenRoundsSeconds,
                notes: b.notes,
                exercises: blockExercises
              };
            });

            setBlocks(parsedBlocks);
          } else {
            // 2. Legacy fallback to flat exercises
            const sourceExercises: any[] =
              Array.isArray(data.exercises) && data.exercises.length > 0
                ? data.exercises
                : (data as any).template?.exercises || [];

            if (sourceExercises.length > 0) {
              const legacyExercises: LocalExerciseLog[] = sourceExercises.map((te: any) => {
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
                    roundNumber: 1,
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
                    isCompleted: prior ? Boolean(prior.isCompleted) : false,
                    isSkipped: prior ? Boolean(prior.isSkipped) : false,
                    skipReason: prior?.skipReason || ""
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

              setBlocks([
                {
                  id: "legacy-block",
                  orderIndex: 0,
                  type: "SINGLE",
                  title: "Workout Exercises",
                  rounds: 1,
                  exercises: legacyExercises
                }
              ]);
            }
          }
        }
      })
      .catch((err) => console.error("[WorkoutExecution] Error loading assignment:", err));
  }, [assignmentId]);

  // Workout duration ticker
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => setWorkoutSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Rest timer ticker
  useEffect(() => {
    let interval: any = null;
    if (isRestActive && restSecondsLeft > 0) {
      interval = setInterval(() => setRestSecondsLeft((s) => s - 1), 1000);
    } else if (restSecondsLeft === 0) {
      setIsRestActive(false);
    }
    return () => clearInterval(interval);
  }, [isRestActive, restSecondsLeft]);

  const startRestTimer = (seconds: number = 60) => {
    setRestSecondsLeft(seconds);
    setIsRestActive(true);
  };

  const handleToggleSet = (bIdx: number, exIdx: number, setIdx: number) => {
    if (assignment?.effectiveStatus === "COMPLETED") return;
    const next = [...blocks];
    const targetSet = next[bIdx].exercises[exIdx].sets[setIdx];
    targetSet.isCompleted = !targetSet.isCompleted;
    if (targetSet.isCompleted) {
      targetSet.isSkipped = false;
      targetSet.skipReason = "";
      startRestTimer(next[bIdx].exercises[exIdx].restSeconds || 60);
    }
    setBlocks(next);
  };

  const handleOpenItemSkip = (bIdx: number, exIdx: number, setIdx: number) => {
    if (assignment?.effectiveStatus === "COMPLETED") return;
    setItemSkipTarget({ bIdx, exIdx, setIdx });
    setItemSkipReason("Fatigued / Pain");
  };

  const handleConfirmItemSkip = () => {
    if (!itemSkipTarget) return;
    const { bIdx, exIdx, setIdx } = itemSkipTarget;
    const next = [...blocks];
    const targetSet = next[bIdx].exercises[exIdx].sets[setIdx];
    targetSet.isSkipped = true;
    targetSet.isCompleted = false;
    targetSet.skipReason = itemSkipReason.trim() || "Skipped by athlete";
    setBlocks(next);
    setItemSkipTarget(null);
  };

  const handleUnskipItem = (bIdx: number, exIdx: number, setIdx: number) => {
    if (assignment?.effectiveStatus === "COMPLETED") return;
    const next = [...blocks];
    const targetSet = next[bIdx].exercises[exIdx].sets[setIdx];
    targetSet.isSkipped = false;
    targetSet.skipReason = "";
    setBlocks(next);
  };

  const handleUpdateActual = (
    bIdx: number,
    exIdx: number,
    setIdx: number,
    field: "actualWeight" | "actualReps" | "actualDistanceKm" | "actualTimeSeconds" | "actualRounds" | "actualPace",
    val: number | string
  ) => {
    if (assignment?.effectiveStatus === "COMPLETED") return;
    const next = [...blocks];
    (next[bIdx].exercises[exIdx].sets[setIdx] as any)[field] = val;
    setBlocks(next);
  };

  const buildExecutionPayload = (action: "SAVE_PROGRESS" | "COMPLETE") => {
    const durationMin = Math.max(1, Math.round(workoutSeconds / 60));
    const allExercises = blocks.flatMap((b) => b.exercises);

    const blockItemLogs = blocks.flatMap((b) =>
      b.exercises.flatMap((ex) =>
        ex.sets
          .filter((s) => Boolean(s.assignmentBlockItemId))
          .map((s) => ({
            assignmentBlockItemId: s.assignmentBlockItemId!,
            roundNumber: s.roundNumber,
            setNumber: s.setNumber,
            isCompleted: s.isCompleted,
            isSkipped: s.isSkipped,
            skipReason: s.skipReason || null,
            targetReps: s.targetReps || null,
            targetWeightKg: s.targetWeight,
            targetDistanceKm: s.targetDistanceKm,
            targetTimeSeconds: s.targetTimeSeconds,
            targetPace: s.targetPace,
            targetRounds: s.targetRounds,
            actualWeightKg:
              ex.metricType === "SETS_REPS_WEIGHT" || ex.metricType === "TIME_HOLD" ? s.actualWeight : null,
            actualReps:
              ex.metricType === "SETS_REPS_WEIGHT" || ex.metricType === "ROUNDS_REPS_TIME"
                ? s.actualReps
                : null,
            actualDistanceKm:
              ex.metricType === "DISTANCE_TIME_PACE" || ex.metricType === "LAPS_TIME"
                ? s.actualDistanceKm
                : null,
            actualTimeSeconds:
              ex.metricType === "DISTANCE_TIME_PACE" ||
              ex.metricType === "LAPS_TIME" ||
              ex.metricType === "ROUNDS_REPS_TIME" ||
              ex.metricType === "TIME_HOLD"
                ? s.actualTimeSeconds
                : null,
            actualPace: ex.metricType === "DISTANCE_TIME_PACE" ? s.actualPace || null : null,
            actualRounds: ex.metricType === "ROUNDS_REPS_TIME" ? s.actualRounds : null,
            actualRpe: overallRpe
          }))
      )
    );

    return {
      action,
      durationMinutes: durationMin,
      overallRpe,
      clientFeedback,
      exercises: allExercises.map((el) => ({
        exerciseId: el.exerciseId,
        assignmentBlockItemId: el.assignmentBlockItemId || null,
        sets: el.sets.map((s) => ({
          assignmentBlockItemId: s.assignmentBlockItemId || null,
          roundNumber: s.roundNumber,
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
          isCompleted: s.isCompleted,
          isSkipped: s.isSkipped,
          skipReason: s.skipReason || null
        }))
      })),
      blockItemLogs
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
      setActionToast("Progress saved! All sets & blocks atomically persisted.");
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
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
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

  const getBlockTypeBadge = (type: BlockType) => {
    switch (type) {
      case "CIRCUIT":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "SUPERSET":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "SEQUENCE":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    }
  };

  const isCompletedSession = assignment?.effectiveStatus === "COMPLETED";

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
            <span className="text-xs text-slate-400">{assignment?.client?.user?.name}</span>
            {isCompletedSession && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Immutable</span>
              </span>
            )}
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

          {assignment?.effectiveStatus !== "SKIPPED" && !isCompletedSession && (
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

      {/* Render Exercises Grouped by Block with Round Indicators */}
      <div className="space-y-6">
        {blocks.map((block, bIdx) => {
          const isMultiRound = block.type === "CIRCUIT" || block.type === "SUPERSET" || block.rounds > 1;

          return (
            <div
              key={block.id || bIdx}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5"
            >
              {/* Block Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-brand-crimson">
                    {bIdx + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider border ${getBlockTypeBadge(
                          block.type
                        )}`}
                      >
                        {block.type}
                      </span>
                      {block.rounds > 1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {block.rounds} Rounds
                        </span>
                      )}
                      {block.restBetweenRoundsSeconds && (
                        <span className="text-[11px] text-slate-400">
                          Rest between rounds: {block.restBetweenRoundsSeconds}s
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                      {block.title || `Block ${bIdx + 1}`}
                    </h2>
                    {block.notes && <p className="text-[11px] text-slate-400 mt-0.5">{block.notes}</p>}
                  </div>
                </div>
              </div>

              {/* Exercises in Block */}
              <div className="space-y-6">
                {block.exercises.map((el, exIdx) => {
                  const isDistance = el.metricType === "DISTANCE_TIME_PACE" || el.metricType === "LAPS_TIME";
                  const isRounds = el.metricType === "ROUNDS_REPS_TIME";
                  const isTimeHold = el.metricType === "TIME_HOLD";

                  return (
                    <div key={`${el.exerciseId}-${exIdx}`} className="space-y-3 pt-2">
                      {/* Exercise Sub-header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Dumbbell className="w-4 h-4 text-brand-crimson" />
                          <h3 className="text-sm sm:text-base font-bold text-white">{el.exerciseName}</h3>
                          {(el.tempo || el.notes) && (
                            <span className="text-[11px] text-slate-400">
                              ({el.tempo ? `Tempo: ${el.tempo}` : ""}
                              {el.tempo && el.notes ? " • " : ""}
                              {el.notes})
                            </span>
                          )}
                        </div>

                        {(el.exercise?.contraindicatedBodyParts?.length || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/40 text-red-300 border border-red-500/30 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span>Injury Alert</span>
                          </span>
                        )}
                      </div>

                      {/* Sets / Rounds Touch Table */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 px-3 pb-1">
                          <span className="col-span-2 text-start">
                            {isMultiRound ? "Round" : isRounds ? "Block" : "Set"}
                          </span>
                          <span className="col-span-3 text-center">Target</span>
                          <span className="col-span-3 text-center">
                            {isDistance
                              ? "Distance (km)"
                              : isRounds
                              ? "Rounds"
                              : isTimeHold
                              ? "Hold (sec)"
                              : "Actual Load (KG)"}
                          </span>
                          <span className="col-span-2 text-center">
                            {isDistance ? "Time (sec)" : isTimeHold ? "Load (kg)" : "Actual Reps"}
                          </span>
                          <span className="col-span-2 text-center">Actions</span>
                        </div>

                        {el.sets.map((set, setIdx) => (
                          <div
                            key={setIdx}
                            className={`grid grid-cols-12 items-center p-2.5 rounded-2xl border transition-all ${
                              set.isSkipped
                                ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                                : set.isCompleted
                                ? "bg-[#141416] border-brand-crimson/40 text-brand-crimson"
                                : "bg-slate-950/70 border-slate-800 text-white"
                            }`}
                          >
                            <div className="col-span-2 font-bold text-xs ps-2 flex items-center space-x-1">
                              <span>
                                {isMultiRound ? `R${set.roundNumber}` : `#${set.setNumber}`}
                              </span>
                              {set.isSkipped && (
                                <span className="text-[10px] text-amber-400 font-normal truncate block">
                                  [Skip]
                                </span>
                              )}
                            </div>

                            <span className="col-span-3 text-center text-xs text-slate-400 font-semibold">
                              {isDistance
                                ? `${set.targetDistanceKm ?? 0}km • ${set.targetTimeSeconds ?? 0}s${
                                    set.targetPace ? ` @ ${set.targetPace}` : ""
                                  }`
                                : isRounds
                                ? `${set.targetRounds ?? 1} rds × ${set.targetReps || "-"}`
                                : isTimeHold
                                ? `${set.targetTimeSeconds ?? 30}s hold${
                                    set.targetWeight ? ` @ ${set.targetWeight}kg` : ""
                                  }`
                                : `${set.targetWeight ?? 0}kg × ${set.targetReps || "-"}`}
                            </span>

                            <div className="col-span-3 px-1">
                              {isDistance ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  disabled={isCompletedSession || set.isSkipped}
                                  value={set.actualDistanceKm}
                                  onChange={(e) =>
                                    handleUpdateActual(bIdx, exIdx, setIdx, "actualDistanceKm", Number(e.target.value))
                                  }
                                  className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                                />
                              ) : isRounds ? (
                                <input
                                  type="number"
                                  disabled={isCompletedSession || set.isSkipped}
                                  value={set.actualRounds}
                                  onChange={(e) =>
                                    handleUpdateActual(bIdx, exIdx, setIdx, "actualRounds", Number(e.target.value))
                                  }
                                  className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                                />
                              ) : isTimeHold ? (
                                <input
                                  type="number"
                                  disabled={isCompletedSession || set.isSkipped}
                                  value={set.actualTimeSeconds}
                                  onChange={(e) =>
                                    handleUpdateActual(bIdx, exIdx, setIdx, "actualTimeSeconds", Number(e.target.value))
                                  }
                                  className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                                />
                              ) : (
                                <input
                                  type="number"
                                  disabled={isCompletedSession || set.isSkipped}
                                  value={set.actualWeight}
                                  onChange={(e) =>
                                    handleUpdateActual(bIdx, exIdx, setIdx, "actualWeight", Number(e.target.value))
                                  }
                                  className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                                />
                              )}
                            </div>

                            <div className="col-span-2 px-1">
                              {isDistance ? (
                                <input
                                  type="number"
                                  disabled={isCompletedSession || set.isSkipped}
                                  value={set.actualTimeSeconds}
                                  onChange={(e) =>
                                    handleUpdateActual(bIdx, exIdx, setIdx, "actualTimeSeconds", Number(e.target.value))
                                  }
                                  className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                                />
                              ) : isTimeHold ? (
                                <input
                                  type="number"
                                  disabled={isCompletedSession || set.isSkipped}
                                  value={set.actualWeight}
                                  onChange={(e) =>
                                    handleUpdateActual(bIdx, exIdx, setIdx, "actualWeight", Number(e.target.value))
                                  }
                                  className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                                />
                              ) : (
                                <input
                                  type="number"
                                  disabled={isCompletedSession || set.isSkipped}
                                  value={set.actualReps}
                                  onChange={(e) =>
                                    handleUpdateActual(bIdx, exIdx, setIdx, "actualReps", Number(e.target.value))
                                  }
                                  className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                                />
                              )}
                            </div>

                            <div className="col-span-2 flex items-center justify-center space-x-1.5">
                              {/* Complete Toggle Button */}
                              <button
                                type="button"
                                disabled={isCompletedSession}
                                onClick={() => handleToggleSet(bIdx, exIdx, setIdx)}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                  set.isCompleted
                                    ? "bg-brand-crimson text-white shadow-md shadow-[0_0_15px_rgba(240,20,37,0.35)]"
                                    : "bg-slate-800 text-slate-500 hover:text-slate-200 border border-slate-700"
                                } disabled:opacity-40`}
                                title={set.isCompleted ? "Completed" : "Mark Done"}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>

                              {/* Item-level Skip Button */}
                              {set.isSkipped ? (
                                <button
                                  type="button"
                                  disabled={isCompletedSession}
                                  onClick={() => handleUnskipItem(bIdx, exIdx, setIdx)}
                                  className="px-1.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold hover:bg-amber-500/30 disabled:opacity-40"
                                  title={`Reason: ${set.skipReason}. Click to unskip.`}
                                >
                                  Unskip
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isCompletedSession}
                                  onClick={() => handleOpenItemSkip(bIdx, exIdx, setIdx)}
                                  className="w-7 h-7 rounded-xl flex items-center justify-center bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700 text-[10px] font-bold disabled:opacity-40"
                                  title="Skip this set/round"
                                >
                                  <FastForward className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Rest Timer Quick Launch */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-slate-400 font-medium">Quick Rest Timer:</span>
                        <div className="flex space-x-1.5">
                          <button
                            type="button"
                            onClick={() => startRestTimer(45)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300"
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
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300"
                          >
                            90s
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Item Skip Modal */}
      {itemSkipTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center space-x-2">
              <FastForward className="w-4 h-4 text-amber-400" />
              <span>Skip Exercise / Round</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select or enter a reason for skipping this individual item:
            </p>

            <div className="space-y-1.5">
              {["Fatigued / Pain", "Equipment Unavailable", "Time Constraint", "Coach Modification"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setItemSkipReason(r)}
                  className={`w-full text-start px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    itemSkipReason === r
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div>
              <input
                type="text"
                value={itemSkipReason}
                onChange={(e) => setItemSkipReason(e.target.value)}
                placeholder="Or type custom reason..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setItemSkipTarget(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmItemSkip}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate of Perceived Exertion (RPE) & Feedback Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>{t("rpeScale")}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{t("rpeHelp")}</p>
        </div>

        {/* RPE Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-brand-crimson text-base">RPE: {overallRpe} / 10</span>
            <span className="font-bold text-slate-300">{getRpeDescription(overallRpe)}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            disabled={isCompletedSession}
            value={overallRpe}
            onChange={(e) => setOverallRpe(Number(e.target.value))}
            className="w-full accent-[#F01425] h-2 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Workout Feedback & Notes
          </label>
          <textarea
            rows={2}
            disabled={isCompletedSession}
            value={clientFeedback}
            onChange={(e) => setClientFeedback(e.target.value)}
            placeholder="e.g. Felt strong on bench press, form was clean..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
          />
        </div>

        {assignment?.effectiveStatus !== "SKIPPED" && !isCompletedSession && (
          <div className="flex flex-col sm:flex-row gap-2.5">
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

      {/* Skip Entire Workout Modal */}
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30 flex items-center justify-center text-white mx-auto shadow-xl shadow-[0_0_20px_rgba(240,20,37,0.38)] animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">Great job! Workout Completed 🏆</h3>
              <p className="text-xs text-slate-400 mt-1.5">{t("workoutCompletedSuccess")}</p>
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
                  {blocks.reduce(
                    (acc, b) => acc + b.exercises.reduce((exAcc, el) => exAcc + el.sets.filter((s) => s.isCompleted).length, 0),
                    0
                  )}{" "}
                  Sets
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
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
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
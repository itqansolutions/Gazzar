"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  ClientWorkoutAssignment,
  Exercise,
  MetricType,
  BlockType
} from "@/types";
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
  Lock,
  X,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Check
} from "lucide-react";

export interface WorkoutModalRunnerProps {
  assignmentId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  standalone?: boolean;
}

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
  coachReview?: string | null;
  coachReviewedAt?: Date | string | null;
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

interface ExerciseStepPointer {
  stepIndex: number;
  bIdx: number;
  exIdx: number;
}

export default function WorkoutModalRunner({
  assignmentId,
  isOpen,
  onClose,
  onUpdated,
  standalone = false
}: WorkoutModalRunnerProps) {
  const { language, dir } = useLanguage();
  const isRtl = dir === "rtl" || language === "ar";
  const { user } = useAuth();

  // Load and core data state
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [assignment, setAssignment] = useState<ClientWorkoutAssignment | null>(null);
  const [blocks, setBlocks] = useState<LocalBlockLog[]>([]);

  // Navigation state (0 .. stepsCount - 1 = exercises; stepsCount = summary step)
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Workout Elapsed Timer
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Rest Countdown Timer
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [isRestActive, setIsRestActive] = useState(false);

  // Completion / Progress / Workout Skip Form
  const [overallRpe, setOverallRpe] = useState(8);
  const [clientFeedback, setClientFeedback] = useState("");
  const [coachFeedback, setCoachFeedback] = useState("");

  // Saving states
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [stepSaveError, setStepSaveError] = useState("");
  const [stepSaveSuccess, setStepSaveSuccess] = useState(false);

  // Finish states
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [isCompletedSuccess, setIsCompletedSuccess] = useState(false);

  // Item-level skip modal state
  const [itemSkipTarget, setItemSkipTarget] = useState<{
    bIdx: number;
    exIdx: number;
    setIdx: number;
  } | null>(null);
  const [itemSkipReason, setItemSkipReason] = useState("Fatigued / Pain");

  // Workout-level skip modal state
  const [isSkipWorkoutOpen, setIsSkipWorkoutOpen] = useState(false);
  const [skipWorkoutReason, setSkipWorkoutReason] = useState("");
  const [isSkippingWorkout, setIsSkippingWorkout] = useState(false);
  const [skipWorkoutError, setSkipWorkoutError] = useState("");

  // Exit confirmation modal state
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Fetch assignment data
  useEffect(() => {
    if (!isOpen || !assignmentId) return;

    let isMounted = true;
    setLoading(true);
    setFetchError("");
    setStepSaveError("");
    setFinishError("");
    setIsCompletedSuccess(false);
    setActiveStepIndex(0);

    fetch(`/api/workouts/${assignmentId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (!json.success || !json.data) {
          setFetchError(json.error || (isRtl ? "تعذر تحميل بيانات التمرين" : "Failed to load workout assignment"));
          setLoading(false);
          return;
        }

        const data: ClientWorkoutAssignment = json.data;
        setAssignment(data);

        if (data.workoutLog) {
          if (typeof data.workoutLog.overallRpe === "number") {
            setOverallRpe(data.workoutLog.overallRpe);
          }
          if (data.workoutLog.clientFeedback) {
            setClientFeedback(data.workoutLog.clientFeedback);
          }
          if (data.workoutLog.coachFeedback) {
            setCoachFeedback(data.workoutLog.coachFeedback);
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
                    skipReason: priorSetLog?.skipReason || "",
                    coachReview: priorSetLog?.coachReview || null,
                    coachReviewedAt: priorSetLog?.coachReviewedAt || null
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
                exerciseName: te.exercise?.nameEn || te.exercise?.nameAr || "Exercise",
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
                id: "legacy-block-0",
                orderIndex: 0,
                type: "SINGLE",
                title: "Workout Exercises",
                rounds: 1,
                exercises: legacyExercises
              }
            ]);
          } else {
            setBlocks([]);
          }
        }

        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setFetchError(err?.message || (isRtl ? "خطأ في الشبكة" : "Network error loading workout"));
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, assignmentId, isRtl]);

  // Compute linear step list preserving block/exercise indices
  const steps: ExerciseStepPointer[] = useMemo(() => {
    const list: ExerciseStepPointer[] = [];
    let counter = 0;
    blocks.forEach((block, bIdx) => {
      block.exercises.forEach((_ex, exIdx) => {
        list.push({
          stepIndex: counter++,
          bIdx,
          exIdx
        });
      });
    });
    return list;
  }, [blocks]);

  // Workout duration ticker
  useEffect(() => {
    let interval: any = null;
    if (isOpen && isTimerRunning) {
      interval = setInterval(() => setWorkoutSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, isTimerRunning]);

  // Rest countdown ticker (Preserves existing stopwatch / rest timer behavior)
  useEffect(() => {
    let interval: any = null;
    if (isOpen && isRestActive && restSecondsLeft > 0) {
      interval = setInterval(() => setRestSecondsLeft((s) => s - 1), 1000);
    } else if (restSecondsLeft === 0) {
      setIsRestActive(false);
    }
    return () => clearInterval(interval);
  }, [isOpen, isRestActive, restSecondsLeft]);

  const startRestTimer = (seconds: number = 60) => {
    setRestSecondsLeft(seconds);
    setIsRestActive(true);
  };

  const stopRestTimer = () => {
    setRestSecondsLeft(0);
    setIsRestActive(false);
  };

  // Set-level state handlers
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

  // Payload builder conforming 100% to POST /api/workouts/[id] contract
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

  // Step advancement with mandatory SAVE_PROGRESS error guard:
  // If SAVE_PROGRESS fails, DO NOT ADVANCE. Keep all values in memory and provide retry.
  const handleNextStep = async () => {
    setStepSaveError("");
    setStepSaveSuccess(false);

    // If already in summary step, do nothing
    if (activeStepIndex >= steps.length) return;

    // If assignment is already completed, allow free inspection without saving
    if (assignment?.effectiveStatus === "COMPLETED") {
      setActiveStepIndex((idx) => idx + 1);
      return;
    }

    setIsSavingStep(true);
    try {
      const res = await fetch(`/api/workouts/${assignment?.id || assignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildExecutionPayload("SAVE_PROGRESS"))
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setStepSaveError(
          json.error ||
            (isRtl
              ? "فشل حفظ التقدم. لم يتم الانتقال للتمرين التالي للحفاظ على مدخلاتك. يرجى إعادة المحاولة."
              : "Failed to save progress. Did not advance to preserve your input. Please retry.")
        );
        setIsSavingStep(false);
        return; // GUARD: DO NOT ADVANCE ON FAILURE!
      }

      if (json.data?.assignment) {
        setAssignment(json.data.assignment);
      }

      setStepSaveSuccess(true);
      setTimeout(() => setStepSaveSuccess(false), 2000);

      // Advance to next step safely
      setActiveStepIndex((idx) => idx + 1);
    } catch (err: any) {
      setStepSaveError(
        err?.message ||
          (isRtl
            ? "حدث خطأ في الاتصال أثناء حفظ التقدم. تم الاحتفاظ بكل بياناتك في الذاكرة. يرجى الضغط على إعادة المحاولة."
            : "Connection error while saving progress. All inputs preserved in memory. Please retry.")
      );
    } finally {
      setIsSavingStep(false);
    }
  };

  const handlePrevStep = () => {
    setStepSaveError("");
    setActiveStepIndex((idx) => Math.max(0, idx - 1));
  };

  // Complete workout handler
  // Only closes modal and shows COMPLETED after the backend endpoint returns success.
  const handleFinishWorkout = async () => {
    setFinishError("");
    setIsFinishing(true);

    try {
      const res = await fetch(`/api/workouts/${assignment?.id || assignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildExecutionPayload("COMPLETE"))
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFinishError(
          json.error ||
            (isRtl
              ? "فشل اعتماد إنهاء التمرين من الخادم. لم يتم قفل الجلسة. يرجى إعادة المحاولة."
              : "Failed to complete workout on server. Session not closed. Please retry.")
        );
        setIsFinishing(false);
        return; // GUARD: DO NOT SHOW COMPLETED ON FAILURE!
      }

      if (json.data?.assignment) {
        setAssignment(json.data.assignment);
      }

      setIsTimerRunning(false);
      setIsCompletedSuccess(true);

      if (onUpdated) {
        onUpdated();
      }
    } catch (err: any) {
      setFinishError(
        err?.message ||
          (isRtl
            ? "خطأ في الشبكة أثناء إرسال بيانات إنهاء التمرين. يرجى إعادة المحاولة."
            : "Network error completing workout. Please retry.")
      );
    } finally {
      setIsFinishing(false);
    }
  };

  // Skip entire workout session
  const handleSkipWorkout = async () => {
    setSkipWorkoutError("");
    setIsSkippingWorkout(true);

    try {
      const res = await fetch(`/api/workouts/${assignment?.id || assignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SKIP",
          reason: skipWorkoutReason.trim() || "Skipped by athlete"
        })
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setSkipWorkoutError(json.error || (isRtl ? "فشل تخطي التمرين" : "Failed to skip workout"));
        setIsSkippingWorkout(false);
        return;
      }

      if (json.data) setAssignment(json.data);
      setIsTimerRunning(false);
      setIsSkipWorkoutOpen(false);

      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      setSkipWorkoutError(err?.message || (isRtl ? "خطأ أثناء تخطي التمرين" : "Error skipping workout"));
    } finally {
      setIsSkippingWorkout(false);
    }
  };

  const handleRequestClose = () => {
    if (isCompletedSuccess || assignment?.effectiveStatus === "COMPLETED") {
      onClose();
      return;
    }
    // If workout has started and has in-progress state, ask for confirmation
    if (workoutSeconds > 30) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  // Helpers
  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const getRpeDescription = (rpe: number) => {
    if (rpe <= 4) return isRtl ? "سهل جداً (راحة تامة)" : "Very Easy (Plenty in reserve)";
    if (rpe <= 6) return isRtl ? "جهد متوسط (تحكم كامل)" : "Moderate Effort";
    if (rpe === 7) return isRtl ? "تحدي ممتع (3 تكرارات باقية - 3 RIR)" : "Good Challenge (3 RIR)";
    if (rpe === 8) return isRtl ? "شاق ومثمر (تكراران باقيان - 2 RIR)" : "Heavy (2 RIR)";
    if (rpe === 9) return isRtl ? "قريب من أقصى جهد (تكرار واحد باقٍ - 1 RIR)" : "Near Max (1 RIR)";
    return isRtl ? "أقصى جهد ممكن (0 RIR)" : "Absolute Max (0 RIR)";
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
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    }
  };

  // Stats calculation
  const totalSetsCount = useMemo(() => {
    return blocks.reduce((acc, b) => acc + b.exercises.reduce((exAcc, ex) => exAcc + ex.sets.length, 0), 0);
  }, [blocks]);

  const completedSetsCount = useMemo(() => {
    return blocks.reduce(
      (acc, b) => acc + b.exercises.reduce((exAcc, ex) => exAcc + ex.sets.filter((s) => s.isCompleted).length, 0),
      0
    );
  }, [blocks]);

  const skippedSetsCount = useMemo(() => {
    return blocks.reduce(
      (acc, b) => acc + b.exercises.reduce((exAcc, ex) => exAcc + ex.sets.filter((s) => s.isSkipped).length, 0),
      0
    );
  }, [blocks]);

  if (!isOpen) return null;

  // Active step pointers
  const isSummaryStep = activeStepIndex >= steps.length;
  const currentStep = !isSummaryStep && steps[activeStepIndex] ? steps[activeStepIndex] : null;
  const currentBlock = currentStep ? blocks[currentStep.bIdx] : null;
  const currentExercise = currentStep && currentBlock ? currentBlock.exercises[currentStep.exIdx] : null;
  const isMultiRoundBlock = currentBlock
    ? currentBlock.type === "CIRCUIT" || currentBlock.type === "SUPERSET" || currentBlock.rounds > 1
    : false;
  const isCompletedSession = assignment?.effectiveStatus === "COMPLETED";

  // Active exercise media, instructions and form guidance
  const exerciseImageUrl =
    currentExercise?.exercise?.thumbnailUrl ||
    (currentExercise?.exercise as any)?.imageUrl ||
    (currentExercise as any)?.imageUrl ||
    null;

  const exerciseInstructions =
    (isRtl ? currentExercise?.exercise?.instructionsAr : currentExercise?.exercise?.instructionsEn) ||
    currentExercise?.exercise?.instructionsEn ||
    currentExercise?.exercise?.instructionsAr ||
    currentExercise?.notes ||
    "";

  const exerciseCoachTip =
    (isRtl ? currentExercise?.exercise?.coachTipsAr : currentExercise?.exercise?.coachTipsEn) ||
    currentExercise?.exercise?.coachTipsEn ||
    currentExercise?.exercise?.coachTipsAr ||
    "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 overflow-y-auto"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Runner Dialog (Fullscreen on mobile, centered dialog on desktop) */}
      <div
        className={`relative w-full h-full ${
          standalone ? "md:h-[95vh] md:max-w-5xl" : "md:h-auto md:max-h-[92vh] md:max-w-4xl"
        } bg-slate-950 text-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-800`}
      >
        {/* TOP BAR / HEADER */}
        <div className="shrink-0 bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-crimson/20 border border-brand-crimson/40 flex items-center justify-center text-brand-crimson shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">
                {assignment?.template?.titleAr && isRtl
                  ? assignment.template.titleAr
                  : assignment?.template?.titleEn ||
                    (isRtl ? "جلسة التمرين" : "Workout Session")}
              </h2>
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-slate-400">
                {steps.length > 0 && !isSummaryStep && (
                  <span>
                    {isRtl ? "تمرين" : "Exercise"} {activeStepIndex + 1} / {steps.length}
                  </span>
                )}
                {isSummaryStep && (
                  <span className="text-brand-crimson font-semibold">
                    {isRtl ? "ملخص الجلسة" : "Session Summary"}
                  </span>
                )}
                {isCompletedSession && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {isRtl ? "مكتمل" : "Completed"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timers in Header */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
            {/* Workout Elapsed Timer */}
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono font-bold text-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatTimer(workoutSeconds)}</span>
              {!isCompletedSession && (
                <button
                  type="button"
                  onClick={() => setIsTimerRunning((r) => !r)}
                  className="text-slate-400 hover:text-white transition-colors ps-0.5"
                  title={isTimerRunning ? "Pause timer" : "Resume timer"}
                >
                  {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                </button>
              )}
            </div>

            {/* Rest Countdown Timer Pill */}
            {isRestActive && (
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold animate-pulse">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Rest: {formatTimer(restSecondsLeft)}</span>
                <button
                  type="button"
                  onClick={stopRestTimer}
                  className="text-amber-400 hover:text-white text-[11px] font-bold ps-1"
                  title="Dismiss rest timer"
                >
                  ×
                </button>
              </div>
            )}

            {/* Close / Dismiss Button */}
            <button
              type="button"
              onClick={handleRequestClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title={isRtl ? "إغلاق" : "Close"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="shrink-0 w-full bg-slate-900 h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-crimson to-rose-400 transition-all duration-300"
            style={{
              width: `${
                steps.length === 0
                  ? 0
                  : Math.min(100, Math.round(((activeStepIndex + (isSummaryStep ? 1 : 0)) / (steps.length + 1)) * 100))
              }%`
            }}
          />
        </div>

        {/* SCROLLABLE CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Loading state */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-brand-crimson animate-spin" />
              <p className="text-sm text-slate-400">
                {isRtl ? "جارٍ تحميل بيانات التمرين..." : "Loading workout execution..."}
              </p>
            </div>
          )}

          {/* Fetch error */}
          {!loading && fetchError && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-sm flex items-center space-x-3 rtl:space-x-reverse">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="flex-1">{fetchError}</span>
            </div>
          )}

          {/* Empty blocks state */}
          {!loading && !fetchError && blocks.length === 0 && (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <p className="text-sm">{isRtl ? "لا توجد تمارين مسجلة في هذا التكليف." : "No exercises found in this assignment."}</p>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {isCompletedSuccess && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/10">
                <Trophy className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {isRtl ? "عاش يا بطل! تم إنهاء التمرين بنجاح" : "Workout Completed Successfully!"}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRtl
                    ? "تم تسجيل كافة المجموعات والأوزان والـ RPE ذرياً في سجلك الرياضي."
                    : "All sets, loads, and RPE feedback were successfully persisted."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full max-w-sm pt-2">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block">{isRtl ? "المدة" : "Duration"}</span>
                  <span className="text-sm font-bold text-white">{formatTimer(workoutSeconds)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block">{isRtl ? "المجموعات" : "Sets Done"}</span>
                  <span className="text-sm font-bold text-rose-400">
                    {completedSetsCount} / {totalSetsCount}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block">{isRtl ? "الجهد RPE" : "Overall RPE"}</span>
                  <span className="text-sm font-bold text-brand-crimson">{overallRpe} / 10</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-sm font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
              >
                {isRtl ? "إغلاق المشغل" : "Close Runner"}
              </button>
            </div>
          )}

          {/* MAIN RUNNER VIEW: EXERCISE STEP VIEW (STRICTLY ONE EXERCISE PER SCREEN) */}
          {!loading && !fetchError && !isCompletedSuccess && !isSummaryStep && currentBlock && currentExercise && (
            <div className="space-y-4">
              {/* STEP PROGRESS & BLOCK CONTEXT BANNER */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-brand-crimson/20 text-brand-crimson border border-brand-crimson/40 shadow-xs">
                      {isRtl
                        ? `التمرين ${activeStepIndex + 1} من ${steps.length}`
                        : `Exercise ${activeStepIndex + 1} of ${steps.length}`}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getBlockTypeBadge(
                        currentBlock.type
                      )}`}
                    >
                      {currentBlock.title || currentBlock.type}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs text-slate-400">
                    {currentBlock.rounds > 1 && (
                      <span className="font-semibold text-slate-300">
                        {isRtl
                          ? `الجولة ${currentExercise.sets[0]?.roundNumber || 1} من ${currentBlock.rounds}`
                          : `Round ${currentExercise.sets[0]?.roundNumber || 1} of ${currentBlock.rounds}`}
                      </span>
                    )}
                    {typeof currentBlock.restBetweenRoundsSeconds === "number" &&
                      currentBlock.restBetweenRoundsSeconds > 0 && (
                        <span>
                          {isRtl
                            ? `راحة الجولة: ${currentBlock.restBetweenRoundsSeconds}ث`
                            : `Round Rest: ${currentBlock.restBetweenRoundsSeconds}s`}
                        </span>
                      )}
                  </div>
                </div>

                {/* If SUPERSET or CIRCUIT or SEQUENCE, show sequence context pills */}
                {currentBlock.exercises.length > 1 && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-slate-400 font-semibold me-1">
                      {isRtl ? "ترتيب تمارين المجموعة المركبة:" : "Block Sequence:"}
                    </span>
                    {currentBlock.exercises.map((ex, exIdx) => {
                      const isCurrentInBlock = exIdx === currentStep!.exIdx;
                      const isExDone = ex.sets.every((s) => s.isCompleted || s.isSkipped);
                      return (
                        <div
                          key={ex.exerciseId + exIdx}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 rtl:space-x-reverse border transition-all ${
                            isCurrentInBlock
                              ? "bg-brand-crimson text-white border-brand-crimson shadow-md shadow-[0_0_12px_rgba(240,20,37,0.35)] ring-1 ring-white/20"
                              : isExDone
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 opacity-60"
                          }`}
                        >
                          <span>{exIdx + 1}.</span>
                          <span className="truncate max-w-[120px]">{ex.exerciseName}</span>
                          {isCurrentInBlock && (
                            <span className="text-[9px] uppercase tracking-wider bg-black/40 px-1 py-0.2 rounded font-black">
                              {isRtl ? "الحالي" : "Now"}
                            </span>
                          )}
                          {isExDone && <Check className="w-3 h-3 text-rose-400" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentBlock.notes && (
                  <p className="text-xs text-slate-400 italic pt-0.5">{currentBlock.notes}</p>
                )}
              </div>

              {/* EXERCISE DETAIL CARD (FOCUSED SINGLE EXERCISE VIEW) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                {/* Header: Title + Primary Muscles / Badges + Quick Rest */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2 rtl:space-x-reverse">
                      <span>{currentExercise.exerciseName}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700">
                        {currentExercise.metricType}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-brand-crimson border border-brand-crimson/30">
                        {currentExercise.sets.length} {isRtl ? "مجموعات" : "Sets"}
                      </span>
                      {currentExercise.exercise?.primaryMuscle && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[10px] font-semibold text-slate-300 border border-slate-700">
                          {isRtl
                            ? currentExercise.exercise.primaryMuscle.nameAr || currentExercise.exercise.primaryMuscle.nameEn
                            : currentExercise.exercise.primaryMuscle.nameEn}
                        </span>
                      )}
                      {currentExercise.exercise?.equipment && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[10px] font-semibold text-slate-300 border border-slate-700">
                          {isRtl
                            ? currentExercise.exercise.equipment.nameAr || currentExercise.exercise.equipment.nameEn
                            : currentExercise.exercise.equipment.nameEn}
                        </span>
                      )}
                      {currentExercise.tempo && (
                        <span className="text-slate-300">
                          {isRtl ? "الإيقاع (Tempo):" : "Tempo:"} <span className="font-bold text-white">{currentExercise.tempo}</span>
                        </span>
                      )}
                      {currentExercise.restSeconds > 0 && (
                        <span className="text-slate-300">
                          {isRtl ? "الراحة:" : "Rest:"} <span className="font-bold text-white">{currentExercise.restSeconds}s</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Manual Quick Rest Trigger */}
                  <div className="flex items-center space-x-1.5 rtl:space-x-reverse shrink-0">
                    <button
                      type="button"
                      onClick={() => startRestTimer(currentExercise.restSeconds || 60)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition-colors border border-slate-700 shadow-xs"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isRtl ? "مؤقت راحة" : "Rest Timer"}</span>
                    </button>
                  </div>
                </div>

                {/* Exercise Image / Thumbnail (if available) */}
                {exerciseImageUrl && (
                  <div className="relative w-full max-h-56 sm:max-h-64 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                    <img
                      src={exerciseImageUrl}
                      alt={currentExercise.exerciseName}
                      className="w-full h-full max-h-56 sm:max-h-64 object-contain sm:object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Instructions & Technique Guidance (if available) */}
                {exerciseInstructions && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse font-bold text-slate-200">
                      <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{isRtl ? "تعليمات الأداء الفني:" : "Exercise Instructions:"}</span>
                    </div>
                    <p className="leading-relaxed text-slate-300 whitespace-pre-line">{exerciseInstructions}</p>
                  </div>
                )}

                {/* Coach Technique Tip (if available) */}
                {exerciseCoachTip && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse font-bold text-amber-300">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>{isRtl ? "توجيهات المدرب:" : "Coach Tip:"}</span>
                    </div>
                    <p className="leading-relaxed text-amber-100/90 whitespace-pre-line">{exerciseCoachTip}</p>
                  </div>
                )}

                {/* SETS TABLE FOR CURRENT EXERCISE */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 px-3 pb-1">
                    <span className="col-span-2 text-start">
                      {isMultiRoundBlock ? (isRtl ? "الجولة" : "Round") : isRtl ? "المجموعة" : "Set"}
                    </span>
                    <span className="col-span-3 text-center">{isRtl ? "المستهدف" : "Target"}</span>
                    <span className="col-span-3 text-center">
                      {currentExercise.metricType === "DISTANCE_TIME_PACE"
                        ? isRtl
                          ? "المسافة (كم)"
                          : "Dist (km)"
                        : currentExercise.metricType === "ROUNDS_REPS_TIME"
                        ? isRtl
                          ? "الجولات"
                          : "Rounds"
                        : currentExercise.metricType === "TIME_HOLD"
                        ? isRtl
                          ? "الثبات (ث)"
                          : "Hold (s)"
                        : isRtl
                        ? "الوزن الفعلي (كغ)"
                        : "Load (kg)"}
                    </span>
                    <span className="col-span-2 text-center">
                      {currentExercise.metricType === "DISTANCE_TIME_PACE"
                        ? isRtl
                          ? "الوقت (ث)"
                          : "Time (s)"
                        : currentExercise.metricType === "TIME_HOLD"
                        ? isRtl
                          ? "الوزن (كغ)"
                          : "Load (kg)"
                        : isRtl
                        ? "التكرارات"
                        : "Reps"}
                    </span>
                    <span className="col-span-2 text-center">{isRtl ? "الإجراء" : "Done"}</span>
                  </div>

                  {currentExercise.sets.map((set, setIdx) => {
                    const isDistance = currentExercise.metricType === "DISTANCE_TIME_PACE";
                    const isRounds = currentExercise.metricType === "ROUNDS_REPS_TIME";
                    const isTimeHold = currentExercise.metricType === "TIME_HOLD";

                    return (
                      <div
                        key={setIdx}
                        className={`grid grid-cols-12 items-center p-2.5 rounded-xl border transition-all ${
                          set.isSkipped
                            ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                            : set.isCompleted
                            ? "bg-slate-900 border-brand-crimson/50 text-brand-crimson"
                            : "bg-slate-950/80 border-slate-800 text-white"
                        }`}
                      >
                        <div className="col-span-2 font-bold text-xs ps-2 flex items-center space-x-1 rtl:space-x-reverse">
                          <span>
                            {isMultiRoundBlock ? `R${set.roundNumber}` : `#${set.setNumber}`}
                          </span>
                          {set.isSkipped && (
                            <span className="text-[10px] text-amber-400 font-normal truncate block">
                              [{isRtl ? "تم التخطي" : "Skip"}]
                            </span>
                          )}
                        </div>

                        {/* Target values */}
                        <span className="col-span-3 text-center text-xs text-slate-400 font-semibold">
                          {isDistance
                            ? `${set.targetDistanceKm ?? 0}km • ${set.targetTimeSeconds ?? 0}s`
                            : isRounds
                            ? `${set.targetRounds ?? 1} rds × ${set.targetReps || "-"}`
                            : isTimeHold
                            ? `${set.targetTimeSeconds ?? 30}s hold${
                                set.targetWeight ? ` @ ${set.targetWeight}kg` : ""
                              }`
                            : `${set.targetWeight ?? 0}kg × ${set.targetReps || "-"}`}
                        </span>

                        {/* Actual input primary */}
                        <div className="col-span-3 px-1">
                          {isDistance ? (
                            <input
                              type="number"
                              step="0.1"
                              disabled={isCompletedSession || set.isSkipped}
                              value={set.actualDistanceKm}
                              onChange={(e) =>
                                handleUpdateActual(
                                  currentStep!.bIdx,
                                  currentStep!.exIdx,
                                  setIdx,
                                  "actualDistanceKm",
                                  Number(e.target.value)
                                )
                              }
                              className="w-full text-center py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                            />
                          ) : isRounds ? (
                            <input
                              type="number"
                              disabled={isCompletedSession || set.isSkipped}
                              value={set.actualRounds}
                              onChange={(e) =>
                                handleUpdateActual(
                                  currentStep!.bIdx,
                                  currentStep!.exIdx,
                                  setIdx,
                                  "actualRounds",
                                  Number(e.target.value)
                                )
                              }
                              className="w-full text-center py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                            />
                          ) : isTimeHold ? (
                            <input
                              type="number"
                              disabled={isCompletedSession || set.isSkipped}
                              value={set.actualTimeSeconds}
                              onChange={(e) =>
                                handleUpdateActual(
                                  currentStep!.bIdx,
                                  currentStep!.exIdx,
                                  setIdx,
                                  "actualTimeSeconds",
                                  Number(e.target.value)
                                )
                              }
                              className="w-full text-center py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                            />
                          ) : (
                            <input
                              type="number"
                              step="0.5"
                              disabled={isCompletedSession || set.isSkipped}
                              value={set.actualWeight}
                              onChange={(e) =>
                                handleUpdateActual(
                                  currentStep!.bIdx,
                                  currentStep!.exIdx,
                                  setIdx,
                                  "actualWeight",
                                  Number(e.target.value)
                                )
                              }
                              className="w-full text-center py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                            />
                          )}
                        </div>

                        {/* Actual input secondary (reps / secondary metric) */}
                        <div className="col-span-2 px-1">
                          {isDistance ? (
                            <input
                              type="number"
                              disabled={isCompletedSession || set.isSkipped}
                              value={set.actualTimeSeconds}
                              onChange={(e) =>
                                handleUpdateActual(
                                  currentStep!.bIdx,
                                  currentStep!.exIdx,
                                  setIdx,
                                  "actualTimeSeconds",
                                  Number(e.target.value)
                                )
                              }
                              className="w-full text-center py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                            />
                          ) : isTimeHold ? (
                            <input
                              type="number"
                              disabled={isCompletedSession || set.isSkipped}
                              value={set.actualWeight}
                              onChange={(e) =>
                                handleUpdateActual(
                                  currentStep!.bIdx,
                                  currentStep!.exIdx,
                                  setIdx,
                                  "actualWeight",
                                  Number(e.target.value)
                                )
                              }
                              className="w-full text-center py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                            />
                          ) : (
                            <input
                              type="number"
                              disabled={isCompletedSession || set.isSkipped}
                              value={set.actualReps}
                              onChange={(e) =>
                                handleUpdateActual(
                                  currentStep!.bIdx,
                                  currentStep!.exIdx,
                                  setIdx,
                                  "actualReps",
                                  Number(e.target.value)
                                )
                              }
                              className="w-full text-center py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                            />
                          )}
                        </div>

                        {/* Set Actions: Complete or Skip */}
                        <div className="col-span-2 flex items-center justify-center space-x-1.5 rtl:space-x-reverse">
                          <button
                            type="button"
                            disabled={isCompletedSession}
                            onClick={() => handleToggleSet(currentStep!.bIdx, currentStep!.exIdx, setIdx)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                              set.isCompleted
                                ? "bg-brand-crimson text-white shadow-md shadow-[0_0_15px_rgba(240,20,37,0.35)]"
                                : "bg-slate-800 text-slate-500 hover:text-slate-200 border border-slate-700"
                            } disabled:opacity-40`}
                            title={set.isCompleted ? (isRtl ? "مكتملة" : "Completed") : isRtl ? "إكمال" : "Mark Done"}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          {set.isSkipped ? (
                            <button
                              type="button"
                              disabled={isCompletedSession}
                              onClick={() => handleUnskipItem(currentStep!.bIdx, currentStep!.exIdx, setIdx)}
                              className="px-1.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold hover:bg-amber-500/30 disabled:opacity-40"
                              title={`Reason: ${set.skipReason}. Click to unskip.`}
                            >
                              {isRtl ? "إلغاء التخطي" : "Unskip"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isCompletedSession}
                              onClick={() => handleOpenItemSkip(currentStep!.bIdx, currentStep!.exIdx, setIdx)}
                              className="w-7 h-7 rounded-xl flex items-center justify-center bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700 text-[10px] font-bold disabled:opacity-40"
                              title={isRtl ? "تخطي هذه المجموعة" : "Skip this set"}
                            >
                              <FastForward className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SAVE ERROR BANNER & RETRY (MANDATORY REQUIREMENT 4) */}
              {stepSaveError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="truncate">{stepSaveError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isSavingStep}
                    className="px-3 py-1.5 rounded-lg bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shrink-0 flex items-center space-x-1 rtl:space-x-reverse shadow-md"
                  >
                    {isSavingStep ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>{isRtl ? "إعادة المحاولة" : "Retry"}</span>
                  </button>
                </div>
              )}

              {/* SAVE SUCCESS NOTICE */}
              {stepSaveSuccess && (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 rtl:space-x-reverse">
                  <CheckCircle2 className="w-4 h-4 text-rose-400" />
                  <span>{isRtl ? "تم حفظ تقدم التمرين ذرياً بنجاح." : "Progress saved atomically."}</span>
                </div>
              )}
            </div>
          )}

          {/* SUMMARY & COMPLETION STEP VIEW */}
          {!loading && !fetchError && !isCompletedSuccess && isSummaryStep && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-10 h-10 rounded-xl bg-brand-crimson/20 border border-brand-crimson/40 flex items-center justify-center text-brand-crimson">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isRtl ? "مراجعة واعتماد التمرين" : "Session Review & Completion"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isRtl
                        ? "أنهيت كافة التمارين! حدد تقييم الجهد وسجل أي ملاحظات للمدرب قبل الإنهاء."
                        : "All exercises completed! Rate your effort and record feedback."}
                    </p>
                  </div>
                </div>

                {/* Overall Session Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block">{isRtl ? "الوقت الإجمالي" : "Total Time"}</span>
                    <span className="text-sm font-bold text-white font-mono">{formatTimer(workoutSeconds)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block">{isRtl ? "المجموعات المنجزة" : "Sets Done"}</span>
                    <span className="text-sm font-bold text-rose-400">
                      {completedSetsCount} / {totalSetsCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[11px] text-slate-400 block">{isRtl ? "المجموعات المتخطاة" : "Skipped Sets"}</span>
                    <span className="text-sm font-bold text-amber-400">{skippedSetsCount}</span>
                  </div>
                </div>

                {/* RPE Selector (1 to 10) */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      {isRtl ? "مقياس الجهد البدني (RPE 1-10):" : "Rate of Perceived Exertion (RPE 1-10):"}
                    </label>
                    <span className="text-xs font-bold text-brand-crimson">
                      {overallRpe} / 10 • {getRpeDescription(overallRpe)}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={isCompletedSession}
                        onClick={() => setOverallRpe(val)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          overallRpe === val
                            ? "bg-brand-crimson text-white border-brand-crimson shadow-md shadow-[0_0_12px_rgba(240,20,37,0.35)]"
                            : "bg-slate-950/80 text-slate-400 hover:text-white border-slate-800"
                        } disabled:opacity-40`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Athlete Feedback */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-300">
                    {isRtl ? "ملاحظات اللاعب (اختياري):" : "Athlete Feedback / Notes (Optional):"}
                  </label>
                  <textarea
                    rows={3}
                    disabled={isCompletedSession}
                    value={clientFeedback}
                    onChange={(e) => setClientFeedback(e.target.value)}
                    placeholder={
                      isRtl
                        ? "كيف كان شعورك أثناء التمرين؟ أي ألم أو صعوبة؟"
                        : "How did the workout feel? Any fatigue, stiffness, or highlights?"
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                  />
                </div>

                {/* Coach Feedback if exists */}
                {coachFeedback && (
                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 space-y-1">
                    <span className="font-bold flex items-center space-x-1.5 rtl:space-x-reverse text-blue-300">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isRtl ? "ملاحظات المدرب المسبقة:" : "Coach Notes:"}</span>
                    </span>
                    <p>{coachFeedback}</p>
                  </div>
                )}

                {/* FINISH ERROR BANNER */}
                {finishError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="truncate">{finishError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleFinishWorkout}
                      disabled={isFinishing}
                      className="px-3 py-1.5 rounded-lg bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shrink-0 flex items-center space-x-1 rtl:space-x-reverse"
                    >
                      {isFinishing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>{isRtl ? "إعادة المحاولة" : "Retry"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM STICKY ACTION BAR */}
        {!loading && !fetchError && !isCompletedSuccess && (
          <div className="shrink-0 bg-slate-900 border-t border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              {/* Skip workout option */}
              {!isCompletedSession && (
                <button
                  type="button"
                  onClick={() => setIsSkipWorkoutOpen(true)}
                  className="text-xs text-slate-400 hover:text-amber-400 transition-colors underline"
                >
                  {isRtl ? "تخطي الجلسة" : "Skip Workout"}
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              {/* Back / Previous Button */}
              {activeStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isSavingStep || isFinishing}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition-colors border border-slate-700"
                >
                  {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  <span>{isRtl ? "التمرين السابق" : "Previous Exercise"}</span>
                </button>
              )}

              {/* Next / Review / Finish Button */}
              {!isSummaryStep ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isSavingStep}
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition-all shadow-md shadow-[0_0_15px_rgba(240,20,37,0.35)] disabled:opacity-50"
                >
                  {isSavingStep && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {activeStepIndex === steps.length - 1
                      ? isRtl
                        ? "مراجعة وإنهاء الجلسة"
                        : "Review & Finish"
                      : isRtl
                      ? `التمرين التالي (${activeStepIndex + 2}/${steps.length})`
                      : `Next: Exercise ${activeStepIndex + 2}`}
                  </span>
                  {!isSavingStep && (
                    isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isFinishing || isCompletedSession}
                  onClick={handleFinishWorkout}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse transition-all shadow-md shadow-rose-500/20 disabled:opacity-50"
                >
                  {isFinishing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isRtl ? "اعتماد وإنهاء التمرين نهائياً" : "Complete & Lock Workout"}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ITEM SKIP REASON MODAL */}
        {itemSkipTarget && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-4 space-y-3 shadow-2xl">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <FastForward className="w-4 h-4 text-amber-400" />
                <span>{isRtl ? "تخطي هذه المجموعة" : "Skip Set / Round"}</span>
              </h4>
              <p className="text-xs text-slate-400">
                {isRtl ? "يرجى تحديد سبب تخطي هذه المجموعة:" : "Select or enter a reason for skipping:"}
              </p>

              <div className="space-y-1.5">
                {["Fatigued / Pain", "Equipment Busy", "Coach instructed skip", "Time constraint"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setItemSkipReason(r)}
                    className={`w-full text-start px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      itemSkipReason === r
                        ? "bg-amber-500/20 border-amber-500 text-amber-300"
                        : "bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <input
                  type="text"
                  value={itemSkipReason}
                  onChange={(e) => setItemSkipReason(e.target.value)}
                  placeholder={isRtl ? "سبب آخر..." : "Custom reason..."}
                  className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setItemSkipTarget(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmItemSkip}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {isRtl ? "تأكيد التخطي" : "Confirm Skip"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WORKOUT SKIP MODAL */}
        {isSkipWorkoutOpen && (
          <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-4 space-y-3 shadow-2xl">
              <h4 className="text-sm font-bold text-amber-400 flex items-center space-x-2 rtl:space-x-reverse">
                <AlertTriangle className="w-4 h-4" />
                <span>{isRtl ? "تخطي الجلسة بالكامل" : "Skip Entire Workout"}</span>
              </h4>
              <p className="text-xs text-slate-400">
                {isRtl
                  ? "سيتم تسجيل الجلسة كـ 'تم التخطي' ولن تتمكن من تعديلها لاحقاً."
                  : "The assignment will be marked as SKIPPED and cannot be modified."}
              </p>

              <textarea
                rows={2}
                value={skipWorkoutReason}
                onChange={(e) => setSkipWorkoutReason(e.target.value)}
                placeholder={isRtl ? "سبب تخطي الجلسة..." : "Reason for skipping workout..."}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />

              {skipWorkoutError && (
                <p className="text-xs text-red-400">{skipWorkoutError}</p>
              )}

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsSkipWorkoutOpen(false)}
                  disabled={isSkippingWorkout}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  {isRtl ? "رجوع" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleSkipWorkout}
                  disabled={isSkippingWorkout}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {isSkippingWorkout ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : isRtl ? (
                    "تأكيد تخطي الجلسة"
                  ) : (
                    "Confirm Workout Skip"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EXIT CONFIRMATION MODAL */}
        {showExitConfirm && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-4 space-y-3 shadow-2xl text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">
                {isRtl ? "هل أنت متأكد من الخروج؟" : "Leave Workout Runner?"}
              </h4>
              <p className="text-xs text-slate-400">
                {isRtl
                  ? "التمرين ما زال قيد التشغيل. التغييرات المحفوظة بالتنقل بين التمارين محفوظة بأمان، لكن يفضل التأكد قبل الإغلاق."
                  : "Session is in progress. Saved step progress is safely stored on the server."}
              </p>

              <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                >
                  {isRtl ? "البقاء في التمرين" : "Stay in Workout"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-xs font-bold text-white"
                >
                  {isRtl ? "إغلاق المشغل" : "Exit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

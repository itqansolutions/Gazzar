"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  ClientProfile,
  ClientWorkoutAssignment,
  CoachProfile,
  EffectiveAssignmentStatus,
  Exercise,
  MetricType,
  TrainingProgram,
  WorkoutTemplate
} from "@/types";
import { getCairoDateKey, toCalendarDateKey } from "@/lib/date-utils";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Dumbbell,
  Eye,
  Filter,
  Layers,
  MessageSquare,
  Play,
  Plus,
  Search,
  SkipForward,
  Trash2,
  UserCheck,
  X
} from "lucide-react";

type AssignMode = "INDIVIDUAL" | "TEMPLATE" | "PROGRAM";

interface IndividualExerciseDraft {
  uid: string;
  exerciseId: string;
  exerciseNameEn: string;
  metricType: MetricType;
  targetSets: string;
  targetReps: string;
  targetWeightKg: string;
  targetDistanceKm: string;
  targetTimeSeconds: string;
  targetPace: string;
  targetRounds: string;
  restSeconds: string;
  tempo: string;
  notes: string;
}

function getEffectiveStatus(a: ClientWorkoutAssignment): EffectiveAssignmentStatus {
  if (a.effectiveStatus) return a.effectiveStatus;
  if (a.status === "COMPLETED") return "COMPLETED";
  if (a.status === "SKIPPED") return "SKIPPED";
  if (a.status === "MISSED") return "MISSED";
  if (a.workoutLog && a.workoutLog.isCompleted === false) return "IN_PROGRESS";
  return "SCHEDULED";
}

function formatStatusBadge(status: EffectiveAssignmentStatus) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
      };
    case "SKIPPED":
      return {
        label: "Skipped",
        cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30"
      };
    case "MISSED":
      return {
        label: "Missed",
        cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
      };
    default:
      return {
        label: "Scheduled",
        cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
      };
  }
}

function formatSourceBadge(source?: string) {
  if (source === "PROGRAM") {
    return { label: "Program", cls: "bg-brand-crimson/15 text-brand-crimson border-brand-crimson/30" };
  }
  if (source === "INDIVIDUAL") {
    return { label: "Individual", cls: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" };
  }
  return { label: "Template", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30" };
}

function formatTargetSummary(ex: any): string {
  const metric: MetricType = ex.metricType || ex.exercise?.metricType || "SETS_REPS_WEIGHT";
  if (metric === "DISTANCE_TIME_PACE" || metric === "LAPS_TIME") {
    const parts = [];
    if (ex.targetDistanceKm != null) parts.push(`${ex.targetDistanceKm} km`);
    if (ex.targetTimeSeconds != null) parts.push(`${ex.targetTimeSeconds}s`);
    if (ex.targetPace) parts.push(`Pace ${ex.targetPace}`);
    return parts.join(" · ") || "Distance / Time";
  }
  if (metric === "ROUNDS_REPS_TIME") {
    const parts = [];
    if (ex.targetRounds != null) parts.push(`${ex.targetRounds} rounds`);
    if (ex.targetReps) parts.push(`${ex.targetReps} reps`);
    if (ex.targetTimeSeconds != null) parts.push(`${ex.targetTimeSeconds}s`);
    return parts.join(" · ") || "Rounds / Reps";
  }
  if (metric === "TIME_HOLD") {
    const parts = [];
    if (ex.targetSets != null) parts.push(`${ex.targetSets} sets`);
    if (ex.targetTimeSeconds != null) parts.push(`${ex.targetTimeSeconds}s hold`);
    if (ex.targetWeightKg != null) parts.push(`${ex.targetWeightKg} kg`);
    return parts.join(" · ") || "Timed Hold";
  }
  const parts = [];
  if (ex.targetSets != null) parts.push(`${ex.targetSets} sets`);
  if (ex.targetReps) parts.push(`${ex.targetReps} reps`);
  if (ex.targetWeightKg != null) parts.push(`${ex.targetWeightKg} kg`);
  return parts.join(" × ") || "Strength";
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const isClient = user?.role === "CLIENT";

  const [assignments, setAssignments] = useState<ClientWorkoutAssignment[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterClientId, setFilterClientId] = useState("ALL");
  const [filterCoachId, setFilterCoachId] = useState("ALL");
  const [filterSource, setFilterSource] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState<EffectiveAssignmentStatus | "ALL">("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Assign Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<AssignMode>("TEMPLATE");
  const [formClientId, setFormClientId] = useState("");
  const [formCoachId, setFormCoachId] = useState("");
  const [formDate, setFormDate] = useState(getCairoDateKey());
  const [formTitle, setFormTitle] = useState("");
  const [formCoachNotes, setFormCoachNotes] = useState("");

  // Mode A: Individual
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [draftExercises, setDraftExercises] = useState<IndividualExerciseDraft[]>([]);

  // Mode B: Template
  const [formTemplateId, setFormTemplateId] = useState("");

  // Mode C: Program
  const [formProgramId, setFormProgramId] = useState("");
  const [programPreview, setProgramPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [skipProgramConflicts, setSkipProgramConflicts] = useState(false);

  // Conflict & Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [conflictList, setConflictList] = useState<any[] | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // Inspection Modal (Planned vs Actual)
  const [inspecting, setInspecting] = useState<ClientWorkoutAssignment | null>(null);
  const [coachFeedbackDraft, setCoachFeedbackDraft] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  const todayKey = useMemo(() => getCairoDateKey(), []);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const workoutsUrl = isClient && user?.id ? `/api/workouts?clientId=${user.id}` : "/api/workouts";
      const requests: Promise<any>[] = [fetch(workoutsUrl).then((r) => r.json())];

      if (!isClient) {
        requests.push(
          fetch("/api/clients").then((r) => r.json()),
          fetch("/api/coaches").then((r) => r.json()),
          fetch("/api/exercises?activeOnly=true").then((r) => r.json()),
          fetch("/api/programs").then((r) => r.json())
        );
      }

      const [workoutsRes, clientsRes, coachesRes, exercisesRes, programsRes] = await Promise.all(requests);

      if (workoutsRes?.success && workoutsRes.data) {
        setAssignments(workoutsRes.data.assignments || []);
        const tplList = workoutsRes.data.templates || [];
        setTemplates(tplList);
        if (tplList.length > 0 && !formTemplateId) {
          setFormTemplateId(tplList[0].id);
        }
      }

      if (!isClient) {
        if (clientsRes?.success && Array.isArray(clientsRes.data)) {
          setClients(clientsRes.data);
          if (clientsRes.data.length > 0 && !formClientId) {
            setFormClientId(clientsRes.data[0].id);
          }
        }
        if (coachesRes?.success && Array.isArray(coachesRes.data)) {
          setCoaches(coachesRes.data);
          if (coachesRes.data.length > 0 && !formCoachId) {
            setFormCoachId(coachesRes.data[0].id);
          }
        }
        if (exercisesRes?.success && Array.isArray(exercisesRes.data)) {
          setExercises(exercisesRes.data);
        }
        if (programsRes?.success && Array.isArray(programsRes.data)) {
          const nonArchived = programsRes.data.filter((p: TrainingProgram) => p.status !== "ARCHIVED");
          setPrograms(nonArchived);
          if (nonArchived.length > 0 && !formProgramId) {
            setFormProgramId(nonArchived[0].id);
          }
        }
      }
    } catch (err) {
      console.error("[AssignmentsPage] Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const eff = getEffectiveStatus(a);
      if (filterStatus !== "ALL" && eff !== filterStatus) return false;
      if (filterSource !== "ALL" && (a.sourceType || "TEMPLATE") !== filterSource) return false;
      if (filterClientId !== "ALL" && a.clientId !== filterClientId) return false;
      if (filterCoachId !== "ALL" && a.coachId !== filterCoachId) return false;

      const dateKey = toCalendarDateKey(a.scheduledDate);
      if (filterDateFrom && dateKey < filterDateFrom) return false;
      if (filterDateTo && dateKey > filterDateTo) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          a.title,
          a.template?.titleEn,
          a.program?.titleEn,
          a.programDayTitle,
          a.client?.user?.name,
          a.coach?.user?.name,
          a.coachNotes,
          ...(a.exercises || []).map((e) => e.exerciseNameEn || e.exercise?.nameEn || "")
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    assignments,
    filterStatus,
    filterSource,
    filterClientId,
    filterCoachId,
    filterDateFrom,
    filterDateTo,
    searchQuery
  ]);

  const statusCounts = useMemo(() => {
    const counts = { ALL: assignments.length, SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, SKIPPED: 0 };
    for (const a of assignments) {
      const eff = getEffectiveStatus(a);
      if (eff in counts) (counts as any)[eff] += 1;
    }
    return counts;
  }, [assignments]);

  const todaysAthleteWorkouts = useMemo(() => {
    if (!isClient) return [];
    return assignments.filter((a) => {
      const eff = getEffectiveStatus(a);
      return toCalendarDateKey(a.scheduledDate) === todayKey && (eff === "SCHEDULED" || eff === "IN_PROGRESS");
    });
  }, [assignments, isClient, todayKey]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === formTemplateId) || null,
    [templates, formTemplateId]
  );

  const filteredExerciseLibrary = useMemo(() => {
    if (!exerciseSearch.trim()) return exercises.slice(0, 20);
    const q = exerciseSearch.trim().toLowerCase();
    return exercises
      .filter(
        (e) =>
          e.nameEn.toLowerCase().includes(q) ||
          (e.primaryMuscle?.nameEn || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [exercises, exerciseSearch]);

  const addDraftExercise = (ex: Exercise) => {
    setDraftExercises((prev) => [
      ...prev,
      {
        uid: `${ex.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        exerciseId: ex.id,
        exerciseNameEn: ex.nameEn,
        metricType: ex.metricType,
        targetSets: ex.metricType === "SETS_REPS_WEIGHT" || ex.metricType === "TIME_HOLD" ? "3" : "",
        targetReps: ex.metricType === "SETS_REPS_WEIGHT" ? "10-12" : "",
        targetWeightKg: "",
        targetDistanceKm: "",
        targetTimeSeconds: ex.metricType === "TIME_HOLD" ? "30" : "",
        targetPace: "",
        targetRounds: ex.metricType === "ROUNDS_REPS_TIME" ? "3" : "",
        restSeconds: "60",
        tempo: "",
        notes: ""
      }
    ]);
  };

  const moveDraftExercise = (idx: number, dir: -1 | 1) => {
    setDraftExercises((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const resetAssignModal = () => {
    setFormError("");
    setConflictList(null);
    setProgramPreview(null);
    setSkipProgramConflicts(false);
    setFormTitle("");
    setFormCoachNotes("");
    setDraftExercises([]);
    setFormDate(getCairoDateKey());
    setIsAssignOpen(true);
  };

  const handleSubmitWorkoutAssignment = async (allowConflict = false) => {
    setFormError("");
    setConflictList(null);

    if (!formClientId) {
      setFormError("Please select an athlete.");
      return;
    }

    if (assignMode === "TEMPLATE" && !formTemplateId) {
      setFormError("Please select a workout template.");
      return;
    }

    if (assignMode === "INDIVIDUAL" && draftExercises.length === 0) {
      setFormError("Please add at least one exercise to the individual workout.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        clientId: formClientId,
        coachId: formCoachId || undefined,
        scheduledDate: formDate,
        coachNotes: formCoachNotes || undefined,
        allowConflict
      };

      if (assignMode === "TEMPLATE") {
        payload.templateId = formTemplateId;
        if (formTitle.trim()) payload.title = formTitle.trim();
      } else {
        payload.title = formTitle.trim() || "Individual Workout";
        payload.exercises = draftExercises.map((d, idx) => ({
          exerciseId: d.exerciseId,
          orderIndex: idx + 1,
          targetSets: d.targetSets ? Number(d.targetSets) : null,
          targetReps: d.targetReps || null,
          targetWeightKg: d.targetWeightKg ? Number(d.targetWeightKg) : null,
          targetDistanceKm: d.targetDistanceKm ? Number(d.targetDistanceKm) : null,
          targetTimeSeconds: d.targetTimeSeconds ? Number(d.targetTimeSeconds) : null,
          targetPace: d.targetPace || null,
          targetRounds: d.targetRounds ? Number(d.targetRounds) : null,
          restSeconds: d.restSeconds ? Number(d.restSeconds) : null,
          tempo: d.tempo || null,
          notes: d.notes || null
        }));
      }

      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFormError(json.error || "Failed to assign workout");
        if (res.status === 409 && Array.isArray(json.conflicts)) {
          setConflictList(json.conflicts);
        }
        return;
      }

      setIsAssignOpen(false);
      await loadData();
      showToast("Workout assigned successfully.");
    } catch (err: any) {
      setFormError(err?.message || "Unexpected error assigning workout");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewProgram = async () => {
    if (!formProgramId || !formClientId) {
      setFormError("Please select both an athlete and a training program.");
      return;
    }
    setFormError("");
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PREVIEW_APPLY",
          programId: formProgramId,
          clientId: formClientId,
          startDate: formDate
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Failed to preview program schedule");
        return;
      }
      setProgramPreview(json.data);
    } catch (err: any) {
      setFormError(err?.message || "Error previewing program");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyProgram = async () => {
    if (!formProgramId || !formClientId) return;
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPLY",
          programId: formProgramId,
          clientId: formClientId,
          coachId: formCoachId || undefined,
          startDate: formDate,
          notes: formCoachNotes || undefined,
          conflictStrategy: skipProgramConflicts ? "SKIP_CONFLICTS" : "BLOCK"
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Failed to apply training program");
        return;
      }
      setIsAssignOpen(false);
      const createdCount = Array.isArray(json.data) ? json.data.length : (json.data?.workoutAssignments?.length || 0);
      showToast(`Program assigned (${createdCount} workout sessions created).`);
    } catch (err: any) {
      setFormError(err?.message || "Error applying program");
    } finally {
      setSubmitting(false);
    }
  };

  const openInspection = async (a: ClientWorkoutAssignment) => {
    setInspecting(a);
    setCoachFeedbackDraft(a.workoutLog?.coachFeedback || "");
    try {
      const res = await fetch(`/api/workouts/${a.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setInspecting(json.data);
        setCoachFeedbackDraft(json.data.workoutLog?.coachFeedback || "");
      }
    } catch {
      // Keep summary view if detail fetch fails
    }
  };

  const handleSaveCoachFeedback = async () => {
    if (!inspecting) return;
    setSavingFeedback(true);
    try {
      const res = await fetch(`/api/workouts/${inspecting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "COACH_FEEDBACK",
          coachFeedback: coachFeedbackDraft
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setInspecting(json.data);
        await loadData();
        showToast("Coach feedback saved.");
      }
    } finally {
      setSavingFeedback(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-brand-crimson" />
            <span>{isClient ? "My Workouts & Sessions" : "Workout Assignments"}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {filteredAssignments.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isClient
              ? "View your scheduled sessions, log sets and metrics, or review completed workouts."
              : "Assign individual workouts, templates, or full training programs and monitor athlete execution."}
          </p>
        </div>

        {!isClient && (
          <button
            onClick={resetAssignModal}
            className="px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-brand-crimson/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Workout</span>
          </button>
        )}
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Athlete Today's Workout Spotlight */}
      {isClient && todaysAthleteWorkouts.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-brand-crimson/20 border border-brand-crimson/40 text-white shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-crimson text-white">
              Today&apos;s Workout · {todayKey}
            </span>
            <Dumbbell className="w-5 h-5 text-brand-crimson" />
          </div>
          <div className="space-y-2.5">
            {todaysAthleteWorkouts.map((tw) => {
              const eff = getEffectiveStatus(tw);
              return (
                <div
                  key={tw.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800"
                >
                  <div>
                    <h3 className="text-sm font-black text-white">
                      {tw.title || tw.template?.titleEn || "Training Session"}
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {(tw.exercises?.length || tw.template?.exercises?.length || 0)} exercises
                      {tw.programWeekNumber && tw.programDayNumber
                        ? ` · Week ${tw.programWeekNumber} Day ${tw.programDayNumber}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/workout/${tw.id}/execute`}
                    className="px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand-crimson/35"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{eff === "IN_PROGRESS" ? "Resume Workout" : "Start Today's Workout"}</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "ALL", label: "All", count: statusCounts.ALL },
            { key: "SCHEDULED", label: "Scheduled", count: statusCounts.SCHEDULED },
            { key: "IN_PROGRESS", label: "In Progress", count: statusCounts.IN_PROGRESS },
            { key: "COMPLETED", label: "Completed", count: statusCounts.COMPLETED },
            { key: "SKIPPED", label: "Skipped", count: statusCounts.SKIPPED }
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              filterStatus === tab.key
                ? "bg-brand-crimson text-white border-brand-crimson shadow-md shadow-brand-crimson/25"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400"
            }`}
          >
            <span>{tab.label}</span>
            <span className="opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Central Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <Filter className="w-3.5 h-3.5 text-brand-crimson" />
          <span>Filters & Search</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workout, athlete, exercise, program..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
            />
          </div>

          {!isClient && (
            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
            >
              <option value="ALL">All Athletes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.user?.name || c.id}
                </option>
              ))}
            </select>
          )}

          {!isClient && (
            <select
              value={filterCoachId}
              onChange={(e) => setFilterCoachId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
            >
              <option value="ALL">All Coaches</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.user?.name || c.id}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
          >
            <option value="ALL">All Sources</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="TEMPLATE">Template</option>
            <option value="PROGRAM">Program</option>
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              aria-label="Date From"
              className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              aria-label="Date To"
              className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
            />
          </div>
        </div>
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          Loading assignments...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <Dumbbell className="w-8 h-8 text-slate-400 mx-auto opacity-40" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No assignments match your filters</p>
          <p className="text-xs text-slate-500">Adjust filters or create a new workout assignment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((a) => {
            const eff = getEffectiveStatus(a);
            const statusBadge = formatStatusBadge(eff);
            const sourceBadge = formatSourceBadge(a.sourceType);
            const dateStr = toCalendarDateKey(a.scheduledDate);
            const exCount = a.exercises?.length || a.template?.exercises?.length || 0;

            return (
              <div
                key={a.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${sourceBadge.cls}`}>
                      {sourceBadge.label}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.cls}`}>
                      {statusBadge.label}
                    </span>
                    {a.programWeekNumber && a.programDayNumber && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {a.program?.titleEn ? `${a.program.titleEn} · ` : ""}
                        Week {a.programWeekNumber} · Day {a.programDayNumber}
                        {a.programDayTitle ? ` (${a.programDayTitle})` : ""}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {a.title || a.template?.titleEn || a.template?.titleAr || "Custom Workout"}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-brand-crimson" />
                      <strong className="text-slate-700 dark:text-slate-200">{dateStr}</strong>
                    </span>
                    {!isClient && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        Athlete: <strong className="text-slate-700 dark:text-slate-200">{a.client?.user?.name || "Athlete"}</strong>
                      </span>
                    )}
                    <span>
                      Coach: <strong className="text-slate-700 dark:text-slate-200">{a.coach?.user?.name || "Coach"}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {exCount} exercise{exCount === 1 ? "" : "s"}
                    </span>
                    {a.workoutLog?.durationMinutes && eff === "COMPLETED" && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {a.workoutLog.durationMinutes} min · RPE {a.workoutLog.overallRpe ?? "-"}
                      </span>
                    )}
                  </div>

                  {eff === "SKIPPED" && a.workoutLog?.clientFeedback && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                      <SkipForward className="w-3.5 h-3.5 shrink-0" />
                      <span>Skip reason: {a.workoutLog.clientFeedback}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => openInspection(a)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{eff === "COMPLETED" ? "Planned vs Actual" : "View Plan"}</span>
                  </button>

                  <Link
                    href={`/workout/${a.id}/execute`}
                    className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-crimson/25"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {eff === "COMPLETED"
                        ? "View Summary"
                        : eff === "IN_PROGRESS"
                        ? "Resume Workout"
                        : eff === "SKIPPED"
                        ? "View Details"
                        : "Execute Workout"}
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3-MODE ASSIGNMENT MODAL (Coach / Admin)                               */}
      {/* ===================================================================== */}
      {isAssignOpen && !isClient && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Assign Training</h2>
                <p className="text-xs text-slate-500">Choose Individual Exercises, a Workout Template, or a Full Program.</p>
              </div>
              <button
                onClick={() => setIsAssignOpen(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="px-5 pt-4 grid grid-cols-3 gap-2">
              {(
                [
                  { id: "INDIVIDUAL", label: "Mode A · Individual", icon: Dumbbell },
                  { id: "TEMPLATE", label: "Mode B · Template", icon: Layers },
                  { id: "PROGRAM", label: "Mode C · Program", icon: BookOpen }
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setAssignMode(m.id);
                      setFormError("");
                      setConflictList(null);
                      setProgramPreview(null);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      assignMode === m.id
                        ? "bg-brand-crimson text-white border-brand-crimson shadow-md shadow-brand-crimson/25"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Shared Athlete, Coach, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Athlete *</label>
                  <select
                    value={formClientId}
                    onChange={(e) => {
                      setFormClientId(e.target.value);
                      setProgramPreview(null);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name || c.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    {assignMode === "PROGRAM" ? "Start Date (Egypt) *" : "Workout Date (Egypt) *"}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => {
                      setFormDate(e.target.value);
                      setProgramPreview(null);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Coach</label>
                  <select
                    value={formCoachId}
                    onChange={(e) => setFormCoachId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name || c.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mode A: Individual Exercises */}
              {assignMode === "INDIVIDUAL" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Session Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g., Upper Body Hypertrophy Focus"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Add Exercises</span>
                      <input
                        type="text"
                        value={exerciseSearch}
                        onChange={(e) => setExerciseSearch(e.target.value)}
                        placeholder="Search exercise library..."
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white w-56"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {filteredExerciseLibrary.map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => addDraftExercise(ex)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-crimson text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-brand-crimson" />
                          <span>{ex.nameEn}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {draftExercises.length > 0 && (
                    <div className="space-y-2">
                      {draftExercises.map((d, idx) => (
                        <div
                          key={d.uid}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {idx + 1}. {d.exerciseNameEn}
                              <span className="ml-2 text-[10px] font-medium text-slate-500">({d.metricType})</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveDraftExercise(idx, -1)}
                                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveDraftExercise(idx, 1)}
                                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDraftExercises((prev) => prev.filter((x) => x.uid !== d.uid))}
                                className="p-1 text-red-500 hover:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(d.metricType === "SETS_REPS_WEIGHT" || d.metricType === "TIME_HOLD") && (
                              <div>
                                <label className="text-[10px] text-slate-500">Sets</label>
                                <input
                                  type="number"
                                  value={d.targetSets}
                                  onChange={(e) =>
                                    setDraftExercises((prev) =>
                                      prev.map((x) => (x.uid === d.uid ? { ...x, targetSets: e.target.value } : x))
                                    )
                                  }
                                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                                />
                              </div>
                            )}
                            {(d.metricType === "SETS_REPS_WEIGHT" || d.metricType === "ROUNDS_REPS_TIME") && (
                              <div>
                                <label className="text-[10px] text-slate-500">Reps</label>
                                <input
                                  type="text"
                                  value={d.targetReps}
                                  onChange={(e) =>
                                    setDraftExercises((prev) =>
                                      prev.map((x) => (x.uid === d.uid ? { ...x, targetReps: e.target.value } : x))
                                    )
                                  }
                                  placeholder="8-12"
                                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                                />
                              </div>
                            )}
                            {(d.metricType === "SETS_REPS_WEIGHT" || d.metricType === "TIME_HOLD") && (
                              <div>
                                <label className="text-[10px] text-slate-500">Weight (kg)</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={d.targetWeightKg}
                                  onChange={(e) =>
                                    setDraftExercises((prev) =>
                                      prev.map((x) => (x.uid === d.uid ? { ...x, targetWeightKg: e.target.value } : x))
                                    )
                                  }
                                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                                />
                              </div>
                            )}
                            {(d.metricType === "DISTANCE_TIME_PACE" || d.metricType === "LAPS_TIME") && (
                              <div>
                                <label className="text-[10px] text-slate-500">Distance (km)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={d.targetDistanceKm}
                                  onChange={(e) =>
                                    setDraftExercises((prev) =>
                                      prev.map((x) => (x.uid === d.uid ? { ...x, targetDistanceKm: e.target.value } : x))
                                    )
                                  }
                                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                                />
                              </div>
                            )}
                            {d.metricType === "ROUNDS_REPS_TIME" && (
                              <div>
                                <label className="text-[10px] text-slate-500">Rounds</label>
                                <input
                                  type="number"
                                  value={d.targetRounds}
                                  onChange={(e) =>
                                    setDraftExercises((prev) =>
                                      prev.map((x) => (x.uid === d.uid ? { ...x, targetRounds: e.target.value } : x))
                                    )
                                  }
                                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                                />
                              </div>
                            )}
                            {d.metricType !== "SETS_REPS_WEIGHT" && (
                              <div>
                                <label className="text-[10px] text-slate-500">Time (sec)</label>
                                <input
                                  type="number"
                                  value={d.targetTimeSeconds}
                                  onChange={(e) =>
                                    setDraftExercises((prev) =>
                                      prev.map((x) =>
                                        x.uid === d.uid ? { ...x, targetTimeSeconds: e.target.value } : x
                                      )
                                    )
                                  }
                                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                                />
                              </div>
                            )}
                            {d.metricType === "DISTANCE_TIME_PACE" && (
                              <div>
                                <label className="text-[10px] text-slate-500">Pace</label>
                                <input
                                  type="text"
                                  value={d.targetPace}
                                  onChange={(e) =>
                                    setDraftExercises((prev) =>
                                      prev.map((x) => (x.uid === d.uid ? { ...x, targetPace: e.target.value } : x))
                                    )
                                  }
                                  placeholder="5:00/km"
                                  className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                                />
                              </div>
                            )}
                            <div>
                              <label className="text-[10px] text-slate-500">Rest (sec)</label>
                              <input
                                type="number"
                                value={d.restSeconds}
                                onChange={(e) =>
                                  setDraftExercises((prev) =>
                                    prev.map((x) => (x.uid === d.uid ? { ...x, restSeconds: e.target.value } : x))
                                  )
                                }
                                className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mode B: Workout Template */}
              {assignMode === "TEMPLATE" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Workout Template *</label>
                    <select
                      value={formTemplateId}
                      onChange={(e) => setFormTemplateId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                    >
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.titleEn || tpl.titleAr} ({tpl.exercises?.length || 0} exercises)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTemplate && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Template Snapshot Preview
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {selectedTemplate.exercises?.length || 0} exercises
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto">
                        {(selectedTemplate.exercises || []).map((ex, i) => (
                          <div
                            key={ex.id || i}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {i + 1}. {ex.exercise?.nameEn || "Exercise"}
                            </span>
                            <span className="text-[11px] text-slate-500">{formatTargetSummary(ex)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode C: Full Training Program */}
              {assignMode === "PROGRAM" && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Training Program *</label>
                      <select
                        value={formProgramId}
                        onChange={(e) => {
                          setFormProgramId(e.target.value);
                          setProgramPreview(null);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      >
                        {programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.titleEn || p.titleAr} ({p.durationWeeks} weeks)
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handlePreviewProgram}
                      disabled={previewLoading || !formProgramId}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                    >
                      {previewLoading ? "Previewing..." : "Preview Schedule"}
                    </button>
                  </div>

                  {programPreview && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-black text-slate-900 dark:text-white">
                          {programPreview.startDate} → {programPreview.endDate}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {programPreview.trainingSessionsCount ?? 0} workout(s) · {programPreview.restDaysCount ?? 0} rest day(s)
                        </span>
                      </div>

                      {programPreview.hasConflicts && (
                        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2">
                          <div className="font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>
                              Conflicts detected ({programPreview.dateConflicts?.length || 0} date conflict(s),{" "}
                              {programPreview.duplicateProgramAssignments?.length || 0} overlapping program(s))
                            </span>
                          </div>
                          <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={skipProgramConflicts}
                              onChange={(e) => setSkipProgramConflicts(e.target.checked)}
                            />
                            <span>Skip conflicting dates without overwriting existing workouts</span>
                          </label>
                        </div>
                      )}

                      <div className="max-h-44 overflow-y-auto space-y-1">
                        {[
                          ...(programPreview.plannedWorkouts || []).map((w: any) => ({
                            dateKey: w.dateKey,
                            weekNumber: w.weekNumber,
                            dayNumber: w.dayNumber,
                            dayTitle: w.dayTitle,
                            label: w.templateTitle || "Workout",
                            isRestDay: false
                          })),
                          ...(programPreview.restDays || []).map((r: any) => ({
                            dateKey: r.dateKey,
                            weekNumber: r.weekNumber,
                            dayNumber: r.dayNumber,
                            dayTitle: r.dayTitle,
                            label: "Rest Day",
                            isRestDay: true
                          }))
                        ]
                          .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
                          .map((d, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                            >
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {d.dateKey} · W{d.weekNumber}D{d.dayNumber} ({d.dayTitle})
                              </span>
                              <span className={d.isRestDay ? "text-slate-400" : "text-brand-crimson font-bold"}>
                                {d.label}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Coach Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Coach Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={formCoachNotes}
                  onChange={(e) => setFormCoachNotes(e.target.value)}
                  placeholder="Cues, warm-up reminders, RPE targets..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                  {conflictList && conflictList.length > 0 && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px]">
                        Existing: {conflictList.map((c) => c.title || "Workout").join(", ")}
                      </span>
                      {!formError.toLowerCase().includes("duplicate") && (
                        <button
                          type="button"
                          onClick={() => handleSubmitWorkoutAssignment(true)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold"
                        >
                          Assign Alongside Existing
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              {assignMode === "PROGRAM" ? (
                <button
                  type="button"
                  disabled={submitting || !programPreview}
                  onClick={handleApplyProgram}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? "Applying..." : "Confirm Program Assignment"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitWorkoutAssignment(false)}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? "Assigning..." : "Confirm Assignment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PLANNED VS ACTUAL INSPECTION MODAL                                    */}
      {/* ===================================================================== */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {inspecting.title || inspecting.template?.titleEn || "Workout Details"}
                </h2>
                <p className="text-xs text-slate-500">
                  {toCalendarDateKey(inspecting.scheduledDate)} · {inspecting.client?.user?.name || "Athlete"} · Status:{" "}
                  <strong>{getEffectiveStatus(inspecting)}</strong>
                </p>
              </div>
              <button
                onClick={() => setInspecting(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {inspecting.coachNotes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  <strong className="text-slate-700 dark:text-slate-200">Coach Notes:</strong>{" "}
                  <span className="text-slate-600 dark:text-slate-400">{inspecting.coachNotes}</span>
                </div>
              )}

              {inspecting.workoutLog?.clientFeedback && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <strong className="text-amber-700 dark:text-amber-300">
                    {getEffectiveStatus(inspecting) === "SKIPPED" ? "Skip Reason:" : "Athlete Feedback:"}
                  </strong>{" "}
                  <span className="text-slate-700 dark:text-slate-200">{inspecting.workoutLog.clientFeedback}</span>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Planned Targets vs Actual Logged Performance
                </h3>
                {(inspecting.exercises || []).map((planned, idx) => {
                  const actualEx = inspecting.workoutLog?.exercises?.find(
                    (el) => el.exerciseId === planned.exerciseId
                  );
                  return (
                    <div
                      key={planned.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {idx + 1}. {planned.exerciseNameEn || planned.exercise?.nameEn || "Exercise"}
                        </span>
                        <span className="text-[11px] font-bold text-brand-crimson">
                          Planned: {formatTargetSummary(planned)}
                        </span>
                      </div>

                      {actualEx && actualEx.sets?.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {actualEx.sets.map((s) => (
                            <div
                              key={s.id || s.setNumber}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between"
                            >
                              <span className="font-bold text-slate-500">Set {s.setNumber}</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {[
                                  s.actualWeightKg != null ? `${s.actualWeightKg} kg` : null,
                                  s.actualReps != null ? `${s.actualReps} reps` : null,
                                  s.actualDistanceKm != null ? `${s.actualDistanceKm} km` : null,
                                  s.actualTimeSeconds != null ? `${s.actualTimeSeconds}s` : null,
                                  s.actualPace ? `${s.actualPace}` : null,
                                  s.actualRounds != null ? `${s.actualRounds} rds` : null
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Logged"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">No actual sets logged yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isClient && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-brand-crimson" />
                    <span>Coach Review Feedback</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={coachFeedbackDraft}
                      onChange={(e) => setCoachFeedbackDraft(e.target.value)}
                      placeholder="Add post-workout feedback for the athlete..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                    />
                    <button
                      type="button"
                      disabled={savingFeedback}
                      onClick={handleSaveCoachFeedback}
                      className="px-4 py-2 rounded-xl bg-brand-crimson text-white text-xs font-bold disabled:opacity-50"
                    >
                      {savingFeedback ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

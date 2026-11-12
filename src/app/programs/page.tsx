"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  TrainingProgram,
  GoalType,
  Difficulty,
  WorkoutTemplate,
  NutritionProgram,
  ProgramLifecycleStatus
} from "@/types";
import {
  BookOpen,
  PlusCircle,
  Clock,
  Dumbbell,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  Send,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Coffee,
  AlertTriangle,
  Archive,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Apple,
  ShieldAlert,
  Search,
  Sparkles,
  Plus
} from "lucide-react";

type BuilderWorkout = {
  uid: string;
  templateId: string;
};

type BuilderDay = {
  uid: string;
  dayNumber: number;
  titleEn: string;
  isRestDay: boolean;
  workouts: BuilderWorkout[];
};

type BuilderWeek = {
  uid: string;
  weekNumber: number;
  focusEn: string;
  days: BuilderDay[];
};

type ApplyPreview = {
  programId: string;
  programTitle: string;
  startDate: string;
  endDate: string;
  restDaysCount: number;
  restDays: Array<{ weekNumber: number; dayNumber: number; dayTitle: string; dateKey: string }>;
  trainingSessionsCount: number;
  plannedWorkouts: Array<{
    weekNumber: number;
    dayNumber: number;
    dayTitle: string;
    templateId: string;
    templateTitle: string;
    orderIndex: number;
    date: string;
  }>;
  nutritionProgram?: NutritionProgram | null;
  duplicateProgramAssignments: Array<{ id: string; startDate: string; endDate?: string | null }>;
  dateConflicts: Array<{
    date: string;
    weekNumber: number;
    dayNumber: number;
    dayTitle: string;
    incomingTemplateTitle: string;
    existingAssignments: Array<{ id: string; title: string; status: string; sameProgram: boolean }>;
  }>;
  hasConflicts: boolean;
};

const makeUid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function buildDefaultWeek(weekNumber: number, templates: WorkoutTemplate[]): BuilderWeek {
  const defaultTemplateId = templates[0]?.id || "";
  const days: BuilderDay[] = [];
  for (let d = 1; d <= 7; d++) {
    const isRest = d === 3 || d === 7;
    days.push({
      uid: makeUid(`day-${weekNumber}-${d}`),
      dayNumber: d,
      titleEn: isRest ? "Rest & Recovery" : `Training Day ${d}`,
      isRestDay: isRest,
      workouts:
        isRest || !defaultTemplateId
          ? []
          : [{ uid: makeUid(`pw-${weekNumber}-${d}`), templateId: defaultTemplateId }]
    });
  }
  return {
    uid: makeUid(`wk-${weekNumber}`),
    weekNumber,
    focusEn: `Week ${weekNumber} Focus`,
    days
  };
}

function hydrateBuilderWeeks(prog: TrainingProgram): BuilderWeek[] {
  if (!prog.weeks || prog.weeks.length === 0) {
    return [buildDefaultWeek(1, [])];
  }
  return prog.weeks.map((w, wIdx) => ({
    uid: makeUid(`wk-edit-${w.id || wIdx}`),
    weekNumber: wIdx + 1,
    focusEn: w.focusEn || w.focusAr || `Week ${wIdx + 1} Focus`,
    days: (w.days || []).map((d, dIdx) => ({
      uid: makeUid(`day-edit-${d.id || dIdx}`),
      dayNumber: dIdx + 1,
      titleEn: d.titleEn || d.titleAr || `Day ${dIdx + 1}`,
      isRestDay: Boolean(d.isRestDay),
      workouts: d.isRestDay
        ? []
        : (d.workouts || []).map((pw, pIdx) => ({
            uid: makeUid(`pw-edit-${pw.id || pIdx}`),
            templateId: pw.templateId
          }))
    }))
  }));
}

export default function ProgramsPage() {
  const { user, loading: authLoading } = useAuth();

  const canManagePrograms =
    user?.role === "ADMIN" || user?.role === "HEAD_COACH" || user?.role === "COACH";

  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [nutritionPrograms, setNutritionPrograms] = useState<NutritionProgram[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ProgramLifecycleStatus>("ALL");
  const [sportFilter, setSportFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  // Toast & live region
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [liveStatus, setLiveStatus] = useState("");

  // Builder Modal state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [savingProgram, setSavingProgram] = useState(false);

  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [sportId, setSportId] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("MUSCLE_GAIN");
  const [difficulty, setDifficulty] = useState<Difficulty>("INTERMEDIATE");
  const [programStatus, setProgramStatus] = useState<ProgramLifecycleStatus>("ACTIVE");
  const [nutritionProgramId, setNutritionProgramId] = useState("");

  // Inline Quick Nutrition Plan Creator
  const [showQuickNutrition, setShowQuickNutrition] = useState(false);
  const [newNutTitle, setNewNutTitle] = useState("");
  const [newNutCalories, setNewNutCalories] = useState("");
  const [newNutProtein, setNewNutProtein] = useState("");
  const [newNutCarbs, setNewNutCarbs] = useState("");
  const [newNutFats, setNewNutFats] = useState("");
  const [newNutNotes, setNewNutNotes] = useState("");
  const [savingNutrition, setSavingNutrition] = useState(false);

  // Weekly structure state
  const [activeWeekIdx, setActiveWeekIdx] = useState(0);
  const [programWeeks, setProgramWeeks] = useState<BuilderWeek[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");

  // Delete / 409 Conflict state
  const [deleteConfirmProgram, setDeleteConfirmProgram] = useState<TrainingProgram | null>(null);
  const [deleteConflictMsg, setDeleteConflictMsg] = useState<string | null>(null);

  // Apply Program Modal state
  const [applyProgram, setApplyProgram] = useState<TrainingProgram | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [applyNotes, setApplyNotes] = useState("");
  const [previewData, setPreviewData] = useState<ApplyPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [skipConflicts, setSkipConflicts] = useState(false);
  const [includeNutrition, setIncludeNutrition] = useState(true);
  const [customizeNutrition, setCustomizeNutrition] = useState(false);
  const [overrideCalories, setOverrideCalories] = useState("");
  const [overrideProtein, setOverrideProtein] = useState("");
  const [overrideCarbs, setOverrideCarbs] = useState("");
  const [overrideFats, setOverrideFats] = useState("");
  const [overrideWater, setOverrideWater] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [applyingProgram, setApplyingProgram] = useState(false);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    if (!canManagePrograms) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [progRes, tmplRes, sportsRes, clientsRes, nutRes] = await Promise.all([
        fetch("/api/programs").then((r) => r.json()),
        fetch("/api/templates?activeOnly=true").then((r) => r.json()),
        fetch("/api/sports").then((r) => r.json()),
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/nutrition-programs?activeOnly=true").then((r) => r.json())
      ]);

      if (progRes.success && Array.isArray(progRes.data)) setPrograms(progRes.data);
      if (tmplRes.success && Array.isArray(tmplRes.data)) setTemplates(tmplRes.data);
      if (sportsRes.success && Array.isArray(sportsRes.data)) setSports(sportsRes.data);
      if (clientsRes.success && Array.isArray(clientsRes.data)) setClients(clientsRes.data);
      if (nutRes.success && Array.isArray(nutRes.data)) setNutritionPrograms(nutRes.data);
    } catch (err) {
      console.error("[ProgramsPage] Failed to load program builder data:", err);
      showNotification("Failed to load training programs data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canManagePrograms]);

  // Live Apply Preview whenever modal target changes
  useEffect(() => {
    if (!applyProgram || !selectedClientId || !startDate) {
      setPreviewData(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);

    fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "PREVIEW_APPLY",
        programId: applyProgram.id,
        clientId: selectedClientId,
        startDate
      })
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) {
          setPreviewError(json.error || "Failed to calculate program schedule preview");
          setPreviewData(null);
        } else {
          setPreviewData(json.data);
          setSkipConflicts(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPreviewError(err.message || "Preview error");
          setPreviewData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyProgram, selectedClientId, startDate]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((prog) => {
      const effectiveStatus = prog.status || (prog.isActive === false ? "ARCHIVED" : prog.isTemplate ? "ACTIVE" : "DRAFT");
      if (statusFilter !== "ALL" && effectiveStatus !== statusFilter) return false;
      if (sportFilter && prog.sportId !== sportFilter) return false;
      if (difficultyFilter && prog.difficulty !== difficultyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${prog.titleEn || ""} ${prog.titleAr || ""} ${prog.descriptionEn || ""} ${prog.descriptionAr || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [programs, statusFilter, sportFilter, difficultyFilter, searchQuery]);

  const filteredTemplatesForPicker = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter((tpl) =>
      `${tpl.titleEn || ""} ${tpl.titleAr || ""} ${tpl.sport?.nameEn || ""}`.toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  const openCreateModal = () => {
    setEditingProgram(null);
    setTitleEn("");
    setTitleAr("");
    setDescriptionEn("");
    setSportId(sports[0]?.id || "");
    setGoalType("MUSCLE_GAIN");
    setDifficulty("INTERMEDIATE");
    setProgramStatus("ACTIVE");
    setNutritionProgramId("");
    setShowQuickNutrition(false);
    setTemplateSearch("");
    setActiveWeekIdx(0);
    setProgramWeeks([
      buildDefaultWeek(1, templates),
      buildDefaultWeek(2, templates),
      buildDefaultWeek(3, templates),
      buildDefaultWeek(4, templates)
    ]);
    setIsBuilderOpen(true);
  };

  const openEditModal = (prog: TrainingProgram) => {
    setEditingProgram(prog);
    setTitleEn(prog.titleEn || prog.titleAr);
    setTitleAr(prog.titleAr || prog.titleEn);
    setDescriptionEn(prog.descriptionEn || prog.descriptionAr || "");
    setSportId(prog.sportId);
    setGoalType(prog.goalType);
    setDifficulty(prog.difficulty);
    setProgramStatus(prog.status || (prog.isActive === false ? "ARCHIVED" : prog.isTemplate ? "ACTIVE" : "DRAFT"));
    setNutritionProgramId(prog.nutritionProgramId || "");
    setShowQuickNutrition(false);
    setTemplateSearch("");
    setActiveWeekIdx(0);
    setProgramWeeks(hydrateBuilderWeeks(prog));
    setIsBuilderOpen(true);
  };

  // --- Weekly Structure Handlers ---
  const reindexWeeks = (weeks: BuilderWeek[]): BuilderWeek[] =>
    weeks.map((w, idx) => ({
      ...w,
      weekNumber: idx + 1,
      days: w.days.map((d, dIdx) => ({ ...d, dayNumber: dIdx + 1 }))
    }));

  const handleAddWeek = () => {
    const nextNum = programWeeks.length + 1;
    const next = reindexWeeks([...programWeeks, buildDefaultWeek(nextNum, templates)]);
    setProgramWeeks(next);
    setActiveWeekIdx(next.length - 1);
    setLiveStatus(`Added Week ${nextNum}`);
  };

  const handleRemoveWeek = (idx: number) => {
    if (programWeeks.length <= 1) return;
    const next = reindexWeeks(programWeeks.filter((_, i) => i !== idx));
    setProgramWeeks(next);
    setActiveWeekIdx(Math.max(0, Math.min(activeWeekIdx, next.length - 1)));
    setLiveStatus(`Removed Week ${idx + 1}`);
  };

  const handleMoveWeek = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= programWeeks.length) return;
    const copy = [...programWeeks];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    setProgramWeeks(reindexWeeks(copy));
    setActiveWeekIdx(targetIdx);
    setLiveStatus(`Moved week to position ${targetIdx + 1}`);
  };

  const handleDuplicateWeek1ToAll = () => {
    if (programWeeks.length <= 1) return;
    const w1 = programWeeks[0];
    const next = programWeeks.map((w, idx) => {
      if (idx === 0) return w;
      return {
        ...w,
        focusEn: w1.focusEn,
        days: w1.days.map((d, dIdx) => ({
          uid: makeUid(`day-copy-${idx + 1}-${dIdx + 1}`),
          dayNumber: dIdx + 1,
          titleEn: d.titleEn,
          isRestDay: d.isRestDay,
          workouts: d.isRestDay
            ? []
            : d.workouts.map((pw, pIdx) => ({
                uid: makeUid(`pw-copy-${idx + 1}-${dIdx + 1}-${pIdx}`),
                templateId: pw.templateId
              }))
        }))
      };
    });
    setProgramWeeks(reindexWeeks(next));
    setLiveStatus("Copied Week 1 schedule to all weeks");
    showNotification("Week 1 schedule copied to all weeks");
  };

  const handleAddDay = (weekIdx: number) => {
    const next = [...programWeeks];
    const week = next[weekIdx];
    if (!week) return;
    const nextDayNum = week.days.length + 1;
    const defaultTplId = templates[0]?.id || "";
    week.days = [
      ...week.days,
      {
        uid: makeUid(`day-add-${weekIdx + 1}`),
        dayNumber: nextDayNum,
        titleEn: `Training Day ${nextDayNum}`,
        isRestDay: false,
        workouts: defaultTplId ? [{ uid: makeUid("pw-add"), templateId: defaultTplId }] : []
      }
    ];
    setProgramWeeks(reindexWeeks(next));
    setLiveStatus(`Added Day ${nextDayNum} to Week ${weekIdx + 1}`);
  };

  const handleRemoveDay = (weekIdx: number, dayIdx: number) => {
    const next = [...programWeeks];
    const week = next[weekIdx];
    if (!week || week.days.length <= 1) return;
    week.days = week.days.filter((_, i) => i !== dayIdx);
    setProgramWeeks(reindexWeeks(next));
    setLiveStatus(`Removed Day ${dayIdx + 1} from Week ${weekIdx + 1}`);
  };

  const handleMoveDay = (weekIdx: number, dayIdx: number, direction: -1 | 1) => {
    const next = [...programWeeks];
    const week = next[weekIdx];
    if (!week) return;
    const targetIdx = dayIdx + direction;
    if (targetIdx < 0 || targetIdx >= week.days.length) return;
    const daysCopy = [...week.days];
    const [moved] = daysCopy.splice(dayIdx, 1);
    daysCopy.splice(targetIdx, 0, moved);
    week.days = daysCopy;
    setProgramWeeks(reindexWeeks(next));
    setLiveStatus(`Moved day to Day ${targetIdx + 1}`);
  };

  const handleUpdateDay = (weekIdx: number, dayIdx: number, patch: Partial<BuilderDay>) => {
    const next = [...programWeeks];
    const week = next[weekIdx];
    if (!week || !week.days[dayIdx]) return;
    const updatedDay = { ...week.days[dayIdx], ...patch };
    if (patch.isRestDay === true) {
      updatedDay.workouts = [];
    } else if (patch.isRestDay === false && updatedDay.workouts.length === 0 && templates[0]?.id) {
      updatedDay.workouts = [{ uid: makeUid("pw-toggle"), templateId: templates[0].id }];
    }
    week.days[dayIdx] = updatedDay;
    setProgramWeeks(next);
  };

  const handleAddTemplateToDay = (weekIdx: number, dayIdx: number, templateId: string) => {
    if (!templateId) return;
    const next = [...programWeeks];
    const day = next[weekIdx]?.days[dayIdx];
    if (!day) return;
    day.isRestDay = false;
    day.workouts = [...day.workouts, { uid: makeUid("pw"), templateId }];
    setProgramWeeks(next);
  };

  const handleReplaceDayWorkout = (weekIdx: number, dayIdx: number, workoutIdx: number, templateId: string) => {
    const next = [...programWeeks];
    const day = next[weekIdx]?.days[dayIdx];
    if (!day || !day.workouts[workoutIdx]) return;
    day.workouts[workoutIdx] = { ...day.workouts[workoutIdx], templateId };
    setProgramWeeks(next);
  };

  const handleRemoveDayWorkout = (weekIdx: number, dayIdx: number, workoutIdx: number) => {
    const next = [...programWeeks];
    const day = next[weekIdx]?.days[dayIdx];
    if (!day) return;
    day.workouts = day.workouts.filter((_, i) => i !== workoutIdx);
    setProgramWeeks(next);
  };

  const handleQuickCreateNutrition = async () => {
    if (!newNutTitle.trim()) {
      showNotification("Enter a nutrition plan title", "error");
      return;
    }
    setSavingNutrition(true);
    try {
      const res = await fetch("/api/nutrition-programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNutTitle.trim(),
          dailyCalories: newNutCalories ? Number(newNutCalories) : null,
          proteinGrams: newNutProtein ? Number(newNutProtein) : null,
          carbsGrams: newNutCarbs ? Number(newNutCarbs) : null,
          fatsGrams: newNutFats ? Number(newNutFats) : null,
          notes: newNutNotes.trim() || null
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to create nutrition plan");

      setNutritionPrograms((prev) => [json.data, ...prev]);
      setNutritionProgramId(json.data.id);
      setShowQuickNutrition(false);
      setNewNutTitle("");
      setNewNutCalories("");
      setNewNutProtein("");
      setNewNutCarbs("");
      setNewNutFats("");
      setNewNutNotes("");
      showNotification("Nutrition plan added to library & attached to program");
    } catch (err: any) {
      showNotification(err.message || "Failed to save nutrition plan", "error");
    } finally {
      setSavingNutrition(false);
    }
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim()) {
      showNotification("Program title is required", "error");
      return;
    }

    setSavingProgram(true);
    try {
      const payload = {
        titleEn: titleEn.trim(),
        titleAr: titleAr.trim() || titleEn.trim(),
        descriptionEn: descriptionEn.trim() || null,
        descriptionAr: descriptionEn.trim() || null,
        durationWeeks: programWeeks.length,
        sportId: sportId || sports[0]?.id,
        goalType,
        difficulty,
        status: programStatus,
        nutritionProgramId: nutritionProgramId || null,
        weeks: programWeeks.map((w, wIdx) => ({
          weekNumber: wIdx + 1,
          focusEn: w.focusEn.trim() || null,
          days: w.days.map((d, dIdx) => ({
            dayNumber: dIdx + 1,
            titleEn: d.titleEn.trim() || (d.isRestDay ? "Rest & Recovery" : `Day ${dIdx + 1}`),
            isRestDay: d.isRestDay,
            workouts: d.isRestDay
              ? []
              : d.workouts
                  .filter((pw) => pw.templateId)
                  .map((pw, pIdx) => ({ templateId: pw.templateId, orderIndex: pIdx }))
          }))
        }))
      };

      const url = editingProgram ? `/api/programs/${editingProgram.id}` : "/api/programs";
      const method = editingProgram ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save program");

      await loadData();
      setIsBuilderOpen(false);
      setEditingProgram(null);
      showNotification(editingProgram ? "Training program updated" : "Training program created");
    } catch (err: any) {
      showNotification(err.message || "Failed to save training program", "error");
    } finally {
      setSavingProgram(false);
    }
  };

  const handleStatusChange = async (prog: TrainingProgram, nextStatus: ProgramLifecycleStatus) => {
    try {
      const res = await fetch(`/api/programs/${prog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update program status");
      await loadData();
      showNotification(`Program status updated to ${nextStatus}`);
    } catch (err: any) {
      showNotification(err.message || "Error updating status", "error");
    }
  };

  const handleDeleteProgram = async () => {
    if (!deleteConfirmProgram) return;
    try {
      const res = await fetch(`/api/programs/${deleteConfirmProgram.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.status === 409) {
        setDeleteConflictMsg(json.error || "This program is linked to athlete assignments. Archive it instead.");
        return;
      }
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to delete program");

      setDeleteConfirmProgram(null);
      setDeleteConflictMsg(null);
      await loadData();
      showNotification("Program deleted");
    } catch (err: any) {
      showNotification(err.message || "Error deleting program", "error");
    }
  };

  const openApplyModal = (prog: TrainingProgram) => {
    setApplyProgram(prog);
    setSelectedClientId(clients[0]?.id || "");
    setStartDate(new Date().toISOString().slice(0, 10));
    setApplyNotes("");
    setSkipConflicts(false);
    setIncludeNutrition(Boolean(prog.nutritionProgram));
    setCustomizeNutrition(false);
    setOverrideCalories(prog.nutritionProgram?.dailyCalories ? String(prog.nutritionProgram.dailyCalories) : "");
    setOverrideProtein(prog.nutritionProgram?.proteinGrams ? String(prog.nutritionProgram.proteinGrams) : "");
    setOverrideCarbs(prog.nutritionProgram?.carbsGrams ? String(prog.nutritionProgram.carbsGrams) : "");
    setOverrideFats(prog.nutritionProgram?.fatsGrams ? String(prog.nutritionProgram.fatsGrams) : "");
    setOverrideWater(prog.nutritionProgram?.waterLiters ? String(prog.nutritionProgram.waterLiters) : "");
    setOverrideNotes(prog.nutritionProgram?.notes || "");
  };

  const handleApplyProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyProgram || !selectedClientId) {
      showNotification("Please select an athlete and start date", "error");
      return;
    }
    if (previewData?.hasConflicts && !skipConflicts) {
      showNotification("Resolve schedule conflicts or pick a new start date first", "error");
      return;
    }

    setApplyingProgram(true);
    try {
      const nutritionOverride =
        includeNutrition && customizeNutrition
          ? {
              dailyCalories: overrideCalories !== "" ? Number(overrideCalories) : null,
              proteinGrams: overrideProtein !== "" ? Number(overrideProtein) : null,
              carbsGrams: overrideCarbs !== "" ? Number(overrideCarbs) : null,
              fatsGrams: overrideFats !== "" ? Number(overrideFats) : null,
              waterLiters: overrideWater !== "" ? Number(overrideWater) : null,
              notes: overrideNotes.trim() || null
            }
          : null;

      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPLY",
          programId: applyProgram.id,
          clientId: selectedClientId,
          startDate,
          notes: applyNotes.trim() || undefined,
          conflictStrategy: skipConflicts ? "SKIP_CONFLICTS" : "BLOCK",
          includeNutrition,
          nutritionOverride
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to apply program");
      }

      setApplyProgram(null);
      await loadData();
      showNotification(
        `Assigned ${json.data?.length || 0} workout(s) (${json.restDaysSkipped || 0} rest days skipped)`
      );
    } catch (err: any) {
      showNotification(err.message || "Error applying program", "error");
    } finally {
      setApplyingProgram(false);
    }
  };

  const getStatusBadge = (status?: ProgramLifecycleStatus) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Draft
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            Archived
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            Active
          </span>
        );
    }
  };

  const getDifficultyBadge = (d: Difficulty) => {
    switch (d) {
      case "BEGINNER":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Beginner</span>;
      case "INTERMEDIATE":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">Intermediate</span>;
      case "ADVANCED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30">Advanced</span>;
      default:
        return null;
    }
  };

  if (!authLoading && user && !canManagePrograms) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">Coach & Admin Access Required</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Training Program management is restricted to Academy Admins and Coaches. View your assigned schedule from My Workouts.
        </p>
        <Link
          href="/assignments"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-brand-crimson text-white text-xs font-bold"
        >
          Go to My Workouts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sr-only" role="status" aria-live="polite">
        {liveStatus}
      </div>

      {/* Toast */}
      {notification && (
        <div
          className={`fixed bottom-5 end-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold ${
            notification.type === "success"
              ? "bg-brand-crimson text-white border-brand-crimson shadow-[0_0_20px_rgba(240,20,37,0.38)]"
              : "bg-red-600 text-white border-red-500"
          }`}
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
            <BookOpen className="w-6 h-6 text-brand-crimson" />
            <span>Training Programs</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {programs.length} programs
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Structure multi-week training schedules, link workout templates and nutrition plans, and assign programs cleanly from a start date.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all"
          >
            <Layers className="w-4 h-4 text-brand-crimson" />
            <span>Templates Library</span>
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Training Program</span>
          </button>
        </div>
      </div>

      {/* Filters & Status Tabs */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
        <div
          role="tablist"
          aria-label="Program lifecycle status filter"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-nowrap"
        >
          {(["ALL", "ACTIVE", "DRAFT", "ARCHIVED"] as const).map((tab) => {
            const selected = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setStatusFilter(tab)}
                className={`relative flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  selected
                    ? "bg-brand-crimson text-white border-b-2 border-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {tab === "ALL" ? "All Programs" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
            />
          </div>

          <select
            aria-label="Filter by sport"
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="">All Sports</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameEn || s.nameAr}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by difficulty"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="">All Difficulties</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
      </div>

      {/* Programs List */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          Loading training programs...
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No matching training programs</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Create a structured multi-week program with workout templates, rest days, and optional nutrition plans.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Training Program</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrograms.map((prog) => {
            const isExpanded = expandedId === prog.id;
            const effectiveStatus =
              prog.status || (prog.isActive === false ? "ARCHIVED" : prog.isTemplate ? "ACTIVE" : "DRAFT");
            const trainingDaysCount = (prog.weeks || []).reduce(
              (acc, w) => acc + (w.days || []).filter((d) => !d.isRestDay).length,
              0
            );
            const restDaysCount = (prog.weeks || []).reduce(
              (acc, w) => acc + (w.days || []).filter((d) => d.isRestDay).length,
              0
            );
            const workoutsCount = (prog.weeks || []).reduce(
              (acc, w) => acc + (w.days || []).reduce((dAcc, d) => dAcc + (d.isRestDay ? 0 : d.workouts?.length || 0), 0),
              0
            );

            return (
              <div
                key={prog.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-all"
              >
                {/* Card Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : prog.id)}
                  className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {prog.titleEn || prog.titleAr}
                        </h3>
                        {getStatusBadge(effectiveStatus)}
                        {getDifficultyBadge(prog.difficulty)}
                        {prog.sport && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {prog.sport.nameEn || prog.sport.nameAr}
                          </span>
                        )}
                      </div>
                      {prog.descriptionEn && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{prog.descriptionEn}</p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                        <span className="flex items-center gap-1 font-bold text-brand-crimson">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{prog.durationWeeks} weeks</span>
                        </span>
                        <span>•</span>
                        <span>{trainingDaysCount} training days</span>
                        <span>•</span>
                        <span>{restDaysCount} rest days</span>
                        <span>•</span>
                        <span>{workoutsCount} template session(s)</span>
                        {prog.nutritionProgram && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                              <Apple className="w-3 h-3" />
                              {prog.nutritionProgram.title}
                              {prog.nutritionProgram.dailyCalories ? ` (${prog.nutritionProgram.dailyCalories} kcal)` : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={effectiveStatus !== "ACTIVE"}
                      onClick={() => openApplyModal(prog)}
                      title={
                        effectiveStatus === "ACTIVE"
                          ? "Assign program to athlete from a start date"
                          : "Activate program before applying to an athlete"
                      }
                      className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Apply to Athlete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(prog)}
                      title="Edit program"
                      className="p-2 rounded-xl text-slate-500 hover:text-brand-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {effectiveStatus !== "ARCHIVED" ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(prog, "ARCHIVED")}
                        title="Archive program"
                        className="p-2 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(prog, "ACTIVE")}
                        title="Reactivate program"
                        className="p-2 rounded-xl text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConflictMsg(null);
                        setDeleteConfirmProgram(prog);
                      }}
                      title="Delete program"
                      className="p-2 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : prog.id)}
                      aria-label={isExpanded ? "Collapse program schedule" : "Expand program schedule"}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Weekly Breakdown */}
                {isExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
                    {(prog.weeks || []).map((week) => (
                      <div
                        key={week.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 gap-2 flex-wrap">
                          <span className="text-xs font-bold text-brand-crimson">
                            Week {week.weekNumber} — {week.focusEn || week.focusAr || "Training Schedule"}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {(week.days || []).filter((d) => !d.isRestDay).length} training day(s) •{" "}
                            {(week.days || []).filter((d) => d.isRestDay).length} rest day(s)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                          {(week.days || []).map((day, dIdx) => (
                            <div
                              key={day.id || dIdx}
                              className={`p-3 rounded-xl border text-xs space-y-2 flex flex-col justify-between ${
                                day.isRestDay
                                  ? "bg-slate-100/80 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-500"
                                  : "bg-white dark:bg-[#141416] border-slate-300 dark:border-brand-crimson/35 text-slate-900 dark:text-white"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Day {day.dayNumber}
                                  </span>
                                  {day.isRestDay ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 inline-flex items-center gap-0.5">
                                      <Coffee className="w-2.5 h-2.5" /> Rest
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-crimson/15 text-brand-crimson inline-flex items-center gap-0.5">
                                      <Dumbbell className="w-2.5 h-2.5" /> Train
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-xs mt-1 line-clamp-2">
                                  {day.isRestDay ? day.titleEn || "Rest & Recovery" : day.titleEn || day.titleAr}
                                </p>
                              </div>

                              {!day.isRestDay && (
                                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1">
                                  {day.workouts && day.workouts.length > 0 ? (
                                    day.workouts.map((pw, idx) => (
                                      <div
                                        key={pw.id || idx}
                                        className="text-[11px] font-bold text-brand-crimson truncate"
                                      >
                                        • {pw.template?.titleEn || pw.template?.titleAr || "Template"}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-amber-500">No template linked</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- CREATE / EDIT WEEKLY PROGRAM BUILDER MODAL --- */}
      {isBuilderOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="program-builder-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2
                  id="program-builder-title"
                  className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2"
                >
                  <BookOpen className="w-5 h-5 text-brand-crimson" />
                  <span>{editingProgram ? "Edit Training Program" : "Build Training Program"}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure program metadata, optional nutrition linkage, weeks, training/rest days, and workout templates.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close builder"
                onClick={() => setIsBuilderOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-5">
              {/* Program Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Program Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Strength & Conditioning"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Secondary Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Optional subtitle / Arabic title"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sport *</label>
                  <select
                    value={sportId}
                    onChange={(e) => setSportId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameEn || s.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Goal</label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as GoalType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="MUSCLE_GAIN">Muscle Gain</option>
                    <option value="STRENGTH">Strength</option>
                    <option value="WEIGHT_LOSS">Weight Loss</option>
                    <option value="ENDURANCE">Endurance</option>
                    <option value="PERFORMANCE">Performance</option>
                    <option value="REHABILITATION">Rehabilitation</option>
                    <option value="GENERAL_FITNESS">General Fitness</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={programStatus}
                    onChange={(e) => setProgramStatus(e.target.value as ProgramLifecycleStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active (Ready to Assign)</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description & Coach Guidelines
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline the program progression, deload approach, or expectations..."
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Optional Nutrition Plan Linkage */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Apple className="w-4 h-4 text-emerald-500" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        Nutrition Plan Attachment (Optional)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Attach a saved nutrition library template. Athlete-specific overrides stay separate during assignment.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickNutrition((v) => !v)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-brand-crimson cursor-pointer self-start"
                  >
                    {showQuickNutrition ? "Close Quick Create" : "+ New Nutrition Library Plan"}
                  </button>
                </div>

                <select
                  aria-label="Optional Nutrition Program"
                  value={nutritionProgramId}
                  onChange={(e) => setNutritionProgramId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-semibold"
                >
                  <option value="">No Nutrition Plan Attached</option>
                  {nutritionPrograms.map((np) => (
                    <option key={np.id} value={np.id}>
                      {np.title}
                      {np.dailyCalories ? ` • ${np.dailyCalories} kcal` : ""}
                      {np.proteinGrams ? ` • P:${np.proteinGrams}g` : ""}
                    </option>
                  ))}
                </select>

                {showQuickNutrition && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Create Reusable Nutrition Library Template (fields optional — no forced macros)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nutrition plan title *"
                        value={newNutTitle}
                        onChange={(e) => setNewNutTitle(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Daily calories (optional)"
                        value={newNutCalories}
                        onChange={(e) => setNewNutCalories(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="Protein g (opt)"
                        value={newNutProtein}
                        onChange={(e) => setNewNutProtein(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Carbs g (opt)"
                        value={newNutCarbs}
                        onChange={(e) => setNewNutCarbs(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Fats g (opt)"
                        value={newNutFats}
                        onChange={(e) => setNewNutFats(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Guidelines / notes (optional)"
                      value={newNutNotes}
                      onChange={(e) => setNewNutNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={savingNutrition}
                        onClick={handleQuickCreateNutrition}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {savingNutrition ? "Saving..." : "Save & Attach Nutrition Plan"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Weekly Schedule Builder */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand-crimson" />
                      <span>Weekly Structure ({programWeeks.length} weeks)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Add, remove, or reorder weeks and training/rest days. Filter templates quickly to assign sessions.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {programWeeks.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDuplicateWeek1ToAll}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Week 1 to All</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddWeek}
                      className="px-3 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Week</span>
                    </button>
                  </div>
                </div>

                {/* Week Tabs (single scrollable row) */}
                <div
                  role="tablist"
                  aria-label="Program weeks"
                  className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap"
                >
                  {programWeeks.map((week, idx) => {
                    const selected = activeWeekIdx === idx;
                    return (
                      <button
                        key={week.uid}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveWeekIdx(idx)}
                        className={`flex-none px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          selected
                            ? "bg-brand-crimson text-white border-b-2 border-white shadow-md"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        Week {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Active Week Controls & Days */}
                {programWeeks[activeWeekIdx] && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          Week {activeWeekIdx + 1} Focus Note
                        </label>
                        <input
                          type="text"
                          value={programWeeks[activeWeekIdx].focusEn}
                          onChange={(e) => {
                            const next = [...programWeeks];
                            next[activeWeekIdx] = { ...next[activeWeekIdx], focusEn: e.target.value };
                            setProgramWeeks(next);
                          }}
                          placeholder="e.g. Accumulation Phase / Hypertrophy Volume"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 pt-3 sm:pt-4">
                        <button
                          type="button"
                          disabled={activeWeekIdx === 0}
                          onClick={() => handleMoveWeek(activeWeekIdx, -1)}
                          title="Move week earlier"
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={activeWeekIdx === programWeeks.length - 1}
                          onClick={() => handleMoveWeek(activeWeekIdx, 1)}
                          title="Move week later"
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={programWeeks.length <= 1}
                          onClick={() => handleRemoveWeek(activeWeekIdx)}
                          title="Remove this week"
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-40 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Template Filter Helper inside Week Editor */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="relative flex-1 max-w-xs">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="search"
                          placeholder="Filter template dropdown..."
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          className="w-full ps-8 pe-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddDay(activeWeekIdx)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-brand-crimson text-xs font-bold text-slate-800 dark:text-white inline-flex items-center gap-1.5 cursor-pointer self-start"
                      >
                        <Plus className="w-3.5 h-3.5 text-brand-crimson" />
                        <span>Add Day to Week {activeWeekIdx + 1}</span>
                      </button>
                    </div>

                    {/* Days List */}
                    <div className="space-y-2.5">
                      {programWeeks[activeWeekIdx].days.map((day, dayIdx) => (
                        <div
                          key={day.uid}
                          className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                            day.isRestDay
                              ? "bg-slate-100/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                              : "bg-white dark:bg-slate-900 border-slate-300 dark:border-brand-crimson/35 shadow-xs"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 flex-1">
                              <span
                                className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                                  day.isRestDay
                                    ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    : "bg-brand-crimson/15 text-brand-crimson"
                                }`}
                              >
                                D{dayIdx + 1}
                              </span>
                              <input
                                type="text"
                                aria-label={`Day ${dayIdx + 1} title`}
                                placeholder={day.isRestDay ? "Rest Day" : "Day title (e.g. Upper Body)"}
                                value={day.titleEn}
                                onChange={(e) => handleUpdateDay(activeWeekIdx, dayIdx, { titleEn: e.target.value })}
                                className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDay(activeWeekIdx, dayIdx, {
                                    isRestDay: !day.isRestDay,
                                    titleEn: !day.isRestDay
                                      ? "Rest & Recovery"
                                      : day.titleEn === "Rest & Recovery"
                                        ? `Training Day ${dayIdx + 1}`
                                        : day.titleEn
                                  })
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border cursor-pointer ${
                                  day.isRestDay
                                    ? "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                    : "bg-brand-crimson/10 border-brand-crimson/30 text-brand-crimson"
                                }`}
                              >
                                {day.isRestDay ? (
                                  <>
                                    <Coffee className="w-3.5 h-3.5" />
                                    <span>Rest Day</span>
                                  </>
                                ) : (
                                  <>
                                    <Dumbbell className="w-3.5 h-3.5" />
                                    <span>Training Day</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                disabled={dayIdx === 0}
                                onClick={() => handleMoveDay(activeWeekIdx, dayIdx, -1)}
                                title="Move day up"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-35 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={dayIdx === programWeeks[activeWeekIdx].days.length - 1}
                                onClick={() => handleMoveDay(activeWeekIdx, dayIdx, 1)}
                                title="Move day down"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-35 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={programWeeks[activeWeekIdx].days.length <= 1}
                                onClick={() => handleRemoveDay(activeWeekIdx, dayIdx)}
                                title="Remove day"
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-35 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Linked Workout Templates for Training Days */}
                          {!day.isRestDay && (
                            <div className="ps-9 space-y-1.5">
                              {templates.length === 0 ? (
                                <p className="text-[11px] text-amber-500">
                                  No active workout templates available. Create one in Templates first.
                                </p>
                              ) : (
                                <>
                                  {day.workouts.map((pw, pwIdx) => (
                                    <div key={pw.uid} className="flex items-center gap-2">
                                      <select
                                        aria-label={`Day ${dayIdx + 1} template ${pwIdx + 1}`}
                                        value={pw.templateId}
                                        onChange={(e) =>
                                          handleReplaceDayWorkout(activeWeekIdx, dayIdx, pwIdx, e.target.value)
                                        }
                                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                                      >
                                        {filteredTemplatesForPicker.map((tpl) => (
                                          <option key={tpl.id} value={tpl.id}>
                                            {tpl.titleEn || tpl.titleAr} ({tpl.exercises?.length || 0} exercises
                                            {tpl.sport ? ` • ${tpl.sport.nameEn}` : ""})
                                          </option>
                                        ))}
                                      </select>
                                      {day.workouts.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDayWorkout(activeWeekIdx, dayIdx, pwIdx)}
                                          title="Remove template from day"
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAddTemplateToDay(
                                        activeWeekIdx,
                                        dayIdx,
                                        filteredTemplatesForPicker[0]?.id || templates[0]?.id || ""
                                      )
                                    }
                                    className="text-[11px] font-bold text-brand-crimson hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add workout template to Day {dayIdx + 1}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProgram}
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] cursor-pointer disabled:opacity-50"
                >
                  {savingProgram ? "Saving..." : editingProgram ? "Save Program Changes" : "Create Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- APPLY PROGRAM MODAL WITH PREVIEW, CONFLICT DETECTION & NUTRITION OVERRIDE --- */}
      {applyProgram && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-program-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-brand-crimson" />
                <h2 id="apply-program-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                  Assign Program to Athlete
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close assign modal"
                onClick={() => setApplyProgram(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyProgramSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#141416] border border-slate-200 dark:border-brand-crimson/30 text-xs space-y-1">
                <p className="font-bold text-brand-crimson uppercase tracking-wider text-[10px]">Program</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {applyProgram.titleEn || applyProgram.titleAr}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {applyProgram.durationWeeks} weeks • {applyProgram.sport?.nameEn}
                  {applyProgram.nutritionProgram ? ` • Nutrition: ${applyProgram.nutritionProgram.title}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Athlete *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Athlete --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name} ({c.sport?.nameEn || "Athlete"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Program Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Nutrition Inheritance / Override Options */}
              {applyProgram.nutritionProgram && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/25 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeNutrition}
                        onChange={(e) => setIncludeNutrition(e.target.checked)}
                        className="rounded border-slate-300 text-brand-crimson"
                      />
                      <span>Attach Linked Nutrition Plan ({applyProgram.nutritionProgram.title})</span>
                    </label>
                    {includeNutrition && (
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customizeNutrition}
                          onChange={(e) => setCustomizeNutrition(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <span>Customize targets for this athlete only</span>
                      </label>
                    )}
                  </div>

                  {includeNutrition && customizeNutrition && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                      <input
                        type="number"
                        placeholder="Calories"
                        value={overrideCalories}
                        onChange={(e) => setOverrideCalories(e.target.value)}
                        className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Protein (g)"
                        value={overrideProtein}
                        onChange={(e) => setOverrideProtein(e.target.value)}
                        className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Carbs (g)"
                        value={overrideCarbs}
                        onChange={(e) => setOverrideCarbs(e.target.value)}
                        className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Fats (g)"
                        value={overrideFats}
                        onChange={(e) => setOverrideFats(e.target.value)}
                        className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Water (L)"
                        value={overrideWater}
                        onChange={(e) => setOverrideWater(e.target.value)}
                        className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assignment Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional notes for this athlete's cycle..."
                  value={applyNotes}
                  onChange={(e) => setApplyNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Preview & Conflict Summary */}
              {previewLoading && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-500">
                  Calculating workout calendar dates & checking for schedule conflicts...
                </div>
              )}
              {previewError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-semibold">
                  {previewError}
                </div>
              )}
              {previewData && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-bold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-brand-crimson" />
                        <span>
                          {previewData.startDate} → {previewData.endDate}
                        </span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {previewData.trainingSessionsCount} workout(s) • {previewData.restDaysCount} rest day(s)
                      </span>
                    </div>

                    {previewData.plannedWorkouts.length > 0 && (
                      <div className="max-h-36 overflow-y-auto space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                        {previewData.plannedWorkouts.map((pw, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] py-0.5">
                            <span className="text-slate-700 dark:text-slate-300">
                              W{pw.weekNumber} D{pw.dayNumber} — <strong>{pw.dayTitle}</strong> ({pw.templateTitle})
                            </span>
                            <span className="font-mono text-slate-500">{pw.date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {previewData.hasConflicts && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Schedule Conflicts Detected (Existing workouts are never overwritten)</span>
                      </div>
                      {previewData.duplicateProgramAssignments.length > 0 && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          • Athlete already has an active assignment for this program overlapping these dates.
                        </p>
                      )}
                      {previewData.dateConflicts.length > 0 && (
                        <ul className="text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5 max-h-24 overflow-y-auto">
                          {previewData.dateConflicts.map((c, idx) => (
                            <li key={idx}>
                              • {c.date} (W{c.weekNumber} D{c.dayNumber}): collides with{" "}
                              {c.existingAssignments.map((ea) => `"${ea.title}"`).join(", ")}
                            </li>
                          ))}
                        </ul>
                      )}
                      <label className="flex items-center gap-2 pt-1 text-[11px] font-bold text-slate-900 dark:text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skipConflicts}
                          onChange={(e) => setSkipConflicts(e.target.checked)}
                          className="rounded border-slate-300 text-brand-crimson"
                        />
                        <span>Skip conflicting dates and schedule only non-conflicting sessions</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyProgram(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    applyingProgram ||
                    !selectedClientId ||
                    previewLoading ||
                    Boolean(previewError) ||
                    (Boolean(previewData?.hasConflicts) && !skipConflicts)
                  }
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50 cursor-pointer"
                >
                  {applyingProgram ? "Scheduling..." : "Confirm & Assign Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM / 409 CONFLICT MODAL --- */}
      {deleteConfirmProgram && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-program-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 id="delete-program-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                {deleteConflictMsg ? "Program Cannot Be Deleted" : "Delete Training Program"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {deleteConflictMsg
                  ? deleteConflictMsg
                  : `Are you sure you want to permanently delete "${deleteConfirmProgram.titleEn || deleteConfirmProgram.titleAr}"?`}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmProgram(null);
                  setDeleteConflictMsg(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              {deleteConflictMsg ? (
                <button
                  type="button"
                  onClick={async () => {
                    const target = deleteConfirmProgram;
                    setDeleteConfirmProgram(null);
                    setDeleteConflictMsg(null);
                    await handleStatusChange(target, "ARCHIVED");
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                >
                  Archive Program Instead
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDeleteProgram}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Delete Program
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

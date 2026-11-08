"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { WorkoutTemplate, Exercise, WorkoutTemplateExercise, Difficulty, ClientProfile } from "@/types";
import {
  Layers,
  PlusCircle,
  Dumbbell,
  Clock,
  Flame,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  Info,
  Scale,
  Timer
} from "lucide-react";

export default function TemplatesPage() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Notification Toast
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<WorkoutTemplate | null>(null);

  // Assign modal state
  const [assignTemplate, setAssignTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Template Form Metadata
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [sportId, setSportId] = useState("sport-bodybuilding");
  const [difficulty, setDifficulty] = useState<Difficulty>("INTERMEDIATE");

  // Template Exercises in Builder
  interface BuilderExerciseItem {
    exerciseId: string;
    exerciseNameAr: string;
    exerciseNameEn: string;
    primaryMuscleName?: string;
    targetSets: number;
    targetReps: string;
    targetWeightKg?: number;
    restSeconds: number;
    notes?: string;
  }

  const [builderExercises, setBuilderExercises] = useState<BuilderExerciseItem[]>([]);

  // Current exercise being added in form
  const [curExerciseId, setCurExerciseId] = useState("");
  const [curSets, setCurSets] = useState(3);
  const [curReps, setCurReps] = useState("10-12");
  const [curWeight, setCurWeight] = useState<number>(40);
  const [curRest, setCurRest] = useState(60);
  const [curNotes, setCurNotes] = useState("");

  const loadData = async () => {
    try {
      const [tRes, eRes, sRes, cRes] = await Promise.all([
        fetch("/api/templates"),
        fetch("/api/exercises"),
        fetch("/api/sports"),
        fetch("/api/clients")
      ]);

      if (tRes.ok) {
        const j = await tRes.json();
        if (j.success && Array.isArray(j.data)) setTemplates(j.data);
      }
      if (eRes.ok) {
        const j = await eRes.json();
        if (j.success && Array.isArray(j.data)) setExercises(j.data);
      }
      if (sRes.ok) {
        const j = await sRes.json();
        if (j.success && Array.isArray(j.data)) {
          setSports(j.data);
          if (j.data.length > 0 && sportId === "sport-bodybuilding") setSportId(j.data[0].id);
        }
      }
      if (cRes.ok) {
        const j = await cRes.json();
        if (j.success && Array.isArray(j.data)) setClients(j.data);
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading templates data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Add an exercise into the template builder list
  const handleAddExerciseToBuilder = () => {
    if (!curExerciseId) {
      if (exercises.length > 0) {
        setCurExerciseId(exercises[0].id);
      } else {
        showNotification("Please add exercises to library first!", "error");
        return;
      }
    }

    const exId = curExerciseId || exercises[0]?.id;
    const foundEx = exercises.find(e => e.id === exId);
    if (!foundEx) return;

    const newItem: BuilderExerciseItem = {
      exerciseId: foundEx.id,
      exerciseNameAr: foundEx.nameEn || foundEx.nameAr,
      exerciseNameEn: foundEx.nameEn,
      primaryMuscleName: foundEx.primaryMuscle?.nameEn || foundEx.primaryMuscle?.nameAr,
      targetSets: Number(curSets) || 3,
      targetReps: curReps.trim() || "10",
      targetWeightKg: Number(curWeight) || 0,
      restSeconds: Number(curRest) || 60,
      notes: curNotes.trim() || undefined
    };

    setBuilderExercises([...builderExercises, newItem]);
    setCurNotes("");
  };

  const handleRemoveExerciseFromBuilder = (index: number) => {
    const updated = [...builderExercises];
    updated.splice(index, 1);
    setBuilderExercises(updated);
  };

  const openCreateModal = () => {
    setTitleAr("");
    setTitleEn("");
    setDescAr("");
    setSportId(sports[0]?.id || "sport-1");
    setDifficulty("INTERMEDIATE");
    setBuilderExercises([]);
    if (exercises.length > 0) {
      setCurExerciseId(exercises[0].id);
    }
    setCurSets(3);
    setCurReps("10-12");
    setCurWeight(40);
    setCurRest(60);
    setIsCreateModalOpen(true);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr && !titleEn) {
      showNotification("Please enter template title", "error");
      return;
    }

    if (builderExercises.length === 0) {
      showNotification("Please add at least one exercise to this template", "error");
      return;
    }

    try {
      const templateExercises = builderExercises.map((item, idx) => ({
        exerciseId: item.exerciseId,
        orderIndex: idx + 1,
        targetSets: item.targetSets,
        targetReps: item.targetReps,
        targetWeightKg: item.targetWeightKg,
        restSeconds: item.restSeconds,
        notes: item.notes
      }));

      const finalTitle = titleEn.trim() || titleAr.trim();

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleAr: titleAr.trim() || finalTitle,
          titleEn: finalTitle,
          descriptionAr: descAr.trim() || "Custom workout template",
          descriptionEn: descAr.trim() || "Custom workout template",
          sportId: sportId || sports[0]?.id || "sport-bodybuilding",
          difficulty,
          exercises: templateExercises
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification(json.error || "Error creating template in PostgreSQL", "error");
        return;
      }

      setIsCreateModalOpen(false);
      await loadData();
      showNotification("Template created in PostgreSQL successfully! ✓");
    } catch (err: any) {
      showNotification(err.message || "Error creating template", "error");
    }
  };

  const openEditModal = (tpl: WorkoutTemplate) => {
    setEditingTemplate(tpl);
    setTitleAr(tpl.titleAr);
    setTitleEn(tpl.titleEn);
    setDescAr(tpl.descriptionAr || "");
    setSportId(tpl.sportId);
    setDifficulty(tpl.difficulty);

    const items: BuilderExerciseItem[] = (tpl.exercises || []).map(te => ({
      exerciseId: te.exerciseId,
      exerciseNameAr: te.exercise?.nameEn || te.exercise?.nameAr || "Exercise",
      exerciseNameEn: te.exercise?.nameEn || "Exercise",
      primaryMuscleName: te.exercise?.primaryMuscle?.nameEn || te.exercise?.primaryMuscle?.nameAr,
      targetSets: te.targetSets || 3,
      targetReps: String(te.targetReps || "10"),
      targetWeightKg: te.targetWeightKg || 0,
      restSeconds: te.restSeconds || 60,
      notes: te.notes
    }));

    setBuilderExercises(items);
    if (exercises.length > 0) {
      setCurExerciseId(exercises[0].id);
    }
    setIsEditModalOpen(true);
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    if (builderExercises.length === 0) {
      showNotification("Please add at least one exercise", "error");
      return;
    }

    try {
      const templateExercises = builderExercises.map((item, idx) => ({
        exerciseId: item.exerciseId,
        orderIndex: idx + 1,
        targetSets: item.targetSets,
        targetReps: item.targetReps,
        targetWeightKg: item.targetWeightKg,
        restSeconds: item.restSeconds,
        notes: item.notes
      }));

      const finalTitle = titleEn.trim() || titleAr.trim();

      const res = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleAr: titleAr.trim() || finalTitle,
          titleEn: finalTitle,
          descriptionAr: descAr.trim(),
          sportId,
          difficulty,
          exercises: templateExercises
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification(json.error || "Error updating template", "error");
        return;
      }

      setIsEditModalOpen(false);
      setEditingTemplate(null);
      await loadData();
      showNotification("Template updated in PostgreSQL successfully! ✓");
    } catch (err: any) {
      showNotification(err.message || "Error updating template", "error");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteConfirmTemplate) return;
    try {
      const res = await fetch(`/api/templates/${deleteConfirmTemplate.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setDeleteConfirmTemplate(null);
        await loadData();
        showNotification("Template deleted from PostgreSQL");
      } else {
        const json = await res.json();
        showNotification(json.error || "Error deleting template", "error");
      }
    } catch (err: any) {
      showNotification(err.message || "Error deleting template", "error");
    }
  };

  // 1-Click Assign Template to Client
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTemplate || !selectedClientId) return;

    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          templateId: assignTemplate.id,
          scheduledDate: scheduledDate || new Date().toISOString().split("T")[0]
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification(json.error || "Error assigning workout", "error");
        return;
      }

      setAssignTemplate(null);
      showNotification("Workout assigned in PostgreSQL! 🎯");
    } catch (err: any) {
      showNotification(err.message || "Error assigning workout", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 end-5 z-50 flex items-center space-x-2.5 rtl:space-x-reverse px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === "success"
              ? "bg-brand-crimson text-white border-brand-crimson shadow-[0_0_20px_rgba(240,20,37,0.38)]"
              : "bg-red-600 text-white border-red-500 shadow-red-600/30"
          }`}
        >
          {notification.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Layers className="w-6 h-6 text-brand-crimson" />
            <span>{t("navTemplates")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {templates.length} templates
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Workout session templates builder with multi-exercise composition, target sets, reps, load and rest periods
          </p>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Link
            href="/assignments"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all"
          >
            <Dumbbell className="w-4 h-4 text-brand-crimson" />
            <span>Assigned Workouts</span>
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Template +</span>
          </button>
        </div>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No workout templates yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Create workout templates by picking multiple exercises and setting sets, reps, and rest intervals.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all inline-flex items-center space-x-2 rtl:space-x-reverse cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Template</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(tpl => {
            const isExpanded = expandedId === tpl.id;
            const exerciseCount = tpl.exercises?.length || 0;

            return (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-all"
              >
                {/* Template Header Banner */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                  className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                    <div className="w-12 h-12 rounded-2xl bg-brand-crimson/15 border border-brand-crimson/30 text-brand-crimson flex items-center justify-center font-bold text-lg flex-shrink-0">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {tpl.titleEn || tpl.titleAr}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30">
                          {exerciseCount} exercises
                        </span>
                      </div>
                      {tpl.descriptionEn ? (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                          {tpl.descriptionEn}
                        </p>
                      ) : tpl.descriptionAr ? (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                          {tpl.descriptionAr}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 rtl:space-x-reverse" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setAssignTemplate(tpl);
                        if (clients.length > 0) setSelectedClientId(clients[0].id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-md flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Assign to Client 🎯</span>
                    </button>

                    <button
                      onClick={() => openEditModal(tpl)}
                      title="Edit Template & Exercises"
                      className="p-2 rounded-xl text-slate-400 hover:text-brand-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmTemplate(tpl)}
                      title="Delete Template"
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Exercises List in Template */}
                {isExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="space-y-2.5 pt-2">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                        Exercises & Sets in this workout:
                      </p>

                      {tpl.exercises?.map((te, idx) => (
                        <div
                          key={te.id || idx}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <span className="w-7 h-7 rounded-xl bg-brand-crimson/15 text-brand-crimson font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                              #{idx + 1}
                            </span>
                            {te.exercise?.thumbnailUrl && (
                              <img
                                src={te.exercise.thumbnailUrl}
                                alt={te.exercise?.nameEn || te.exercise?.nameAr}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                              />
                            )}
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {te.exercise?.nameEn || te.exercise?.nameAr || "Exercise"}
                              </h4>
                              {te.notes && (
                                <p className="text-[11px] text-brand-crimson mt-0.5">
                                  💡 {te.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700">
                              {te.targetSets || 3} sets × {te.targetReps || 10} reps
                            </span>

                            {te.targetWeightKg && te.targetWeightKg > 0 && (
                              <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-500/30 flex items-center space-x-1 rtl:space-x-reverse">
                                <Scale className="w-3 h-3" />
                                <span>{te.targetWeightKg} kg</span>
                              </span>
                            )}

                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] flex items-center space-x-1 rtl:space-x-reverse">
                              <Timer className="w-3 h-3 text-amber-500" />
                              <span>{te.restSeconds || 60}s rest</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- CREATE / EDIT TEMPLATE MODAL WITH WORKOUT BUILDER --- */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <Layers className="w-5 h-5 text-brand-crimson" />
                  <span>{isCreateModalOpen ? "Create Workout Template & Pick Exercises" : "Edit Template & Exercises"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure template details, add exercises, and set target sets, reps, load, and rest periods
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isCreateModalOpen ? handleCreateTemplate : handleUpdateTemplate} className="space-y-4">
              {/* Template Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Template Title (Alt / Arabic)</label>
                  <input
                    type="text"
                    placeholder="e.g. Upper Body Strength"
                    value={titleAr}
                    onChange={e => setTitleAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Template Title (English) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Upper Body Strength"
                    value={titleEn}
                    onChange={e => setTitleEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-brand-crimson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sport / Discipline</label>
                  <select
                    value={sportId}
                    onChange={e => setSportId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {sports.map(s => (
                      <option key={s.id} value={s.id}>{s.nameEn || s.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Template Description & Coach Notes</label>
                <textarea
                  rows={2}
                  placeholder="Guidance for client regarding exercise order, rest, or warmup..."
                  value={descAr}
                  onChange={e => setDescAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* --- WORKOUT ROUTINE BUILDER SECTION --- */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Sparkles className="w-4 h-4 text-brand-crimson" />
                    <span>Add Exercise to Template</span>
                  </h4>
                  <span className="text-[11px] font-bold text-brand-crimson">
                    {builderExercises.length} exercises added
                  </span>
                </div>

                {exercises.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center justify-between">
                    <span>No exercises registered in library yet!</span>
                    <Link href="/exercises" className="underline font-bold">Go to exercises library 🏋️</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Select Exercise *</label>
                      <select
                        value={curExerciseId || exercises[0]?.id}
                        onChange={e => setCurExerciseId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                      >
                        {exercises.map(ex => (
                          <option key={ex.id} value={ex.id}>
                            {ex.nameEn || ex.nameAr} - {ex.primaryMuscle?.nameEn || ex.primaryMuscle?.nameAr || "Muscle"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Sets</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={curSets}
                          onChange={e => setCurSets(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Reps</label>
                        <input
                          type="text"
                          placeholder="e.g. 10-12"
                          value={curReps}
                          onChange={e => setCurReps(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Load (kg)</label>
                        <input
                          type="number"
                          min="0"
                          max="500"
                          value={curWeight}
                          onChange={e => setCurWeight(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Rest (Sec)</label>
                        <input
                          type="number"
                          min="0"
                          max="600"
                          step="10"
                          value={curRest}
                          onChange={e => setCurRest(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Technique notes for this exercise (optional)..."
                        value={curNotes}
                        onChange={e => setCurNotes(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddExerciseToBuilder}
                        className="px-4 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-md flex items-center space-x-1 rtl:space-x-reverse cursor-pointer flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Exercise ➕</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Added Exercises List inside Modal */}
                {builderExercises.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Exercises in this template:
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pe-1">
                      {builderExercises.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <span className="font-bold text-brand-crimson">#{idx + 1}</span>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{item.exerciseNameEn || item.exerciseNameAr}</p>
                              <span className="text-[10px] text-slate-400">{item.targetSets} sets × {item.targetReps} reps {item.targetWeightKg ? `@ ${item.targetWeightKg}kg` : ''} ({item.restSeconds}s rest)</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseFromBuilder(idx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                >
                  {isCreateModalOpen ? "Save Template & Exercises ✓" : "Update Template ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ASSIGN TEMPLATE MODAL --- */}
      {assignTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Send className="w-5 h-5 text-brand-crimson" />
                <span>Assign Workout to Client</span>
              </h3>
              <button onClick={() => setAssignTemplate(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-[#141416] border border-[#26262A] dark:border-brand-crimson/30 text-xs space-y-1">
                <p className="font-bold text-white dark:text-brand-crimson">Selected Template:</p>
                <p className="font-bold text-slate-900 dark:text-white">{assignTemplate.titleEn || assignTemplate.titleAr}</p>
                <p className="text-slate-500 dark:text-slate-400">{assignTemplate.exercises?.length || 0} exercises included</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Client *</label>
                {clients.length === 0 ? (
                  <p className="text-xs text-red-500 font-bold">No clients registered yet. Please add clients first from the Clients tab.</p>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name} ({c.sport?.nameEn || c.sport?.nameAr || "Sport"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Scheduled Workout Date *</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setAssignTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={clients.length === 0}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50"
                >
                  Confirm Assignment 🎯
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {deleteConfirmTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Template Deletion</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete template "{deleteConfirmTemplate.titleEn || deleteConfirmTemplate.titleAr}"?
              </p>
            </div>
            <div className="flex justify-center space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTemplate(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteTemplate}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30"
              >
                Yes, Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

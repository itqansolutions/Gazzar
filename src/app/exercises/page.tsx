"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Exercise, Difficulty, MetricType, BodyPart } from "@/types";
import {
  Dumbbell,
  Search,
  PlusCircle,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  X,
  ExternalLink,
  Info,
  Edit,
  Trash2,
  Image as ImageIcon,
  Video,
  Play,
  Archive,
  RotateCcw,
  Trophy
} from "lucide-react";

function getExerciseSports(ex: Exercise): Array<{ id: string; nameEn: string; nameAr: string; icon?: string }> {
  if (Array.isArray(ex.sports) && ex.sports.length > 0) {
    return ex.sports;
  }
  if (Array.isArray(ex.exerciseSports) && ex.exerciseSports.length > 0) {
    return ex.exerciseSports
      .map((es) => es.sport)
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }
  if (ex.sport) {
    return [ex.sport];
  }
  return [];
}

function getExerciseSportIds(ex: Exercise): string[] {
  if (Array.isArray(ex.sportIds) && ex.sportIds.length > 0) {
    return ex.sportIds;
  }
  const fromList = getExerciseSports(ex).map((s) => s.id);
  if (fromList.length > 0) return fromList;
  return ex.sportId ? [ex.sportId] : [];
}

export default function ExercisesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const canManageExercises =
    user?.role === "ADMIN" || user?.role === "HEAD_COACH" || user?.role === "COACH";

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("ALL");
  const [selectedMuscle, setSelectedMuscle] = useState("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Selected exercise for detail / cues modal
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);

  // Selected video for video player modal
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>("");

  // Add / Edit / Delete Exercise Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editSportIds, setEditSportIds] = useState<string[]>([]);
  const [deleteConfirmExercise, setDeleteConfirmExercise] = useState<Exercise | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields (Add modal)
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [instAr, setInstAr] = useState("");
  const [instEn, setInstEn] = useState("");
  const [coachTipsAr, setCoachTipsAr] = useState("");
  const [commonMistakesAr, setCommonMistakesAr] = useState("");
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [primaryMuscleId, setPrimaryMuscleId] = useState("mg-chest");
  const [equipmentId, setEquipmentId] = useState("eq-barbell");
  const [difficulty, setDifficulty] = useState<Difficulty>("BEGINNER");
  const [metricType, setMetricType] = useState<MetricType>("SETS_REPS_WEIGHT");
  const [contraindicated, setContraindicated] = useState<BodyPart[]>([]);

  const [sports, setSports] = useState<any[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadExercises = async () => {
    try {
      const res = await fetch("/api/exercises");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setExercises(json.data);
        }
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading exercises:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const res = await fetch("/api/exercises/meta?includeInactive=true");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const loadedSports = json.data.sports || [];
          setSports(loadedSports);
          setMuscleGroups(json.data.muscleGroups || []);
          setEquipmentList(json.data.equipment || []);
          const firstActiveSport = loadedSports.find((s: any) => s.isActive ?? true) || loadedSports[0];
          if (firstActiveSport && selectedSportIds.length === 0) {
            setSelectedSportIds([firstActiveSport.id]);
          }
        }
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading exercise meta:", err);
    }
  };

  useEffect(() => {
    loadExercises();
    loadMeta();
  }, []);

  const filteredExercises = exercises.filter(ex => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      ex.nameAr.toLowerCase().includes(q) ||
      ex.nameEn.toLowerCase().includes(q) ||
      (ex.descriptionAr && ex.descriptionAr.toLowerCase().includes(q)) ||
      (ex.descriptionEn && ex.descriptionEn.toLowerCase().includes(q));

    const exSportIds = getExerciseSportIds(ex);
    const matchesSport = selectedSport === "ALL" || exSportIds.includes(selectedSport);
    const matchesMuscle = selectedMuscle === "ALL" || ex.primaryMuscleId === selectedMuscle;
    const matchesDiff = selectedDifficulty === "ALL" || ex.difficulty === selectedDifficulty;

    const activeFlag = ex.isActive ?? true;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && activeFlag) ||
      (statusFilter === "ARCHIVED" && !activeFlag);

    return matchesSearch && matchesSport && matchesMuscle && matchesDiff && matchesStatus;
  });

  const activeCount = exercises.filter(ex => ex.isActive ?? true).length;
  const archivedCount = exercises.length - activeCount;

  const toggleSelection = (list: string[], id: string): string[] => {
    return list.includes(id) ? list.filter(x => x !== id) : [...list, id];
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nameEn.trim()) {
      setFormError("Exercise English name is required.");
      return;
    }
    if (selectedSportIds.length === 0) {
      setFormError("Select at least one sport for this exercise.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: (nameAr.trim() || nameEn.trim()),
          nameEn: nameEn.trim(),
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          descriptionAr: descAr.trim() || descEn.trim() || nameEn.trim(),
          descriptionEn: descEn.trim() || nameEn.trim(),
          instructionsAr: instAr.trim() || instEn.trim() || "Perform exercise with proper form and controlled tempo",
          instructionsEn: instEn.trim() || "Execute the exercise with proper form and controlled tempo",
          coachTipsAr: coachTipsAr.trim() || "Focus on proper breathing and full range of motion",
          commonMistakesAr: commonMistakesAr.trim() || "Avoid using excessive weight that compromises form",
          sportId: selectedSportIds[0],
          sportIds: selectedSportIds,
          primaryMuscleId: primaryMuscleId || null,
          equipmentId: equipmentId || null,
          difficulty,
          metricType,
          contraindicatedBodyParts: contraindicated
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Failed to create exercise");
        return;
      }

      setIsAddModalOpen(false);
      setNameAr("");
      setNameEn("");
      setThumbnailUrl("");
      setVideoUrl("");
      setDescAr("");
      setDescEn("");
      setInstAr("");
      setInstEn("");
      setCoachTipsAr("");
      setCommonMistakesAr("");
      await loadExercises();
      showNotification("Exercise created and linked to selected sports");
    } catch (err: any) {
      setFormError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (ex: Exercise) => {
    setFormError(null);
    setEditingExercise({ ...ex, isActive: ex.isActive ?? true });
    setEditSportIds(getExerciseSportIds(ex));
    setIsEditModalOpen(true);
  };

  const handleEditExerciseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise) return;
    setFormError(null);

    if (!editingExercise.nameEn.trim()) {
      setFormError("Exercise English name is required.");
      return;
    }
    if (editSportIds.length === 0) {
      setFormError("Select at least one sport for this exercise.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/exercises/${editingExercise.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: (editingExercise.nameAr || editingExercise.nameEn).trim(),
          nameEn: editingExercise.nameEn.trim(),
          thumbnailUrl: editingExercise.thumbnailUrl?.trim() || null,
          videoUrl: editingExercise.videoUrl?.trim() || null,
          descriptionAr: editingExercise.descriptionAr,
          descriptionEn: editingExercise.descriptionEn,
          instructionsAr: editingExercise.instructionsAr,
          instructionsEn: editingExercise.instructionsEn,
          coachTipsAr: editingExercise.coachTipsAr,
          commonMistakesAr: editingExercise.commonMistakesAr,
          sportId: editSportIds.includes(editingExercise.sportId || "")
            ? editingExercise.sportId
            : editSportIds[0],
          sportIds: editSportIds,
          primaryMuscleId: editingExercise.primaryMuscleId || null,
          equipmentId: editingExercise.equipmentId || null,
          difficulty: editingExercise.difficulty,
          metricType: editingExercise.metricType,
          isActive: editingExercise.isActive ?? true
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Failed to update exercise");
        return;
      }

      setIsEditModalOpen(false);
      setEditingExercise(null);
      await loadExercises();
      showNotification("Exercise updated successfully");
    } catch (err: any) {
      setFormError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (ex: Exercise, nextActive: boolean) => {
    try {
      const res = await fetch(`/api/exercises/${ex.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update status");

      await loadExercises();
      setDeleteConfirmExercise(null);
      setDeleteError(null);
      showNotification(nextActive ? `"${ex.nameEn}" reactivated` : `"${ex.nameEn}" archived`);
    } catch (err: any) {
      showNotification(err.message || "Error updating exercise status", "error");
    }
  };

  const handleDeleteExercise = async () => {
    if (!deleteConfirmExercise || isSubmitting) return;
    setIsSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/exercises/${deleteConfirmExercise.id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (res.status === 409) {
          setDeleteError(json.error || "Exercise is in use and cannot be deleted.");
          return;
        }
        throw new Error(json.error || "Failed to delete exercise");
      }

      await loadExercises();
      setDeleteConfirmExercise(null);
      showNotification("Exercise deleted successfully");
    } catch (err: any) {
      showNotification(err.message || "Error deleting exercise", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case "BEGINNER":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-crimson/20 text-brand-crimson border border-brand-crimson/40">Beginner</span>;
      case "INTERMEDIATE":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">Intermediate</span>;
      case "ADVANCED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">Advanced</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">{diff}</span>;
    }
  };

  // Helper to extract YouTube video ID for embed player
  const getEmbedVideoUrl = (url: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    }
    return url;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 end-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === "success"
              ? "bg-brand-crimson text-white border-brand-crimson shadow-[0_0_20px_rgba(240,20,37,0.38)]"
              : "bg-red-600 text-white border-red-500 shadow-red-600/30"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Dumbbell className="w-6 h-6 text-brand-crimson" />
            <span>{t("navExercises")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {filteredExercises.length} exercises
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Multi-sport exercise library with sport filters, video demonstrations, and technique cues
          </p>
        </div>

        {canManageExercises && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setNameAr("");
              setNameEn("");
              setThumbnailUrl("");
              setVideoUrl("");
              setDescAr("");
              setDescEn("");
              setInstAr("");
              setInstEn("");
              setCoachTipsAr("");
              setCommonMistakesAr("");
              if (selectedSport !== "ALL") {
                setSelectedSportIds([selectedSport]);
              } else if (selectedSportIds.length === 0 && sports.length > 0) {
                const firstActive = sports.find(s => s.isActive ?? true) || sports[0];
                setSelectedSportIds([firstActive.id]);
              }
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Exercise +</span>
          </button>
        )}
      </div>

      {/* Search & Multi-Sport Filters */}
      <search className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="sm:col-span-2 relative">
            <label htmlFor="exercise-search" className="sr-only">Search exercises</label>
            <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
            <input
              id="exercise-search"
              type="search"
              placeholder="Search exercises by name or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="exercise-sport-filter" className="sr-only">Filter by sport</label>
            <select
              id="exercise-sport-filter"
              value={selectedSport}
              onChange={e => setSelectedSport(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson shadow-sm"
            >
              <option value="ALL">All Sports</option>
              {sports.map(sp => (
                <option key={sp.id} value={sp.id}>
                  {sp.icon ? `${sp.icon} ` : ""}{sp.nameEn || sp.nameAr}{sp.isActive === false ? " (Archived)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="exercise-muscle-filter" className="sr-only">Filter by muscle group</label>
            <select
              id="exercise-muscle-filter"
              value={selectedMuscle}
              onChange={e => setSelectedMuscle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson shadow-sm"
            >
              <option value="ALL">All Muscle Groups</option>
              {muscleGroups.map(m => (
                <option key={m.id} value={m.id}>{m.nameEn || m.nameAr}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="exercise-difficulty-filter" className="sr-only">Filter by difficulty</label>
            <select
              id="exercise-difficulty-filter"
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson shadow-sm"
            >
              <option value="ALL">All Difficulties</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 shadow-sm">
            {(["ALL", "ACTIVE", "ARCHIVED"] as const).map(tab => {
              const label =
                tab === "ALL"
                  ? `All (${exercises.length})`
                  : tab === "ACTIVE"
                    ? `Active (${activeCount})`
                    : `Archived (${archivedCount})`;
              const selected = statusFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    selected
                      ? "bg-brand-crimson text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </search>

      {/* Exercises Cards Grid */}
      {isLoading ? (
        <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
          Loading exercises...
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No matching exercises found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Add exercises tagged to one or more sports, or adjust your active filters.
            </p>
          </div>
          {canManageExercises && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all inline-flex items-center space-x-2 rtl:space-x-reverse cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add First Exercise</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExercises.map(ex => {
            const exSports = getExerciseSports(ex);
            const isActive = ex.isActive ?? true;

            return (
              <div
                key={ex.id}
                className={`bg-white dark:bg-slate-900/90 border rounded-3xl shadow-sm dark:shadow-xl transition-all flex flex-col justify-between overflow-hidden group ${
                  isActive
                    ? "border-slate-200 dark:border-slate-800 hover:border-brand-crimson/40"
                    : "border-slate-200/70 dark:border-slate-800/70 opacity-75"
                }`}
              >
                {/* Exercise Image Banner */}
                {ex.thumbnailUrl ? (
                  <div className="w-full h-40 overflow-hidden bg-slate-950 relative">
                    <img
                      src={ex.thumbnailUrl}
                      alt={ex.nameEn || ex.nameAr}
                      onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                    {ex.videoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveVideoUrl(ex.videoUrl!);
                          setActiveVideoTitle(ex.nameEn || ex.nameAr);
                        }}
                        className="absolute bottom-3 end-3 px-2.5 py-1 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-[10px] font-bold shadow-lg flex items-center space-x-1.5 rtl:space-x-reverse transition-all backdrop-blur-md cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Video Demo</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 pb-0 flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    {ex.videoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveVideoUrl(ex.videoUrl!);
                          setActiveVideoTitle(ex.nameEn || ex.nameAr);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-bold flex items-center space-x-1 rtl:space-x-reverse transition-all cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-red-500" />
                        <span>Video Demo</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {ex.nameEn || ex.nameAr}
                        </h3>
                        {!isActive && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30">
                            Archived
                          </span>
                        )}
                      </div>

                      {canManageExercises && (
                        <div className="flex items-center space-x-1 rtl:space-x-reverse flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditModal(ex)}
                            title="Edit Exercise"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(ex, !isActive)}
                            title={isActive ? "Archive Exercise" : "Reactivate Exercise"}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          >
                            {isActive ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteConfirmExercise(ex);
                            }}
                            title="Delete Exercise"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Multi-Sport Badges */}
                    {exSports.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {exSports.map(sp => (
                          <span
                            key={sp.id}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-crimson/10 text-brand-crimson border border-brand-crimson/25"
                          >
                            <Trophy className="w-2.5 h-2.5" />
                            <span>{sp.nameEn || sp.nameAr}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 items-center pt-1">
                      {getDifficultyBadge(ex.difficulty)}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {ex.primaryMuscle?.nameEn || ex.primaryMuscle?.nameAr || "Primary Muscle"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {ex.equipment?.nameEn || ex.equipment?.nameAr || "Free / Machine"}
                      </span>
                    </div>

                    {(ex.descriptionEn || ex.descriptionAr) && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 pt-1 leading-relaxed">
                        {ex.descriptionEn || ex.descriptionAr}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveExercise(ex)}
                      className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-crimson hover:text-white dark:hover:bg-brand-crimson text-slate-700 dark:text-slate-300 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 rtl:space-x-reverse cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Technique & Form Cues</span>
                    </button>

                    {ex.videoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveVideoUrl(ex.videoUrl!);
                          setActiveVideoTitle(ex.nameEn || ex.nameAr);
                        }}
                        title="Watch Video"
                        className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer flex-shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- VIDEO PLAYER MODAL --- */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 max-w-3xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Video className="w-5 h-5 text-red-500" />
                <h3 className="text-sm sm:text-base font-bold text-white">Exercise Demo: {activeVideoTitle}</h3>
              </div>
              <button onClick={() => setActiveVideoUrl(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner">
              {activeVideoUrl.includes("youtube.com") || activeVideoUrl.includes("youtu.be") ? (
                <iframe
                  src={getEmbedVideoUrl(activeVideoUrl) || activeVideoUrl}
                  title={activeVideoTitle}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <PlayCircle className="w-16 h-16 text-brand-crimson animate-pulse" />
                  <p className="text-xs text-slate-300">Direct Video Link:</p>
                  <a
                    href={activeVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs inline-flex items-center space-x-2 rtl:space-x-reverse"
                  >
                    <span>Open video in new tab</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TECHNIQUE CUES & DETAILS MODAL --- */}
      {activeExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeExercise.nameEn || activeExercise.nameAr}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {getExerciseSports(activeExercise).length > 0
                    ? getExerciseSports(activeExercise).map((sp) => sp.nameEn || sp.nameAr).join(" • ")
                    : (activeExercise as any).category || "Fitness Exercise"}
                </p>
              </div>
              <button onClick={() => setActiveExercise(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exercise Image in Detail Modal */}
            {activeExercise.thumbnailUrl && (
              <div className="w-full h-48 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800">
                <img
                  src={activeExercise.thumbnailUrl}
                  alt={activeExercise.nameEn || activeExercise.nameAr}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#141416] border border-[#26262A] dark:border-brand-crimson/30 space-y-1">
                <span className="font-bold text-white dark:text-brand-crimson flex items-center space-x-1.5 rtl:space-x-reverse">
                  <CheckCircle2 className="w-4 h-4 text-brand-crimson" />
                  <span>Proper Execution Instructions:</span>
                </span>
                <p className="text-slate-300 leading-relaxed pt-0.5">
                  {activeExercise.instructionsEn || activeExercise.instructionsAr}
                </p>
              </div>

              {activeExercise.coachTipsAr && (
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/20 space-y-1">
                  <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span>Coach Tips:</span>
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5">
                    {activeExercise.coachTipsAr}
                  </p>
                </div>
              )}

              {activeExercise.commonMistakesAr && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/20 space-y-1">
                  <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-1.5 rtl:space-x-reverse">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Common Mistakes to Avoid:</span>
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5">
                    {activeExercise.commonMistakesAr}
                  </p>
                </div>
              )}

              {activeExercise.videoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const vUrl = activeExercise.videoUrl!;
                    const vTitle = activeExercise.nameEn || activeExercise.nameAr;
                    setActiveExercise(null);
                    setActiveVideoUrl(vUrl);
                    setActiveVideoTitle(vTitle);
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Watch Exercise Video Demo ▶️</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADD EXERCISE MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <PlusCircle className="w-5 h-5 text-brand-crimson" />
                  <span>Add New Exercise to Library</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign one or more sports, target muscle, media URLs, and cues
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExercise} className="space-y-3.5">
              {formError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exercise Name (Internal / Alt)</label>
                  <input
                    type="text"
                    placeholder="e.g. Barbell Flat Bench Press"
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exercise Name (English) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Barbell Flat Bench Press"
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson font-mono"
                  />
                </div>
              </div>

              {/* Multi-Sport Assignment */}
              <fieldset className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                <legend className="px-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-brand-crimson" />
                  <span>Assigned Sports * ({selectedSportIds.length} selected)</span>
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {sports.map((sp) => {
                    const checked = selectedSportIds.includes(sp.id);
                    const inactive = sp.isActive === false;
                    return (
                      <label
                        key={sp.id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          checked
                            ? "border-brand-crimson/60 bg-brand-crimson/10 text-slate-900 dark:text-white font-semibold"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelectedSportIds((prev) => toggleSelection(prev, sp.id))}
                          className="w-4 h-4 rounded accent-brand-crimson"
                        />
                        <span className="truncate">
                          {sp.nameEn || sp.nameAr}
                          {inactive ? " (Archived)" : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Image URL with live preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-crimson" />
                  <span>Exercise Image URL</span>
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-... or direct image URL"
                  value={thumbnailUrl}
                  onChange={e => setThumbnailUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-brand-crimson"
                />
                {thumbnailUrl && (
                  <div className="mt-2 w-full h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
                  </div>
                )}
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Video className="w-3.5 h-3.5 text-red-500" />
                  <span>Video Demonstration URL (YouTube / Video URL)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or direct video URL"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Muscle</label>
                  <select
                    value={primaryMuscleId}
                    onChange={e => setPrimaryMuscleId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {muscleGroups.map(m => <option key={m.id} value={m.id}>{m.nameEn || m.nameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Equipment</label>
                  <select
                    value={equipmentId}
                    onChange={e => setEquipmentId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {equipmentList.map(eq => <option key={eq.id} value={eq.id}>{eq.nameEn || eq.nameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Execution Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Step-by-step instructions for executing the exercise..."
                  value={instAr}
                  onChange={e => setInstAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Coach Tips</label>
                  <input
                    type="text"
                    placeholder="e.g. Keep back straight, controlled tempo"
                    value={coachTipsAr}
                    onChange={e => setCoachTipsAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Common Mistakes</label>
                  <input
                    type="text"
                    placeholder="e.g. Excessive swinging, rounded shoulders"
                    value={commonMistakesAr}
                    onChange={e => setCommonMistakesAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                >
                  {isSubmitting ? "Saving..." : "Save Exercise ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT EXERCISE MODAL --- */}
      {isEditModalOpen && editingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <Edit className="w-5 h-5 text-brand-crimson" />
                  <span>Edit Exercise Details, Sports &amp; Media</span>
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditExerciseSubmit} className="space-y-3.5">
              {formError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exercise Name (Alt)</label>
                  <input
                    type="text"
                    value={editingExercise.nameAr}
                    onChange={e => setEditingExercise({ ...editingExercise, nameAr: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exercise Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={editingExercise.nameEn}
                    onChange={e => setEditingExercise({ ...editingExercise, nameEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Multi-Sport Assignment in Edit */}
              <fieldset className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                <legend className="px-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-brand-crimson" />
                  <span>Assigned Sports * ({editSportIds.length} selected)</span>
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {sports.map((sp) => {
                    const checked = editSportIds.includes(sp.id);
                    const inactive = sp.isActive === false;
                    return (
                      <label
                        key={sp.id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          checked
                            ? "border-brand-crimson/60 bg-brand-crimson/10 text-slate-900 dark:text-white font-semibold"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setEditSportIds((prev) => toggleSelection(prev, sp.id))}
                          className="w-4 h-4 rounded accent-brand-crimson"
                        />
                        <span className="truncate">
                          {sp.nameEn || sp.nameAr}
                          {inactive ? " (Archived)" : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Image URL in Edit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-crimson" />
                  <span>Exercise Image URL</span>
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editingExercise.thumbnailUrl || ""}
                  onChange={e => setEditingExercise({ ...editingExercise, thumbnailUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Video URL in Edit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Video className="w-3.5 h-3.5 text-red-500" />
                  <span>Video Demonstration URL</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={editingExercise.videoUrl || ""}
                  onChange={e => setEditingExercise({ ...editingExercise, videoUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Muscle</label>
                  <select
                    value={editingExercise.primaryMuscleId || ""}
                    onChange={e => setEditingExercise({ ...editingExercise, primaryMuscleId: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">None</option>
                    {muscleGroups.map(m => <option key={m.id} value={m.id}>{m.nameEn || m.nameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Equipment</label>
                  <select
                    value={editingExercise.equipmentId || ""}
                    onChange={e => setEditingExercise({ ...editingExercise, equipmentId: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">None</option>
                    {equipmentList.map(eq => <option key={eq.id} value={eq.id}>{eq.nameEn || eq.nameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={editingExercise.difficulty}
                    onChange={e => setEditingExercise({ ...editingExercise, difficulty: e.target.value as Difficulty })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Execution Instructions</label>
                <textarea
                  rows={2}
                  value={editingExercise.instructionsEn || editingExercise.instructionsAr || ""}
                  onChange={e => setEditingExercise({ ...editingExercise, instructionsEn: e.target.value, instructionsAr: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingExercise.isActive ?? true}
                  onChange={e => setEditingExercise({ ...editingExercise, isActive: e.target.checked })}
                  className="w-4 h-4 rounded accent-brand-crimson"
                />
                <span>Active in Library (uncheck to archive without deleting historical assignments)</span>
              </label>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                >
                  {isSubmitting ? "Saving..." : "Update Exercise ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE / ARCHIVE CONFIRMATION MODAL --- */}
      {deleteConfirmExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-500">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Exercise
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmExercise(null);
                  setDeleteError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Delete <strong className="text-slate-900 dark:text-white">{deleteConfirmExercise.nameEn || deleteConfirmExercise.nameAr}</strong>?
              Exercises referenced in workout templates, client assignments, or workout logs cannot be hard-deleted to preserve history.
            </p>

            {deleteError && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-medium space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
                {(deleteConfirmExercise.isActive ?? true) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const target = deleteConfirmExercise;
                      setDeleteConfirmExercise(null);
                      setDeleteError(null);
                      await handleToggleActive(target, false);
                    }}
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Exercise Instead</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmExercise(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteExercise}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold"
              >
                {isSubmitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


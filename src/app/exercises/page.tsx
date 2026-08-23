"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { Exercise, Difficulty, MetricType, BodyPart } from "@/types";
import {
  Dumbbell,
  Search,
  Filter,
  PlusCircle,
  PlayCircle,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sparkles,
  X,
  ExternalLink,
  Info,
  Edit,
  Trash2
} from "lucide-react";

export default function ExercisesPage() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("ALL");
  const [selectedMuscle, setSelectedMuscle] = useState("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");

  // Selected exercise for detail modal
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [detailLang, setDetailLang] = useState<"ar" | "en">("ar");

  // Add Exercise Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [instAr, setInstAr] = useState("");
  const [instEn, setInstEn] = useState("");
  const [sportId, setSportId] = useState("sport-bodybuilding");
  const [primaryMuscleId, setPrimaryMuscleId] = useState("mg-chest");
  const [equipmentId, setEquipmentId] = useState("eq-barbell");
  const [difficulty, setDifficulty] = useState<Difficulty>("BEGINNER");
  const [metricType, setMetricType] = useState<MetricType>("SETS_REPS_WEIGHT");
  const [contraindicated, setContraindicated] = useState<BodyPart[]>([]);

  const sports = db.getSports();
  const muscleGroups = db.getMuscleGroups();
  const equipmentList = db.getEquipment();

  const loadExercises = () => {
    setExercises(db.getExercises());
  };

  useEffect(() => {
    loadExercises();
    const handleDbChange = () => loadExercises();
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, []);

  const filteredExercises = exercises.filter(ex => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      ex.nameAr.toLowerCase().includes(q) ||
      ex.nameEn.toLowerCase().includes(q) ||
      (ex.descriptionAr && ex.descriptionAr.toLowerCase().includes(q)) ||
      (ex.descriptionEn && ex.descriptionEn.toLowerCase().includes(q));

    const matchesSport = selectedSport === "ALL" || ex.sportId === selectedSport;
    const matchesMuscle = selectedMuscle === "ALL" || ex.primaryMuscleId === selectedMuscle;
    const matchesDiff = selectedDifficulty === "ALL" || ex.difficulty === selectedDifficulty;

    return matchesSearch && matchesSport && matchesMuscle && matchesDiff;
  });

  const handleCreateExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !nameEn) return;

    db.createExercise({
      nameAr,
      nameEn,
      descriptionAr: descAr,
      descriptionEn: descEn,
      instructionsAr: instAr,
      instructionsEn: instEn,
      sportId,
      primaryMuscleId,
      equipmentId,
      difficulty,
      metricType,
      contraindicatedBodyParts: contraindicated
    });

    setIsAddModalOpen(false);
    setNameAr("");
    setNameEn("");
    setDescAr("");
    setDescEn("");
    setInstAr("");
    setInstEn("");
    loadExercises();
  };

  const handleEditExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise) return;

    db.updateExercise(editingExercise.id, {
      nameAr: editingExercise.nameAr,
      nameEn: editingExercise.nameEn,
      descriptionAr: editingExercise.descriptionAr,
      descriptionEn: editingExercise.descriptionEn,
      instructionsAr: editingExercise.instructionsAr,
      instructionsEn: editingExercise.instructionsEn,
      sportId: editingExercise.sportId,
      primaryMuscleId: editingExercise.primaryMuscleId,
      equipmentId: editingExercise.equipmentId,
      difficulty: editingExercise.difficulty,
      metricType: editingExercise.metricType
    });

    setIsEditModalOpen(false);
    setEditingExercise(null);
    loadExercises();
  };

  const handleDeleteExercise = (id: string, name: string) => {
    if (confirm(language === "ar" ? `هل أنت متأكد من حذف التمرين "${name}"؟` : `Delete exercise "${name}"?`)) {
      db.deleteExercise(id);
      if (activeExercise?.id === id) setActiveExercise(null);
      loadExercises();
    }
  };

  const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case "BEGINNER":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">مبتدئ • Beginner</span>;
      case "INTERMEDIATE":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">متوسط • Intermediate</span>;
      case "ADVANCED":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">متقدم • Advanced</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">{diff}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Dumbbell className="w-6 h-6 text-emerald-500" />
            <span>{t("navExercises")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {filteredExercises.length} {language === "ar" ? "تمرين" : "exercises"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "مكتبة التمارين الرياضية ثنائية اللغة، إرشادات الأداء، إمكانية الإضافة والتعديل والحذف الفوري"
              : "Bilingual exercise database, execution cues, live add/edit/delete"}
          </p>
        </div>

        {user?.role !== "CLIENT" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === "ar" ? "إضافة تمرين جديد +" : "Add Exercise +"}</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
          <input
            type="text"
            placeholder={language === "ar" ? "بحث بالاسم العربي أو الإنجليزي..." : "Search exercise..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedSport}
            onChange={e => setSelectedSport(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">{language === "ar" ? "جميع الرياضات" : "All Sports"}</option>
            {sports.map(s => (
              <option key={s.id} value={s.id}>{language === "ar" ? s.nameAr : s.nameEn}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedMuscle}
            onChange={e => setSelectedMuscle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">{language === "ar" ? "جميع العضلات المستهدفة" : "All Muscle Groups"}</option>
            {muscleGroups.map(m => (
              <option key={m.id} value={m.id}>{language === "ar" ? m.nameAr : m.nameEn}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">{language === "ar" ? "كل مستويات الصعوبة" : "All Difficulties"}</option>
            <option value="BEGINNER">مبتدئ (Beginner)</option>
            <option value="INTERMEDIATE">متوسط (Intermediate)</option>
            <option value="ADVANCED">متقدم (Advanced)</option>
          </select>
        </div>
      </div>

      {/* Exercises Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map(ex => {
          const hasContra = (ex.contraindicatedBodyParts?.length || 0) > 0;

          return (
            <div
              key={ex.id}
              className="bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {ex.sport?.nameAr || "لياقة"}
                  </span>
                  {getDifficultyBadge(ex.difficulty)}
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">
                  {language === "ar" ? ex.nameAr : ex.nameEn}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mb-2">
                  {language === "ar" ? ex.nameEn : ex.nameAr}
                </p>

                {/* Details Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    💪 {ex.primaryMuscle?.nameAr || "عضلة رئيسية"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    🏋️ {ex.equipment?.nameAr || "أوزان حرة"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    📊 {ex.metricType}
                  </span>
                </div>

                {/* Description Preview */}
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {language === "ar" ? (ex.descriptionAr || ex.descriptionEn) : (ex.descriptionEn || ex.descriptionAr)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                <button
                  onClick={() => setActiveExercise(ex)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 rtl:space-x-reverse"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "عرض الشرح والفيديو" : "View Cues & Video"}</span>
                </button>

                {user?.role !== "CLIENT" && (
                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <button
                      onClick={() => {
                        setEditingExercise(JSON.parse(JSON.stringify(ex)));
                        setIsEditModalOpen(true);
                      }}
                      title="تعديل التمرين"
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteExercise(ex.id, ex.nameAr)}
                      title="حذف التمرين"
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL MODAL */}
      {activeExercise && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {detailLang === "ar" ? activeExercise.nameAr : activeExercise.nameEn}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {detailLang === "ar" ? activeExercise.nameEn : activeExercise.nameAr}
                </p>
              </div>
              <button onClick={() => setActiveExercise(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex space-x-2 rtl:space-x-reverse border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setDetailLang("ar")}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${detailLang === "ar" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
              >
                العربية 🇪🇬
              </button>
              <button
                onClick={() => setDetailLang("en")}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${detailLang === "en" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
              >
                English 🇬🇧
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">وصف التمرين:</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                  {detailLang === "ar" ? (activeExercise.descriptionAr || "لا يوجد وصف مدخل") : (activeExercise.descriptionEn || "No description provided")}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">تعليمات وتكنيك الأداء:</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl font-mono text-[11px]">
                  {detailLang === "ar" ? (activeExercise.instructionsAr || "لا توجد تعليمات مدخلة") : (activeExercise.instructionsEn || "No instructions provided")}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setActiveExercise(null)}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EXERCISE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                <span>إضافة تمرين جديد للمكتبة</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExercise} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الاسم بالعربي *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بنش برس مستوي"
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الاسم بالإنجليزي *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Barbell Bench Press"
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الرياضة</label>
                  <select
                    value={sportId}
                    onChange={e => setSportId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {sports.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">العضلة المستهدفة</label>
                  <select
                    value={primaryMuscleId}
                    onChange={e => setPrimaryMuscleId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {muscleGroups.map(m => <option key={m.id} value={m.id}>{m.nameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الصعوبة</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">مبتدئ</option>
                    <option value="INTERMEDIATE">متوسط</option>
                    <option value="ADVANCED">متقدم</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الوصف بالعربي</label>
                <textarea
                  rows={2}
                  value={descAr}
                  onChange={e => setDescAr(e.target.value)}
                  placeholder="وصف مبسط للتمرين وفوائده..."
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">تعليمات الأداء والتكنيك (عربي)</label>
                <textarea
                  rows={2}
                  value={instAr}
                  onChange={e => setInstAr(e.target.value)}
                  placeholder="1. استلقِ على البنش...&#10;2. انزل بالبار بتحكم..."
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  حفظ التمرين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXERCISE MODAL */}
      {isEditModalOpen && editingExercise && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Edit className="w-5 h-5 text-blue-500" />
                <span>تعديل بيانات التمرين</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditExerciseSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الاسم بالعربي</label>
                  <input
                    type="text"
                    required
                    value={editingExercise.nameAr}
                    onChange={e => setEditingExercise({ ...editingExercise, nameAr: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الاسم بالإنجليزي</label>
                  <input
                    type="text"
                    required
                    value={editingExercise.nameEn}
                    onChange={e => setEditingExercise({ ...editingExercise, nameEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الرياضة</label>
                  <select
                    value={editingExercise.sportId}
                    onChange={e => setEditingExercise({ ...editingExercise, sportId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {sports.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الصعوبة</label>
                  <select
                    value={editingExercise.difficulty}
                    onChange={e => setEditingExercise({ ...editingExercise, difficulty: e.target.value as Difficulty })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">مبتدئ</option>
                    <option value="INTERMEDIATE">متوسط</option>
                    <option value="ADVANCED">متقدم</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الوصف</label>
                <textarea
                  rows={2}
                  value={editingExercise.descriptionAr || ""}
                  onChange={e => setEditingExercise({ ...editingExercise, descriptionAr: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
                >
                  تأكيد التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

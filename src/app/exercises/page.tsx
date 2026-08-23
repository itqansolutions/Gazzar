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
  Info
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
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [instAr, setInstAr] = useState("");
  const [instEn, setInstEn] = useState("");
  const [sportId, setSportId] = useState("sport-1");
  const [primaryMuscleId, setPrimaryMuscleId] = useState("mg-chest");
  const [equipmentId, setEquipmentId] = useState("eq-barbell");
  const [difficulty, setDifficulty] = useState<Difficulty>("BEGINNER");
  const [metricType, setMetricType] = useState<MetricType>("SETS_REPS_WEIGHT");
  const [contraindicated, setContraindicated] = useState<BodyPart[]>([]);

  const sports = db.getSports();
  const muscleGroups = db.getMuscleGroups();
  const equipmentList = db.getEquipment();

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = () => {
    setExercises(db.getExercises());
  };

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
    loadExercises();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Dumbbell className="w-6 h-6 text-emerald-400" />
            <span>{t("navExercises")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {filteredExercises.length} {language === "ar" ? "تمرين" : "exercises"}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {language === "ar"
              ? "مكتبة التمارين الرياضية ثنائية اللغة، إرشادات الأداء، الفيديوهات ومحاذير الإصابات"
              : "Bilingual exercise library with coaching cues, video tutorials & medical contraindications"}
          </p>
        </div>

        {user?.role !== "CLIENT" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t("addExercise")}</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
          <input
            type="text"
            placeholder={language === "ar" ? "بحث عن تمرين بالعربي أو الإنجليزي..." : "Search exercise in AR / EN..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedSport}
            onChange={e => setSelectedSport(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
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
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">{language === "ar" ? "جميع العضلات" : "All Muscle Groups"}</option>
            {muscleGroups.map(m => (
              <option key={m.id} value={m.id}>{language === "ar" ? m.nameAr : m.nameEn}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">{language === "ar" ? "جميع المستويات" : "All Difficulties"}</option>
            <option value="BEGINNER">{language === "ar" ? "مبتدئ (Beginner)" : "Beginner"}</option>
            <option value="INTERMEDIATE">{language === "ar" ? "متوسط (Intermediate)" : "Intermediate"}</option>
            <option value="ADVANCED">{language === "ar" ? "متقدم (Advanced)" : "Advanced"}</option>
          </select>
        </div>
      </div>

      {/* Exercises Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExercises.map(ex => {
          const hasContraindications = ex.contraindicatedBodyParts && ex.contraindicatedBodyParts.length > 0;

          return (
            <div
              key={ex.id}
              onClick={() => setActiveExercise(ex)}
              className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-3xl overflow-hidden shadow-xl transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Thumbnail & Video Badge */}
                <div className="relative aspect-video bg-slate-800 overflow-hidden">
                  <img
                    src={ex.thumbnailUrl || "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600"}
                    alt={ex.nameEn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                  <div className="absolute top-2.5 start-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                    {ex.sport?.nameAr || "لياقة"}
                  </div>

                  {ex.videoUrl && (
                    <div className="absolute bottom-2.5 end-2.5 flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-full bg-slate-950/80 text-white text-[11px] font-semibold border border-slate-700">
                      <PlayCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>فيديو توضيحي</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {ex.nameAr}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400 tracking-wide mt-0.5">{ex.nameEn}</p>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {language === "ar" ? ex.descriptionAr : ex.descriptionEn}
                  </p>

                  {/* Muscle & Equipment Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      💪 {ex.primaryMuscle?.nameAr || "عضلة رئيسية"}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      🏋️ {ex.equipment?.nameAr || "أوزان"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      ex.difficulty === "ADVANCED" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}>
                      {ex.difficulty}
                    </span>
                  </div>

                  {/* Contraindication Warning Badge ⚠ */}
                  {hasContraindications && (
                    <div className="px-2.5 py-1.5 rounded-xl bg-red-950/30 border border-red-500/30 flex items-center space-x-2 rtl:space-x-reverse">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-red-300 truncate">
                        محظور لإصابات: {ex.contraindicatedBodyParts.join("، ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* View Details Action */}
              <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                <span>{t("viewDetails")}</span>
                <Info className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Exercise Detail Modal */}
      {activeExercise && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{activeExercise.nameAr}</h3>
                <p className="text-xs font-semibold text-slate-400">{activeExercise.nameEn}</p>
              </div>
              <button onClick={() => setActiveExercise(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Toggle in Modal */}
            <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">عرض الشرح بلغة:</span>
              <div className="flex space-x-1 rtl:space-x-reverse">
                <button
                  onClick={() => setDetailLang("ar")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    detailLang === "ar" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  العربية
                </button>
                <button
                  onClick={() => setDetailLang("en")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    detailLang === "en" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Video preview / Tutorial */}
            {activeExercise.videoUrl && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <PlayCircle className="w-5 h-5 text-red-500" />
                  <span className="text-xs font-bold text-white">فيديو الشرح والأداء الصحيح</span>
                </div>
                <a
                  href={activeExercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-bold text-emerald-400 hover:underline"
                >
                  <span>مشاهدة على YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{t("instructions")}</h4>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
                {detailLang === "ar" ? activeExercise.instructionsAr : activeExercise.instructionsEn}
              </p>
            </div>

            {/* Common Mistakes */}
            {activeExercise.commonMistakesAr && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">{t("commonMistakes")}</h4>
                <p className="text-xs text-slate-200 leading-relaxed bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-2xl">
                  {detailLang === "ar" ? activeExercise.commonMistakesAr : activeExercise.commonMistakesEn}
                </p>
              </div>
            )}

            {/* Coach Tips */}
            {activeExercise.coachTipsAr && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">{t("coachTips")}</h4>
                <p className="text-xs text-slate-200 leading-relaxed bg-teal-950/20 border border-teal-500/30 p-3.5 rounded-2xl">
                  {detailLang === "ar" ? activeExercise.coachTipsAr : activeExercise.coachTipsEn}
                </p>
              </div>
            )}

            {/* Medical Contraindication Alert ⚠ */}
            {activeExercise.contraindicatedBodyParts?.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-start space-x-2.5 rtl:space-x-reverse">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <h5 className="text-xs font-bold text-red-300">تحذير طبي وإصابات:</h5>
                  <p className="text-[11px] text-red-200 mt-0.5">
                    يُمنع أو يحذر من أداء هذا التمرين للاعبين الذين يعانون من مشاكل في:{" "}
                    <strong>{activeExercise.contraindicatedBodyParts.join("، ")}</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add New Exercise */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>{t("addExercise")}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExercise} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">اسم التمرين (عربي) *</label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    placeholder="سكوات بالبار"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Exercise Name (EN) *</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    placeholder="Barbell Squat"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">الرياضة</label>
                  <select
                    value={sportId}
                    onChange={e => setSportId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    {sports.map(s => (
                      <option key={s.id} value={s.id}>{s.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">العضلة المستهدفة</label>
                  <select
                    value={primaryMuscleId}
                    onChange={e => setPrimaryMuscleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    {muscleGroups.map(m => (
                      <option key={m.id} value={m.id}>{m.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">المعدات</label>
                  <select
                    value={equipmentId}
                    onChange={e => setEquipmentId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    {equipmentList.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">الصعوبة</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="BEGINNER">مبتدئ</option>
                    <option value="INTERMEDIATE">متوسط</option>
                    <option value="ADVANCED">متقدم</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">نوع القياس</label>
                  <select
                    value={metricType}
                    onChange={e => setMetricType(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="SETS_REPS_WEIGHT">مجموعات/تكرار</option>
                    <option value="DISTANCE_TIME_PACE">مسافة/زمن</option>
                    <option value="ROUNDS_REPS_TIME">جولات CrossFit</option>
                    <option value="LAPS_TIME">لفات سباحة</option>
                    <option value="TIME_HOLD">ثبات بالزمن</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">طريقة الأداء والشرح (عربي)</label>
                <textarea
                  rows={2}
                  value={instAr}
                  onChange={e => setInstAr(e.target.value)}
                  placeholder="خطوات التمرين الدقيقة..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300">
                  {t("cancel")}
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md">
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
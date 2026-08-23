"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { TrainingProgram } from "@/types";
import {
  BookOpen,
  PlusCircle,
  Calendar,
  Dumbbell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flame,
  X,
  Trash2,
  Edit2
} from "lucide-react";

export default function ProgramsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [descriptionAr, setDescriptionAr] = useState("");

  const refreshPrograms = () => {
    setPrograms(db.getPrograms());
  };

  useEffect(() => {
    refreshPrograms();
    const handleDbChange = () => refreshPrograms();
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, []);

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      db.createProgram({
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || titleAr.trim(),
        descriptionAr: descriptionAr.trim() || "برنامج تدريبي مخصص",
        descriptionEn: descriptionAr.trim() || "Custom training regimen",
        durationWeeks: Number(durationWeeks) || 8,
        sportId: "sport-bodybuilding",
        goalType: "MUSCLE_GAIN",
        difficulty: "INTERMEDIATE",
        isTemplate: true,
        weeks: []
      });

      refreshPrograms();
      setIsAddModalOpen(false);
      setTitleAr("");
      setTitleEn("");
      setDescriptionAr("");
    } catch (err: any) {
      alert(err.message || "Error creating program");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <BookOpen className="w-6 h-6 text-emerald-500" />
            <span>{t("navPrograms")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {programs.length} {language === "ar" ? "برامج تدريبية" : "programs"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "البرامج التدريبية الممتدة لعدة أسابيع (برنامج ← أسابيع ← أيام تدريب ← تمارين)"
              : "Multi-week structured regimens: Program -> Weeks -> Days -> Workouts"}
          </p>
        </div>

        {user?.role !== "CLIENT" && (
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{language === "ar" ? "إنشاء برنامج جديد +" : "Create Program +"}</span>
            </button>
            <Link
              href="/assignments"
              className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all"
            >
              <span>تعيين لمشترك 🎯</span>
            </Link>
          </div>
        )}
      </div>

      {/* Programs List */}
      {programs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === "ar" ? "لا توجد برامج تدريبية مسجلة حالياً" : "No training programs found"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {language === "ar"
                ? "أنشئ برامجك التدريبية المتكاملة الممتدة لعدة أسابيع وقم بتعيينها للمشتركين بضغطة زر."
                : "Create structured multi-week regimens to assign directly to athletes."}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all inline-flex items-center space-x-2 rtl:space-x-reverse"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === "ar" ? "إنشاء أول برنامج تدريبي" : "Create First Program"}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {programs.map(prog => {
            const isExpanded = expandedProgramId === prog.id;

            return (
              <div
                key={prog.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-all"
              >
                {/* Program Header Banner */}
                <div
                  onClick={() => setExpandedProgramId(isExpanded ? null : prog.id)}
                  className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 flex-shrink-0">
                      <Flame className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{prog.titleAr}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {prog.durationWeeks} {language === "ar" ? "أسبوع" : "Weeks"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{prog.titleEn}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">{prog.descriptionAr}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <Link
                      href="/assignments"
                      onClick={e => e.stopPropagation()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                    >
                      تطبيق على مشترك 🚀
                    </Link>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Program Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">إنشاء برنامج تدريبي جديد</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم البرنامج بالعربي *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. برنامج التضخيم وقوة العضلات 12 أسبوع"
                  value={titleAr}
                  onChange={e => setTitleAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم البرنامج بالإنجليزي</label>
                <input
                  type="text"
                  placeholder="e.g. 12-Week Hypertrophy & Strength"
                  value={titleEn}
                  onChange={e => setTitleEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المدة بالأسابيع</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={durationWeeks}
                  onChange={e => setDurationWeeks(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الوصف</label>
                <textarea
                  rows={3}
                  placeholder="وصف تفصيلي للبرنامج والفئة المستهدفة..."
                  value={descriptionAr}
                  onChange={e => setDescriptionAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  {language === "ar" ? "حفظ البرنامج ✓" : "Save Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

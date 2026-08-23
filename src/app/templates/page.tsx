"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { WorkoutTemplate, Exercise } from "@/types";
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
  Send
} from "lucide-react";

export default function TemplatesPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>("tpl-upper-body");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);

  // New Template Form
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [sportId, setSportId] = useState("sport-bodybuilding");
  const [difficulty, setDifficulty] = useState<any>("INTERMEDIATE");

  const sports = db.getSports();
  const exercises = db.getExercises();

  const loadTemplates = () => {
    setTemplates(db.getTemplates());
  };

  useEffect(() => {
    loadTemplates();
    const handleDbChange = () => loadTemplates();
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, []);

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr || !titleEn) return;

    db.createTemplate({
      titleAr,
      titleEn,
      descriptionAr: descAr,
      sportId,
      difficulty,
      exercises: [
        {
          id: `tple-${Date.now()}`,
          templateId: "",
          exerciseId: exercises[0]?.id || "ex-bench",
          exercise: exercises[0],
          orderIndex: 1,
          targetSets: 4,
          targetReps: "10",
          targetWeightKg: 50,
          restSeconds: 60
        }
      ]
    });

    setIsCreateModalOpen(false);
    setTitleAr("");
    setTitleEn("");
    setDescAr("");
    loadTemplates();
  };

  const handleEditTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    db.updateTemplate(editingTemplate.id, {
      titleAr: editingTemplate.titleAr,
      titleEn: editingTemplate.titleEn,
      descriptionAr: editingTemplate.descriptionAr,
      sportId: editingTemplate.sportId,
      difficulty: editingTemplate.difficulty
    });

    setIsEditModalOpen(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  const handleDeleteTemplate = (id: string, title: string) => {
    if (confirm(language === "ar" ? `هل أنت متأكد من حذف القالب "${title}"؟` : `Delete template "${title}"?`)) {
      db.deleteTemplate(id);
      loadTemplates();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Layers className="w-6 h-6 text-emerald-500" />
            <span>{t("navTemplates")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {templates.length} {language === "ar" ? "قالب جاهز" : "templates"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "قوالب التمارين الجاهزة بمختلف المقاييس مع دعم التعديل والحذف وتعيينها للمتدربين فوراً"
              : "Pre-built workout templates supporting live editing, deletion, and client assignments"}
          </p>
        </div>

        {user?.role !== "CLIENT" && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t("createTemplate")} +</span>
          </button>
        )}
      </div>

      {/* Templates Accordion Grid */}
      <div className="space-y-4">
        {templates.map(tpl => {
          const isExpanded = expandedId === tpl.id;

          return (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all"
            >
              {/* Header Row */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div
                  className="flex items-center space-x-4 rtl:space-x-reverse cursor-pointer flex-1"
                  onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold flex-shrink-0">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {language === "ar" ? tpl.titleAr : tpl.titleEn}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {tpl.sport?.nameAr || "لياقة بدنية"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tpl.exercises?.length || 0} تمارين • {tpl.descriptionAr || tpl.descriptionEn || "قالب تدريبي شامل"}
                    </p>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center space-x-2 rtl:space-x-reverse self-end sm:self-center">
                  <Link
                    href="/assignments"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1 rtl:space-x-reverse"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>تعيين لمتدرب 🎯</span>
                  </Link>

                  {user?.role !== "CLIENT" && (
                    <>
                      <button
                        onClick={() => {
                          setEditingTemplate(JSON.parse(JSON.stringify(tpl)));
                          setIsEditModalOpen(true);
                        }}
                        title="تعديل القالب"
                        className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.titleAr)}
                        title="حذف القالب"
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    تمارين وجولات هذا القالب ({tpl.exercises?.length || 0}):
                  </h4>

                  <div className="space-y-2">
                    {tpl.exercises?.map((te, idx) => (
                      <div
                        key={te.id || idx}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-[11px]">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {language === "ar" ? te.exercise?.nameAr : te.exercise?.nameEn}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {te.targetSets} مجموعات × {te.targetReps} تكرار • وزن مقترح: {te.targetWeightKg || "—"} KG
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-mono">
                          راحة: {te.restSeconds} ث
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE TEMPLATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                <span>إنشاء قالب تمرين جديد</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">اسم القالب (عربي) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تمرين الصدر والتراي"
                    value={titleAr}
                    onChange={e => setTitleAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">اسم القالب (English) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chest & Triceps Blast"
                    value={titleEn}
                    onChange={e => setTitleEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الرياضة</label>
                  <select
                    value={sportId}
                    onChange={e => setSportId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {sports.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">المستوى</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">مبتدئ</option>
                    <option value="INTERMEDIATE">متوسط</option>
                    <option value="ADVANCED">متقدم</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">وصف القالب والهدف منه</label>
                <textarea
                  rows={2}
                  value={descAr}
                  onChange={e => setDescAr(e.target.value)}
                  placeholder="وصف مختصر للبرنامج..."
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  حفظ القالب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEMPLATE MODAL */}
      {isEditModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Edit className="w-5 h-5 text-blue-500" />
                <span>تعديل قالب التمرين</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTemplateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">اسم القالب (عربي)</label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.titleAr}
                    onChange={e => setEditingTemplate({ ...editingTemplate, titleAr: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">اسم القالب (English)</label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.titleEn}
                    onChange={e => setEditingTemplate({ ...editingTemplate, titleEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الوصف</label>
                <textarea
                  rows={2}
                  value={editingTemplate.descriptionAr || ""}
                  onChange={e => setEditingTemplate({ ...editingTemplate, descriptionAr: e.target.value })}
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
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

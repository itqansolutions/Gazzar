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
  Sparkles
} from "lucide-react";

export default function TemplatesPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>("tpl-upper-body");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Template Form
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [sportId, setSportId] = useState("sport-1");
  const [difficulty, setDifficulty] = useState<any>("INTERMEDIATE");

  const sports = db.getSports();
  const exercises = db.getExercises();

  useEffect(() => {
    setTemplates(db.getTemplates());
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
          exerciseId: "ex-bench",
          exercise: exercises[1],
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
    setTemplates(db.getTemplates());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Layers className="w-6 h-6 text-emerald-400" />
            <span>{t("navTemplates")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {templates.length} {language === "ar" ? "قالب جاهز" : "templates"}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {language === "ar"
              ? "قوالب التمارين الجاهزة بمختلف المقاييس (أوزان، مسافات، جولات كروس فيت، سباحة)"
              : "Pre-built workout templates supporting flexible sets/reps, running pace, and WODs"}
          </p>
        </div>

        {user?.role !== "CLIENT" && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t("createTemplate")}</span>
          </button>
        )}
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {templates.map(tpl => {
          const isExpanded = expandedId === tpl.id;

          return (
            <div
              key={tpl.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all"
            >
              {/* Template Card Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">{tpl.titleAr}</h3>
                    <p className="text-xs font-semibold text-slate-400">{tpl.titleEn}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{tpl.exercises.length} تمارين • {tpl.sport?.nameAr || "كمال أجسام"}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                    {tpl.difficulty}
                  </span>
                  <Link
                    href="/assignments"
                    onClick={e => e.stopPropagation()}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                  >
                    تعيين لمشترك 🎯
                  </Link>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {/* Expanded Exercises in Template */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-800/70 space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">تمارين القالب والمقاييس المستهدفة:</h4>
                  <div className="space-y-2">
                    {tpl.exercises.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-white">{item.exercise?.nameAr || "تمرين"}</p>
                            <p className="text-[11px] text-slate-400">{item.exercise?.nameEn}</p>
                          </div>
                        </div>

                        {/* Metric Targets Badge */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {item.targetSets && (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-bold text-emerald-400">
                              {item.targetSets} {language === "ar" ? "مجموعات" : "Sets"} × {item.targetReps || "10"}
                            </span>
                          )}
                          {item.targetWeightKg && (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-bold text-white">
                              {item.targetWeightKg} KG
                            </span>
                          )}
                          {item.targetDistanceKm && (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-bold text-blue-400">
                              🏃 {item.targetDistanceKm} KM ({item.targetPace || "5:00/km"})
                            </span>
                          )}
                          {item.restSeconds && (
                            <span className="px-2 py-1 rounded-lg bg-slate-900/60 text-slate-400 text-[11px] flex items-center space-x-1 rtl:space-x-reverse">
                              <Clock className="w-3 h-3" />
                              <span>راحة {item.restSeconds}ث</span>
                            </span>
                          )}
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

      {/* Modal: Create Template */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>{t("createTemplate")}</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">اسم القالب (عربي) *</label>
                <input
                  type="text"
                  required
                  value={titleAr}
                  onChange={e => setTitleAr(e.target.value)}
                  placeholder="تمرين أرجل وقوة سفلية"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Template Title (EN) *</label>
                <input
                  type="text"
                  required
                  value={titleEn}
                  onChange={e => setTitleEn(e.target.value)}
                  placeholder="Legs & Lower Body Hypertrophy"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">المستوى</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="BEGINNER">مبتدئ</option>
                    <option value="INTERMEDIATE">متوسط</option>
                    <option value="ADVANCED">متقدم</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300">
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
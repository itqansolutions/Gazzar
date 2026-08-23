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
  Flame
} from "lucide-react";

export default function ProgramsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>("prog-12w-fatloss");

  useEffect(() => {
    setPrograms(db.getPrograms());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <span>{t("navPrograms")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {programs.length} {language === "ar" ? "برامج تدريبية" : "programs"}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {language === "ar"
              ? "البرامج التدريبية الممتدة لعدة أسابيع (برنامج ← أسابيع ← أيام تدريب ← تمارين)"
              : "Multi-week structured regimens: Program -> Weeks -> Days -> Workouts"}
          </p>
        </div>

        {user?.role !== "CLIENT" && (
          <Link
            href="/assignments"
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تعيين برنامج لمشترك 🎯</span>
          </Link>
        )}
      </div>

      {/* Programs List */}
      <div className="space-y-6">
        {programs.map(prog => {
          const isExpanded = expandedProgramId === prog.id;

          return (
            <div
              key={prog.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all"
            >
              {/* Program Header Banner */}
              <div
                onClick={() => setExpandedProgramId(isExpanded ? null : prog.id)}
                className="p-6 cursor-pointer hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 flex-shrink-0">
                    <Flame className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                      <h3 className="text-base sm:text-lg font-bold text-white">{prog.titleAr}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {prog.durationWeeks} {language === "ar" ? "أسبوع" : "Weeks"}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">{prog.titleEn}</p>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl">{prog.descriptionAr}</p>
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

              {/* Weeks & Days Hierarchy */}
              {isExpanded && prog.weeks && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-800 space-y-4 animate-in fade-in">
                  {prog.weeks.map(week => (
                    <div key={week.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          الأسبوع {week.weekNumber}: {week.focusAr}
                        </span>
                        <span className="text-[11px] text-slate-400">{week.days.length} أيام تدريبية</span>
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {week.days.map(day => (
                          <div
                            key={day.id}
                            className={`p-3.5 rounded-xl border ${
                              day.isRestDay
                                ? "bg-slate-900/40 border-slate-800 text-slate-400"
                                : "bg-slate-900 border-slate-700/60 text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold flex items-center space-x-2 rtl:space-x-reverse">
                                <span>{day.titleAr}</span>
                              </span>
                              {day.isRestDay && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                  راحة واستشفاء
                                </span>
                              )}
                            </div>

                            {!day.isRestDay && day.workouts && day.workouts.length > 0 && (
                              <div className="space-y-1">
                                {day.workouts.map(pw => (
                                  <div key={pw.id} className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-emerald-300 bg-slate-950/60 px-2.5 py-1.5 rounded-lg">
                                    <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="font-semibold">{pw.template?.titleAr || "تمرين اليوم"}</span>
                                  </div>
                                ))}
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
    </div>
  );
}
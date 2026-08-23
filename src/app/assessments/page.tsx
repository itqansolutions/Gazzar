"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/db";
import { ClientAssessment } from "@/types";
import {
  Activity,
  Award,
  TrendingUp,
  PlusCircle,
  CheckCircle,
  Flame,
  Clock,
  Sparkles
} from "lucide-react";

export default function AssessmentsPage() {
  const { t, language } = useLanguage();
  const [assessments, setAssessments] = useState<ClientAssessment[]>([]);

  useEffect(() => {
    setAssessments(db.getAssessments());
  }, []);

  const a1 = assessments[0]; // Baseline
  const a2 = assessments[1]; // Month 1

  const calcImprovement = (initial?: number, current?: number, lowerIsBetter: boolean = false) => {
    if (!initial || !current) return null;
    if (lowerIsBetter) {
      const diff = ((initial - current) / initial) * 100;
      return diff > 0 ? `-${diff.toFixed(0)}% (أسرع)` : `+${Math.abs(diff).toFixed(0)}%`;
    }
    const diff = ((current - initial) / initial) * 100;
    return diff > 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <Activity className="w-6 h-6 text-emerald-400" />
          <span>{t("navAssessments")}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {language === "ar"
            ? "التقييمات البدنية الدورية ومقارنة النتائج وحساب نسب التطور الفعلي"
            : "Periodic physical assessments, benchmark comparisons & improvement rates"}
        </p>
      </div>

      {/* Comparison Hero Card: Assessment #1 vs Assessment #2 */}
      {a1 && a2 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/40 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-base sm:text-lg font-bold text-white">
                  مقارنة التطور البدني: التقييم الأول vs التقييم الثاني
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">المتدرب: محمد إبراهيم الفقي (فترة 3 أسابيع تدريب)</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 self-start sm:self-auto">
              🏆 تطور عام متميز
            </span>
          </div>

          {/* Benchmark Metrics Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Pushups */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400">{t("pushups")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-white">{a2.pushupsCount}</span>
                <span className="text-xs text-slate-500 line-through">{a1.pushupsCount}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 block">
                {calcImprovement(a1.pushupsCount, a2.pushupsCount)} زيادة قوة
              </span>
            </div>

            {/* Pullups */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400">{t("pullups")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-white">{a2.pullupsCount}</span>
                <span className="text-xs text-slate-500 line-through">{a1.pullupsCount}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 block">
                {calcImprovement(a1.pullupsCount, a2.pullupsCount)} تضاعف الأداء!
              </span>
            </div>

            {/* Plank */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400">{t("plank")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-white">{a2.plankSeconds}ث</span>
                <span className="text-xs text-slate-500 line-through">{a1.plankSeconds}ث</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 block">
                {calcImprovement(a1.plankSeconds, a2.plankSeconds)} ثبات كور
              </span>
            </div>

            {/* VO2 Max */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400">{t("vo2max")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-white">{a2.vo2Max}</span>
                <span className="text-xs text-slate-500 line-through">{a1.vo2Max}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 block">
                {calcImprovement(a1.vo2Max, a2.vo2Max)} لياقة قلبية
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-xs text-slate-300">
            <span className="font-bold text-emerald-400">تقييم الكابتن المشرف:</span> {a2.coachNotes}
          </div>
        </div>
      )}

      {/* Historical Assessments List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white">سجل جميع التقييمات المسجلة</h3>
        {assessments.map(item => (
          <div key={item.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">{item.title}</h4>
              <span className="text-xs text-slate-400 font-semibold">{item.date}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ضغط</span>
                <span className="font-bold text-white">{item.pushupsCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">عقلة</span>
                <span className="font-bold text-white">{item.pullupsCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">بلانك</span>
                <span className="font-bold text-white">{item.plankSeconds}ث</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">جري 1كم</span>
                <span className="font-bold text-white">{item.runningKmTimeSec}ث</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">المرونة</span>
                <span className="font-bold text-white">{item.flexibilityScore}/10</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">VO2 Max</span>
                <span className="font-bold text-emerald-400">{item.vo2Max}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
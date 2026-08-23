"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { ClientAssessment, ClientProfile } from "@/types";
import {
  Activity,
  Award,
  TrendingUp,
  PlusCircle,
  CheckCircle,
  Flame,
  Clock,
  Sparkles,
  User,
  Calendar,
  X
} from "lucide-react";

export default function AssessmentsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const isClient = user?.role === "CLIENT";
  const myClient = isClient && user ? db.getClients().find(c => c.userId === user.id) : null;

  const [assessments, setAssessments] = useState<ClientAssessment[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");

  // Add Assessment Modal (Coach / Admin only)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetClientId, setTargetClientId] = useState("");
  const [title, setTitle] = useState("تقييم الأداء البدني الشهري");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pushups, setPushups] = useState(30);
  const [pullups, setPullups] = useState(10);
  const [plankSec, setPlankSec] = useState(75);
  const [runningSec, setRunningSec] = useState(270);
  const [flexibility, setFlexibility] = useState(8);
  const [vo2, setVo2] = useState(46.5);
  const [notes, setNotes] = useState("");

  const loadData = () => {
    const allClients = db.getClients();
    setClients(allClients);

    if (isClient && myClient) {
      setAssessments(db.getAssessments(myClient.id));
    } else if (selectedClientId !== "ALL") {
      setAssessments(db.getAssessments(selectedClientId));
    } else {
      setAssessments(db.getAssessments());
    }
  };

  useEffect(() => {
    loadData();
    const handleDbChange = () => loadData();
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, [isClient, myClient?.id, selectedClientId]);

  const calcImprovement = (initial?: number, current?: number, lowerIsBetter: boolean = false) => {
    if (!initial || !current) return null;
    if (lowerIsBetter) {
      const diff = ((initial - current) / initial) * 100;
      return diff > 0 ? `-${diff.toFixed(0)}% (أسرع)` : `+${Math.abs(diff).toFixed(0)}%`;
    }
    const diff = ((current - initial) / initial) * 100;
    return diff > 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`;
  };

  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClientId) return;

    db.createAssessment({
      clientId: targetClientId,
      coachId: user?.id || "user-coach-1",
      date,
      title,
      pushupsCount: Number(pushups),
      pullupsCount: Number(pullups),
      plankSeconds: Number(plankSec),
      runningKmTimeSec: Number(runningSec),
      flexibilityScore: Number(flexibility),
      vo2Max: Number(vo2),
      coachNotes: notes
    });

    setIsAddModalOpen(false);
    loadData();
  };

  // For Client comparison: latest vs oldest (baseline)
  const aLatest = assessments[0];
  const aBaseline = assessments.length > 1 ? assessments[assessments.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Activity className="w-6 h-6 text-emerald-500" />
            <span>{isClient ? (language === "ar" ? "تقييماتي واختباراتي البدنية" : "My Physical Assessments") : t("navAssessments")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {assessments.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isClient
              ? (language === "ar" ? "متابعة نتائج اختبارات القوة والتحمل والبلانك ومقارنة التطور مع نقطة البداية" : "Track your strength, endurance benchmarks and compare improvements over baseline")
              : (language === "ar" ? "التقييمات البدنية الدورية ومقارنة النتائج وحساب نسب التطور الفعلي" : "Periodic physical assessments, benchmark comparisons & improvement rates")}
          </p>
        </div>

        {!isClient && (
          <button
            onClick={() => {
              if (clients.length > 0) setTargetClientId(clients[0].id);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all self-start sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === "ar" ? "تسجيل تقييم بدني جديد +" : "Record Assessment +"}</span>
          </button>
        )}
      </div>

      {/* Filter by Client for Coach / Admin */}
      {!isClient && (
        <div className="flex items-center space-x-3 rtl:space-x-reverse bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl max-w-md">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">تصفية بحسب المشترك:</span>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
          >
            <option value="ALL">جميع المشتركين</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.user?.name} ({c.sport?.nameAr || "متدرب"})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Comparison Hero Card: Latest vs Baseline */}
      {aLatest && aBaseline && aLatest.id !== aBaseline.id ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-emerald-500/40 shadow-sm dark:shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {language === "ar" ? "مقارنة التطور البدني الفعلي: أحدث تقييم vs نقطة البداية (Baseline)" : "Physical Progress Comparison: Latest vs Baseline"}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === "ar" ? `الفترة بين ${aBaseline.date} إلى ${aLatest.date}` : `Between ${aBaseline.date} and ${aLatest.date}`}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
              🏆 {language === "ar" ? "تطور بدني ممتاز" : "Excellent Progress"}
            </span>
          </div>

          {/* Benchmark Metrics Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Pushups */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t("pushups")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{aLatest.pushupsCount}</span>
                <span className="text-xs text-slate-400 line-through">{aBaseline.pushupsCount}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                {calcImprovement(aBaseline.pushupsCount, aLatest.pushupsCount)} {language === "ar" ? "زيادة قوة" : "Gain"}
              </span>
            </div>

            {/* Pullups */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t("pullups")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{aLatest.pullupsCount}</span>
                <span className="text-xs text-slate-400 line-through">{aBaseline.pullupsCount}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                {calcImprovement(aBaseline.pullupsCount, aLatest.pullupsCount)} {language === "ar" ? "تطور ملحوظ" : "Improvement"}
              </span>
            </div>

            {/* Plank */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t("plank")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{aLatest.plankSeconds}ث</span>
                <span className="text-xs text-slate-400 line-through">{aBaseline.plankSeconds}ث</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                {calcImprovement(aBaseline.plankSeconds, aLatest.plankSeconds)} {language === "ar" ? "ثبات كور" : "Core endurance"}
              </span>
            </div>

            {/* VO2 Max */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t("vo2max")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{aLatest.vo2Max}</span>
                <span className="text-xs text-slate-400 line-through">{aBaseline.vo2Max}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                {calcImprovement(aBaseline.vo2Max, aLatest.vo2Max)} {language === "ar" ? "لياقة قلبية" : "Cardio capacity"}
              </span>
            </div>
          </div>

          {aLatest.coachNotes && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">تقييم الكابتن المشرف:</span> {aLatest.coachNotes}
            </div>
          )}
        </div>
      ) : null}

      {/* Historical Assessments List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {isClient ? (language === "ar" ? "سجل جميع تقييماتي البدنية المكتملة" : "Completed Assessments Log") : "سجل جميع التقييمات المسجلة"}
        </h3>

        {assessments.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
            <p className="font-bold text-slate-700 dark:text-slate-300">
              {isClient
                ? (language === "ar" ? "لم يتم إجراء تقييم بدني لك حتى الآن." : "No physical assessments recorded yet.")
                : (language === "ar" ? "لا توجد تقييمات مسجلة لهذا المشترك." : "No assessments found.")}
            </p>
            <p className="text-[11px]">
              {isClient
                ? (language === "ar" ? "سيقوم الكابتن المشرف بجدولة أول تقييم لقوتك وتحملك قريباً لمتابعة تقدمك." : "Your coach will conduct your initial fitness test soon.")
                : (language === "ar" ? "اضغط على زر إضافة تقييم لتسجيل اختبار جديد." : "Click Record Assessment to add one.")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((item, idx) => (
              <div key={item.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center">
                      #{assessments.length - idx}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">{item.date}</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{language === "ar" ? "ضغط" : "Pushups"}</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{item.pushupsCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{language === "ar" ? "عقلة" : "Pullups"}</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{item.pullupsCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{language === "ar" ? "بلانك" : "Plank"}</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{item.plankSeconds} {language === "ar" ? "ث" : "s"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{language === "ar" ? "جري 1كم" : "1km Run"}</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{item.runningKmTimeSec} {language === "ar" ? "ث" : "s"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{language === "ar" ? "المرونة" : "Flexibility"}</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{item.flexibilityScore}/10</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{language === "ar" ? "اللياقة القلبية" : "VO2 Max"}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{item.vo2Max}</span>
                  </div>
                </div>

                {item.coachNotes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                    💡 <span className="font-bold">ملاحظات الكابتن:</span> {item.coachNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- ADD ASSESSMENT MODAL (COACH / ADMIN ONLY) --- */}
      {isAddModalOpen && !isClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Activity className="w-5 h-5 text-emerald-500" />
                <span>تسجيل تقييم واختبار بدني جديد</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اختر المشترك *</label>
                <select
                  value={targetClientId}
                  onChange={e => setTargetClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.user?.name} ({c.sport?.nameAr || "متدرب"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">عنوان التقييم *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ الاختبار *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">عدد الضغط (Pushups)</label>
                  <input
                    type="number"
                    value={pushups}
                    onChange={e => setPushups(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">عدد العقلة (Pullups)</label>
                  <input
                    type="number"
                    value={pullups}
                    onChange={e => setPullups(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">بلانك (ثواني)</label>
                  <input
                    type="number"
                    value={plankSec}
                    onChange={e => setPlankSec(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">جري 1كم (ثواني)</label>
                  <input
                    type="number"
                    value={runningSec}
                    onChange={e => setRunningSec(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">المرونة (من 10)</label>
                  <input
                    type="number"
                    max={10}
                    value={flexibility}
                    onChange={e => setFlexibility(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">VO2 Max</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vo2}
                    onChange={e => setVo2(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات وتوجيهات الكابتن</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
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
                  حفظ التقييم البدني ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

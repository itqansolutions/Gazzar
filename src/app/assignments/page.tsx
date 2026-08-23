"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { ClientWorkoutAssignment, ClientProfile, WorkoutTemplate, CoachProfile } from "@/types";
import {
  ClipboardList,
  PlusCircle,
  AlertTriangle,
  Calendar,
  User,
  Dumbbell,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from "lucide-react";

export default function AssignmentsPage() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ClientWorkoutAssignment[]>([]);

  const [selectedClientId, setSelectedClientId] = useState("client-1");
  const [selectedTemplateId, setSelectedTemplateId] = useState("tpl-upper-body");
  const [selectedCoachId, setSelectedCoachId] = useState("coach-1");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [coachNotes, setCoachNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const clients = db.getClients();
  const templates = db.getTemplates();
  const coaches = db.getCoaches();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = () => {
    setAssignments(db.getAssignments());
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientRestrictions = selectedClient?.medicalRestrictions || [];

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedTemplateId) return;

    db.assignWorkout({
      clientId: selectedClientId,
      coachId: selectedCoachId,
      templateId: selectedTemplateId,
      scheduledDate,
      coachNotes
    });

    setSuccessMessage(language === "ar" ? "تم تعيين التمرين بنجاح وإرسال إشعار للمتدرب! 🚀" : "Workout assigned successfully!");
    loadAssignments();
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <ClipboardList className="w-6 h-6 text-emerald-400" />
          <span>{t("navAssignments")}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {language === "ar"
            ? "تعيين قوالب التمارين والبرامج للمشتركين مع فحص وتنبيهات المحاذير الطبية الفورية ⚠"
            : "Assign workouts to clients with live medical restriction screening & alerts"}
        </p>
      </div>

      {/* Assignment Builder & Medical Screening Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse border-b border-slate-800 pb-3">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>تعيين تمرين جديد لمشترك</span>
          </h3>

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-bold flex items-center space-x-2 rtl:space-x-reverse animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleAssign} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">اختر المشترك *</label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.user.name} ({c.sport?.nameAr || "كمال أجسام"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">قالب التمرين المطلوب *</label>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.titleAr} ({t.exercises.length} تمارين)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">تاريخ التمرين المقرر *</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">الكابتن المشرف</label>
                <select
                  value={selectedCoachId}
                  onChange={e => setSelectedCoachId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {coaches.map(co => (
                    <option key={co.id} value={co.id}>{co.user?.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">تعليمات وتوجيهات الكابتن للمتدرب</label>
              <textarea
                rows={2}
                value={coachNotes}
                onChange={e => setCoachNotes(e.target.value)}
                placeholder="مثال: ركز على التحكم في النزول (Tempo 3-1-1) والراحة 90 ثانية بين الجولات..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
            >
              تأكيد وتعيين التمرين للمتدرب 🎯
            </button>
          </form>
        </div>

        {/* Live Medical Screening Side Card ⚠ */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2 rtl:space-x-reverse">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>الفحص الطبي التلقائي للمتدرب ⚠</span>
          </h3>

          {clientRestrictions.length > 0 ? (
            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/40 space-y-2 text-xs">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-red-400 font-bold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
                <span>تنبيه إصابة نشطة: {clientRestrictions[0].conditionName}</span>
              </div>
              <p className="text-red-200 text-[11px] leading-relaxed">
                {clientRestrictions[0].description}
              </p>
              <div className="pt-2 border-t border-red-500/20">
                <span className="text-[10px] font-bold text-red-300 block mb-1">التمارين المحظورة تجنبها:</span>
                <div className="flex flex-wrap gap-1">
                  {clientRestrictions[0].restrictedExercises.map((e, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-red-900/60 text-red-200 text-[10px] font-bold">
                      ⛔ {e}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-400 flex items-center space-x-2 rtl:space-x-reverse">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>لا توجد أي محاذير طبية مسجلة لهذا المتدرب (سليم وجاهز للتمرين).</span>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1 text-xs">
            <p className="font-bold text-white">المتدرب المختار:</p>
            <p className="text-slate-300">{selectedClient?.user.name}</p>
            <p className="text-[11px] text-slate-400">الوزن الحالي: {selectedClient?.weightKg} KG • الطول: {selectedClient?.heightCm} CM</p>
          </div>
        </div>
      </div>

      {/* Assigned Workouts Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">جدول التمارين المعينة وحالات التنفيذ</h3>

        <div className="space-y-3">
          {assignments.map(a => (
            <div
              key={a.id}
              className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <h4 className="text-xs sm:text-sm font-bold text-white">{a.template?.titleAr || "تمرين مخصص"}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">← {a.client?.user.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">التاريخ: {a.scheduledDate} • الكابتن: {a.coach?.user?.name}</p>
                  {a.coachNotes && <p className="text-[10px] text-slate-500 mt-0.5">💡 {a.coachNotes}</p>}
                </div>
              </div>

              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  a.status === "COMPLETED"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}>
                  {a.status}
                </span>

                <Link
                  href={`/workout/${a.id}/execute`}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    a.status === "COMPLETED"
                      ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                  }`}
                >
                  {a.status === "COMPLETED" ? "نتائج الأداء 🏆" : "تنفيذ الآن 🏋️"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
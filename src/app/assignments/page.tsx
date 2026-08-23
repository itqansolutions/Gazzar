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
  Play,
  Flame,
  Award,
  Sparkles
} from "lucide-react";

export default function AssignmentsPage() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [assignments, setAssignments] = useState<ClientWorkoutAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<"SCHEDULED" | "COMPLETED">("SCHEDULED");

  const isClient = user?.role === "CLIENT";
  const myClient = isClient && user ? db.getClients().find(c => c.userId === user.id) : null;

  // Coach assignment form states
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedCoachId, setSelectedCoachId] = useState("coach-1");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [coachNotes, setCoachNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);

  const loadData = () => {
    const cls = db.getClients();
    const tpls = db.getTemplates();
    const cos = db.getCoaches();

    setClients(cls);
    setTemplates(tpls);
    setCoaches(cos);

    if (cls.length > 0 && !selectedClientId) setSelectedClientId(cls[0].id);
    if (tpls.length > 0 && !selectedTemplateId) setSelectedTemplateId(tpls[0].id);

    if (isClient && myClient) {
      setAssignments(db.getAssignments(myClient.id));
    } else {
      setAssignments(db.getAssignments());
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
    const handleDbChange = () => loadData();
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, [isClient, myClient?.id]);

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedTemplateId || isClient) return;

    db.assignWorkout({
      clientId: selectedClientId,
      coachId: selectedCoachId,
      templateId: selectedTemplateId,
      scheduledDate,
      coachNotes
    });

    setSuccessMessage(language === "ar" ? "تم تعيين التمرين بنجاح وإرسال إشعار للمتدرب! 🚀" : "Workout assigned successfully!");
    loadData();
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const scheduledAssignments = assignments.filter(a => a.status === "SCHEDULED");
  const completedAssignments = assignments.filter(a => a.status === "COMPLETED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <ClipboardList className="w-6 h-6 text-emerald-500" />
          <span>{isClient ? (language === "ar" ? "جدول تماريني وحصص التدريب" : "My Workouts & Sessions") : t("navAssignments")}</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            {assignments.length}
          </span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isClient
            ? (language === "ar" ? "قائمة التمارين المجدولة لك، والتمارين المكتملة، وبدء تسجيل التمرين المباشر فوراً" : "Your active training schedule, live workout logger, and session history")
            : (language === "ar" ? "تعيين قوالب التمارين والبرامج للمشتركين مع فحص وتنبيهات المحاذير الطبية الفورية ⚠" : "Assign workouts to clients with live medical restriction screening & alerts")}
        </p>
      </div>

      {/* --- FOR COACH / ADMIN ONLY: ASSIGN WORKOUT FORM --- */}
      {!isClient && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse border-b border-slate-100 dark:border-slate-800 pb-3">
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>تعيين تمرين جديد لمشترك</span>
          </h3>

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-2 rtl:space-x-reverse animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleAssign} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اختر المشترك *</label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.user?.name || "متدرب"} ({c.sport?.nameAr || "رياضة"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">قالب التمرين المطلوب *</label>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.titleAr} ({t.exercises?.length || 0} تمارين)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ التمرين المقرر *</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الكابتن المشرف</label>
                <select
                  value={selectedCoachId}
                  onChange={e => setSelectedCoachId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                >
                  {coaches.map(co => (
                    <option key={co.id} value={co.id}>{co.user?.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تعليمات وتوجيهات الكابتن للمتدرب</label>
              <textarea
                rows={2}
                placeholder="توجيهات تخص أوزان اليوم، الإحماء، والراحة بين المجموعات..."
                value={coachNotes}
                onChange={e => setCoachNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                تعيين التمرين وجدولته للمتدرب ✓
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs for Client / Coach view */}
      <div className="flex space-x-2 rtl:space-x-reverse border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("SCHEDULED")}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "SCHEDULED"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
          }`}
        >
          🏋️ {language === "ar" ? "التمارين القادمة والمجدولة" : "Scheduled Workouts"} ({scheduledAssignments.length})
        </button>

        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "COMPLETED"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
          }`}
        >
          ✓ {language === "ar" ? "سجل التمارين المكتملة" : "Completed History"} ({completedAssignments.length})
        </button>
      </div>

      {/* Workouts List */}
      <div className="space-y-3">
        {(activeTab === "SCHEDULED" ? scheduledAssignments : completedAssignments).length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
            {activeTab === "SCHEDULED"
              ? (language === "ar" ? "لا توجد تمارين مجدولة حالياً." : "No scheduled workouts right now.")
              : (language === "ar" ? "لا توجد تمارين مكتملة بعد. ابدأ أول تمرين الآن!" : "No completed workouts yet.")}
          </div>
        ) : (
          (activeTab === "SCHEDULED" ? scheduledAssignments : completedAssignments).map(a => (
            <div
              key={a.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {a.template?.titleAr || "حصة تدريبية مخصصة"}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({a.template?.exercises?.length || 0} {language === "ar" ? "تمارين" : "exercises"})
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center space-x-1 rtl:space-x-reverse">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{a.scheduledDate}</span>
                    </span>
                    {!isClient && a.client && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">المتدرب: {a.client.user?.name}</span>
                      </>
                    )}
                    {a.coach && (
                      <>
                        <span>•</span>
                        <span>الكابتن: {a.coach.user?.name}</span>
                      </>
                    )}
                  </div>

                  {a.coachNotes && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                      💡 {a.coachNotes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse self-end sm:self-center">
                {a.status === "SCHEDULED" ? (
                  <Link
                    href={`/workout/${a.id}/execute`}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer scale-100 hover:scale-105"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{language === "ar" ? "بدء التمرين وتسجيل الأوزان 🏋️‍♂️" : "Start & Log Workout"}</span>
                  </Link>
                ) : (
                  <div className="text-end">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 block">
                      ✓ مكتمل ({a.workoutLog?.durationMinutes || 45} دقيقة)
                    </span>
                    {a.workoutLog?.overallRpe && (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        شدة المجهود RPE: {a.workoutLog.overallRpe}/10
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

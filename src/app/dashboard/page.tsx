"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import {
  Users,
  Dumbbell,
  Calendar,
  Activity,
  AlertTriangle,
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  PlusCircle,
  Apple,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Flame,
  Scale
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function DashboardPage() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    const handleDbChange = () => setTick(t => t + 1);
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, []);

  if (!mounted) return null;

  const role = user?.role || "ADMIN";
  const clients = db.getClients(undefined, role, user?.id);
  const coaches = db.getCoaches();
  const assignments = db.getAssignments();
  const exercises = db.getExercises();
  const templates = db.getTemplates();
  const calendars = db.getCalendars();
  const auditLogs = db.getAuditLogs().slice(0, 5);

  const activeClients = clients.filter(c => c.status === "ACTIVE");
  const myClient = clients.find(c => c.userId === user?.id) || clients[0];
  const clientMeasurements = myClient?.measurements || [];
  const clientGoals = myClient?.goals || [];
  const clientRestrictions = myClient?.medicalRestrictions || [];

  // Data for charts
  const weightTrendData = clientMeasurements.map(m => ({
    date: m.date.slice(5),
    weight: m.weightKg,
    fat: m.bodyFatPercentage,
    muscle: m.muscleMassKg
  }));

  const revenueData = [
    { month: language === "ar" ? "يناير" : "Jan", revenue: 24000, clients: 18 },
    { month: language === "ar" ? "فبراير" : "Feb", revenue: 32000, clients: 25 },
    { month: language === "ar" ? "مارس" : "Mar", revenue: 41000, clients: 32 },
    { month: language === "ar" ? "أبريل" : "Apr", revenue: 48000, clients: 38 },
    { month: language === "ar" ? "مايو" : "May", revenue: 56000, clients: 44 }
  ];

  const displayName = user?.name || (language === "ar" ? "مرحباً" : "Welcome");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/80 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-white">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {role === "ADMIN" ? t("roleAdmin") : role === "HEAD_COACH" ? t("roleHeadCoach") : role === "COACH" ? t("roleCoach") : t("roleClient")}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {new Date().toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              {language === "ar" ? `أهلاً بك، ${displayName} 👋` : `Welcome back, ${displayName} 👋`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-xl">
              {role === "CLIENT"
                ? language === "ar"
                  ? "جدول تمرين اليوم جاهز، استمر في الالتزام والوصول لأفضل لياقة وقوة بدنية!"
                  : "Today's workout is ready. Stay consistent to crush your fitness targets!"
                : language === "ar"
                ? "إليك ملخص أداء المشتركين، جلسات التدريب المقررة لليوم، وسجل التنبيهات الطبية."
                : "Here is your coaching overview, scheduled sessions, and athlete medical alerts."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {role === "CLIENT" ? (
              <Link
                href="/assignments"
                className="inline-flex items-center space-x-2 rtl:space-x-reverse px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Dumbbell className="w-5 h-5" />
                <span>{language === "ar" ? "عرض جدول تماريني 🏋️" : "View My Workouts 🏋️"}</span>
              </Link>
            ) : (
              <Link
                href="/assignments"
                className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t("navAssignments")}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* --- CLIENT DASHBOARD VIEW --- */}
      {role === "CLIENT" && (
        <div className="space-y-6">
          {/* Active Medical Alerts if any */}
          {clientRestrictions.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 rounded-2xl p-4 sm:p-5 flex items-start space-x-3 rtl:space-x-reverse shadow-lg">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">{t("medicalAlert")}</h3>
                <p className="text-xs text-amber-900 dark:text-amber-200/90 mt-0.5">
                  {language === "ar"
                    ? `لديك محاذير وإصابات مسجلة: ${clientRestrictions.map(r => r.conditionName).join("، ")}.`
                    : `Active restrictions recorded: ${clientRestrictions.map(r => r.conditionName).join(", ")}.`}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-1">
                  {language === "ar"
                    ? "💡 يتم تكييف التمارين تلقائياً لتجنب الحركات التي تضغط على منطقة الإصابة."
                    : "💡 Workouts are automatically adjusted to avoid movements affecting restricted joints."}
                </p>
              </div>
            </div>
          )}

          {/* Client Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-md">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-medium">{t("weight")}</span>
                <Scale className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {myClient?.weightKg || 80} <span className="text-xs font-normal text-slate-400">{language === "ar" ? "كجم" : "KG"}</span>
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 me-1" /> {language === "ar" ? "متابعة مستمرة للوزن" : "Weight tracking active"}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-md">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-medium">{t("bmi")}</span>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">24.5</p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                {language === "ar" ? "ضمن المعدل الصحي الطبيعي" : "Healthy Range"}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-md">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-medium">{t("bodyFat")}</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">18%</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                {language === "ar" ? "تحسن مستمر" : "Steady progress"}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-md">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-medium">{t("attendanceRate")}</span>
                <CheckCircle className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">100%</p>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-semibold">
                {language === "ar" ? "التزام ممتاز بالحصص" : "Excellent attendance"}
              </p>
            </div>
          </div>

          {/* Quick Access to Profile and Assessments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href={`/clients/${myClient?.id || "client-1"}`}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all shadow-sm flex items-center justify-between group"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  {language === "ar" ? "ملفي الشخصي والقياسات البدنية 📊" : "My Profile & Body Stats 📊"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === "ar" ? "عرض قياسات الجسم، الأهداف التدريبية، ومعرض صور التطور" : "View circumference stats, training goals, and photo gallery"}
                </p>
              </div>
              <span className="text-emerald-500 font-bold text-xs">{language === "ar" ? "فتح الملف ←" : "Open →"}</span>
            </Link>

            <Link
              href="/assessments"
              className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all shadow-sm flex items-center justify-between group"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  {language === "ar" ? "اختباراتي وتقييماتي البدنية 🏆" : "My Fitness Assessments 🏆"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === "ar" ? "متابعة نتائج اختبارات القوة، التحمل، ومقارنة التطور" : "Track performance in pushups, plank, VO2 max and strength"}
                </p>
              </div>
              <span className="text-emerald-500 font-bold text-xs">{language === "ar" ? "عرض التقييمات ←" : "View →"}</span>
            </Link>
          </div>
        </div>
      )}

      {/* --- ADMIN / HEAD COACH / COACH VIEW --- */}
      {role !== "CLIENT" && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">{t("navClients")}</span>
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{clients.length}</p>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{activeClients.length} {language === "ar" ? "مشترك نشط" : "active athletes"}</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">{t("navCoaches")}</span>
                <ShieldCheck className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{coaches.length}</p>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">{coaches.length} {language === "ar" ? "كابتن تدريب" : "active coaches"}</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">{t("navTemplates")}</span>
                <Dumbbell className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{templates.length}</p>
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">{templates.length} {language === "ar" ? "قالب تمرين جاهز" : "workout templates"}</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">{t("todaySessions")}</span>
                <Calendar className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{calendars.length}</p>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{language === "ar" ? "جلسات تدريبية مجدولة" : "Scheduled training sessions"}</span>
            </div>
          </div>

          {/* Revenue & Growth Chart */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {language === "ar" ? "نمو الاشتراكات والإيرادات (ج.م)" : "Revenue & Memberships Growth (EGP)"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {language === "ar" ? "تطور الدخل الشهري للأكاديمية وتجديدات المشتركين" : "Monthly academy revenue and active athlete subscriptions"}
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
                  <Bar dataKey="revenue" name={language === "ar" ? "الإيرادات (ج.م)" : "Revenue (EGP)"} fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

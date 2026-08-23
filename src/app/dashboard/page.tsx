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

  useEffect(() => {
    setMounted(true);
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
    { month: "يناير / Jan", revenue: 24000, clients: 18 },
    { month: "فبراير / Feb", revenue: 32000, clients: 25 },
    { month: "مارس / Mar", revenue: 41000, clients: 32 },
    { month: "أبريل / Apr", revenue: 48000, clients: 38 },
    { month: "مايو / May", revenue: 56000, clients: 44 }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {role === "ADMIN" ? t("roleAdmin") : role === "HEAD_COACH" ? t("roleHeadCoach") : role === "COACH" ? t("roleCoach") : t("roleClient")}
              </span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              {language === "ar" ? `مرحباً بك، ${user?.name || "كابتن"} 👋` : `Welcome back, ${user?.name || "Coach"} 👋`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {role === "CLIENT"
                ? language === "ar"
                  ? "تمرين اليوم جاهز، استمر في الالتزام لتحقيق هدفك في خسارة الوزن وبناء العضلات!"
                  : "Today's workout is ready. Stay consistent to crush your fitness targets!"
                : language === "ar"
                ? "إليك ملخص أداء المشتركين، جلسات التدريب المقررة لليوم، وسجل التنبيهات الطبية."
                : "Here is your coaching overview, scheduled sessions, and athlete medical alerts."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {role === "CLIENT" ? (
              <Link
                href="/workout/assign-wo-1/execute"
                className="inline-flex items-center space-x-2 rtl:space-x-reverse px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all scale-100 hover:scale-105 active:scale-95"
              >
                <Dumbbell className="w-5 h-5" />
                <span>{t("startWorkout")} 🏋️</span>
              </Link>
            ) : (
              <Link
                href="/assignments"
                className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
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
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex items-start space-x-3 rtl:space-x-reverse shadow-lg">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-amber-300">{t("medicalAlert")}</h3>
                <p className="text-xs text-amber-200/90 mt-0.5">
                  {t("medicalWarning")} <strong className="text-white">{clientRestrictions.map(r => r.conditionName).join("، ")}</strong>.
                </p>
                <p className="text-[11px] text-amber-300/70 mt-1">
                  💡 تم تكييف التمارين تلقائياً لتجنب الحركات المحظورة (مثل السكوات بالأوزان الثقيلة).
                </p>
              </div>
            </div>
          )}

          {/* Client Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">{t("weight")}</span>
                <Scale className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-white">{myClient?.weightKg} <span className="text-xs font-normal text-slate-400">KG</span></p>
              <p className="text-[11px] text-emerald-400 mt-1 font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 me-1" /> -4.0 KG {language === "ar" ? "منذ البداية" : "since baseline"}
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">{t("bmi")}</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white">28.7</p>
              <p className="text-[11px] text-blue-400 mt-1 font-semibold">
                {language === "ar" ? "تحسن من 30.0 (نزول صحي)" : "Improved from 30.0"}
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">{t("bodyFat")}</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white">25%</p>
              <p className="text-[11px] text-amber-400 mt-1 font-semibold">
                -3.0% {language === "ar" ? "نسبة دهون مفقودة" : "fat loss"}
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">{t("attendanceRate")}</span>
                <CheckCircle className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-black text-white">95%</p>
              <p className="text-[11px] text-purple-400 mt-1 font-semibold">
                19/20 {language === "ar" ? "حصة مكتملة" : "sessions done"}
              </p>
            </div>
          </div>

          {/* Interactive Progress Chart */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">{t("measurementsHistory")}</h3>
                <p className="text-xs text-slate-400">{language === "ar" ? "تتبع نزول الوزن ونسبة الدهون عبر الزمن" : "Weight & Body Fat % progression over time"}</p>
              </div>
              <Link href={`/clients/${myClient?.id || "client-1"}`} className="text-xs font-bold text-emerald-400 hover:underline">
                {t("viewDetails")}
              </Link>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightTrendData}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[80, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Area type="monotone" dataKey="weight" name={t("weight") + " (KG)"} stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#weightGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Goals & Nutrition Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Goals */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>{t("clientGoals")}</span>
                </h3>
              </div>
              {clientGoals.map(g => {
                const progress = Math.min(100, Math.round(((g.startingValue - g.currentValue) / (g.startingValue - g.targetValue)) * 100));
                return (
                  <div key={g.id} className="space-y-1.5 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between text-xs font-semibold text-white">
                      <span>{g.title}</span>
                      <span className="text-emerald-400 font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>البداية: {g.startingValue} {g.unit}</span>
                      <span>الهدف: {g.targetValue} {g.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coaches & Nutrition */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Apple className="w-4 h-4 text-teal-400" />
                <span>{language === "ar" ? "الكباتن والنظام الغذائي اليومي" : "My Coaches & Nutrition"}</span>
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500 flex items-center justify-center text-xs font-bold text-emerald-400">
                      علي
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">كابتن علي منصور</p>
                      <p className="text-[10px] text-slate-400">الكابتن الأساسي للتمارين</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Primary</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                    <div className="w-8 h-8 rounded-full bg-teal-600/30 border border-teal-500 flex items-center justify-center text-xs font-bold text-teal-400">
                      سارة
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">كابتن سارة كمال</p>
                      <p className="text-[10px] text-slate-400">أخصائية التغذية (2100 Kcal / 180g P)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400">Nutritionist</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADMIN & COACH DASHBOARD VIEW --- */}
      {role !== "CLIENT" && (
        <div className="space-y-6">
          {/* Main KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">{t("navClients")}</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">{clients.length}</p>
              <p className="text-[11px] text-emerald-400 mt-1 font-semibold flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 me-1.5 inline-block" />
                {activeClients.length} {t("active")}
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">{t("navCoaches")}</span>
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">{coaches.length}</p>
              <p className="text-[11px] text-blue-400 mt-1 font-semibold">
                {coaches.reduce((acc, c) => acc + (c.assignedClientsCount || 0), 0)} {language === "ar" ? "متدربين موزعين" : "distributed athletes"}
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">{t("todaySessions")}</span>
                <Calendar className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">{calendars.length}</p>
              <p className="text-[11px] text-purple-400 mt-1 font-semibold">
                {calendars.filter(c => c.sessionType === "GROUP").length} {language === "ar" ? "جماعية" : "groups"} • {calendars.filter(c => c.sessionType === "INDIVIDUAL").length} PT
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold">{t("attendanceRate")}</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white">96%</p>
              <p className="text-[11px] text-amber-400 mt-1 font-semibold">
                +4% {language === "ar" ? "هذا الشهر" : "this month"}
              </p>
            </div>
          </div>

          {/* Active Medical Alerts Warning Banner for Coaches/Admins */}
          <div className="bg-gradient-to-r from-red-950/40 via-amber-950/30 to-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-amber-300 flex items-center space-x-2 rtl:space-x-reverse">
                <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{language === "ar" ? "تنبيهات الإصابات والمحاذير الطبية النشطة للمتدربين ⚠" : "Active Athlete Medical & Injury Alerts ⚠"}</span>
              </h3>
              <Link href="/clients" className="text-xs font-bold text-amber-400 hover:underline">
                {language === "ar" ? "متابعة السجلات الطبية" : "Review Medical Files"}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white">محمد إبراهيم الفقي</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">HIGH</span>
                </div>
                <p className="text-slate-300 text-[11px]">تمزق غضروف الركبة اليمنى - محظور السكوات الثقيل والدفع العنيف.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white">كريم عادل الشناوي</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM</span>
                </div>
                <p className="text-slate-300 text-[11px]">إجهاد أسفل الظهر - محظور الديدليفت التقليدي وسحب البار المنحني.</p>
              </div>
            </div>
          </div>

          {/* Revenue & Growth Chart for Admin / Head Coach */}
          {role === "ADMIN" && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">{language === "ar" ? "نمو الاشتراكات والإيرادات الشهرية" : "Monthly Subscriptions & Revenue Growth"}</h3>
                  <p className="text-xs text-slate-400">{language === "ar" ? "إحصائيات التدريب والاشتراكات السنوية والشهرية" : "Memberships, PT packages, and active retention"}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  +28% YoY
                </span>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Bar dataKey="revenue" name={language === "ar" ? "الإيرادات (EGP)" : "Revenue (EGP)"} fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Quick Athlete Overview & Recent Audit Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Athletes List */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{language === "ar" ? "أحدث المشتركين والمتابعات" : "Recent Athletes"}</h3>
                <Link href="/clients" className="text-xs font-bold text-emerald-400 hover:underline">
                  {t("all")} ({clients.length})
                </Link>
              </div>
              <div className="space-y-2">
                {clients.slice(0, 4).map(c => (
                  <Link
                    key={c.id}
                    href={`/clients/${c.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <img src={c.user.avatar} alt={c.user.name} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                      <div>
                        <p className="text-xs font-bold text-white">{c.user.name}</p>
                        <p className="text-[10px] text-slate-400">{c.weightKg} KG • {c.sport?.nameAr || "كمال أجسام"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {c.status}
                      </span>
                      {dir === "rtl" ? <ChevronLeft className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Real-Time Audit Logs */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>{t("navAuditLogs")}</span>
                </h3>
                <Link href="/audit-logs" className="text-xs font-bold text-purple-400 hover:underline">
                  {language === "ar" ? "سجل العمليات الكامل" : "Full Logs"}
                </Link>
              </div>
              <div className="space-y-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-emerald-400">{log.userName}</span>
                      <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] font-mono">{log.action}: {log.entityType}</p>
                    {log.newValues && <p className="text-slate-400 text-[10px] truncate mt-0.5">{log.newValues}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
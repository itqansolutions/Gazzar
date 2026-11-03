"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/db";
import {
  Users,
  Dumbbell,
  Calendar,
  Layers,
  Activity,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Search,
  Bell,
  TrendingUp,
  AlertTriangle,
  Scale,
  Flame,
  CheckCircle,
  PlusCircle,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import {
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
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    const handleDbChange = () => setTick(t => t + 1);
    window.addEventListener("gx_db_change", handleDbChange);
    return () => window.removeEventListener("gx_db_change", handleDbChange);
  }, []);

  if (!mounted || !user) return null;

  const role = user.role;
  const isClient = role === "CLIENT";

  // Existing DB data
  const clients = db.getClients(undefined, role, user?.id);
  const coaches = db.getCoaches();
  const programs = db.getPrograms();
  const templates = db.getTemplates();
  const calendars = db.getCalendars();
  const assignments = db.getAssignments();

  // Metrics (grounded in application data with reference defaults)
  const membersCount = clients.length > 0 ? clients.length : 128;
  const programsCount = programs.length > 0 ? programs.length : 24;
  const sessionsCount = calendars.length + assignments.length > 0 ? calendars.length + assignments.length : 316;
  const coachesCount = coaches.length > 0 ? coaches.length : 8;

  // Client-specific data
  const myClient = clients.find(c => c.userId === user?.id) || clients[0];
  const clientRestrictions = myClient?.medicalRestrictions || [];

  // Today's classes list
  const todayClasses = calendars.length > 0
    ? calendars.slice(0, 3).map((c, i) => ({
        id: c.id,
        title: c.title,
        time: c.startTime ? new Date(c.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:00 AM",
        members: c.attendances?.length ? `${c.attendances.length} Members` : `${14 + i * 4} Members`
      }))
    : [
        { id: "c1", title: "CrossFit WOD", time: "10:00 AM", members: "18 Members" },
        { id: "c2", title: "Strength & Conditioning", time: "12:00 PM", members: "12 Members" },
        { id: "c3", title: "MetCon Endurance", time: "06:00 PM", members: "16 Members" }
      ];

  // Members Activity Chart Data (Mon - Sun curve)
  const activityData = [
    { day: language === "ar" ? "الإثنين" : "Mon", members: 18 },
    { day: language === "ar" ? "الثلاثاء" : "Tue", members: 42 },
    { day: language === "ar" ? "الأربعاء" : "Wed", members: 32 },
    { day: language === "ar" ? "الخميس" : "Thu", members: 58 },
    { day: language === "ar" ? "الجمعة" : "Fri", members: 48 },
    { day: language === "ar" ? "السبت" : "Sat", members: 66 },
    { day: language === "ar" ? "الأحد" : "Sun", members: 96 }
  ];

  // Progress Overview Bar Data (Jan - Jun)
  const progressOverviewData = [
    { month: language === "ar" ? "يناير" : "Jan", current: 36, target: 45 },
    { month: language === "ar" ? "فبراير" : "Feb", current: 48, target: 58 },
    { month: language === "ar" ? "مارس" : "Mar", current: 58, target: 68 },
    { month: language === "ar" ? "أبريل" : "Apr", current: 62, target: 82 },
    { month: language === "ar" ? "مايو" : "May", current: 82, target: 88 },
    { month: language === "ar" ? "يونيو" : "Jun", current: 96, target: 100 }
  ];

  const displayName = user?.name || (language === "ar" ? "الكابتن عبدالله" : "Coach Abdullah");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* =========================================================================
          1. TOP WELCOME & BRANDING HEADER (DESKTOP & TABLET)
          ========================================================================= */}
      <div className="hidden sm:flex items-center justify-between gap-4 py-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {language === "ar" ? "لوحة التحكم" : "Dashboard"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {language === "ar" ? `مرحباً بك مجدداً، ${displayName} 👋` : `Welcome back, ${displayName} 👋`}
          </p>
        </div>

        {/* Right Controls in Header (Search & Quick Controls) */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
            <input
              type="text"
              placeholder={language === "ar" ? "بحث سريع..." : "Search academy..."}
              className="ps-9 pe-4 py-2 text-xs rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] text-slate-900 dark:text-white focus:outline-none focus:border-red-500 transition-all w-48 focus:w-60"
            />
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] shadow-sm">
            <img
              src="/design-reference/gx-theme/light_branding_panel.png"
              alt="Coach Abdullah"
              className="w-7 h-7 rounded-full object-cover object-left border border-red-500/40"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{displayName}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MOBILE HERO GREETING CARD (MOBILE ONLY)
          ========================================================================= */}
      <div className="sm:hidden relative overflow-hidden rounded-3xl bg-[#121620] border border-[#1f2937] p-5 shadow-2xl text-white">
        <div className="absolute inset-0 opacity-25 mix-blend-luminosity pointer-events-none">
          <img
            src="/design-reference/gx-theme/dark_branding_panel.png"
            alt="GX Athletic Coach"
            className="w-full h-full object-cover object-left"
          />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/30 text-red-400 border border-red-500/40 mb-2">
              GX Fitness Academy
            </div>
            <p className="text-[11px] text-slate-400">
              {language === "ar" ? "صباح الخير،" : "Good Morning,"}
            </p>
            <h2 className="text-lg font-black text-white tracking-tight">
              {displayName}
            </h2>
          </div>
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-red-500/60 shadow-lg shadow-red-600/30">
            <img
              src="/design-reference/gx-theme/light_branding_panel.png"
              alt="Coach Abdullah"
              className="w-full h-full object-cover object-left scale-125"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. FOUR PROMINENT KPI CARDS (MATCHING REFERENCE DESIGN)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Card 1: Members */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] shadow-sm dark:shadow-xl transition-all hover:border-red-500/40">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-11 h-11 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30 flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {membersCount}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                {language === "ar" ? "المشتركون" : "Members"}
              </p>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center mt-0.5">
                <TrendingUp className="w-3 h-3 me-0.5" /> +12%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Programs */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] shadow-sm dark:shadow-xl transition-all hover:border-purple-500/40">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-11 h-11 rounded-2xl bg-purple-600 dark:bg-purple-700/80 flex items-center justify-center text-white shadow-md shadow-purple-600/30 flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {programsCount}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                {language === "ar" ? "البرامج النشطة" : "Active Programs"}
              </p>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center mt-0.5">
                <TrendingUp className="w-3 h-3 me-0.5" /> +20%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Sessions */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] shadow-sm dark:shadow-xl transition-all hover:border-sky-500/40">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-11 h-11 rounded-2xl bg-sky-600 dark:bg-sky-700/80 flex items-center justify-center text-white shadow-md shadow-sky-600/30 flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {sessionsCount}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                {language === "ar" ? "الجلسات التدريبية" : "Sessions"}
              </p>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center mt-0.5">
                <TrendingUp className="w-3 h-3 me-0.5" /> +18%
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Coaches */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] shadow-sm dark:shadow-xl transition-all hover:border-slate-500/40">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-11 h-11 rounded-2xl bg-slate-700 dark:bg-slate-800 flex items-center justify-center text-white shadow-md shadow-slate-700/30 flex-shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {coachesCount}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                {language === "ar" ? "كباتن التدريب" : "Coaches"}
              </p>
              <span className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center">
                {language === "ar" ? "معتمدون" : "Certified"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. MAIN WORKSPACE GRID (CHARTS + TODAY'S CLASSES)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2): Members Activity Chart / Progress Overview */}
        <div className="lg:col-span-2 p-5 sm:p-7 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {language === "ar" ? "نشاط المشتركين (Members Activity)" : "Members Activity"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "ar" ? "معدل الحضور والنشاط البدني الأسبوعي" : "Weekly attendance and active engagement"}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20">
              {language === "ar" ? "هذا الأسبوع" : "This Week"}
            </span>
          </div>

          {/* Area Chart with Red Glowing Gradient Fill (as in reference) */}
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="redGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.6} />
                    <stop offset="50%" stopColor="#e11d48" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#1f2937" : "#e2e8f0"} opacity={0.6} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#121620" : "#ffffff",
                    borderColor: theme === "dark" ? "#1f2937" : "#e2e8f0",
                    borderRadius: "16px",
                    color: theme === "dark" ? "#ffffff" : "#0f172a",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="members"
                  stroke="#e11d48"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#redGlow)"
                  name={language === "ar" ? "عدد الحضور" : "Attendees"}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column (Span 1): Today's Classes List (as in reference) */}
        <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] shadow-sm dark:shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Dumbbell className="w-5 h-5 text-red-600" />
                <span>{language === "ar" ? "حصص اليوم" : "Today's Classes"}</span>
              </h2>
              <Link
                href="/calendar"
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
              >
                {language === "ar" ? "الجدول ←" : "All →"}
              </Link>
            </div>

            {/* List of class items */}
            <div className="space-y-3">
              {todayClasses.map(item => (
                <Link
                  key={item.id}
                  href="/calendar"
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#161c28] border border-slate-200/80 dark:border-[#1f2937] flex items-center justify-between hover:border-red-500/50 hover:bg-slate-100 dark:hover:bg-[#1c2333] transition-all group cursor-pointer"
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="w-10 h-10 rounded-xl bg-red-600/10 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.time} • {item.members}
                      </p>
                    </div>
                  </div>
                  {dir === "rtl" ? (
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Coach Abdullah Signature Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600/10 via-rose-600/10 to-transparent border border-red-500/20 flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-red-500/40 flex-shrink-0">
              <img
                src="/design-reference/gx-theme/light_branding_panel.png"
                alt="Coach Abdullah"
                className="w-full h-full object-cover object-left"
              />
            </div>
            <div>
              <p className="text-[11px] font-bold text-red-600 dark:text-red-400">
                GX Fitness Academy
              </p>
              <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                By Abdullah Elgazzar
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. SECONDARY ROW: MONTHLY PROGRESS OVERVIEW & REVENUE (DESKTOP)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Overview Bar Chart */}
        <div className="lg:col-span-2 p-5 sm:p-7 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {language === "ar" ? "نظرة عامة على التقدم (Progress Overview)" : "Progress Overview"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "ar" ? "المقارنة الشهرية للأهداف المحققة" : "Monthly performance vs. targets"}
              </p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressOverviewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#1f2937" : "#e2e8f0"} opacity={0.6} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#121620" : "#ffffff",
                    borderColor: theme === "dark" ? "#1f2937" : "#e2e8f0",
                    borderRadius: "16px",
                    color: theme === "dark" ? "#ffffff" : "#0f172a"
                  }}
                />
                <Bar dataKey="current" name={language === "ar" ? "المحقق" : "Achieved"} fill="#e11d48" radius={[8, 8, 0, 0]} />
                <Bar dataKey="target" name={language === "ar" ? "الهدف" : "Target"} fill={theme === "dark" ? "#27272a" : "#cbd5e1"} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memberships & Retention Card */}
        <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] shadow-sm dark:shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              {language === "ar" ? "نسبة استبقاء الاشتراكات" : "Memberships Retention"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {language === "ar" ? "تجديد المشتركين والالتزام الشهري" : "Retention rate vs. last month"}
            </p>

            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG Radial Ring */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={theme === "dark" ? "#1f2937" : "#e2e8f0"}
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#e11d48"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - 0.76)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">76%</span>
                  <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400">+12%</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {language === "ar" ? "+12% مقارنة بالشهر السابق" : "+12% vs. last month"}
              </p>
            </div>
          </div>

          <Link
            href="/memberships"
            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#161c28] dark:hover:bg-[#1c2333] text-slate-800 dark:text-slate-200 text-xs font-bold text-center border border-slate-200 dark:border-[#1f2937] transition-all flex items-center justify-center space-x-1.5 rtl:space-x-reverse"
          >
            <span>{language === "ar" ? "تفاصيل الاشتراكات" : "View Memberships"}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* =========================================================================
          6. CLIENT ATHLETE PERSPECTIVE (IF USER IS CLIENT)
          ========================================================================= */}
      {isClient && (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-[#1f2937]">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            {language === "ar" ? "سجل ومتابعة اللاعب البدنية" : "Athlete Medical & Workout Center"}
          </h2>

          {clientRestrictions.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 rounded-2xl p-4 flex items-start space-x-3 rtl:space-x-reverse shadow-lg">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">{t("medicalAlert")}</h3>
                <p className="text-xs text-amber-900 dark:text-amber-200/90 mt-0.5">
                  {language === "ar"
                    ? `محاذير مسجلة: ${clientRestrictions.map(r => r.conditionName).join("، ")}.`
                    : `Active restrictions: ${clientRestrictions.map(r => r.conditionName).join(", ")}.`}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href="/assignments"
              className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center space-x-2 rtl:space-x-reverse"
            >
              <Dumbbell className="w-4 h-4" />
              <span>{language === "ar" ? "فتح تماريني لليوم" : "Start Today's Workout"}</span>
            </Link>
            <Link
              href={`/clients/${myClient?.id || "client-1"}`}
              className="px-5 py-3 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] text-slate-800 dark:text-white font-bold text-xs hover:border-red-500 transition-all"
            >
              <span>{language === "ar" ? "ملفي وقياساتي" : "My Measurements"}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

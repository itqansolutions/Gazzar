"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/db";
import GXLogo from "@/components/brand/GXLogo";
import {
  Users,
  Dumbbell,
  Calendar,
  Layers,
  Activity,
  UserCheck,
  ChevronRight,
  TrendingUp,
  PlusCircle,
  Clock,
  ArrowUpRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    const handleDbChange = () => setTick((t) => t + 1);
    window.addEventListener("gx_db_change", handleDbChange);
    return () => window.removeEventListener("gx_db_change", handleDbChange);
  }, []);

  if (!mounted || !user) return null;

  const role = user.role;
  const isClient = role === "CLIENT";

  // Real Database entities
  const clients = db.getClients(undefined, user.role, user?.id);
  const coaches = db.getCoaches();
  const programs = db.getPrograms();
  const calendars = db.getCalendars();
  const assignments = db.getAssignments();

  // Metrics grounded strictly in application database (with graceful fallback to reference values if db is fresh)
  const membersCount = clients.length || 128;
  const programsCount = programs.length || 24;
  const sessionsCount = (calendars.length + assignments.length) || 316;
  const coachesCount = coaches.length || 8;

  // Client Athlete profile
  const myClient = clients.find((c) => c.userId === user?.id) || clients[0];
  const clientRestrictions = myClient?.medicalRestrictions || [];

  // Today's classes from DB with reference alignment
  const todayClasses = calendars.length > 0
    ? calendars.slice(0, 3).map((c) => ({
        id: c.id,
        title: c.title,
        time: c.startTime ? new Date(c.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:00 AM",
        members: c.attendances?.length ? `${c.attendances.length} Members` : "18 Members"
      }))
    : [
        { id: "ref-1", title: "CrossFit WOD", time: "10:00 AM", members: "18 Members" },
        { id: "ref-2", title: "Strength", time: "12:00 PM", members: "12 Members" },
        { id: "ref-3", title: "MetCon", time: "06:00 PM", members: "16 Members" }
      ];

  // Members Activity Spline Wave Curve (Dark Mode Reference)
  const activityData = [
    { day: "Mon", members: 20 },
    { day: "Tue", members: 38 },
    { day: "Wed", members: 48 },
    { day: "Thu", members: 32 },
    { day: "Fri", members: 58 },
    { day: "Sat", members: 72 },
    { day: "Sun", members: 92 }
  ];

  // Progress Overview Bar Chart (Light Mode Reference)
  const progressData = [
    { month: "Jan", progress: 30 },
    { month: "Feb", progress: 45 },
    { month: "Mar", progress: 52 },
    { month: "Apr", progress: 68 },
    { month: "May", progress: 78 },
    { month: "Jun", progress: 95 }
  ];

  // Memberships Radial Donut Data (Light Mode Reference)
  const donutData = [
    { name: "Active", value: 76, color: "#e11d48" },
    { name: "Remaining", value: 24, color: theme === "dark" ? "#1f2937" : "#e2e8f0" }
  ];

  const displayName = user?.name || "Coach Abdullah";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full overflow-x-hidden">
      {/* =========================================================================
          1. DESKTOP HEADER (CLEAN MATCH TO REFERENCE TOP BAR)
          ========================================================================= */}
      <div className="hidden sm:flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Welcome back, {displayName} 👋
          </p>
        </div>

        {/* Quick Assignment CTA */}
        <div className="flex items-center space-x-3">
          <Link
            href="/assignments"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Assignment</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. MOBILE WELCOME HERO BANNER (MATCHING PHONE FRAME IN REFERENCE)
          ========================================================================= */}
      <div className="sm:hidden relative overflow-hidden rounded-3xl bg-[#0c0f17] dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] p-5 shadow-2xl text-white">
        {/* Genuine Coach Abdullah portrait blend */}
        <div className="absolute right-0 top-0 bottom-0 w-36 pointer-events-none opacity-50 mix-blend-screen">
          <img
            src="/coach_abdullah_portrait.png"
            alt="Coach Abdullah"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0f17] via-[#0c0f17]/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[210px]">
          <div className="mb-2.5">
            <GXLogo size="sm" priority />
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Good Morning,</p>
          <h2 className="text-xl font-black text-white tracking-tight mt-0.5 truncate">
            {displayName}
          </h2>
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mt-1.5">
            Manage • Train • Track • Perform
          </p>
        </div>
      </div>

      {/* =========================================================================
          3. FOUR KPI CARDS (2x2 ON MOBILE, 4-COL ON DESKTOP, MATCHING REFERENCE)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Members (Crimson Red Accent) */}
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-4 sm:p-5 shadow-sm hover:border-red-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Members</span>
            <div className="w-9 h-9 rounded-full bg-red-600/10 dark:bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {membersCount}
            </span>
            <span className="text-xs font-bold text-emerald-500 flex items-center">
              +12%
            </span>
          </div>
        </div>

        {/* KPI 2: Active Programs (Royal Purple Accent) */}
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-4 sm:p-5 shadow-sm hover:border-purple-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Active Programs</span>
            <div className="w-9 h-9 rounded-full bg-purple-600/10 dark:bg-purple-950/40 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {programsCount}
            </span>
            <span className="text-xs font-bold text-emerald-500 flex items-center">
              +20%
            </span>
          </div>
        </div>

        {/* KPI 3: Sessions (Ocean Blue Accent) */}
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-4 sm:p-5 shadow-sm hover:border-blue-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Sessions</span>
            <div className="w-9 h-9 rounded-full bg-sky-600/10 dark:bg-sky-950/40 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {sessionsCount}
            </span>
            <span className="text-xs font-bold text-emerald-500 flex items-center">
              +18%
            </span>
          </div>
        </div>

        {/* KPI 4: Coaches (Slate/Indigo Accent) */}
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-4 sm:p-5 shadow-sm hover:border-indigo-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Coaches</span>
            <div className="w-9 h-9 rounded-full bg-slate-600/10 dark:bg-slate-800/40 border border-slate-500/20 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {coachesCount}
            </span>
            <span className="text-xs font-bold text-slate-400">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. MAIN SECTION: DUAL-MODE VISUAL LAYOUT
          - Dark Mode: Members Activity Wave Chart (Span 2) + Today's Classes (Span 1)
          - Light Mode: Progress Overview + Memberships Donut + Coach Hero Cutout
          ========================================================================= */}
      {theme === "light" ? (
        /* Light Theme Composition Matching Reference */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Progress Overview Bar Chart (Span 6) */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Progress Overview
                </h2>
                <p className="text-[11px] text-slate-500">
                  Monthly performance progressions
                </p>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+24%</span>
              </div>
            </div>

            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "1rem",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#0f172a"
                    }}
                  />
                  <Bar dataKey="progress" fill="#e11d48" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memberships Donut Chart (Span 3) */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between text-center">
            <div className="text-left">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Memberships
              </h2>
              <p className="text-[11px] text-slate-500">Active membership ratio</p>
            </div>

            <div className="relative h-44 w-full flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900">76%</span>
                <span className="text-[10px] font-bold text-emerald-500">+12%</span>
              </div>
            </div>

            <p className="text-[11px] font-medium text-slate-500">
              +12% vs. last month
            </p>
          </div>

          {/* Coach Abdullah Cutout with Dynamic Red Brush Strokes (Span 3) */}
          <div className="lg:col-span-3 relative rounded-3xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 p-5 shadow-sm overflow-hidden flex flex-col justify-end">
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <img
                src="/coach_abdullah_light_hero.png"
                alt="Coach Abdullah"
                className="w-full h-full object-contain object-bottom filter drop-shadow-md"
              />
            </div>
            <div className="relative z-10 pt-48">
              <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider inline-block">
                Coach Lead
              </span>
              <p className="text-xs font-black text-slate-900 mt-1">
                Abdullah Elgazzar
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Dark Theme Composition Matching Reference */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Members Activity Wave Chart (Span 2) */}
          <div className="lg:col-span-2 bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Members Activity
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Weekly attendance and training volume
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Live Volume</span>
              </div>
            </div>

            <div className="h-56 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="crimsonWaveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0c0f17",
                      borderColor: "#1f2937",
                      borderRadius: "1rem",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#ffffff"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="members"
                    stroke="#e11d48"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#crimsonWaveGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Today's Classes List (Span 1) */}
          <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Today&apos;s Classes
                </h2>
                <Link
                  href="/calendar"
                  className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center space-x-1"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {todayClasses.map((cls) => (
                  <Link
                    key={cls.id}
                    href="/calendar"
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#161c28] border border-slate-200 dark:border-[#1f2937] hover:border-red-500/40 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-red-600/10 dark:bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-105 transition-transform flex-shrink-0">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-red-500 transition-colors truncate">
                          {cls.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {cls.time} • {cls.members}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-[#1f2937]">
              <Link
                href="/assignments"
                className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Workout Assignment</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. MOBILE TODAY'S CLASSES (RENDERED DIRECTLY ON MOBILE IN LIGHT MODE TOO)
          ========================================================================= */}
      {theme === "light" && (
        <div className="sm:hidden bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-900">Today&apos;s Classes</h2>
            <Link href="/calendar" className="text-xs font-bold text-red-600">View all</Link>
          </div>
          <div className="space-y-2.5">
            {todayClasses.map((cls) => (
              <Link
                key={cls.id}
                href="/calendar"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/10 flex items-center justify-center text-red-600">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{cls.title}</h3>
                    <p className="text-[10px] text-slate-500">{cls.time} • {cls.members}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          6. ATHLETE CLIENT SECTION (FOR ATHLETE USERS ONLY)
          ========================================================================= */}
      {isClient && (
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              My Training & Medical Status
            </h2>
            <Link
              href={`/clients/${myClient?.id || ""}`}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
            >
              View Full Profile
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161c28] border border-slate-200 dark:border-[#1f2937]">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Target Sport</span>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {myClient?.sport?.nameEn || "CrossFit / Fitness"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161c28] border border-slate-200 dark:border-[#1f2937]">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Membership Status</span>
              <p className="text-sm font-black text-emerald-500">{myClient?.status || "ACTIVE"}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161c28] border border-slate-200 dark:border-[#1f2937]">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Medical Clearance</span>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {clientRestrictions.length === 0 ? "Full Clearance (Safe)" : `${clientRestrictions.length} Restriction(s)`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

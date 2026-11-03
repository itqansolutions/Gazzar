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

  // Real DB data
  const clients = db.getClients(undefined, role, user?.id);
  const coaches = db.getCoaches();
  const programs = db.getPrograms();
  const templates = db.getTemplates();
  const calendars = db.getCalendars();
  const assignments = db.getAssignments();

  // Metrics (grounded in application data with reference fallbacks)
  const membersCount = clients.length > 0 ? clients.length : 128;
  const programsCount = programs.length > 0 ? programs.length : 24;
  const sessionsCount = calendars.length + assignments.length > 0 ? calendars.length + assignments.length : 316;
  const coachesCount = coaches.length > 0 ? coaches.length : 8;

  // Client athlete data
  const myClient = clients.find(c => c.userId === user?.id) || clients[0];
  const clientRestrictions = myClient?.medicalRestrictions || [];

  // Today's classes
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

  // Members Activity Chart Data (Mon - Sun curve matching reference)
  const activityData = [
    { day: "Mon", members: 18 },
    { day: "Tue", members: 42 },
    { day: "Wed", members: 32 },
    { day: "Thu", members: 58 },
    { day: "Fri", members: 48 },
    { day: "Sat", members: 66 },
    { day: "Sun", members: 96 }
  ];

  // Progress Overview Data (Jan - Jun)
  const progressOverviewData = [
    { month: "Jan", current: 36, target: 45 },
    { month: "Feb", current: 48, target: 58 },
    { month: "Mar", current: 58, target: 68 },
    { month: "Apr", current: 62, target: 82 },
    { month: "May", current: 82, target: 88 },
    { month: "Jun", current: 96, target: 100 }
  ];

  const displayName = user?.name || "Coach Abdullah";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* =========================================================================
          1. DESKTOP & TABLET HEADER
          ========================================================================= */}
      <div className="hidden sm:flex items-center justify-between gap-4 py-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Welcome back, {displayName} 👋
          </p>
        </div>

        {/* Right Search & Profile badge */}
        <div className="flex items-center space-x-3">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute top-2.5 left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search academy..."
              className="pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] text-slate-900 dark:text-white focus:outline-none focus:border-red-500 transition-all w-48 focus:w-60"
            />
          </div>

          <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] shadow-sm">
            <img
              src="/coach_abdullah_portrait.png"
              alt="Coach Abdullah"
              className="w-7 h-7 rounded-full object-cover border border-red-500/40"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{displayName}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MOBILE HERO HEADER CARD WITH COACH BLEND (MATCHING REFERENCE)
          ========================================================================= */}
      <div className="sm:hidden relative overflow-hidden rounded-3xl bg-[#0c0f17] border border-[#1a1f2e] p-5 shadow-2xl text-white">
        {/* Coach blend in background right */}
        <div className="absolute right-0 top-0 bottom-0 w-44 pointer-events-none opacity-40 mix-blend-screen">
          <img
            src="/coach_abdullah_portrait.png"
            alt="Coach Abdullah"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0f17] via-[#0c0f17]/40 to-transparent" />
        </div>

        <div className="relative z-10">
          <div className="mb-2">
            <GXLogo size="sm" priority />
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Good Morning,</p>
          <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
            {displayName}
          </h2>
        </div>
      </div>

      {/* =========================================================================
          3. KPI CARDS (MATCHING REFERENCE COLORS & PROPORTIONS)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Members (Red accent) */}
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-4 sm:p-5 shadow-sm hover:border-red-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Members</span>
            <div className="w-9 h-9 rounded-2xl bg-red-600/10 dark:bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
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

        {/* Card 2: Active Programs (Purple accent) */}
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-4 sm:p-5 shadow-sm hover:border-purple-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Active Programs</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-600/10 dark:bg-purple-950/40 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
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

        {/* Card 3: Sessions (Blue accent) */}
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-4 sm:p-5 shadow-sm hover:border-blue-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Sessions</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-600/10 dark:bg-blue-950/40 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
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

        {/* Card 4: Coaches (Slate/Indigo accent) */}
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-4 sm:p-5 shadow-sm hover:border-indigo-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Coaches</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 dark:bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
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
          4. MAIN SECTION: MEMBERS ACTIVITY CHART & TODAY'S CLASSES
          ========================================================================= */}
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
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Live Volume</span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#1f2937" : "#e2e8f0"} vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#0c0f17" : "#ffffff",
                    borderColor: theme === "dark" ? "#1f2937" : "#e2e8f0",
                    borderRadius: "1rem",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: theme === "dark" ? "#ffffff" : "#0f172a"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="members"
                  stroke="#dc2626"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#redGradient)"
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
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#161c28] border border-slate-200 dark:border-[#1f2937] hover:border-red-500/40 transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-600/10 dark:bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-105 transition-transform">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-red-500 transition-colors">
                        {cls.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {cls.time} • {cls.members}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-[#1f2937]">
            <Link
              href="/assignments"
              className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 transition-all flex items-center justify-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Workout Assignment</span>
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. ATHLETE CLIENT SECTION (FOR ATHLETE USERS)
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
              <p className="text-sm font-black text-slate-900 dark:text-white">{myClient?.sport?.nameEn || "CrossFit / Fitness"}</p>
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

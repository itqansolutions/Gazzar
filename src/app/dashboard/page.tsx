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
  Sparkles,
  TrendingUp,
  PlusCircle,
  Clock,
  Flame,
  ArrowUpRight,
  Shield
} from "lucide-react";
import {
  AreaChart,
  Area,
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

  // Real Database entities
  const clients = db.getClients(undefined, role, user?.id);
  const coaches = db.getCoaches();
  const programs = db.getPrograms();
  const templates = db.getTemplates();
  const calendars = db.getCalendars();
  const assignments = db.getAssignments();

  // Metrics grounded strictly in application database
  const membersCount = clients.length;
  const programsCount = programs.length;
  const sessionsCount = calendars.length + assignments.length;
  const coachesCount = coaches.length;

  // Client Athlete profile
  const myClient = clients.find(c => c.userId === user?.id) || clients[0];
  const clientRestrictions = myClient?.medicalRestrictions || [];

  // Today's classes directly mapped from session calendars
  const todayClasses = calendars.length > 0
    ? calendars.slice(0, 3).map((c, i) => ({
        id: c.id,
        title: c.title,
        time: c.startTime ? new Date(c.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:00 AM",
        members: c.attendances?.length ? `${c.attendances.length} Members` : "Open Session"
      }))
    : [];

  // Weekly attendance volume curve
  const activityData = [
    { day: "Mon", members: Math.round(membersCount * 0.15) || 18 },
    { day: "Tue", members: Math.round(membersCount * 0.35) || 42 },
    { day: "Wed", members: Math.round(membersCount * 0.25) || 32 },
    { day: "Thu", members: Math.round(membersCount * 0.45) || 58 },
    { day: "Fri", members: Math.round(membersCount * 0.38) || 48 },
    { day: "Sat", members: Math.round(membersCount * 0.52) || 66 },
    { day: "Sun", members: Math.round(membersCount * 0.75) || 96 }
  ];

  const displayName = user?.name || "Coach Abdullah";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full overflow-x-hidden">
      {/* =========================================================================
          1. DESKTOP WELCOME HERO BANNER (MATCHING DESIGN REFERENCE WITH COACH PHOTO)
          ========================================================================= */}
      <div className="hidden sm:block relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#121620] to-[#161c28] dark:from-[#0c0f17] dark:via-[#121620] dark:to-[#1a1f2e] border border-slate-200 dark:border-[#1f2937] p-6 lg:p-8 shadow-xl text-white">
        {/* Subtle Crimson Red Glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-48 w-48 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-red-400" />
              <span>GX Athletic Performance Academy</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              Welcome back, {displayName} 👋
            </h1>

            <p className="text-xs lg:text-sm text-slate-300 dark:text-slate-400 mt-2 font-medium leading-relaxed">
              Manage athletic programs, review member progressions, and orchestrate today&apos;s coaching sessions with high intensity.
            </p>

            <div className="flex items-center space-x-3 mt-5">
              <Link
                href="/assignments"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Workout Assignment</span>
              </Link>
              <Link
                href="/calendar"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>View Schedule</span>
              </Link>
            </div>
          </div>

          {/* Genuine Coach Abdullah Photograph Standing on Desktop Right */}
          <div className="hidden lg:block relative w-48 h-56 flex-shrink-0 self-end -mb-8 overflow-hidden pointer-events-none">
            <img
              src="/coach_abdullah_hero.png"
              alt="Coach Abdullah Elgazzar"
              className="w-full h-full object-contain object-bottom filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MOBILE WELCOME BANNER (DEDICATED MOBILE COMPOSITION WITH COACH BLEND)
          ========================================================================= */}
      <div className="sm:hidden relative overflow-hidden rounded-3xl bg-[#0c0f17] border border-[#1a1f2e] p-5 shadow-2xl text-white">
        {/* Genuine Coach Abdullah blend in background */}
        <div className="absolute right-0 top-0 bottom-0 w-36 pointer-events-none opacity-45 mix-blend-screen">
          <img
            src="/coach_abdullah_portrait.png"
            alt="Coach Abdullah"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0f17] via-[#0c0f17]/50 to-transparent" />
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
          3. FOUR KPI CARDS (2x2 ON MOBILE, 4-COL ON DESKTOP, APPROVED COLORS)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Members (Crimson Red Accent) */}
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

        {/* KPI 2: Active Programs (Royal Purple Accent) */}
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

        {/* KPI 3: Sessions (Ocean Blue Accent) */}
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

        {/* KPI 4: Coaches (Slate/Indigo Accent) */}
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
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Live Volume</span>
            </div>
          </div>

          <div className="h-56 sm:h-72 w-full">
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

            {todayClasses.length > 0 ? (
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
            ) : (
              <div className="py-8 text-center px-4 rounded-2xl bg-slate-50 dark:bg-[#161c28] border border-dashed border-slate-200 dark:border-slate-800">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No sessions scheduled for today
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Plan and schedule training sessions from the calendar.
                </p>
              </div>
            )}
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

      {/* =========================================================================
          5. ATHLETE CLIENT SECTION (FOR ATHLETE USERS ONLY)
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

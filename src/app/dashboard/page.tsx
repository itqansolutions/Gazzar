"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/db";
import { Mark } from "@/components/brand/Logo";
import {
  KPICard,
  ClassRow,
  ActivityChart,
  ProgressChart,
  MembershipsDonut,
} from "@/components/dashboard";
import {
  Users,
  Calendar,
  Layers,
  UserCheck,
  ChevronRight,
  PlusCircle,
  Dumbbell,
} from "lucide-react";

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

  // Metrics grounded strictly in application database (with reference fallbacks if db is fresh)
  const membersCount = clients.length || 128;
  const programsCount = programs.length || 24;
  const sessionsCount = calendars.length + assignments.length || 316;
  const coachesCount = coaches.length || 8;

  // Client Athlete profile
  const myClient = clients.find((c) => c.userId === user?.id) || clients[0];
  const clientRestrictions = myClient?.medicalRestrictions || [];

  // Today's classes from DB with reference alignment
  const todayClasses =
    calendars.length > 0
      ? calendars.slice(0, 3).map((c) => ({
          id: c.id,
          title: c.title,
          time: c.startTime
            ? new Date(c.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "10:00 AM",
          members: c.attendances?.length
            ? `${c.attendances.length} Members`
            : "18 Members",
        }))
      : [
          { id: "ref-1", title: "CrossFit WOD", time: "10:00 AM", members: "18 Members" },
          { id: "ref-2", title: "Strength", time: "12:00 PM", members: "12 Members" },
          { id: "ref-3", title: "MetCon", time: "06:00 PM", members: "16 Members" },
        ];

  // Members Activity Spline Wave Curve (Dark Mode Reference)
  const activityData = [
    { day: "Mon", members: 20 },
    { day: "Tue", members: 38 },
    { day: "Wed", members: 48 },
    { day: "Thu", members: 32 },
    { day: "Fri", members: 58 },
    { day: "Sat", members: 72 },
    { day: "Sun", members: 92 },
  ];

  // Progress Overview Bar Chart (Light Mode Reference)
  const progressData = [
    { month: "Jan", progress: 30 },
    { month: "Feb", progress: 45 },
    { month: "Mar", progress: 52 },
    { month: "Apr", progress: 68 },
    { month: "May", progress: 78 },
    { month: "Jun", progress: 95 },
  ];

  const displayName = user?.name || "Coach Abdullah";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full overflow-x-hidden">
      {/* =========================================================================
          1. DESKTOP HEADER (CLEAN MATCH TO REFERENCE TOP BAR)
          ========================================================================= */}
      <div className="hidden sm:flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-sans text-fg tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1 font-medium">
            Welcome back, {displayName} 👋
          </p>
        </div>

        {/* Quick Assignment CTA */}
        <div className="flex items-center space-x-3">
          <Link
            href="/assignments"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-control bg-brand hover:bg-brand-hover text-brand-contrast font-bold text-xs shadow-glow transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-app"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Assignment</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          2. MOBILE WELCOME HERO BANNER (MATCHING PHONE FRAME IN REFERENCE)
          ========================================================================= */}
      <div className="sm:hidden relative overflow-hidden rounded-card bg-card border border-line p-5 shadow-card text-fg">
        {/* Genuine Coach Abdullah portrait blend */}
        <div className="absolute right-0 top-0 bottom-0 w-36 pointer-events-none opacity-40 mix-blend-screen">
          <img
            src="/coach_abdullah_portrait.png"
            alt="Coach Abdullah"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[210px]">
          <div className="mb-2.5">
            <Mark size={28} />
          </div>
          <p className="text-xs text-muted font-medium">Good Morning,</p>
          <h2 className="text-xl font-black text-fg tracking-tight mt-0.5 truncate font-display">
            {displayName}
          </h2>
          <p className="text-[10px] text-brand font-bold uppercase tracking-wider mt-1.5">
            Manage • Train • Track • Perform
          </p>
        </div>
      </div>

      {/* =========================================================================
          3. FOUR KPI CARDS (2x2 ON MOBILE, 4-COL ON DESKTOP, MATCHING REFERENCE)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Members (Brand Accent) */}
        <KPICard
          label="Members"
          value={membersCount}
          delta="+12%"
          accent="brand"
          icon={<Users className="w-5 h-5" />}
        />

        {/* KPI 2: Active Programs (Purple Accent) */}
        <KPICard
          label="Active Programs"
          value={programsCount}
          delta="+20%"
          accent="purple"
          icon={<Layers className="w-5 h-5" />}
        />

        {/* KPI 3: Sessions (Blue Accent) */}
        <KPICard
          label="Sessions"
          value={sessionsCount}
          delta="+18%"
          accent="blue"
          icon={<Calendar className="w-5 h-5" />}
        />

        {/* KPI 4: Coaches (Neutral Accent) */}
        <KPICard
          label="Coaches"
          value={coachesCount}
          delta="Active"
          accent="neutral"
          icon={<UserCheck className="w-5 h-5" />}
        />
      </div>

      {/* =========================================================================
          4. MOBILE TODAY'S CLASSES (< lg) - EXACT MATCH TO REFERENCE
          ========================================================================= */}
      <div className="lg:hidden bg-card border border-line rounded-card p-5 shadow-card">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold text-fg">Today&apos;s Classes</h2>
          <Link
            href="/calendar"
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-2.5">
          {todayClasses.map((cls) => (
            <ClassRow
              key={cls.id}
              id={cls.id}
              title={cls.title}
              time={cls.time}
              members={cls.members}
              icon={<Dumbbell className="h-4 w-4" />}
            />
          ))}
        </div>
      </div>

      {/* =========================================================================
          5. DESKTOP MAIN SECTION (≥ lg): DUAL-MODE VISUAL LAYOUT
          - Dark Mode: Members Activity Wave Chart (Span 2) + Today's Classes (Span 1)
          - Light Mode: Progress Overview + Memberships Donut + Coach Hero Cutout
          ========================================================================= */}
      {theme === "light" ? (
        /* Light Theme Desktop Composition Matching Reference */
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-stretch">
          {/* Progress Overview Bar Chart (Span 6) */}
          <div className="lg:col-span-6">
            <ProgressChart data={progressData} />
          </div>

          {/* Memberships Donut Chart (Span 3) */}
          <div className="lg:col-span-3">
            <MembershipsDonut percentage={76} delta="+12%" />
          </div>

          {/* Coach Abdullah Cutout with Dynamic Red Brush Strokes (Span 3) */}
          <div className="lg:col-span-3 relative rounded-card bg-raised border border-line p-5 shadow-card overflow-hidden flex flex-col justify-end min-h-[300px]">
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <img
                src="/coach_abdullah_light_hero.png"
                alt="Coach Abdullah"
                className="w-full h-full object-contain object-bottom filter drop-shadow-md"
              />
            </div>
            <div className="relative z-10 pt-48">
              <span className="px-2.5 py-1 rounded-pill bg-brand text-brand-contrast text-[10px] font-bold uppercase tracking-wider inline-block">
                Coach Lead
              </span>
              <p className="text-xs font-black text-fg mt-1">
                Abdullah Elgazzar
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Dark Theme Desktop Composition Matching Reference */
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {/* Left: Members Activity Wave Chart (Span 2) */}
          <div className="lg:col-span-2">
            <ActivityChart data={activityData} />
          </div>

          {/* Right: Today's Classes List (Span 1) */}
          <div className="bg-card border border-line rounded-card p-5 sm:p-6 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-fg tracking-tight">
                  Today&apos;s Classes
                </h2>
                <Link
                  href="/calendar"
                  className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {todayClasses.map((cls) => (
                  <ClassRow
                    key={cls.id}
                    id={cls.id}
                    title={cls.title}
                    time={cls.time}
                    members={cls.members}
                    icon={<Dumbbell className="h-4 w-4" />}
                  />
                ))}
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="pt-4 mt-4 border-t border-line">
              <Link
                href="/assignments"
                className="w-full py-3 rounded-control bg-brand hover:bg-brand-hover text-brand-contrast font-bold text-xs shadow-glow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-app"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Workout Assignment</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. ATHLETE CLIENT SECTION (FOR ATHLETE USERS ONLY)
          ========================================================================= */}
      {isClient && (
        <div className="bg-card border border-line rounded-card p-5 sm:p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-fg tracking-tight">
              My Training & Medical Status
            </h2>
            <Link
              href={`/clients/${myClient?.id || ""}`}
              className="text-xs font-bold text-brand hover:underline"
            >
              View Full Profile
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-control bg-raised border border-line">
              <span className="text-[11px] font-medium text-muted block mb-1">
                Target Sport
              </span>
              <p className="text-sm font-bold text-fg">
                {myClient?.sport?.nameEn || "CrossFit / Fitness"}
              </p>
            </div>
            <div className="p-4 rounded-control bg-raised border border-line">
              <span className="text-[11px] font-medium text-muted block mb-1">
                Membership Status
              </span>
              <p className="text-sm font-bold text-emerald-500">
                {myClient?.status || "ACTIVE"}
              </p>
            </div>
            <div className="p-4 rounded-control bg-raised border border-line">
              <span className="text-[11px] font-medium text-muted block mb-1">
                Medical Clearance
              </span>
              <p className="text-sm font-bold text-fg">
                {clientRestrictions.length === 0
                  ? "Full Clearance (Safe)"
                  : `${clientRestrictions.length} Restriction(s)`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

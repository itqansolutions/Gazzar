"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Mark } from "@/components/brand/Logo";
import {
  KPICard,
  ClassRow,
  ActivityChart,
  ProgressChart,
  MembershipsDonut,
  TopPrograms,
  WelcomeHero,
  SubscriptionCard,
} from "@/components/dashboard";
import {
  Users,
  Calendar,
  Layers,
  UserCheck,
  ChevronRight,
  PlusCircle,
  Dumbbell,
  Bell,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setDashboardData(json.data);
        }
      })
      .catch((err) => console.error("[Dashboard] Error loading metrics:", err));
  }, []);

  if (!mounted || !user) return null;

  const role = user.role;
  const isClient = role === "CLIENT";

  // Real Database entities from API
  const metrics = dashboardData?.metrics || {};
  const membersCount = metrics.clientsCount ?? 0;
  const programsCount = metrics.templatesCount ?? 0;
  const sessionsCount = metrics.totalWorkouts ?? 0;
  const coachesCount = metrics.coachesCount ?? 0;

  const myClient = dashboardData?.recentClients?.[0] || null;
  const clientRestrictions: any[] = [];

  // Upcoming classes from PostgreSQL
  const upcomingSessions = dashboardData?.upcomingSessions || [];
  const todayClasses =
    upcomingSessions.length > 0
      ? upcomingSessions.map((c: any) => ({
          id: c.id,
          title: c.title,
          time: c.startTime
            ? new Date(c.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          members: c.attendances?.length
            ? `${c.attendances.length} Members`
            : "0 Members",
        }))
      : [];

  // Members Activity Spline Wave Curve (Weekly)
  const activityData = [
    { day: "Mon", members: 0 },
    { day: "Tue", members: 0 },
    { day: "Wed", members: 0 },
    { day: "Thu", members: 0 },
    { day: "Fri", members: 0 },
    { day: "Sat", members: 0 },
    { day: "Sun", members: 0 },
  ];

  // Progress Overview Bar Chart (Monthly)
  const progressData = [
    { month: "Jan", progress: 0 },
    { month: "Feb", progress: 0 },
    { month: "Mar", progress: 0 },
    { month: "Apr", progress: 0 },
    { month: "May", progress: 0 },
    { month: "Jun", progress: 0 },
  ];

  const displayName = user?.name || "Coach Abdullah";
  const isLight = theme === "light";

  return (
    <div className="atmo -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 min-h-screen relative overflow-hidden">
      {/* Background athletic atmospheric texture and slashes */}
      <div className="texture-hatch" aria-hidden="true" />
      <div
        className="slash-accent left-[14%] top-[-60px] w-[70px] h-[300px] opacity-20"
        aria-hidden="true"
      />

      <div className="relative z-10 space-y-6 max-w-7xl mx-auto pb-16 w-full">
        {/* =========================================================================
            1. DESKTOP HEADER (TOP BAR WITH WELCOME)
            ========================================================================= */}
        <div className="hidden sm:flex items-center justify-between pb-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-sans text-fg tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1 font-medium">
              Welcome back, {displayName} 👋
            </p>
          </div>

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
            2. DESKTOP WELCOME HERO BANNER (MATCHING GX FIT LOOK PROTOTYPE)
            ========================================================================= */}
        <div className="hidden sm:block">
          <WelcomeHero
            displayName={displayName}
            theme={theme as "dark" | "light"}
            classesCount={todayClasses.length}
            checkinsCount={12}
          />
        </div>

        {/* =========================================================================
            3. MOBILE IMMERSIVE HERO BANNER (< sm)
            - 304px height, genuine coach photo, radial glow, slashes, logo, title
            ========================================================================= */}
        <div className="sm:hidden relative h-[304px] -mx-4 -mt-4 overflow-hidden rounded-b-card shadow-card">
          <img
            src={isLight ? "/coach_light_hero.jpg" : "/coach_dark_hero.jpg"}
            alt="Coach Abdullah"
            className="absolute inset-0 w-full h-full object-cover object-[62%_10%]"
          />

          {/* Bottom gradient fade */}
          <div
            className="absolute inset-0"
            style={{
              background: isLight
                ? "linear-gradient(0deg, #F4F5F7 4%, rgba(244,245,247,0.6) 48%, rgba(244,245,247,0.25) 100%)"
                : "linear-gradient(0deg, #0A0A0B 4%, rgba(10,10,11,0.6) 48%, rgba(10,10,11,0.25) 100%)",
            }}
          />

          {/* Radial red glow overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: isLight
                ? "radial-gradient(320px 220px at 0% 0%, rgba(226,13,27,0.25), transparent 68%)"
                : "radial-gradient(320px 220px at 0% 0%, rgba(240,20,37,0.42), transparent 68%)",
            }}
          />

          {/* Slashes */}
          <div
            className="slash-accent left-[58%] top-[-30px] w-[56px] h-[230px] opacity-80"
            aria-hidden="true"
          />
          <div
            className="slash-accent left-[72%] top-[-30px] w-[12px] h-[200px] opacity-60"
            aria-hidden="true"
          />
          <div className="texture-hatch" aria-hidden="true" />

          {/* Top Logo and Notification row */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <Mark size={32} />
            <Link
              href="/attendance"
              className="w-10 h-10 rounded-control flex items-center justify-center bg-card/70 backdrop-blur-md border border-line text-muted relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand" />
            </Link>
          </div>

          {/* Bottom Coach Title */}
          <div className="absolute left-4 bottom-10 z-10">
            <p className="text-xs text-muted font-medium">Good Morning,</p>
            <h1 className="font-display italic font-bold uppercase text-3xl sm:text-4xl text-fg leading-none mt-1">
              {displayName}
            </h1>
            <p className="text-[10px] text-brand font-bold uppercase tracking-wider mt-1">
              Manage • Train • Track • Perform
            </p>
          </div>
        </div>

        {/* =========================================================================
            4. FOUR KPI CARDS (OVERLAPPING ON MOBILE, 4-COL ON DESKTOP)
            ========================================================================= */}
        <div className="relative z-20 -mt-6 sm:mt-0 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            label="Members"
            value={membersCount}
            delta="+12%"
            accent="brand"
            icon={<Users className="w-5 h-5" />}
          />
          <KPICard
            label="Active Programs"
            value={programsCount}
            delta="+20%"
            accent="purple"
            icon={<Layers className="w-5 h-5" />}
          />
          <KPICard
            label="Sessions"
            value={sessionsCount}
            delta="+18%"
            accent="blue"
            icon={<Calendar className="w-5 h-5" />}
          />
          <KPICard
            label="Coaches"
            value={coachesCount}
            delta="Active"
            accent="neutral"
            icon={<UserCheck className="w-5 h-5" />}
          />
        </div>

        {/* =========================================================================
            5. MIDDLE SECTION: MEMBERS ACTIVITY WAVE CHART + TODAY'S CLASSES
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Left: Members Activity Area Wave Chart (Span 2) */}
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
                {todayClasses.length > 0 ? (
                  todayClasses.map((cls: any) => (
                    <ClassRow
                      key={cls.id}
                      id={cls.id}
                      title={cls.title}
                      time={cls.time}
                      members={cls.members}
                      icon={<Dumbbell className="h-4 w-4" />}
                    />
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-muted font-medium border border-dashed border-line rounded-card">
                    No upcoming sessions scheduled yet
                  </div>
                )}
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

        {/* =========================================================================
            6. LOWER SECTION: PROGRESS OVERVIEW + MEMBERSHIPS + TOP PROGRAMS
            ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
          {/* Progress Overview Bar Chart (Span 5) */}
          <div className="lg:col-span-5">
            <ProgressChart data={progressData} />
          </div>

          {/* Memberships Donut Chart (Span 3) */}
          <div className="lg:col-span-3">
            <MembershipsDonut percentage={76} delta="+12%" />
          </div>

          {/* Top Programs Progress Bars (Span 4) */}
          <div className="lg:col-span-4 md:col-span-2">
            <TopPrograms />
          </div>
        </div>

        {/* =========================================================================
            7. ATHLETE CLIENT SECTION (FOR ATHLETE USERS ONLY)
            ========================================================================= */}
        {isClient && (
          <div className="space-y-6">
            <SubscriptionCard clientId={myClient?.id} />

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
          </div>
        )}
      </div>
    </div>
  );
}

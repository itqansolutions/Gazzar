"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  AudienceScope,
  ClientProfile,
  ClientWorkoutAssignment,
  CoachProfile,
  EventMode,
  EventType,
  SessionCalendar,
  Sport
} from "@/types";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Globe,
  Video,
  Users,
  Trophy,
  Dumbbell,
  Plus,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ClipboardList,
  AlertCircle,
  X,
  User,
  Trash2,
  Layers
} from "lucide-react";

function localKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function CalendarPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const isCoachOrAdmin = user?.role === "ADMIN" || user?.role === "HEAD_COACH" || user?.role === "COACH";

  // Data states
  const [events, setEvents] = useState<SessionCalendar[]>([]);
  const [showCalWorkouts, setShowCalWorkouts] = useState(false);
  const [workouts, setWorkouts] = useState<ClientWorkoutAssignment[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Navigation states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<"ALL" | "EVENTS" | "WORKOUTS">("ALL");
  const [layoutMode, setLayoutMode] = useState<"MONTH" | "AGENDA">("MONTH");
  const [filterSportId, setFilterSportId] = useState("ALL");
  const [filterCoachId, setFilterCoachId] = useState("ALL");

  // Selected Item Drawer state
  const [selectedEvent, setSelectedEvent] = useState<SessionCalendar | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<ClientWorkoutAssignment | null>(null);

  // Schedule Modal state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formEventType, setFormEventType] = useState<EventType>("GROUP_CLASS");
  const [formEventMode, setFormEventMode] = useState<EventMode>("ONLINE");
  const [formOnlineLink, setFormOnlineLink] = useState("");
  const [formLocation, setFormLocation] = useState("GX Main Gym Floor");
  const [formSportId, setFormSportId] = useState("");
  const [formCoachId, setFormCoachId] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formStartTime, setFormStartTime] = useState("10:00");
  const [formEndTime, setFormEndTime] = useState("11:30");
  const [formIsAllDay, setFormIsAllDay] = useState(false);
  const [formAudienceScope, setFormAudienceScope] = useState<AudienceScope>("WHOLE_ACADEMY");
  const [formSelectedClients, setFormSelectedClients] = useState<string[]>([]);
  const [formMaxParticipants, setFormMaxParticipants] = useState(25);
  const [formDescription, setFormDescription] = useState("");

  // Calculate month boundaries
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthStart = useMemo(() => new Date(year, month, 1), [year, month]);
  const monthEnd = useMemo(() => new Date(year, month + 1, 0, 23, 59, 59), [year, month]);

  // Load calendar items
  useEffect(() => {
    loadCalendarData();
  }, [currentDate, filterSportId, filterCoachId, viewType]);

  // Load auxiliary lists (sports, coaches, clients) once
  useEffect(() => {
    Promise.all([
      fetch("/api/sports").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/coaches").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/clients").then((r) => r.json()).catch(() => ({ data: [] }))
    ]).then(([sportsRes, coachesRes, clientsRes]) => {
      if (sportsRes.success && Array.isArray(sportsRes.data)) setSports(sportsRes.data);
      if (coachesRes.success && Array.isArray(coachesRes.data)) setCoaches(coachesRes.data);
      if (clientsRes.success && Array.isArray(clientsRes.data)) setClients(clientsRes.data);
    });
  }, []);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      // Provide a buffer of 7 days before and after the month for calendar grid overflow
      const queryStart = new Date(year, month, -6).toISOString();
      const queryEnd = new Date(year, month + 1, 7).toISOString();
      q.set("startDate", queryStart);
      q.set("endDate", queryEnd);
      if (filterSportId !== "ALL") q.set("sportId", filterSportId);
      if (filterCoachId !== "ALL") q.set("coachId", filterCoachId);
      q.set("view", viewType);

      const res = await fetch(`/api/calendar?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setEvents(json.data.events || []);
        setWorkouts(json.data.workouts || []);
      }
    } catch (err) {
      console.error("[Calendar] Error loading unified calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthLabel = useMemo(() => {
    return currentDate.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
      month: "long",
      year: "numeric"
    });
  }, [currentDate, language]);

  // Calendar Grid Days Calculation
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDayIndex = monthStart.getDay(); // 0 is Sunday
    const totalDaysInMonth = monthEnd.getDate();

    // Previous month filler days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, [monthStart, monthEnd, year, month]);

  // Map events and workouts by date string "YYYY-MM-DD"
  const itemsByDate = useMemo(() => {
    const map = new Map<string, { events: SessionCalendar[]; workouts: ClientWorkoutAssignment[] }>();

    events.forEach((ev) => {
      const key = localKey(new Date(ev.startTime));
      if (!map.has(key)) map.set(key, { events: [], workouts: [] });
      map.get(key)!.events.push(ev);
    });

    workouts.forEach((wo) => {
      const key = new Date(wo.scheduledDate).toISOString().split("T")[0];
      if (!map.has(key)) map.set(key, { events: [], workouts: [] });
      map.get(key)!.workouts.push(wo);
    });

    return map;
  }, [events, workouts]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError("");
    setScheduleLoading(true);

    try {
      const startIso = new Date(`${formDate}T${formStartTime}:00`).toISOString();
      const endIso = new Date(`${formDate}T${formEndTime}:00`).toISOString();

      const payload = {
        title: formTitle,
        eventType: formEventType,
        eventMode: formEventMode,
        onlineLink: formEventMode === "ONLINE" ? formOnlineLink : null,
        location: formEventMode === "IN_PERSON" ? formLocation : null,
        sportId: formSportId && formSportId !== "ALL" ? formSportId : null,
        coachId: formCoachId || undefined,
        startTime: startIso,
        endTime: endIso,
        isAllDay: formIsAllDay,
        audienceScope: formAudienceScope,
        maxParticipants: Number(formMaxParticipants) || 20,
        description: formDescription,
        clientIds: formAudienceScope === "SELECTED_ATHLETES" ? formSelectedClients : undefined
      };

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to schedule session");
      }

      setIsScheduleOpen(false);
      // Reset form
      setFormTitle("");
      setFormDescription("");
      loadCalendarData();
    } catch (err: any) {
      setScheduleError(err.message || "Failed to schedule session");
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this event? This will also remove any attendance records.")) return;

    try {
      const res = await fetch(`/api/sessions?id=${sessionId}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to delete session");
        return;
      }
      setSelectedEvent(null);
      loadCalendarData();
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const getEventTypeBadge = (type?: EventType) => {
    switch (type) {
      case "CHAMPIONSHIP":
        return { label: "Championship 🏆", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" };
      case "CAMP":
        return { label: "Camp 🏕️", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" };
      case "SEMINAR_WORKSHOP":
        return { label: "Workshop 🎓", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" };
      case "GENERAL_EVENT":
        return { label: "Event 🌟", cls: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" };
      default:
        return { label: "Group Class 👥", cls: "bg-brand-crimson/15 text-brand-crimson border-brand-crimson/30" };
    }
  };

  const getWorkoutStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return { label: "Completed", dotCls: "bg-rose-500", textCls: "text-rose-600 dark:text-rose-400" };
      case "IN_PROGRESS":
        return { label: "In Progress", dotCls: "bg-amber-500", textCls: "text-amber-600 dark:text-amber-400" };
      case "SKIPPED":
        return { label: "Skipped", dotCls: "bg-slate-400", textCls: "text-slate-500" };
      case "MISSED":
        return { label: "Missed", dotCls: "bg-red-500", textCls: "text-red-600 dark:text-red-400" };
      default:
        return { label: "Scheduled", dotCls: "bg-sky-500", textCls: "text-sky-600 dark:text-sky-400" };
    }
  };

  const totalEventCount = events.length;
  const totalWorkoutCount = workouts.length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <CalendarIcon className="w-6 h-6 text-brand-crimson" />
            <span>Academy Calendar</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Unified schedule of championships, group classes, webinars, and individual athlete workout assignments
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          {isCoachOrAdmin && (
            <button
              onClick={() => setIsScheduleOpen(true)}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-brand-crimson/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Event / Class</span>
            </button>
          )}

          <Link
            href="/assignments"
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
          >
            <ClipboardList className="w-4 h-4 text-brand-crimson" />
            <span>Workout Schedule</span>
          </Link>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Month Navigator */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-brand-crimson transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize min-w-[150px]">
            {monthLabel}
          </span>
        </div>

        {/* View Filters & Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Type Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setViewType("ALL")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewType === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All ({totalEventCount + totalWorkoutCount})
            </button>
            <button
              onClick={() => setViewType("EVENTS")}
              className={`flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewType === "EVENTS"
                  ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-purple-500" />
              <span>Events ({totalEventCount})</span>
            </button>
            <button
              onClick={() => setViewType("WORKOUTS")}
              className={`flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewType === "WORKOUTS"
                  ? "bg-white dark:bg-slate-900 text-brand-crimson shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 text-brand-crimson" />
              <span>Workouts ({totalWorkoutCount})</span>
            </button>
          </div>

          {/* Sport Filter */}
          <select
            value={filterSportId}
            onChange={(e) => setFilterSportId(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-crimson cursor-pointer"
          >
            <option value="ALL">All Sports</option>
            {sports.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.nameEn}
              </option>
            ))}
          </select>

          {/* Coach Filter (for Admin/Head Coach) */}
          {user?.role === "ADMIN" && (
            <select
              value={filterCoachId}
              onChange={(e) => setFilterCoachId(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-crimson cursor-pointer"
            >
              <option value="ALL">All Coaches</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.user?.name || "Coach"}
                </option>
              ))}
            </select>
          )}

          {/* Layout Mode Switch (Month Grid vs List Agenda) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setLayoutMode("MONTH")}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                layoutMode === "MONTH"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setLayoutMode("AGENDA")}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                layoutMode === "AGENDA"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Render */}
      {loading ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold animate-pulse">
          Loading unified calendar schedule...
        </div>
      ) : layoutMode === "MONTH" ? (
        /* ==================== MONTH VIEW GRID ==================== */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">
              {showCalWorkouts ? "Showing classes and athlete workouts" : `Showing classes only · ${totalWorkoutCount} athlete workouts hidden`}
            </span>
            <button
              type="button"
              onClick={() => setShowCalWorkouts((v) => !v)}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
            >
              {showCalWorkouts ? "Hide workouts" : "Show workouts"}
            </button>
          </div>
          {/* Day Headers (Sun - Sat) */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-center text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 py-3">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Day Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
            {calendarDays.map((cell, idx) => {
              const dateKey = localKey(cell.date);
              const cellItems = itemsByDate.get(dateKey) || { events: [], workouts: [] };
              const isToday = localKey(new Date()) === dateKey;

              return (
                <div
                  key={idx}
                  className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors ${
                    !cell.isCurrentMonth
                      ? "bg-slate-50/40 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600"
                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  } ${isToday ? "ring-2 ring-inset ring-brand-crimson/50 bg-brand-crimson/[0.02]" : ""}`}
                >
                  {/* Date Number Badge */}
                  <div className="flex items-center justify-between pb-1">
                    <span
                      className={`text-xs font-black inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? "bg-brand-crimson text-white shadow-sm"
                          : cell.isCurrentMonth
                          ? "text-slate-700 dark:text-slate-300"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    {(cellItems.events.length > 0 || cellItems.workouts.length > 0) && (
                      <span className="hidden sm:inline text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        {cellItems.events.length + cellItems.workouts.length} items
                      </span>
                    )}
                  </div>

                  {/* Cell Items Stack */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[110px] no-scrollbar">
                    {/* Events (Solid Purple/Crimson Pill) */}
                    {cellItems.events.map((ev) => {
                      const typeBadge = getEventTypeBadge(ev.eventType);
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className="w-full text-left p-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-[10px] font-bold text-purple-700 dark:text-purple-300 transition-all flex items-center justify-between gap-1 cursor-pointer truncate"
                          title={`${ev.title} (${ev.eventType})`}
                        >
                          <div className="flex items-center space-x-1 rtl:space-x-reverse truncate">
                            <Trophy className="w-3 h-3 flex-shrink-0 text-purple-500" />
                            <span className="truncate">{ev.title}</span>
                          </div>
                          {ev.eventMode === "ONLINE" ? (
                            <span title="Online"><Globe className="w-2.5 h-2.5 flex-shrink-0 text-blue-500" /></span>
                          ) : (
                            <span title="In Person"><MapPin className="w-2.5 h-2.5 flex-shrink-0 text-rose-500" /></span>
                          )}
                        </button>
                      );
                    })}

                    {!showCalWorkouts && cellItems.workouts.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-crimson" />
                        {cellItems.workouts.length}<span className="hidden sm:inline">&nbsp;workout{cellItems.workouts.length === 1 ? "" : "s"}</span>
                      </span>
                    )}
                    {/* Workouts (Outlined Badge with Status Dot) */}
                    {(showCalWorkouts ? cellItems.workouts : []).map((wo) => {
                      const st = getWorkoutStatusBadge(wo.status);
                      return (
                        <button
                          key={wo.id}
                          onClick={() => setSelectedWorkout(wo)}
                          className="w-full text-left p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-800 dark:text-slate-200 transition-all flex items-center justify-between gap-1 cursor-pointer truncate"
                          title={`${wo.client?.user?.name || "Athlete"}: ${wo.template?.titleEn || wo.workoutTemplate?.titleEn || wo.program?.titleEn || wo.title || "Workout"}`}
                        >
                          <div className="flex items-center space-x-1.5 rtl:space-x-reverse truncate">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dotCls}`} />
                            <span className="font-bold truncate">
                              {wo.client?.user?.name ? wo.client.user.name.split(" ")[0] : "Athlete"}:
                            </span>
                            <span className="truncate text-slate-500 dark:text-slate-400">
                              {wo.template?.titleEn || wo.workoutTemplate?.titleEn || wo.program?.titleEn || wo.title || "Workout"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ==================== AGENDA / LIST VIEW ==================== */
        <div className="space-y-4">
          {events.length === 0 && workouts.length === 0 ? (
            <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No events or scheduled workouts found for this month window.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Events Column */}
              {(viewType === "ALL" || viewType === "EVENTS") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center space-x-2 rtl:space-x-reverse">
                      <Trophy className="w-4 h-4" />
                      <span>Academy Events & Classes ({events.length})</span>
                    </h2>
                  </div>

                  {events.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                      No academy events scheduled.
                    </div>
                  ) : (
                    events.map((ev) => {
                      const typeBadge = getEventTypeBadge(ev.eventType);
                      const startTime = new Date(ev.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const endTime = new Date(ev.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const dateStr = new Date(ev.startTime).toLocaleDateString([], { month: "short", day: "numeric", weekday: "short" });

                      return (
                        <div
                          key={ev.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-500/20 hover:border-purple-500/40 shadow-sm space-y-3 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeBadge.cls}`}>
                                  {typeBadge.label}
                                </span>
                                {ev.eventMode === "ONLINE" ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center space-x-1 rtl:space-x-reverse">
                                    <Globe className="w-3 h-3" />
                                    <span>Online</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center space-x-1 rtl:space-x-reverse">
                                    <MapPin className="w-3 h-3" />
                                    <span>In-Person</span>
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">{ev.title}</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Coach: {ev.coach?.user?.name || "GX Coach"} {ev.sport ? `• Sport: ${ev.sport.nameEn}` : ""}
                              </p>
                            </div>

                            <button
                              onClick={() => setSelectedEvent(ev)}
                              className="px-2.5 py-1 rounded-xl text-xs font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                            >
                              Details
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                              <Clock className="w-3.5 h-3.5 text-purple-500" />
                              <span>{dateStr} • {startTime} - {endTime}</span>
                            </div>
                            <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{ev.attendances?.length || 0} / {ev.maxParticipants}</span>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center justify-between pt-1 text-xs">
                            {ev.eventMode === "ONLINE" && ev.onlineLink ? (
                              <a
                                href={ev.onlineLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 rtl:space-x-reverse text-blue-600 dark:text-blue-400 font-bold hover:underline"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Online Meeting</span>
                              </a>
                            ) : (
                              <span className="text-slate-500 truncate max-w-[200px]">
                                📍 {ev.location || "GX Main Hall"}
                              </span>
                            )}

                            {isCoachOrAdmin && (
                              <Link
                                href={`/attendance?sessionId=${ev.id}`}
                                className="inline-flex items-center space-x-1 rtl:space-x-reverse text-brand-crimson font-bold hover:underline"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Manage Attendance</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Workouts Column */}
              {(viewType === "ALL" || viewType === "WORKOUTS") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-brand-crimson flex items-center space-x-2 rtl:space-x-reverse">
                      <Dumbbell className="w-4 h-4" />
                      <span>Athlete Workout Schedule ({workouts.length})</span>
                    </h2>
                  </div>

                  {workouts.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                      No workouts scheduled in this date range.
                    </div>
                  ) : (
                    workouts.map((wo) => {
                      const st = getWorkoutStatusBadge(wo.status);
                      const dateStr = new Date(wo.scheduledDate).toLocaleDateString([], { month: "short", day: "numeric", weekday: "short" });
                      const exerciseCount = wo.assignmentBlocks?.reduce((acc, b) => acc + (b.items?.length || 0), 0) || wo.exercises?.length || 0;

                      return (
                        <div
                          key={wo.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-crimson/30 shadow-sm space-y-3 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                  {wo.client?.user?.name || "Athlete"}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  {wo.client?.sport?.nameEn || "General"}
                                </span>
                              </div>
                              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 pt-0.5">
                                {wo.template?.titleEn || wo.workoutTemplate?.titleEn || wo.program?.titleEn || wo.title || "Custom Workout"}
                              </h3>
                              <p className="text-[11px] text-slate-400">
                                Coach: {wo.coach?.user?.name || "Assigned Coach"}
                              </p>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center space-x-1 rtl:space-x-reverse ${st.textCls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`} />
                              <span>{st.label}</span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span>📅 {dateStr}</span>
                            <span>🏋️ {exerciseCount} exercises</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-xs">
                            <Link
                              href={`/workout/${wo.id}/execute`}
                              className="text-brand-crimson font-bold hover:underline flex items-center space-x-1 rtl:space-x-reverse"
                            >
                              <span>Execute Workout</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>

                            <Link
                              href={`/assignments?athleteId=${wo.clientId}`}
                              className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold"
                            >
                              Inspect File →
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== EVENT DETAIL DRAWER / MODAL ==================== */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getEventTypeBadge(selectedEvent.eventType).cls}`}>
                    {getEventTypeBadge(selectedEvent.eventType).label}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {selectedEvent.eventMode === "ONLINE" ? "🌐 Online" : "📍 In Person"}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white pt-1">{selectedEvent.title}</h3>
                <p className="text-xs text-slate-500">Coach: {selectedEvent.coach?.user?.name || "GX Coach"}</p>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Start Time</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(selectedEvent.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">End Time</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(selectedEvent.endTime).toLocaleTimeString([], { timeStyle: "short" })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sport</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedEvent.sport?.nameEn || "All Sports / Academy-Wide"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Audience Scope</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedEvent.audienceScope?.replace("_", " ") || "Whole Academy"}
                </span>
              </div>
            </div>

            {selectedEvent.description && (
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold block text-[10px] text-slate-400 uppercase pb-1">Notes & Description:</span>
                <p className="whitespace-pre-line">{selectedEvent.description}</p>
              </div>
            )}

            {/* Online link or Location */}
            {selectedEvent.eventMode === "ONLINE" && selectedEvent.onlineLink ? (
              <a
                href={selectedEvent.onlineLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md"
              >
                <Video className="w-4 h-4" />
                <span>Join Online Meeting 🎥</span>
              </a>
            ) : selectedEvent.eventMode === "IN_PERSON" ? (
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-slate-700 dark:text-slate-300 p-2.5 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-500/20">
                <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span className="font-bold truncate">{selectedEvent.location || "GX Main Gym Floor"}</span>
              </div>
            ) : null}

            {/* Attendance Roster Preview */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Registered Attendance ({selectedEvent.attendances?.length || 0} / {selectedEvent.maxParticipants})
                </span>

                {isCoachOrAdmin && (
                  <Link
                    href={`/attendance?sessionId=${selectedEvent.id}`}
                    className="text-brand-crimson font-bold hover:underline flex items-center space-x-1 rtl:space-x-reverse"
                  >
                    <span>Manage Full Roster 📋</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              {isCoachOrAdmin && (
                <button
                  onClick={() => handleDeleteSession(selectedEvent.id)}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Event</span>
                </button>
              )}

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all ml-auto cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== WORKOUT DETAIL DRAWER / MODAL ==================== */}
      {selectedWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30">
                  Workout Assignment
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white pt-1">
                  {selectedWorkout.client?.user?.name || "Athlete Workout"}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedWorkout.template?.titleEn || selectedWorkout.workoutTemplate?.titleEn || selectedWorkout.program?.titleEn || selectedWorkout.title || "Custom Session"}
                </p>
              </div>

              <button
                onClick={() => setSelectedWorkout(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Scheduled Date</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(selectedWorkout.scheduledDate).toLocaleDateString([], { dateStyle: "medium" })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Execution Status</span>
                <span className={`font-bold ${getWorkoutStatusBadge(selectedWorkout.status).textCls}`}>
                  {getWorkoutStatusBadge(selectedWorkout.status).label}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Athlete Sport</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedWorkout.client?.sport?.nameEn || "General Fitness"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Supervising Coach</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedWorkout.coach?.user?.name || "GX Coach"}
                </span>
              </div>
            </div>

            {selectedWorkout.coachNotes && (
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold block text-[10px] text-slate-400 uppercase pb-1">Coach Prescribed Notes:</span>
                <p className="whitespace-pre-line">{selectedWorkout.coachNotes}</p>
              </div>
            )}

            {/* Quick action buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <Link
                href={`/workout/${selectedWorkout.id}/execute`}
                className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-brand-crimson/90 text-white font-bold text-xs transition-all shadow-md flex items-center space-x-1.5 rtl:space-x-reverse"
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Open Workout Execution</span>
              </Link>

              <Link
                href={`/assignments?athleteId=${selectedWorkout.clientId}`}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all"
              >
                Inspect in Schedule 📋
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SCHEDULE EVENT / CLASS MODAL ==================== */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <Trophy className="w-5 h-5 text-brand-crimson" />
                  <span>Schedule Academy Event / Group Class</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creates a session on the academy calendar for attendance tracking and athlete calendars
                </p>
              </div>

              <button
                onClick={() => setIsScheduleOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {scheduleError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center space-x-2 rtl:space-x-reverse">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{scheduleError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Event Title (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cairo Youth Swimming Championship 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-crimson/50"
                />
              </div>

              {/* Event Type & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Event Type *
                  </label>
                  <select
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value as EventType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-crimson/50 cursor-pointer"
                  >
                    <option value="GROUP_CLASS">👥 Group Class / Clinic</option>
                    <option value="CHAMPIONSHIP">🏆 Championship / Competition</option>
                    <option value="CAMP">🏕️ Training Camp</option>
                    <option value="SEMINAR_WORKSHOP">🎓 Seminar / Workshop</option>
                    <option value="GENERAL_EVENT">🌟 General Academy Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Delivery Mode *
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFormEventMode("ONLINE")}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        formEventMode === "ONLINE"
                          ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      🌐 Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormEventMode("IN_PERSON")}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        formEventMode === "IN_PERSON"
                          ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      📍 In Person
                    </button>
                  </div>
                </div>
              </div>

              {/* Mode Dependent Field: Online Link or Location */}
              {formEventMode === "ONLINE" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Online Meeting / Webinar URL (Zoom, Google Meet, YouTube Live)
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/xyz or https://zoom.us/j/..."
                    value={formOnlineLink}
                    onChange={(e) => setFormOnlineLink(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-crimson/50"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Physical Location / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Olympic Swimming Complex, Nasr City"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-crimson/50"
                  />
                </div>
              )}

              {/* Date & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-crimson/50 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-crimson/50 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-crimson/50 cursor-pointer"
                  />
                </div>
              </div>

              {/* Sport & Coach */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sport (Optional)
                  </label>
                  <select
                    value={formSportId}
                    onChange={(e) => setFormSportId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-crimson/50 cursor-pointer"
                  >
                    <option value="">All Sports / General</option>
                    {sports.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Host / Coach
                  </label>
                  <select
                    value={formCoachId}
                    onChange={(e) => setFormCoachId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-crimson/50 cursor-pointer"
                  >
                    <option value="">Auto-Assign to My Profile</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name || "Coach"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Audience Scope */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Audience Scope *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <label className={`p-2.5 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                    formAudienceScope === "WHOLE_ACADEMY"
                      ? "border-brand-crimson bg-brand-crimson/10 font-bold text-brand-crimson"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}>
                    <input
                      type="radio"
                      name="audienceScope"
                      checked={formAudienceScope === "WHOLE_ACADEMY"}
                      onChange={() => setFormAudienceScope("WHOLE_ACADEMY")}
                      className="sr-only"
                    />
                    <span>Whole Academy</span>
                    <span className="text-[10px] text-slate-400">All Athletes</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                    formAudienceScope === "BY_SPORT"
                      ? "border-brand-crimson bg-brand-crimson/10 font-bold text-brand-crimson"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}>
                    <input
                      type="radio"
                      name="audienceScope"
                      checked={formAudienceScope === "BY_SPORT"}
                      onChange={() => setFormAudienceScope("BY_SPORT")}
                      className="sr-only"
                    />
                    <span>By Sport</span>
                    <span className="text-[10px] text-slate-400">Sport Athletes</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                    formAudienceScope === "COACH_ROSTER"
                      ? "border-brand-crimson bg-brand-crimson/10 font-bold text-brand-crimson"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}>
                    <input
                      type="radio"
                      name="audienceScope"
                      checked={formAudienceScope === "COACH_ROSTER"}
                      onChange={() => setFormAudienceScope("COACH_ROSTER")}
                      className="sr-only"
                    />
                    <span>My Roster</span>
                    <span className="text-[10px] text-slate-400">Coach Athletes</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                    formAudienceScope === "SELECTED_ATHLETES"
                      ? "border-brand-crimson bg-brand-crimson/10 font-bold text-brand-crimson"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}>
                    <input
                      type="radio"
                      name="audienceScope"
                      checked={formAudienceScope === "SELECTED_ATHLETES"}
                      onChange={() => setFormAudienceScope("SELECTED_ATHLETES")}
                      className="sr-only"
                    />
                    <span>Select Athletes</span>
                    <span className="text-[10px] text-slate-400">Explicit List</span>
                  </label>
                </div>
              </div>

              {/* Multi-athlete selector when SELECTED_ATHLETES */}
              {formAudienceScope === "SELECTED_ATHLETES" && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Athletes ({formSelectedClients.length} selected):
                  </span>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {clients.map((cl) => {
                      const isSelected = formSelectedClients.includes(cl.id);
                      return (
                        <label
                          key={cl.id}
                          className="flex items-center space-x-2 rtl:space-x-reverse text-xs p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormSelectedClients([...formSelectedClients, cl.id]);
                              } else {
                                setFormSelectedClients(formSelectedClients.filter((id) => id !== cl.id));
                              }
                            }}
                            className="rounded text-brand-crimson focus:ring-brand-crimson"
                          />
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cl.user?.name || "Athlete"}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            ({cl.sport?.nameEn || "General"})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Instructions / Equipment Needed
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bring formal race suit and ID card. Warm-up starts 30 minutes before race."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-crimson/50"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleLoading}
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-brand-crimson/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {scheduleLoading ? "Scheduling..." : "Save Event 🎯"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
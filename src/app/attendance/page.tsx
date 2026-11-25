"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { SessionCalendar, AttendanceStatus } from "@/types";
import {
  CheckCircle2,
  Users,
  Clock,
  Check,
  X,
  AlertCircle,
  Award,
  Calendar,
  ChevronRight,
  Filter,
  Search,
  Globe,
  MapPin,
  Trophy
} from "lucide-react";

interface EligibleAttendee {
  athleteId: string;
  name: string;
  email?: string;
  avatar?: string;
  sportName: string;
  status: AttendanceStatus | null;
  notes: string | null;
  attendanceId: string | null;
}

function AttendanceContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get("sessionId") || searchParams.get("id") || "";

  const [sessions, setSessions] = useState<SessionCalendar[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId);
  const [eligibleAttendees, setEligibleAttendees] = useState<EligibleAttendee[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (initialSessionId) {
      setSelectedSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  useEffect(() => {
    if (selectedSessionId) {
      loadAttendees(selectedSessionId);
    } else if (sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSessions(json.data);
          if (!selectedSessionId && json.data.length > 0) {
            setSelectedSessionId(json.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error("[Attendance] Error loading sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadAttendees = async (sessionId: string) => {
    setLoadingAttendees(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/eligible-attendees`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setEligibleAttendees(json.data);
        }
      }
    } catch (err) {
      console.error("[Attendance] Error loading attendees:", err);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleUpdateStatus = async (athleteId: string, status: AttendanceStatus) => {
    if (!selectedSessionId) return;

    // Optimistic UI update
    setEligibleAttendees((prev) =>
      prev.map((att) => (att.athleteId === athleteId ? { ...att, status } : att))
    );

    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          clientId: athleteId,
          status
        })
      });

      if (!res.ok) {
        // Rollback by reloading
        loadAttendees(selectedSessionId);
      }
    } catch (err) {
      console.error("[Attendance] Error updating attendance status:", err);
      loadAttendees(selectedSessionId);
    }
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  // Filter attendees
  const filteredAttendees = eligibleAttendees.filter((att) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = att.name.toLowerCase().includes(q);
      const matchSport = att.sportName.toLowerCase().includes(q);
      if (!matchName && !matchSport) return false;
    }
    if (statusFilter !== "ALL") {
      if (statusFilter === "UNMARKED") return att.status === null;
      return att.status === statusFilter;
    }
    return true;
  });

  // Calculate statistics
  const totalCount = eligibleAttendees.length;
  const presentCount = eligibleAttendees.filter((a) => a.status === "PRESENT").length;
  const absentCount = eligibleAttendees.filter((a) => a.status === "ABSENT").length;
  const lateCount = eligibleAttendees.filter((a) => a.status === "LATE").length;
  const excusedCount = eligibleAttendees.filter((a) => a.status === "EXCUSED").length;
  const unmarkedCount = eligibleAttendees.filter((a) => a.status === null).length;
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <CheckCircle2 className="w-6 h-6 text-brand-crimson" />
            <span>Attendance & Check-In</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track athlete check-in, late arrivals, excused absences, and adherence rates for academy events & classes
          </p>
        </div>

        <Link
          href="/calendar"
          className="flex items-center space-x-1.5 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4 text-brand-crimson" />
          <span>Open Calendar View</span>
        </Link>
      </div>

      {loadingSessions ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold animate-pulse">
          Loading sessions & classes...
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-3">
          <p>No training sessions or events found in the academy calendar.</p>
          <Link
            href="/calendar"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-crimson text-white text-xs font-bold shadow-md hover:bg-brand-crimson/90"
          >
            <span>+ Schedule First Event</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Session Selector Strip */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Session / Event to Track:
            </label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse overflow-x-auto pb-1 no-scrollbar">
              {sessions.map((sess) => {
                const isSelected = sess.id === selectedSessionId;
                const dateStr = new Date(sess.startTime).toLocaleDateString([], { month: "short", day: "numeric" });
                const timeStr = new Date(sess.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                return (
                  <button
                    key={sess.id}
                    onClick={() => setSelectedSessionId(sess.id)}
                    className={`flex-shrink-0 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-brand-crimson bg-brand-crimson/10 dark:bg-brand-crimson/15 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {sess.title}
                      </span>
                      {sess.eventMode === "ONLINE" ? (
                        <span title="Online"><Globe className="w-3 h-3 text-blue-500 flex-shrink-0" /></span>
                      ) : (
                        <span title="In Person"><MapPin className="w-3 h-3 text-rose-500 flex-shrink-0" /></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      📅 {dateStr} at {timeStr} • Coach: {sess.coach?.user?.name ? sess.coach.user.name.split(" ")[0] : "Coach"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Session Info & Stats */}
          {selectedSession && (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                      {selectedSession.eventType?.replace("_", " ") || "EVENT"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Audience: {selectedSession.audienceScope?.replace("_", " ") || "Whole Academy"}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white pt-1">
                    {selectedSession.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Host: {selectedSession.coach?.user?.name || "GX Coach"} {selectedSession.sport ? `• Sport: ${selectedSession.sport.nameEn}` : ""}
                  </p>
                </div>

                <div className="flex items-center space-x-3 rtl:space-x-reverse self-start sm:self-auto bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="text-center px-2 border-r border-slate-200 dark:border-slate-800 rtl:border-r-0 rtl:border-l">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Eligible</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">{totalCount}</span>
                  </div>
                  <div className="text-center px-2 border-r border-slate-200 dark:border-slate-800 rtl:border-r-0 rtl:border-l">
                    <span className="text-[10px] uppercase font-bold text-rose-500 block">Present</span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">{presentCount}</span>
                  </div>
                  <div className="text-center px-2">
                    <span className="text-[10px] uppercase font-bold text-brand-crimson block">Adherence</span>
                    <span className="text-sm font-black text-brand-crimson">{attendanceRate}%</span>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search athlete or sport..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-crimson"
                  />
                </div>

                <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs overflow-x-auto w-full sm:w-auto">
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                      statusFilter === "ALL"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter("PRESENT")}
                    className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                      statusFilter === "PRESENT"
                        ? "bg-rose-500 text-white"
                        : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    }`}
                  >
                    Present ({presentCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter("ABSENT")}
                    className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                      statusFilter === "ABSENT"
                        ? "bg-rose-500 text-white"
                        : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    }`}
                  >
                    Absent ({absentCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter("LATE")}
                    className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                      statusFilter === "LATE"
                        ? "bg-amber-500 text-white"
                        : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    }`}
                  >
                    Late ({lateCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter("UNMARKED")}
                    className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                      statusFilter === "UNMARKED"
                        ? "bg-slate-500 text-white"
                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Unmarked ({unmarkedCount})
                  </button>
                </div>
              </div>

              {/* Attendees Roster List */}
              {loadingAttendees ? (
                <div className="p-12 text-center text-slate-400 text-xs font-bold animate-pulse">
                  Loading attendee roster for session...
                </div>
              ) : filteredAttendees.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  No athletes match the current filter.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAttendees.map((att) => {
                    return (
                      <div
                        key={att.athleteId}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                            {att.avatar ? (
                              <img src={att.avatar} alt={att.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              att.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white">
                              {att.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Sport: {att.sportName} {att.email ? `• ${att.email}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center space-x-1.5 rtl:space-x-reverse self-end sm:self-auto">
                          <button
                            onClick={() => handleUpdateStatus(att.athleteId, "PRESENT")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 rtl:space-x-reverse ${
                              att.status === "PRESENT"
                                ? "bg-rose-500 text-white shadow-sm ring-2 ring-rose-500/50"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(att.athleteId, "LATE")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 rtl:space-x-reverse ${
                              att.status === "LATE"
                                ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/50"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Late</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(att.athleteId, "ABSENT")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 rtl:space-x-reverse ${
                              att.status === "ABSENT"
                                ? "bg-rose-500 text-white shadow-sm ring-2 ring-rose-500/50"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600"
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(att.athleteId, "EXCUSED")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 rtl:space-x-reverse ${
                              att.status === "EXCUSED"
                                ? "bg-blue-500 text-white shadow-sm ring-2 ring-blue-500/50"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600"
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Excused</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400 text-xs font-bold">Loading attendance...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}
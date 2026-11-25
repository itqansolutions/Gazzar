"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Award,
  Clock,
  Dumbbell,
  MessageSquare,
  Search,
  Filter,
  BarChart3,
  Flame,
  ChevronRight,
  Send,
  Eye,
  Activity
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

type TabType = "ANALYTICS" | "MONITORING" | "REVIEWS";

export default function ReportsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("ANALYTICS");

  // Analytics state
  const [reportsData, setReportsData] = useState<any>(null);
  const [reportsPeriod, setReportsPeriod] = useState<number>(180);
  const [loadingReports, setLoadingReports] = useState<boolean>(true);

  // Monitoring state
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [monitoringPeriod, setMonitoringPeriod] = useState<number>(30);
  const [loadingMonitoring, setLoadingMonitoring] = useState<boolean>(true);
  const [athleteSearch, setAthleteSearch] = useState<string>("");
  const [adherenceFilter, setAdherenceFilter] = useState<string>("ALL");

  // Review submission state
  const [submittingReviewId, setSubmittingReviewId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});
  const [setReviews, setSetReviews] = useState<Record<string, Record<string, string>>>({});
  const [reviewSuccessToast, setReviewSuccessToast] = useState<string>("");
  const [reviewError, setReviewError] = useState<string>("");

  useEffect(() => {
    loadReports(reportsPeriod);
  }, [reportsPeriod]);

  useEffect(() => {
    loadMonitoring(monitoringPeriod);
  }, [monitoringPeriod]);

  const loadReports = async (period: number) => {
    setLoadingReports(true);
    try {
      const res = await fetch(`/api/reports?periodDays=${period}`);
      const json = await res.json();
      if (json.success && json.data) {
        setReportsData(json.data);
      }
    } catch (err) {
      console.error("[Reports] Error loading reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadMonitoring = async (period: number) => {
    setLoadingMonitoring(true);
    try {
      const res = await fetch(`/api/coach/monitoring?periodDays=${period}`);
      const json = await res.json();
      if (json.success && json.data) {
        setMonitoringData(json.data);
      }
    } catch (err) {
      console.error("[Monitoring] Error loading monitoring data:", err);
    } finally {
      setLoadingMonitoring(false);
    }
  };

  const handleReviewFeedbackChange = (logId: string, val: string) => {
    setReviewFeedback((prev) => ({ ...prev, [logId]: val }));
  };

  const handleSetReviewChange = (logId: string, setLogId: string, val: string) => {
    setSetReviews((prev) => ({
      ...prev,
      [logId]: {
        ...(prev[logId] || {}),
        [setLogId]: val
      }
    }));
  };

  const handleSubmitReview = async (logId: string) => {
    setReviewError("");
    setSubmittingReviewId(logId);
    try {
      const coachFeedback = reviewFeedback[logId] ?? "";
      const currentSetReviews = setReviews[logId] || {};
      const setReviewsArray = Object.entries(currentSetReviews)
        .filter(([, review]) => Boolean(review.trim()))
        .map(([setLogId, coachReview]) => ({ setLogId, coachReview }));

      const res = await fetch("/api/coach/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutLogId: logId,
          coachFeedback: coachFeedback.trim() || undefined,
          setReviews: setReviewsArray.length > 0 ? setReviewsArray : undefined
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setReviewError(json.error || "Failed to submit review");
        return;
      }

      setReviewSuccessToast("Coach review successfully submitted and audit-logged!");
      setTimeout(() => setReviewSuccessToast(""), 4000);

      // Refresh monitoring and reports
      loadMonitoring(monitoringPeriod);
      loadReports(reportsPeriod);
    } catch (err: any) {
      setReviewError(err?.message || "Error submitting review");
    } finally {
      setSubmittingReviewId(null);
    }
  };

  const kpi = reportsData?.kpi || {};
  const attendanceTrend = reportsData?.attendanceTrend || [];
  const sportsDistData = reportsData?.sportDistribution || [];
  const mostMissedWorkouts = reportsData?.mostMissedWorkouts || [];
  const adherenceBrackets = reportsData?.adherenceBrackets || { high: 0, medium: 0, low: 0 };

  const monitoringSummary = monitoringData?.summary || {};
  const athletes = monitoringData?.athletes || [];
  const flaggedSessions = monitoringData?.flaggedSessions || [];
  const pendingReviews = monitoringData?.pendingReviews || [];

  // Filter athletes
  const filteredAthletes = athletes.filter((ath: any) => {
    if (athleteSearch.trim()) {
      const q = athleteSearch.toLowerCase();
      const matchName = ath.client.name.toLowerCase().includes(q);
      const matchEmail = (ath.client.email || "").toLowerCase().includes(q);
      const matchSport = (ath.client.sportName || "").toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchSport) return false;
    }
    if (adherenceFilter === "HIGH") return ath.adherenceRate >= 80;
    if (adherenceFilter === "MODERATE") return ath.adherenceRate >= 50 && ath.adherenceRate < 80;
    if (adherenceFilter === "LOW") return ath.adherenceRate < 50;
    if (adherenceFilter === "OVERDUE") return ath.checkInStatus?.overallStatus === "OVERDUE";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header with Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <TrendingUp className="w-6 h-6 text-brand-crimson" />
            <span>Reports & Coach Monitoring</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time academy adherence, attendance trends, athlete check-ins, and coach reviews
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1.5 rtl:space-x-reverse p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("ANALYTICS")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "ANALYTICS"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("MONITORING")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "MONITORING"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Athlete Adherence
          </button>
          <button
            onClick={() => setActiveTab("REVIEWS")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 rtl:space-x-reverse ${
              activeTab === "REVIEWS"
                ? "bg-brand-crimson text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Reviews</span>
            {pendingReviews.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-brand-crimson">
                {pendingReviews.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {reviewSuccessToast && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-in fade-in">
          {reviewSuccessToast}
        </div>
      )}
      {reviewError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-in fade-in">
          {reviewError}
        </div>
      )}

      {/* ==================== TAB 1: ACADEMY ANALYTICS ==================== */}
      {activeTab === "ANALYTICS" && (
        <div className="space-y-6">
          {/* Period Selector Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Aggregated from verified PostgreSQL logs
            </span>
            <div className="flex items-center space-x-1 rtl:space-x-reverse bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              {[
                { label: "30 Days", val: 30 },
                { label: "90 Days", val: 90 },
                { label: "180 Days", val: 180 },
                { label: "1 Year", val: 365 }
              ].map((p) => (
                <button
                  key={p.val}
                  onClick={() => setReportsPeriod(p.val)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    reportsPeriod === p.val
                      ? "bg-brand-crimson text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Real KPI Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Overall Workout Adherence</span>
              <p className="text-2xl font-black text-brand-crimson">
                {loadingReports ? "..." : `${kpi.overallAdherenceRate ?? 0}%`}
              </p>
              <span className="text-[10px] text-slate-500 font-semibold">
                Completed vs Scheduled workouts
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Class Attendance Rate</span>
              <p className="text-2xl font-black text-rose-500">
                {loadingReports ? "..." : `${kpi.overallAttendanceRate ?? 0}%`}
              </p>
              <span className="text-[10px] text-rose-500 font-semibold">
                Recorded session attendances
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Completed Workouts</span>
              <p className="text-2xl font-black text-blue-400">
                {loadingReports ? "..." : kpi.completedWorkouts ?? 0}
              </p>
              <span className="text-[10px] text-blue-400 font-semibold">In selected period</span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Active Athletes</span>
              <p className="text-2xl font-black text-purple-400">
                {loadingReports ? "..." : kpi.totalAthletes ?? 0}
              </p>
              <span className="text-[10px] text-purple-400 font-semibold">
                {kpi.activeCoaches ?? 0} Staff coaches
              </span>
            </div>
          </div>

          {/* Analytics Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real Attendance Rate Trend */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Member Attendance Rate (%)
                </h3>
                <span className="text-[11px] text-slate-500">Past 6 Months</span>
              </div>
              <div className="h-64 w-full">
                {attendanceTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                    No attendance records logged yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          fontSize: "12px",
                          color: "#fff"
                        }}
                      />
                      <Bar dataKey="rate" name="Attendance %" fill="#E20D1B" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Real Sports Breakdown Pie */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Athlete Distribution by Sport
                </h3>
                <span className="text-[11px] text-slate-500">Active Roster</span>
              </div>
              <div className="h-64 w-full flex items-center justify-center">
                {sportsDistData.length === 0 ? (
                  <div className="text-xs text-slate-400 font-bold">No athletes assigned to sports yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sportsDistData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={5}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {sportsDistData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          fontSize: "12px",
                          color: "#fff"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Adherence Distribution & Most Missed Workouts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Adherence Bracket Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Award className="w-4 h-4 text-brand-crimson" />
                <span>Athlete Adherence Brackets</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-rose-500">High Adherence (80% - 100%)</span>
                    <span className="text-slate-700 dark:text-slate-300">{adherenceBrackets.high} Athletes</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{
                        width: `${
                          kpi.totalAthletes > 0 ? (adherenceBrackets.high / kpi.totalAthletes) * 100 : 0
                        }%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-amber-500">Moderate Adherence (50% - 79%)</span>
                    <span className="text-slate-700 dark:text-slate-300">{adherenceBrackets.medium} Athletes</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{
                        width: `${
                          kpi.totalAthletes > 0 ? (adherenceBrackets.medium / kpi.totalAthletes) * 100 : 0
                        }%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-rose-500">Low Adherence (&lt; 50%)</span>
                    <span className="text-slate-700 dark:text-slate-300">{adherenceBrackets.low} Athletes</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{
                        width: `${
                          kpi.totalAthletes > 0 ? (adherenceBrackets.low / kpi.totalAthletes) * 100 : 0
                        }%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Most Missed / Skipped Workouts */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Most-Skipped & Missed Workout Types</span>
              </h3>
              {mostMissedWorkouts.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Zero skipped or missed workouts recorded in this period! Great adherence.
                </p>
              ) : (
                <div className="space-y-2">
                  {mostMissedWorkouts.map((w: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 font-bold flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{w.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-500/15 text-rose-500">
                        {w.count} times
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: ATHLETE ADHERENCE & MONITORING ==================== */}
      {activeTab === "MONITORING" && (
        <div className="space-y-6">
          {/* Monitoring Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Monitored Athletes</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {monitoringSummary.totalAthletes ?? 0}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Average Adherence</span>
              <span className="text-xl font-black text-brand-crimson">
                {monitoringSummary.adherenceRate ?? 0}%
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Overdue Check-ins</span>
              <span className="text-xl font-black text-amber-500">
                {monitoringSummary.overdueCheckInsCount ?? 0}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Flagged Sessions</span>
              <span className="text-xl font-black text-rose-500">
                {monitoringSummary.flaggedSessionsCount ?? 0}
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search athlete, email, or sport..."
                value={athleteSearch}
                onChange={(e) => setAthleteSearch(e.target.value)}
                className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
              />
            </div>

            <div className="flex items-center space-x-1.5 rtl:space-x-reverse overflow-x-auto w-full sm:w-auto text-xs">
              {[
                { id: "ALL", label: "All Athletes" },
                { id: "HIGH", label: "High (≥80%)" },
                { id: "MODERATE", label: "Moderate (50-79%)" },
                { id: "LOW", label: "Low (<50%)" },
                { id: "OVERDUE", label: "Overdue Check-in" }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setAdherenceFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                    adherenceFilter === f.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Athletes Adherence Table */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Athlete Adherence & Check-In Status
              </h3>
              <div className="flex items-center space-x-1 text-xs">
                {[7, 14, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setMonitoringPeriod(days)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                      monitoringPeriod === days
                        ? "bg-brand-crimson text-white"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            {loadingMonitoring ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
                Loading athlete adherence data...
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No athletes matched the selected filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAthletes.map((ath: any) => {
                  const checkInBadge =
                    ath.checkInStatus?.overallStatus === "OVERDUE"
                      ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                      : ath.checkInStatus?.overallStatus === "DUE_SOON"
                      ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                      : ath.checkInStatus?.overallStatus === "UP_TO_DATE"
                      ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                      : "bg-slate-500/10 text-slate-400 border-slate-500/20";

                  return (
                    <div
                      key={ath.client.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all"
                    >
                      {/* Athlete Info */}
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                          {ath.client.avatar ? (
                            <img src={ath.client.avatar} alt={ath.client.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            ath.client.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/clients/${ath.client.id}`}
                            className="text-xs font-black text-slate-900 dark:text-white hover:text-brand-crimson transition-colors"
                          >
                            {ath.client.name}
                          </Link>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ath.client.sportName} {ath.client.email ? `• ${ath.client.email}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Adherence Progress */}
                      <div className="w-full sm:w-48 space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-[11px] text-slate-400">Adherence</span>
                          <span
                            className={
                              ath.adherenceRate >= 80
                                ? "text-rose-500"
                                : ath.adherenceRate >= 50
                                ? "text-amber-500"
                                : "text-rose-500"
                            }
                          >
                            {ath.adherenceRate}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ath.adherenceRate >= 80
                                ? "bg-rose-500"
                                : ath.adherenceRate >= 50
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${ath.adherenceRate}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{ath.completedCount} done / {ath.scheduledCount} total</span>
                          {ath.skippedCount > 0 && <span className="text-amber-500">{ath.skippedCount} skipped</span>}
                          {ath.missedCount > 0 && <span className="text-rose-500">{ath.missedCount} missed</span>}
                        </div>
                      </div>

                      {/* Check-In Schedule Status */}
                      <div className="flex items-center space-x-2 rtl:space-x-reverse self-end sm:self-auto">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${checkInBadge}`}>
                          {ath.checkInStatus?.overallStatus?.replace("_", " ") || "CHECK-IN"}
                          {ath.checkInStatus?.overdueCount > 0 ? ` (${ath.checkInStatus.overdueCount})` : ""}
                        </span>

                        <Link
                          href={`/clients/${ath.client.id}`}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-crimson text-xs"
                          title="View athlete profile"
                        >
                          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Flagged Sessions Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Flagged Skipped & Missed Sessions</span>
            </h3>
            {flaggedSessions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No skipped or missed workout sessions flagged in the current period.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {flaggedSessions.map((fs: any) => (
                  <div
                    key={fs.assignmentId}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="font-bold text-slate-900 dark:text-white">{fs.clientName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            fs.status === "SKIPPED"
                              ? "bg-amber-500/15 text-amber-500"
                              : "bg-rose-500/15 text-rose-500"
                          }`}
                        >
                          {fs.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(fs.scheduledDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">{fs.title}</p>
                    {fs.skipReason && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        <strong>Reason:</strong> {fs.skipReason}
                      </p>
                    )}
                    {fs.coachNotes && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                        Notes: {fs.coachNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: PENDING COACH REVIEWS ==================== */}
      {activeTab === "REVIEWS" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Completed Sessions Needing Coach Review
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review athlete performance logs, leave feedback, and audit-log your coaching notes
              </p>
            </div>
            <button
              onClick={() => loadMonitoring(monitoringPeriod)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-brand-crimson"
            >
              Refresh
            </button>
          </div>

          {loadingMonitoring ? (
            <div className="p-16 text-center text-xs font-bold text-slate-400 animate-pulse">
              Loading pending reviews...
            </div>
          ) : pendingReviews.length === 0 ? (
            <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">All caught up!</p>
              <p>Every completed workout session has been reviewed by staff coaches.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingReviews.map((item: any) => {
                const currentFeedback = reviewFeedback[item.workoutLogId] ?? item.coachFeedback ?? "";

                return (
                  <div
                    key={item.workoutLogId}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                          {item.clientAvatar ? (
                            <img src={item.clientAvatar} alt={item.clientName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            item.clientName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {item.clientName}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                              Completed ✓
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                            {item.workoutTitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl">
                        {item.completedAt && (
                          <span>📅 {new Date(item.completedAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                        )}
                        {item.durationMinutes && <span>⏱️ {item.durationMinutes} min</span>}
                        {item.overallRpe && <span className="font-bold text-brand-crimson">🔥 RPE {item.overallRpe}/10</span>}
                      </div>
                    </div>

                    {/* Athlete Feedback if provided */}
                    {item.clientFeedback && (
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <span className="font-bold text-slate-500 text-[10px] uppercase block">Athlete Feedback:</span>
                        <p className="italic">"{item.clientFeedback}"</p>
                      </div>
                    )}

                    {/* Sets Performance Table */}
                    {item.sets && item.sets.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Completed Sets & Logs:</span>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                          <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-950 p-2.5 font-bold text-slate-500">
                            <span className="col-span-2">Set / Round</span>
                            <span className="col-span-3">Exercise</span>
                            <span className="col-span-3 text-center">Actual Performance</span>
                            <span className="col-span-4">Coach Set Note</span>
                          </div>
                          {item.sets.map((s: any) => {
                            const currentSetNote =
                              setReviews[item.workoutLogId]?.[s.setLogId] ?? s.coachReview ?? "";

                            return (
                              <div
                                key={s.setLogId}
                                className="grid grid-cols-12 items-center p-2.5 border-t border-slate-100 dark:border-slate-800"
                              >
                                <span className="col-span-2 font-bold text-slate-700 dark:text-slate-300">
                                  R{s.roundNumber} · S{s.setNumber}
                                </span>
                                <span className="col-span-3 font-semibold text-slate-900 dark:text-white truncate">
                                  {s.exerciseName}
                                </span>
                                <span className="col-span-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {s.isSkipped ? (
                                    <span className="text-amber-500 font-sans">[Skipped: {s.skipReason || "No reason"}]</span>
                                  ) : s.actualDistanceKm ? (
                                    `${s.actualDistanceKm}km in ${s.actualTimeSeconds ?? 0}s`
                                  ) : (
                                    `${s.actualWeightKg ?? 0}kg × ${s.actualReps ?? 0}`
                                  )}
                                </span>
                                <div className="col-span-4 ps-2">
                                  <input
                                    type="text"
                                    placeholder="Set note (e.g. good form)..."
                                    value={currentSetNote}
                                    onChange={(e) =>
                                      handleSetReviewChange(item.workoutLogId, s.setLogId, e.target.value)
                                    }
                                    className="w-full px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-brand-crimson text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Coach Feedback Form */}
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Overall Coach Review & Recommendations:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Excellent progress on heavy compound sets. Increase load next week by 2.5kg..."
                        value={currentFeedback}
                        onChange={(e) => handleReviewFeedbackChange(item.workoutLogId, e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Link
                        href={`/workout/${item.assignmentId}/execute`}
                        className="inline-flex items-center space-x-1 rtl:space-x-reverse text-xs font-bold text-slate-500 hover:text-brand-crimson"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Execution Screen</span>
                      </Link>

                      <button
                        type="button"
                        disabled={submittingReviewId === item.workoutLogId}
                        onClick={() => handleSubmitReview(item.workoutLogId)}
                        className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {submittingReviewId === item.workoutLogId ? "Submitting..." : "Submit Coach Review"}
                        </span>
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
  );
}
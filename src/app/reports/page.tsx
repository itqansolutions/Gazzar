"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { TrendingUp } from "lucide-react";
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

export default function ReportsPage() {
  const { t } = useLanguage();
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setData(json.data);
        }
      })
      .catch((err) => console.error("[Reports] Error loading dashboard data:", err));
  }, []);

  const metrics = data?.metrics || {};
  const totalAthletes = metrics.clientsCount ?? 0;
  const completedWorkouts = metrics.totalWorkouts ?? 0;

  const attendanceData = [
    { month: "Jan", rate: 0 },
    { month: "Feb", rate: 0 },
    { month: "Mar", rate: 0 },
    { month: "Apr", rate: 0 },
    { month: "May", rate: 0 },
    { month: "Jun", rate: 0 }
  ];

  const sportsDistData = [
    { name: "Bodybuilding", value: 0, color: "#e11d48" },
    { name: "CrossFit", value: 0, color: "#3b82f6" },
    { name: "Fitness & Conditioning", value: 0, color: "#f59e0b" },
    { name: "Swimming", value: 0, color: "#8b5cf6" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5">
          <TrendingUp className="w-6 h-6 text-brand-crimson" />
          <span>{t("navReports")}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Executive analytics, member retention, sport distribution & revenue metrics
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">Overall Adherence Rate</span>
          <p className="text-2xl font-black text-brand-crimson">0%</p>
          <span className="text-[10px] text-slate-500 font-semibold">Real-time attendance rate</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">Completed Workouts</span>
          <p className="text-2xl font-black text-blue-400">{completedWorkouts}</p>
          <span className="text-[10px] text-blue-400 font-semibold">Logged in PostgreSQL</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">Total Athletes</span>
          <p className="text-2xl font-black text-purple-400">{totalAthletes}</p>
          <span className="text-[10px] text-purple-400 font-semibold">Registered active athletes</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">Active Coaches</span>
          <p className="text-2xl font-black text-amber-400">{metrics.coachesCount ?? 0}</p>
          <span className="text-[10px] text-amber-400 font-semibold">Staff coaches</span>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Rate Trend */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Member Attendance & Adherence Rate (%)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[70, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="rate" name="Attendance %" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sports Breakdown Pie */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Athlete Distribution by Sport</h3>
          <div className="h-64 w-full flex items-center justify-center">
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
                  {sportsDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
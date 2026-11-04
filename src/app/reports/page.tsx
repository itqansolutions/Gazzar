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

  const attendanceData = [
    { month: "Jan", rate: 88 },
    { month: "Feb", rate: 92 },
    { month: "Mar", rate: 90 },
    { month: "Apr", rate: 95 },
    { month: "May", rate: 94 },
    { month: "Jun", rate: 97 }
  ];

  const sportsDistData = [
    { name: "Bodybuilding", value: 45, color: "#10b981" },
    { name: "CrossFit", value: 25, color: "#3b82f6" },
    { name: "Running & Conditioning", value: 20, color: "#f59e0b" },
    { name: "Swimming", value: 10, color: "#8b5cf6" }
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
          <p className="text-2xl font-black text-brand-crimson">94.2%</p>
          <span className="text-[10px] text-brand-crimson font-semibold">+3.5% vs last month</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">Completed Workouts</span>
          <p className="text-2xl font-black text-blue-400">1,248</p>
          <span className="text-[10px] text-blue-400 font-semibold">Successfully logged</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">Total Athletes</span>
          <p className="text-2xl font-black text-purple-400">128</p>
          <span className="text-[10px] text-purple-400 font-semibold">Active members</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">Renewal Rate</span>
          <p className="text-2xl font-black text-amber-400">89%</p>
          <span className="text-[10px] text-amber-400 font-semibold">High member loyalty</span>
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
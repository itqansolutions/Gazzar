"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  TrendingUp,
  Award,
  Users,
  Dumbbell,
  DollarSign,
  Activity,
  FileSpreadsheet
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

export default function ReportsPage() {
  const { t, language } = useLanguage();

  const attendanceData = [
    { month: "يناير", rate: 88 },
    { month: "فبراير", rate: 92 },
    { month: "مارس", rate: 90 },
    { month: "أبريل", rate: 95 },
    { month: "مايو", rate: 94 },
    { month: "يونيو", rate: 97 }
  ];

  const sportsDistData = [
    { name: "كمال أجسام", value: 45, color: "#10b981" },
    { name: "كروس فيت", value: 25, color: "#3b82f6" },
    { name: "جري وتخسيس", value: 20, color: "#f59e0b" },
    { name: "سباحة", value: 10, color: "#8b5cf6" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          <span>{t("navReports")}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {language === "ar"
            ? "تقارير الأداء التحليلية، نسب التزام المشتركين، توزيع الرياضات ونمو الإيرادات"
            : "Executive analytics, member retention, sport distribution & revenue metrics"}
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">معدل الالتزام العام</span>
          <p className="text-2xl font-black text-emerald-400">94.2%</p>
          <span className="text-[10px] text-emerald-400 font-semibold">+3.5% مقارنة بالشهر السابق</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">التمارين المكتملة</span>
          <p className="text-2xl font-black text-blue-400">1,248</p>
          <span className="text-[10px] text-blue-400 font-semibold">تمرين منفذ بنجاح</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">إجمالي المشتركين</span>
          <p className="text-2xl font-black text-purple-400">128</p>
          <span className="text-[10px] text-purple-400 font-semibold">مشترك نشط</span>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[11px] font-bold text-slate-400">نسبة تجديد الاشتراكات</span>
          <p className="text-2xl font-black text-amber-400">89%</p>
          <span className="text-[10px] text-amber-400 font-semibold">معدل ولاء مرتفع</span>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Rate Trend */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">تطور نسبة حضور والتزام المشتركين (%)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[70, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="rate" name="نسبة الحضور %" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sports Breakdown Pie */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">توزيع المشتركين حسب الرياضة والنشاط</h3>
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
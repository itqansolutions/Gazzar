"use client";

import React from "react";
import { ClientMeasurementHistory } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { Scale, PlusCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MeasurementsTabProps {
  measurements: ClientMeasurementHistory[];
  onOpenModal: () => void;
}

export default function MeasurementsTab({ measurements, onOpenModal }: MeasurementsTabProps) {
  const { t, language } = useLanguage();

  const chartData = measurements.map(m => ({
    date: m.date.slice(5),
    weight: m.weightKg,
    fat: m.bodyFatPercentage,
    muscle: m.muscleMassKg
  }));

  return (
    <div className="space-y-6">
      {/* Progression Graph */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("measurementsHistory")}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{language === "ar" ? "رسم بياني لتغير الوزن ونسبة الدهون عبر الزمن" : "Weight & Body Fat chart over time"}</p>
          </div>
          <button
            onClick={onOpenModal}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse cursor-pointer shadow-md shadow-emerald-600/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t("addMeasurement")}</span>
          </button>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="weightGradClient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[70, 110]} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px", color: "#fff" }} />
              <Area type="monotone" dataKey="weight" name={language === "ar" ? "الوزن (كجم)" : "Weight (KG)"} stroke="#10b981" strokeWidth={3} fill="url(#weightGradClient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Table */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {language === "ar" ? "سجل القياسات البدنية التفصيلي" : "Historical Measurements Log"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 text-start">{t("date")}</th>
                <th className="p-3 text-center">{t("weight")}</th>
                <th className="p-3 text-center">{language === "ar" ? "الكتلة" : "BMI"}</th>
                <th className="p-3 text-center">{t("bodyFat")}</th>
                <th className="p-3 text-center">{t("muscleMass")}</th>
                <th className="p-3 text-center">{t("waist")}</th>
                <th className="p-3 text-center">{t("chest")}</th>
                <th className="p-3 text-center">{t("arms")}</th>
                <th className="p-3 text-start">{language === "ar" ? "ملاحظات" : "Notes"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {measurements.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white font-mono">{m.date}</td>
                  <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{m.weightKg} {language === "ar" ? "كجم" : "KG"}</td>
                  <td className="p-3 text-center">{m.bmi}</td>
                  <td className="p-3 text-center">{m.bodyFatPercentage}%</td>
                  <td className="p-3 text-center">{m.muscleMassKg} {language === "ar" ? "كجم" : "KG"}</td>
                  <td className="p-3 text-center">{m.waistCm} {language === "ar" ? "سم" : "CM"}</td>
                  <td className="p-3 text-center">{m.chestCm} {language === "ar" ? "سم" : "CM"}</td>
                  <td className="p-3 text-center">{m.armsCm} {language === "ar" ? "سم" : "CM"}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{m.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

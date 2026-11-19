"use client";

import React from "react";
import { ClientMeasurementHistory } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { PlusCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MeasurementsTabProps {
  measurements: ClientMeasurementHistory[];
  onOpenModal: () => void;
}

export default function MeasurementsTab({ measurements, onOpenModal }: MeasurementsTabProps) {
  const { t } = useLanguage();

  const chartData = measurements
    .filter((m) => (m as any).verificationStatus !== "REJECTED")
    .map((m) => ({
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
            <p className="text-xs text-slate-500 dark:text-slate-400">Weight & body fat progression chart (verified only)</p>
          </div>
          <button
            onClick={onOpenModal}
            className="px-3 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs flex items-center space-x-1 cursor-pointer shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
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
              <Area type="monotone" dataKey="weight" name="Weight (KG)" stroke="#10b981" strokeWidth={3} fill="url(#weightGradClient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Table */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Historical Measurements Log & Provenance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 text-start">{t("date")}</th>
                <th className="p-3 text-center">{t("weight")}</th>
                <th className="p-3 text-center">Provenance</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">BMI</th>
                <th className="p-3 text-center">{t("bodyFat")}</th>
                <th className="p-3 text-center">{t("waist")}</th>
                <th className="p-3 text-start">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {measurements.map(m => {
                const source = (m as any).source || "LEGACY";
                const vStatus = (m as any).verificationStatus || "LEGACY";

                return (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white font-mono">{m.date}</td>
                    <td className="p-3 text-center font-bold text-brand-crimson">{m.weightKg} KG</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {source}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          vStatus === "VERIFIED"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : vStatus === "REJECTED"
                            ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                            : vStatus === "PENDING_REVIEW"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                        }`}
                      >
                        {vStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">{m.bmi ?? "-"}</td>
                    <td className="p-3 text-center">{m.bodyFatPercentage ? `${m.bodyFatPercentage}%` : "-"}</td>
                    <td className="p-3 text-center">{m.waistCm ? `${m.waistCm} CM` : "-"}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{m.notes || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

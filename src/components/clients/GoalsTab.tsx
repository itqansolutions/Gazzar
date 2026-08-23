"use client";

import React from "react";
import { ClientGoal } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { Award, PlusCircle } from "lucide-react";

interface GoalsTabProps {
  goals: ClientGoal[];
}

export default function GoalsTab({ goals }: GoalsTabProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{t("clientGoals")}</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {goals.map(g => {
          const isWeightLoss = g.startingValue > g.targetValue;
          const progress = isWeightLoss
            ? Math.min(100, Math.max(0, Math.round(((g.startingValue - g.currentValue) / (g.startingValue - g.targetValue)) * 100)))
            : Math.min(100, Math.max(0, Math.round(((g.currentValue - g.startingValue) / (g.targetValue - g.startingValue)) * 100)));

          return (
            <div key={g.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>{g.title}</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                  {g.status}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span>التقدم المحقق: {progress}%</span>
                  <span className="text-emerald-400 font-bold">الحالي: {g.currentValue} {g.unit}</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>البداية: {g.startingValue} {g.unit}</span>
                  <span>الهدف: {g.targetValue} {g.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
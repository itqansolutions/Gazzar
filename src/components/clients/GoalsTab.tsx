"use client";

import React from "react";
import { ClientGoal } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { Award, Target, CheckCircle2 } from "lucide-react";

interface GoalsTabProps {
  goals: ClientGoal[];
}

export default function GoalsTab({ goals }: GoalsTabProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {language === "ar" ? "الأهداف البدنية والرياضية" : "Training & Athletic Goals"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {language === "ar" ? "أهداف المتدرب في خسارة الوزن، بناء العضلات، أو تحسين الأداء" : "Target metrics and progression goals"}
        </p>
      </div>

      {goals.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          {language === "ar" ? "لم يتم تحديد أهداف بعد." : "No goals specified yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map(g => (
            <div
              key={g.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <span>{g.title}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {g.status === "IN_PROGRESS" ? (language === "ar" ? "قيد التنفيذ" : "In Progress") : g.status}
                </span>
              </div>

              {g.targetValue && (
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <span>{language === "ar" ? "الهدف المستهدف: " : "Target Value: "}</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{g.targetValue} {g.unit || "KG"}</strong>
                </div>
              )}

              {g.deadline && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === "ar" ? "الموعد المستهدف: " : "Deadline: "} {g.deadline}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

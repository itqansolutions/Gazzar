"use client";

import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { useLanguage } from "@/context/LanguageContext";
import { Dumbbell, Calendar, Play } from "lucide-react";

interface WorkoutsTabProps {
  clientId: string;
}

export default function WorkoutsTab({ clientId }: WorkoutsTabProps) {
  const { language } = useLanguage();
  const assignments = db.getAssignments(clientId);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {language === "ar" ? "التمارين والجداول التدريبية المخصصة" : "Assigned Workouts"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {language === "ar" ? "قائمة الحصص التدريبية المجدولة للمتدرب وإمكانية بدئها مباشرة" : "Scheduled training sessions and active logs"}
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          {language === "ar" ? "لا توجد تمارين مخصصة حالياً." : "No workouts assigned yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => (
            <div
              key={a.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {a.template?.titleAr || "حصة تدريبية مخصصة"}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 rtl:space-x-reverse mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>تاريخ التمرين: {a.scheduledDate}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  a.status === "COMPLETED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                }`}>
                  {a.status === "COMPLETED" ? (language === "ar" ? "مكتمل ✓" : "Completed") : (language === "ar" ? "مجدول" : "Scheduled")}
                </span>

                <Link
                  href={`/workout/${a.id}/execute`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse transition-all shadow-md shadow-emerald-600/30"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>{language === "ar" ? "بدء التمرين" : "Start"}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { ClientWorkoutAssignment } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { Dumbbell, PlusCircle, CheckCircle2, Clock } from "lucide-react";

interface WorkoutsTabProps {
  assignments: ClientWorkoutAssignment[];
}

export default function WorkoutsTab({ assignments }: WorkoutsTabProps) {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{t("clientWorkouts")}</h3>
        <Link
          href="/assignments"
          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>{language === "ar" ? "تعيين تمرين جديد" : "Assign Workout"}</span>
        </Link>
      </div>

      <div className="space-y-3">
        {assignments?.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
            لا توجد تمارين معينة لهذا المتدرب حالياً.
          </div>
        ) : (
          assignments?.map(a => (
            <div
              key={a.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                  <h4 className="text-sm font-bold text-white">{a.template?.titleAr || "تمرين مخصص"}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    a.status === "COMPLETED"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}>
                    {a.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">التاريخ المقرر: {a.scheduledDate}</p>
                {a.coachNotes && <p className="text-[11px] text-slate-500 mt-1">ملاحظات الكابتن: {a.coachNotes}</p>}
              </div>

              <Link
                href={`/workout/${a.id}/execute`}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-center transition-all ${
                  a.status === "COMPLETED"
                    ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                }`}
              >
                {a.status === "COMPLETED" ? "عرض نتائج الأداء 🏆" : "تسجيل وتنفيذ التمرين 🏋️"}
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
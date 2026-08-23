"use client";

import React from "react";
import { ClientCoachAssignment } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { Users, PlusCircle, ShieldCheck } from "lucide-react";

interface CoachesTabProps {
  assignments: ClientCoachAssignment[];
  onOpenModal: () => void;
  isClient?: boolean;
}

export default function CoachesTab({ assignments, onOpenModal, isClient }: CoachesTabProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {language === "ar" ? "الكباتن والأخصائيون المسؤولون" : "Assigned Coaches & Specialists"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isClient
              ? (language === "ar" ? "فريق الكباتن المعتمدين والمشرفين على تدريبك وتغذيتك" : "Your dedicated coaching team")
              : (language === "ar" ? "طاقم التدريب والأخصائيين المعينين لمتابعة المتدرب" : "Coaches assigned to this athlete")}
          </p>
        </div>

        {!isClient && (
          <button
            onClick={onOpenModal}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse cursor-pointer shadow-md shadow-emerald-600/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{language === "ar" ? "تعيين كابتن جديد" : "Assign Coach"}</span>
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          {language === "ar" ? "لم يتم تعيين كابتن مشرف بعد." : "No coaches assigned yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {assignments.map(ca => (
            <div
              key={ca.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-black text-sm text-white shadow-md flex-shrink-0">
                  {ca.coach?.user?.name ? ca.coach.user.name.slice(0, 2) : "CO"}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{ca.coach?.user?.name || "كابتن تدريب"}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{ca.coach?.specialties?.join("، ") || "لياقة وتدريب"}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{ca.assignedAt?.slice(0, 10)}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                ca.role === "PRIMARY"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : ca.role === "NUTRITIONIST"
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
              }`}>
                {ca.role === "PRIMARY" ? (language === "ar" ? "مدرب رئيسي" : "Primary") : ca.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

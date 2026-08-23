"use client";

import React from "react";
import { ClientMedicalRestriction } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { AlertTriangle, PlusCircle, ShieldAlert } from "lucide-react";

interface MedicalTabProps {
  restrictions: ClientMedicalRestriction[];
  onOpenModal: () => void;
  isClient?: boolean;
}

export default function MedicalTab({ restrictions, onOpenModal, isClient }: MedicalTabProps) {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t("clientMedical")}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === "ar" ? "سجل الإصابات النشطة والمحاذير البدنية والتمارين الممنوعة" : "Active injuries, restricted body parts and contraindicated exercises"}
          </p>
        </div>

        {!isClient && (
          <button
            onClick={onOpenModal}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse cursor-pointer shadow-md shadow-amber-600/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t("addRestriction")}</span>
          </button>
        )}
      </div>

      {restrictions.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          {language === "ar" ? "لا توجد أي محاذير أو إصابات مسجلة (الحالة البدنية ممتازة) ✓" : "No medical restrictions recorded (Fit to train) ✓"}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {restrictions.map(r => (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>{r.conditionName}</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  {r.severity}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {r.description}
              </p>

              {r.restrictedExercises && r.restrictedExercises.length > 0 && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-400">
                  <span className="font-bold block mb-1">🚫 {language === "ar" ? "التمارين الممنوعة:" : "Contraindicated:"}</span>
                  <span>{r.restrictedExercises.join(", ")}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

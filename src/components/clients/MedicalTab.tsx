"use client";

import React from "react";
import { ClientMedicalRestriction } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { AlertTriangle, PlusCircle } from "lucide-react";

interface MedicalTabProps {
  restrictions: ClientMedicalRestriction[];
  onOpenModal: () => void;
}

export default function MedicalTab({ restrictions, onOpenModal }: MedicalTabProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{t("clientMedical")}</h3>
        <button
          onClick={onOpenModal}
          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse shadow-md"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>{t("addRestriction")}</span>
        </button>
      </div>

      {restrictions.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
          لا توجد محاذير أو إصابات مسجلة لهذا المتدرب.
        </div>
      ) : (
        restrictions.map(r => (
          <div key={r.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                  {r.bodyPart}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{r.conditionName}</h4>
                  <p className="text-[11px] text-slate-400">{r.description}</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                r.severity === "HIGH" || r.severity === "CRITICAL"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}>
                {r.severity}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="text-slate-400 font-bold">التمارين المحظورة:</span>
                <div className="flex flex-wrap gap-1">
                  {r.restrictedExercises.map((e, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-red-900/40 text-red-300 font-bold text-[10px]">
                      ⛔ {e}
                    </span>
                  ))}
                </div>
              </div>
              {r.notes && <p className="text-slate-400 text-[11px]">💡 {r.notes}</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
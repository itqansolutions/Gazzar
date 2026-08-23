"use client";

import React from "react";
import { ClientCoachAssignment } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { Users, PlusCircle, ShieldCheck } from "lucide-react";

interface CoachesTabProps {
  assignments: ClientCoachAssignment[];
  onOpenModal: () => void;
}

export default function CoachesTab({ assignments, onOpenModal }: CoachesTabProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          {language === "ar" ? "الكباتن والأخصائيون المسؤولون (Many-to-Many)" : "Assigned Coaches & Specialists"}
        </h3>
        <button
          onClick={onOpenModal}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>تعيين كابتن جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {assignments?.map(ca => (
          <div key={ca.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-black text-sm text-white shadow-md">
                {ca.coach?.user?.name.slice(0, 2) || "CO"}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{ca.coach?.user?.name || "كابتن تدريب"}</h4>
                <p className="text-[10px] text-slate-400">{ca.coach?.specialties?.join("، ") || "لياقة وتدريب"}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">تاريخ التعيين: {ca.assignedAt.slice(0, 10)}</p>
                {ca.notes && <p className="text-[10px] text-emerald-400/80 mt-0.5">💡 {ca.notes}</p>}
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              ca.role === "PRIMARY"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : ca.role === "NUTRITIONIST"
                ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            }`}>
              {ca.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
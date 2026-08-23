"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { CoachProfile } from "@/types";
import {
  Shield,
  Users,
  Award,
  Star,
  PlusCircle,
  Dumbbell
} from "lucide-react";

export default function CoachesPage() {
  const { t, language } = useLanguage();
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);

  useEffect(() => {
    setCoaches(db.getCoaches());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <Shield className="w-6 h-6 text-emerald-400" />
          <span>{t("navCoaches")}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {language === "ar"
            ? "الهيكل التدريبي، المشرف العام (Head Coach)، الكباتن، الأخصائيين وتوزيع المتدربين"
            : "Coaching staff directory, Head Coach oversight, specialties & assigned clients"}
        </p>
      </div>

      {/* Coaches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {coaches.map(co => (
          <div
            key={co.id}
            className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
              <img
                src={co.user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}
                alt={co.user?.name || "Coach"}
                onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"; }}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
              />
              <div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <h3 className="text-sm sm:text-base font-bold text-white">{co.user?.name}</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {co.user?.role}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">{co.user?.email}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">التخصصات:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {co.specialties?.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 font-medium">المتدربون المسؤول عنهم:</span>
                <span className="font-black text-sm text-emerald-400">{co.assignedClientsCount || 4} مشتركين</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
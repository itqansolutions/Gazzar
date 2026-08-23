"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/db";
import { Sport, MuscleGroup, Equipment } from "@/types";
import {
  Trophy,
  Flame,
  Dumbbell,
  PlusCircle,
  Layers
} from "lucide-react";

export default function SportsPage() {
  const { t, language } = useLanguage();
  const [sports, setSports] = useState<Sport[]>([]);
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  useEffect(() => {
    setSports(db.getSports());
    setMuscles(db.getMuscleGroups());
    setEquipments(db.getEquipment());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <Trophy className="w-6 h-6 text-emerald-400" />
          <span>{t("navSports")}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {language === "ar"
            ? "الرياضات المتاحة بالأكاديمية، المجموعات العضلية والمعدات التدريبية"
            : "Multi-sport activities, muscle groups & gym equipment taxonomy"}
        </p>
      </div>

      {/* Sports Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white">الرياضات المدعومة (Multi-Sport Activities)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sports.map(s => (
            <div key={s.id} className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <span className="text-2xl">{s.icon || "🏆"}</span>
                <div>
                  <h4 className="text-sm font-bold text-white">{s.nameAr}</h4>
                  <p className="text-xs text-slate-400 font-semibold">{s.nameEn}</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 pt-1">
                {language === "ar" ? s.descriptionAr : s.descriptionEn}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Muscle Groups Grid */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <h3 className="text-sm font-bold text-white">المجموعات العضلية (Muscle Groups)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {muscles.map(m => (
            <div key={m.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
              <span className="text-xs font-bold text-white block">{m.nameAr}</span>
              <span className="text-[10px] text-slate-400 block">{m.nameEn}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Equipments Grid */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <h3 className="text-sm font-bold text-white">المعدات التدريبية (Equipment)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {equipments.map(eq => (
            <div key={eq.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
              <span className="text-xs font-bold text-white block">{eq.nameAr}</span>
              <span className="text-[10px] text-slate-400 block">{eq.nameEn}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
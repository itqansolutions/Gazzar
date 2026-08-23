"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/db";
import { Sport } from "@/types";
import { Trophy, PlusCircle, CheckCircle, Activity, X } from "lucide-react";

export default function SportsPage() {
  const { t, language } = useLanguage();
  const [sports, setSports] = useState<Sport[]>([]);

  useEffect(() => {
    setSports(db.getSports());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <Trophy className="w-6 h-6 text-emerald-500" />
          <span>{t("navSports")}</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            {sports.length} {language === "ar" ? "رياضات وتخصصات" : "sports"}
          </span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {language === "ar"
            ? "دليل الرياضات المعتمدة، مقاييس الأداء الخاصة بكل رياضة، وتوزيع المشتركين"
            : "Supported athletic disciplines, custom metric engines, and active participant breakdown"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sports.map(sp => (
          <div
            key={sp.id}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4 hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/20">
                {sp.icon || "🏆"}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{sp.nameAr}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{sp.nameEn}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {sp.descriptionAr}
            </p>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">التصنيفات الفرعية:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  {sp.categories?.join(" • ") || "تدريب رياضي"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

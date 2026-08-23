"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/db";
import { MealPlan } from "@/types";
import {
  Apple,
  Flame,
  Droplets,
  PlusCircle,
  Sparkles,
  Coffee,
  Sun,
  Moon,
  Cookie
} from "lucide-react";

export default function NutritionPage() {
  const { t, language } = useLanguage();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [waterGlasses, setWaterGlasses] = useState(6);

  useEffect(() => {
    setMealPlans(db.getMealPlans());
  }, []);

  const plan = mealPlans[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <Apple className="w-6 h-6 text-emerald-400" />
          <span>{t("navNutrition")}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {language === "ar"
            ? "الأنظمة الغذائية، حساب السعرات والماكروز (بروتين، كارب، دهون) وتتبع شرب الماء"
            : "Meal plans, macronutrient breakdowns (Protein, Carbs, Fats) & hydration tracker"}
        </p>
      </div>

      {plan && (
        <div className="space-y-6">
          {/* Daily Macros Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.title}</h3>
                <p className="text-xs text-slate-400">إشراف: كابتن سارة كمال (أخصائية التغذية الرياضية)</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
                خطة نشطة (Active Plan)
              </span>
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400">السعرات اليومية</span>
                <p className="text-2xl font-black text-amber-400">{plan.dailyCalories} <span className="text-xs font-normal text-slate-400">Kcal</span></p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400">البروتين (Protein)</span>
                <p className="text-2xl font-black text-emerald-400">{plan.proteinGrams} <span className="text-xs font-normal text-slate-400">g</span></p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400">الكارب (Carbs)</span>
                <p className="text-2xl font-black text-blue-400">{plan.carbsGrams} <span className="text-xs font-normal text-slate-400">g</span></p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400">الدهون الصحية (Fats)</span>
                <p className="text-2xl font-black text-purple-400">{plan.fatsGrams} <span className="text-xs font-normal text-slate-400">g</span></p>
              </div>
            </div>

            {/* Hydration Tracker */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-950 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <Droplets className="w-6 h-6 text-blue-400 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-white">تتبع شرب الماء اليومي ({plan.waterLiters} لتر مستهدف)</h4>
                  <p className="text-[11px] text-slate-400">تم شرب {waterGlasses * 0.35} لتر حتى الآن</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => setWaterGlasses(Math.max(0, waterGlasses - 1))}
                  className="w-8 h-8 rounded-xl bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-700"
                >
                  -
                </button>
                <span className="font-black text-sm text-blue-400 px-2">{waterGlasses} أكواب</span>
                <button
                  onClick={() => setWaterGlasses(waterGlasses + 1)}
                  className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Meals Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Breakfast */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-amber-400 font-bold text-xs">
                <Coffee className="w-4 h-4" />
                <span>وجبة الإفطار (Breakfast)</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                {plan.breakfast}
              </p>
            </div>

            {/* Lunch */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-emerald-400 font-bold text-xs">
                <Sun className="w-4 h-4" />
                <span>وجبة الغداء الأساسية (Lunch)</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                {plan.lunch}
              </p>
            </div>

            {/* Dinner */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-indigo-400 font-bold text-xs">
                <Moon className="w-4 h-4" />
                <span>وجبة العشاء (Dinner)</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                {plan.dinner}
              </p>
            </div>

            {/* Snacks & Pre-workout */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-teal-400 font-bold text-xs">
                <Cookie className="w-4 h-4" />
                <span>السناكس وقبل التمرين (Snacks)</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                {plan.snacks}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
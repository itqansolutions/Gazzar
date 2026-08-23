"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/db";
import {
  Settings as SettingsIcon,
  Globe,
  Scale,
  Moon,
  Sun,
  Shield,
  Building,
  CheckCircle,
  Sparkles
} from "lucide-react";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { user, loginAsRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const [unit, setUnit] = useState<"METRIC" | "IMPERIAL">("METRIC");
  const [savedMessage, setSavedMessage] = useState("");

  const handleSave = () => {
    setSavedMessage(language === "ar" ? "تم حفظ الإعدادات بنجاح! ✓" : "Settings saved successfully!");
    setTimeout(() => setSavedMessage(""), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <SettingsIcon className="w-6 h-6 text-emerald-500" />
          <span>{t("navSettings")}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {language === "ar"
            ? "إعدادات المظهر (الوضع الليلي والفاتح)، اللغة، وحدات القياس (KG / LBS)، وتخصيص الأكاديمية"
            : "Theme mode (Dark & Light), language preferences, units & academy profile"}
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-300 font-bold flex items-center space-x-2 rtl:space-x-reverse animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 transition-colors duration-300">
        {/* Theme Mode Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
            {theme === "dark" ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span>مظهر النظام (Theme Mode)</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-center flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all ${
                theme === "dark"
                  ? "bg-slate-950 border-emerald-500 text-emerald-400 shadow-md ring-1 ring-emerald-500/30"
                  : "bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Moon className="w-4 h-4 text-purple-400" />
              <span>الوضع الليلي (Dark Mode) 🌙</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-center flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all ${
                theme === "light"
                  ? "bg-amber-500/10 border-amber-500 text-amber-700 shadow-md ring-1 ring-amber-500/30 font-extrabold"
                  : "bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>الوضع الفاتح (Light Mode) ☀️</span>
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
            <Globe className="w-4 h-4 text-emerald-500" />
            <span>لغة النظام (System Language)</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLanguage("ar")}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all ${
                language === "ar"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-300 shadow-md ring-1 ring-emerald-500/30"
                  : "bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              العربية (RTL) 🇪🇬
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all ${
                language === "en"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-300 shadow-md ring-1 ring-emerald-500/30"
                  : "bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              English (LTR) 🌐
            </button>
          </div>
        </div>

        {/* Units Selection */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
            <Scale className="w-4 h-4 text-blue-500" />
            <span>وحدات القياس (Measurement Units)</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUnit("METRIC")}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all ${
                unit === "METRIC"
                  ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-300 shadow-md"
                  : "bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              النظام المتري: كجم وسم (KG / CM)
            </button>
            <button
              type="button"
              onClick={() => setUnit("IMPERIAL")}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all ${
                unit === "IMPERIAL"
                  ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-300 shadow-md"
                  : "bg-slate-100 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              النظام الإمبراطوري: باوند وبوصة (LBS / IN)
            </button>
          </div>
        </div>

        {/* Role Switcher Demo */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
            <Shield className="w-4 h-4 text-purple-500" />
            <span>التبديل السريع بين الصلاحيات (Role Switcher Preview)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            يمكنك تجربة النظام بكافة الأدوار التدريبية والإدارية بضغطة زر:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => loginAsRole("ADMIN")}
              className={`p-2.5 rounded-xl border text-xs font-bold ${
                user?.role === "ADMIN" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-700 dark:text-slate-300"
              }`}
            >
              👑 مدير (Admin)
            </button>
            <button
              type="button"
              onClick={() => loginAsRole("HEAD_COACH")}
              className={`p-2.5 rounded-xl border text-xs font-bold ${
                user?.role === "HEAD_COACH" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-700 dark:text-slate-300"
              }`}
            >
              ⭐ مشرف (Head Coach)
            </button>
            <button
              type="button"
              onClick={() => loginAsRole("COACH")}
              className={`p-2.5 rounded-xl border text-xs font-bold ${
                user?.role === "COACH" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-700 dark:text-slate-300"
              }`}
            >
              🏋️ كابتن (Coach)
            </button>
            <button
              type="button"
              onClick={() => loginAsRole("CLIENT")}
              className={`p-2.5 rounded-xl border text-xs font-bold ${
                user?.role === "CLIENT" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-700 dark:text-slate-300"
              }`}
            >
              🏃 مشترك (Athlete)
            </button>
          </div>
        </div>

        {/* Organization Info */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
            <Building className="w-4 h-4 text-amber-500" />
            <span>بيانات المنشأة الرياضية (Organization)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">اسم الأكاديمية</label>
              <input
                type="text"
                defaultValue="Gazzar Athletic Performance Academy"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">البريد الرسمي</label>
              <input
                type="email"
                defaultValue="contact@gazzar-academy.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Data Persistence & Reset Controls */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>إدارة قاعدة البيانات والحفظ المحلي (Database & Persistence)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            جميع التعديلات والإضافات والحذف يتم حفظها فورياً في متصفحك. يمكنك إعادة ضبط النظام للبيانات الافتراضية في أي وقت:
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                if (confirm(language === "ar" ? "هل أنت متأكد من إعادة ضبط كافة البيانات للمصنع (Default Demo Data)؟" : "Reset all data to default demo state?")) {
                  db.resetToDefaults();
                  setSavedMessage(language === "ar" ? "تمت استعادة البيانات الافتراضية بنجاح!" : "Default data restored successfully!");
                  setTimeout(() => setSavedMessage(""), 3000);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              <span>🔄 إعادة ضبط البيانات الافتراضية للمصنع</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
        >
          {t("save")}
        </button>
      </div>
    </div>
  );
}
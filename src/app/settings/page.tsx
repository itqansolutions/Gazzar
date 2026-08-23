"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  Settings as SettingsIcon,
  Globe,
  Scale,
  Moon,
  Shield,
  Building,
  CheckCircle,
  Sparkles
} from "lucide-react";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { user, loginAsRole } = useAuth();
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
        <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <SettingsIcon className="w-6 h-6 text-emerald-400" />
          <span>{t("navSettings")}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {language === "ar"
            ? "إعدادات اللغة، وحدات القياس (KG / LBS)، تخصيص الأكاديمية وصلاحيات الحساب"
            : "Language preferences, measurement units, academy profile & permissions"}
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-bold flex items-center space-x-2 rtl:space-x-reverse">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Language Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>لغة النظام (System Language)</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLanguage("ar")}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all ${
                language === "ar"
                  ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              العربية (RTL) 🇪🇬
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all ${
                language === "en"
                  ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              English (LTR) 🌐
            </button>
          </div>
        </div>

        {/* Units Selection */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
            <Scale className="w-4 h-4 text-blue-400" />
            <span>وحدات القياس (Measurement Units)</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUnit("METRIC")}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all ${
                unit === "METRIC"
                  ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-md"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              النظام المتري: كجم وسم (KG / CM)
            </button>
            <button
              type="button"
              onClick={() => setUnit("IMPERIAL")}
              className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all ${
                unit === "IMPERIAL"
                  ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-md"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              النظام الإمبراطوري: باوند وبوصة (LBS / IN)
            </button>
          </div>
        </div>

        {/* Role Switcher Demo */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>التبديل السريع بين الصلاحيات (Role Switcher Preview)</span>
          </h3>
          <p className="text-xs text-slate-400">
            يمكنك تجربة النظام بكافة الأدوار التدريبية والإدارية بضغطة زر:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => loginAsRole("ADMIN")}
              className={`p-2.5 rounded-xl border text-xs font-bold ${
                user?.role === "ADMIN" ? "bg-emerald-600 text-white" : "bg-slate-950 border-slate-800 text-slate-300"
              }`}
            >
              👑 مدير (Admin)
            </button>
            <button
              type="button"
              onClick={() => loginAsRole("HEAD_COACH")}
              className={`p-2.5 rounded-xl border text-xs font-bold ${
                user?.role === "HEAD_COACH" ? "bg-emerald-600 text-white" : "bg-slate-950 border-slate-800 text-slate-300"
              }`}
            >
              ⭐ مشرف (Head Coach)
            </button>
            <button
              type="button"
              onClick={() => loginAsRole("COACH")}
              className={`p-2.5 rounded-xl border text-xs font-bold ${
                user?.role === "COACH" ? "bg-emerald-600 text-white" : "bg-slate-950 border-slate-800 text-slate-300"
              }`}
            >
              🏋️ كابتن (Coach)
            </button>
            <button
              type="button"
              onClick={() => loginAsRole("CLIENT")}
              className={`p-2.5 rounded-xl border text-xs font-bold ${
                user?.role === "CLIENT" ? "bg-emerald-600 text-white" : "bg-slate-950 border-slate-800 text-slate-300"
              }`}
            >
              🏃 مشترك (Athlete)
            </button>
          </div>
        </div>

        {/* Organization Info */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
            <Building className="w-4 h-4 text-amber-400" />
            <span>بيانات المنشأة الرياضية (Organization)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">اسم الأكاديمية</label>
              <input
                type="text"
                defaultValue="Gazzar Athletic Performance Academy"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">البريد الرسمي</label>
              <input
                type="email"
                defaultValue="contact@gazzar-academy.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>
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
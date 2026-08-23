"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, translations } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  dir: "rtl" | "ltr";
  t: (key: keyof typeof translations.ar) => string;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar");

  useEffect(() => {
    const saved = localStorage.getItem("gazzar_lang") as Language;
    if (saved && (saved === "ar" || saved === "en")) {
      setLanguageState(saved);
      document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = saved;
    } else {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("gazzar_lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  const toggleLanguage = () => {
    const next = language === "ar" ? "en" : "ar";
    setLanguage(next);
  };

  const t = (key: keyof typeof translations.ar): string => {
    const dict = translations[language] || translations.ar;
    return (dict as any)[key] || key;
  };

  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, dir, t, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}
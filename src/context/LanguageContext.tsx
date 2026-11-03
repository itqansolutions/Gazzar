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
  const [language] = useState<Language>("en");

  useEffect(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
  }, []);

  const setLanguage = () => {};
  const toggleLanguage = () => {};

  const t = (key: keyof typeof translations.en): string => {
    const dict = translations.en || translations.ar;
    return (dict as any)[key] || key;
  };

  const dir = "ltr";

  return (
    <LanguageContext.Provider value={{ language: "en", dir, t, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}
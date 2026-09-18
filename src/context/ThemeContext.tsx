"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // Always force light mode - dark mode is disabled
    setThemeState("light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    localStorage.setItem("gx_theme", "light");
  }, []);

  const setTheme = (t: Theme) => {
    // Force light always
    setThemeState("light");
    localStorage.setItem("gx_theme", "light");
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.classList.remove("dark");
      root.classList.add("light");
    }
  };

  const toggleTheme = () => {
    // No-op: dark mode disabled
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
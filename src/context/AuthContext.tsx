"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { SessionUser, UserRole } from "@/types";
import { db } from "@/lib/db";

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<SessionUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync session with live db
  const syncWithDb = (savedUser: SessionUser | null): SessionUser | null => {
    if (!savedUser) return null;
    const liveUser = db.getUserById(savedUser.id) || db.getUserByEmail(savedUser.email);
    if (liveUser) {
      return {
        ...savedUser,
        id: liveUser.id,
        email: liveUser.email,
        name: liveUser.name,
        role: liveUser.role,
        avatar: liveUser.avatar,
        phone: liveUser.phone
      };
    }
    return savedUser;
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gx_session_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        const synced = syncWithDb(parsed);
        setUser(synced);
        if (synced) {
          localStorage.setItem("gx_session_user", JSON.stringify(synced));
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Listen to DB changes across the app to update currently logged-in user profile immediately
  useEffect(() => {
    const handleDbChange = () => {
      setUser((prev: SessionUser | null) => {
        if (!prev) return null;
        const synced = syncWithDb(prev);
        if (synced) {
          localStorage.setItem("gx_session_user", JSON.stringify(synced));
        }
        return synced;
      });
    };

    window.addEventListener("gx_db_change", handleDbChange);
    return () => window.removeEventListener("gx_db_change", handleDbChange);
  }, []);

  const updateCurrentUser = (updates: Partial<SessionUser>) => {
    setUser((prev: SessionUser | null) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem("gx_session_user", JSON.stringify(updated));
      return updated;
    });
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!email?.trim() || !password) {
        return { success: false, message: "البريد الإلكتروني وكلمة المرور مطلوبان" };
      }

      // Direct local DB check for reactive prototype experience
      const foundUser = db.getUserByEmail(email.trim());
      if (!foundUser) {
        return { success: false, message: "بيانات الدخول غير صحيحة" };
      }

      // Client-side prototype verification against stored mock credentials
      const isValid = Boolean(foundUser.password && password === foundUser.password);
      if (!isValid) {
        return { success: false, message: "بيانات الدخول غير صحيحة" };
      }

      const sessionUser: SessionUser = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
        avatar: foundUser.avatar,
        phone: foundUser.phone,
        coachId: foundUser.role === "COACH" || foundUser.role === "HEAD_COACH" ? `coach-${foundUser.id}` : undefined,
        clientId: foundUser.role === "CLIENT" ? `client-${foundUser.id}` : undefined
      };

      setUser(sessionUser);
      localStorage.setItem("gx_session_user", JSON.stringify(sessionUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || "حدث خطأ أثناء تسجيل الدخول" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("gx_session_user");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
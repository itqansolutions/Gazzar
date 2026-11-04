"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { SessionUser } from "@/types";

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateCurrentUser: (updates: Partial<SessionUser>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Session Restoration on Application Startup via /api/auth/me
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        // Remove legacy mock auth from localStorage if present
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("gx_session_user");
          } catch {
            // Ignore restricted storage contexts
          }
        }

        const res = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            "Accept": "application/json"
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.success && data.user) {
              setUser(data.user);
            } else {
              setUser(null);
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Centralized Login via POST /api/auth/login
  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!email?.trim() || !password) {
        return { success: false, message: "Email and password are required" };
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        // HttpOnly gx_session cookie is set by the server response
        setUser(data.user);
        return { success: true };
      }

      setUser(null);
      return {
        success: false,
        message: data.message || "Invalid login credentials"
      };
    } catch {
      setUser(null);
      return { success: false, message: "Connection error. Please try again." };
    }
  };

  // 3. Centralized Logout via POST /api/auth/logout
  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Accept": "application/json"
        }
      });
    } catch {
      // Best-effort notification to server
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  // 4. Session Refresh via GET /api/auth/me
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          return;
        }
      }
      setUser(null);
    } catch {
      // Keep existing state on transient failure
    }
  }, []);

  // 5. In-Memory User Profile State Update
  const updateCurrentUser = useCallback((updates: Partial<SessionUser>) => {
    setUser((prev: SessionUser | null) => (prev ? { ...prev, ...updates } : null));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateCurrentUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
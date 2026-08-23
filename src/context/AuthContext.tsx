"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SessionUser } from "@/lib/auth";
import { UserRole } from "@/types";

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, role?: UserRole) => Promise<boolean>;
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultAdminUser: SessionUser = {
  id: "user-admin",
  email: "admin@gazzar.com",
  name: "أحمد الجزار (المدير العام)",
  role: "ADMIN",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("gazzar_session_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        setUser(defaultAdminUser);
      }
    } else {
      // Default to Admin in demo mode
      setUser(defaultAdminUser);
      localStorage.setItem("gazzar_session_user", JSON.stringify(defaultAdminUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, role?: UserRole): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem("gazzar_session_user", JSON.stringify(data.user));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const loginAsRole = (role: UserRole) => {
    let mockUser: SessionUser;
    if (role === "ADMIN") {
      mockUser = {
        id: "user-admin",
        email: "admin@gazzar.com",
        name: "أحمد الجزار (المدير العام)",
        role: "ADMIN",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
      };
    } else if (role === "HEAD_COACH") {
      mockUser = {
        id: "user-headcoach",
        email: "headcoach@gazzar.com",
        name: "كابتن حسام حسن (كبير المدربين)",
        role: "HEAD_COACH",
        coachId: "coach-head",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
      };
    } else if (role === "COACH") {
      mockUser = {
        id: "user-coach-1",
        email: "ali@gazzar.com",
        name: "كابتن علي منصور",
        role: "COACH",
        coachId: "coach-1",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200"
      };
    } else {
      mockUser = {
        id: "user-client-1",
        email: "mohamed@gmail.com",
        name: "محمد إبراهيم الفقي",
        role: "CLIENT",
        clientId: "client-1",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200"
      };
    }

    setUser(mockUser);
    localStorage.setItem("gazzar_session_user", JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("gazzar_session_user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginAsRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
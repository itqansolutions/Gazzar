"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (!loading && user) {
      const clientRestrictedRoutes = [
        "/users",
        "/coaches",
        "/clients",
        "/exercises",
        "/templates",
        "/programs",
        "/attendance",
        "/sports",
        "/reports",
        "/audit-logs"
      ];

      const coachRestrictedRoutes = [
        "/users",
        "/reports",
        "/audit-logs"
      ];

      if (user.role === "CLIENT" && clientRestrictedRoutes.some(r => pathname === r || (pathname.startsWith(r) && pathname === "/clients"))) {
        router.replace("/dashboard");
      } else if (user.role === "COACH" && coachRestrictedRoutes.some(r => pathname === r || pathname.startsWith(r))) {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, isLoginPage, pathname, router]);

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center selection:bg-emerald-500 selection:text-white transition-colors">
        {children}
      </div>
    );
  }

  if (loading || (!user && !isLoginPage)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">جاري التحقق من تسجيل الدخول...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
      <div className="flex-1 flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 lg:ms-64 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {children}
        </main>
      </div>
      <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
}
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
  const isPublicLanding = pathname === "/";
  const isResetPassword = pathname?.startsWith("/reset-password");
  const isPublicWhitelist = isLoginPage || isPublicLanding || isResetPassword;

  useEffect(() => {
    if (!loading && !user && !isPublicWhitelist) {
      router.replace("/login");
      return;
    }

    if (!loading && user && isPublicLanding) {
      router.replace("/dashboard");
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
        "/audit-logs",
        "/settings",
        "/admin-public"
      ];

      const coachRestrictedRoutes = [
        "/users",
        "/reports",
        "/audit-logs",
        "/admin-public"
      ];

      // Note: This is a UI-level UX navigation guard to prevent accidental navigation.
      // True security authorization must be enforced on the server in Phase 2.
      const isClientRouteRestricted =
        pathname === "/clients" ||
        (pathname.startsWith("/clients/") && user.clientId && pathname !== `/clients/${user.clientId}`) ||
        clientRestrictedRoutes.some(r => r !== "/clients" && (pathname === r || pathname.startsWith(`${r}/`)));

      const isCoachRouteRestricted =
        coachRestrictedRoutes.some(r => pathname === r || pathname.startsWith(`${r}/`));

      if (user.role === "CLIENT" && isClientRouteRestricted) {
        router.replace("/dashboard");
      } else if (user.role === "COACH" && isCoachRouteRestricted) {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, isLoginPage, isPublicLanding, pathname, router]);

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 flex flex-col justify-center selection:bg-red-600 selection:text-white transition-colors">
        {children}
      </div>
    );
  }

  // Public layouts: unauthenticated users on "/" or "/reset-password"
  if ((isPublicLanding || isResetPassword) && !user) {
    return <>{children}</>;
  }

  if (loading || (!user && !isLoginPage && !isPublicLanding && !isResetPassword)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090a0f] flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app bg-slate-50 dark:bg-[#090a0f] text-fg text-slate-900 dark:text-slate-100 flex flex-col selection:bg-brand selection:text-brand-contrast transition-colors duration-200">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
      <div className="flex-1 flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 lg:ms-[240px] p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 max-w-7xl w-full mx-auto animate-in fade-in duration-200 flex flex-col justify-between">
          <div className="flex-1">{children}</div>
          <footer className="mt-12 pt-6 border-t border-line dark:border-white/[0.06] text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 select-none">
            <span>&copy; {new Date().getFullYear()} GX Fitness Academy</span>
            <span className="flex items-center">
              Powered & Designed by{" "}
              <a
                href="https://itqansolutions.org"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 font-medium text-slate-600 dark:text-slate-300 hover:text-brand transition-colors"
              >
                Itqan Solutions
              </a>
            </span>
          </footer>
        </main>
      </div>
      <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
}
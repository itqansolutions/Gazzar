"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Calendar,
  Layers,
  Activity,
  Menu
} from "lucide-react";

interface BottomNavProps {
  onOpenSidebar: () => void;
}

export default function BottomNav({ onOpenSidebar }: BottomNavProps) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const isClient = user?.role === "CLIENT";

  const navItems = isClient
    ? [
        { href: "/dashboard", label: t("navDashboard"), icon: LayoutDashboard },
        { href: "/workout/assign-wo-1/execute", label: language === "ar" ? "تمرين اليوم" : "Today Workout", icon: Dumbbell, highlight: true },
        { href: "/exercises", label: t("navExercises"), icon: Layers },
        { href: "/assessments", label: t("navAssessments"), icon: Activity }
      ]
    : [
        { href: "/dashboard", label: t("navDashboard"), icon: LayoutDashboard },
        { href: "/clients", label: t("navClients"), icon: Users },
        { href: "/assignments", label: t("navAssignments"), icon: Dumbbell },
        { href: "/calendar", label: t("navCalendar"), icon: Calendar }
      ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 py-1 px-2 safe-area-pb shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/40 group-active:scale-95 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-emerald-400 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? "text-emerald-400 font-bold" : "hover:text-slate-200"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}

        {/* More Menu Drawer Trigger */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>{language === "ar" ? "المزيد" : "More"}</span>
        </button>
      </div>
    </nav>
  );
}
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Trophy,
  Dumbbell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Activity,
  Apple,
  CreditCard,
  BarChart3,
  ShieldAlert,
  Settings,
  Layers,
  Sparkles,
  ClipboardList
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const isClient = user?.role === "CLIENT";

  const navigationGroups = [
    {
      title: language === "ar" ? "الرئيسية والمشتركين" : "Core & Clients",
      items: [
        { href: "/dashboard", label: t("navDashboard"), icon: LayoutDashboard, roles: ["ADMIN", "HEAD_COACH", "COACH", "CLIENT"] },
        { href: "/users", label: t("navUsers"), icon: Users, roles: ["ADMIN", "HEAD_COACH"] },
        { href: "/clients", label: t("navClients"), icon: Users, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/coaches", label: t("navCoaches"), icon: UserCheck, roles: ["ADMIN", "HEAD_COACH"] }
      ]
    },
    {
      title: language === "ar" ? "المكتبة والبرامج التدريبية" : "Training & Library",
      items: [
        { href: "/sports", label: t("navSports"), icon: Trophy, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/exercises", label: t("navExercises"), icon: Dumbbell, roles: ["ADMIN", "HEAD_COACH", "COACH", "CLIENT"] },
        { href: "/templates", label: t("navTemplates"), icon: Layers, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/programs", label: t("navPrograms"), icon: BookOpen, roles: ["ADMIN", "HEAD_COACH", "COACH", "CLIENT"] },
        { href: "/assignments", label: t("navAssignments"), icon: ClipboardList, roles: ["ADMIN", "HEAD_COACH", "COACH", "CLIENT"] }
      ]
    },
    {
      title: language === "ar" ? "العمليات والأنشطة" : "Operations & Health",
      items: [
        { href: "/calendar", label: t("navCalendar"), icon: Calendar, roles: ["ADMIN", "HEAD_COACH", "COACH", "CLIENT"] },
        { href: "/attendance", label: t("navAttendance"), icon: CheckCircle2, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/assessments", label: t("navAssessments"), icon: Activity, roles: ["ADMIN", "HEAD_COACH", "COACH", "CLIENT"] },
        { href: "/nutrition", label: t("navNutrition"), icon: Apple, roles: ["ADMIN", "HEAD_COACH", "COACH", "CLIENT"] },
        { href: "/memberships", label: t("navMemberships"), icon: CreditCard, roles: ["ADMIN", "HEAD_COACH", "COACH", "CLIENT"] }
      ]
    },
    {
      title: language === "ar" ? "الرقابة والتقارير" : "Reports & Audit",
      items: [
        { href: "/reports", label: t("navReports"), icon: BarChart3, roles: ["ADMIN", "HEAD_COACH"] },
        { href: "/audit-logs", label: t("navAuditLogs"), icon: ShieldAlert, roles: ["ADMIN"] },
        { href: "/settings", label: t("navSettings"), icon: Settings, roles: ["ADMIN", "HEAD_COACH", "COACH", "CLIENT"] }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed top-16 bottom-0 z-40 w-64 bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 custom-scrollbar">
          {navigationGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => !user || item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1.5">
                <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center space-x-3 rtl:space-x-reverse px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm font-bold"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-400"}`} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Client quick workout execution pill for athletes */}
        {isClient && (
          <div className="p-3 mx-3 mb-4 rounded-xl bg-emerald-50 dark:bg-gradient-to-br dark:from-emerald-900/40 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-500/30">
            <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">تمرين اليوم بانتظارك</span>
            </div>
            <Link
              href="/workout/assign-wo-1/execute"
              onClick={onClose}
              className="block w-full py-2 text-center text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-all"
            >
              ابدأ تمرين اليوم 🏋️
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
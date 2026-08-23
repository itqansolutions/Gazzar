"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
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
  ClipboardList,
  LogOut,
  User
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();

  const isClient = user?.role === "CLIENT";

  // Find client ID for profile link
  const myClient = user ? db.getClients().find(c => c.userId === user.id) : null;
  const myProfileHref = myClient ? `/clients/${myClient.id}` : "/dashboard";

  const clientNavigationGroups = [
    {
      title: language === "ar" ? "لوحة المتدرب" : "Athlete Portal",
      items: [
        { href: "/dashboard", label: language === "ar" ? "الرئيسية" : "Overview", icon: LayoutDashboard },
        { href: myProfileHref, label: language === "ar" ? "ملفي الشخصي والقياسات" : "My Profile & Stats", icon: User },
        { href: "/assessments", label: language === "ar" ? "تقييماتي البدنية" : "My Assessments", icon: Activity },
        { href: "/assignments", label: language === "ar" ? "جدول تماريني" : "My Workouts", icon: Dumbbell },
        { href: "/nutrition", label: language === "ar" ? "خطتي الغذائية" : "My Meal Plan", icon: Apple },
        { href: "/memberships", label: language === "ar" ? "اشتراكي وعضويتي" : "My Membership", icon: CreditCard },
        { href: "/settings", label: language === "ar" ? "الإعدادات" : "Settings", icon: Settings }
      ]
    }
  ];

  const adminCoachNavigationGroups = [
    {
      title: language === "ar" ? "الإدارة والمشتركون" : "Core Management",
      items: [
        { href: "/dashboard", label: t("navDashboard"), icon: LayoutDashboard, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/users", label: t("navUsers"), icon: Users, roles: ["ADMIN", "HEAD_COACH"] },
        { href: "/clients", label: t("navClients"), icon: Users, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/coaches", label: t("navCoaches"), icon: UserCheck, roles: ["ADMIN", "HEAD_COACH"] }
      ]
    },
    {
      title: language === "ar" ? "المكتبة والبرامج التدريبية" : "Training & Library",
      items: [
        { href: "/sports", label: t("navSports"), icon: Trophy, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/exercises", label: t("navExercises"), icon: Dumbbell, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/templates", label: t("navTemplates"), icon: Layers, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/programs", label: t("navPrograms"), icon: BookOpen, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/assignments", label: t("navAssignments"), icon: ClipboardList, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
      ]
    },
    {
      title: language === "ar" ? "العمليات والمتابعة الصحية" : "Operations & Health",
      items: [
        { href: "/calendar", label: t("navCalendar"), icon: Calendar, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/attendance", label: t("navAttendance"), icon: CheckCircle2, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/assessments", label: t("navAssessments"), icon: Activity, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/nutrition", label: t("navNutrition"), icon: Apple, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/memberships", label: t("navMemberships"), icon: CreditCard, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
      ]
    },
    {
      title: language === "ar" ? "التقارير والرقابة" : "Reports & Governance",
      items: [
        { href: "/reports", label: t("navReports"), icon: BarChart3, roles: ["ADMIN", "HEAD_COACH"] },
        { href: "/audit-logs", label: t("navAuditLogs"), icon: ShieldAlert, roles: ["ADMIN"] },
        { href: "/settings", label: t("navSettings"), icon: Settings, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
      ]
    }
  ];

  const activeGroups = isClient ? clientNavigationGroups : adminCoachNavigationGroups;

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
          {activeGroups.map((group, groupIdx) => {
            const visibleItems = isClient
              ? group.items
              : (group.items as any[]).filter(item => !user || item.roles.includes(user.role));

            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1.5">
                <h3 className="px-3 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center space-x-3 rtl:space-x-reverse px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-500"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer with Logout Button */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-800/40 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{language === "ar" ? "تسجيل الخروج" : "Log Out"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

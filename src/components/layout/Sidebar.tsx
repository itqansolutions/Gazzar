"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import GXLogo from "@/components/brand/GXLogo";
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
  ClipboardList,
  LogOut,
  User,
  X
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isClient = user?.role === "CLIENT";

  // Find client ID for profile link
  const myClient = user ? db.getClients().find(c => c.userId === user.id) : null;
  const myProfileHref = myClient ? `/clients/${myClient.id}` : "/dashboard";

  const clientNavigationGroups = [
    {
      title: "Athlete Portal",
      items: [
        { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: myProfileHref, label: "My Profile & Stats", icon: User },
        { href: "/assessments", label: "My Assessments", icon: Activity },
        { href: "/assignments", label: "My Workouts", icon: Dumbbell },
        { href: "/nutrition", label: "My Meal Plan", icon: Apple },
        { href: "/memberships", label: "My Membership", icon: CreditCard }
      ]
    }
  ];

  // Primary 9-item navigation matching reference
  const primaryAdminNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/clients", label: "Members", icon: Users },
    { href: "/programs", label: "Programs", icon: BookOpen },
    { href: "/assignments", label: "Workouts", icon: Dumbbell },
    { href: "/calendar", label: "Classes", icon: Calendar },
    { href: "/coaches", label: "Coaches", icon: UserCheck },
    { href: "/nutrition", label: "Nutrition", icon: Apple },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings }
  ];

  const secondaryAdminNav = [
    { href: "/users", label: "Users", icon: Users, roles: ["ADMIN", "HEAD_COACH"] },
    { href: "/exercises", label: "Exercises", icon: Layers, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/attendance", label: "Attendance", icon: CheckCircle2, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/memberships", label: "Memberships", icon: CreditCard, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/audit-logs", label: "Audit Logs", icon: ShieldAlert, roles: ["ADMIN"] }
  ];

  const clientNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: myProfileHref, label: "My Profile", icon: User },
    { href: "/assignments", label: "Workouts", icon: Dumbbell },
    { href: "/calendar", label: "Classes", icon: Calendar },
    { href: "/nutrition", label: "Nutrition", icon: Apple },
    { href: "/assessments", label: "Assessments", icon: Activity },
    { href: "/memberships", label: "Memberships", icon: CreditCard },
    { href: "/settings", label: "Settings", icon: Settings }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 lg:z-30 w-72 lg:w-64 bg-white dark:bg-[#121620] border-r border-slate-200 dark:border-[#1a1f2e] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header with Official GX Logo (Both Desktop & Mobile) */}
        <div className="flex items-center justify-between p-4 lg:p-5 border-b border-slate-200 dark:border-[#1a1f2e] bg-slate-50/60 dark:bg-[#0c0f17]/60">
          <Link href="/dashboard" onClick={onClose} className="focus:outline-none">
            <GXLogo size="md" priority />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items Matching Reference */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1 custom-scrollbar">
          {isClient ? (
            clientNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-red-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })
          ) : (
            <>
              {/* Reference 9 Primary Nav Links */}
              {primaryAdminNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-red-500"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Secondary Tools Section */}
              <div className="pt-4 mt-3 border-t border-slate-200 dark:border-[#1a1f2e]/80">
                <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1.5">
                  Management Tools
                </p>
                {secondaryAdminNav
                  .filter((item) => !user || item.roles.includes(user.role))
                  .map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        {/* Sidebar Footer with Accessible Red Logout Button */}
        <div className="p-4 border-t border-slate-200 dark:border-[#1a1f2e] bg-slate-50/50 dark:bg-[#07090e]/50">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-800/40 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
  const myProfileHref = user?.id ? `/clients/${user.id}` : "/dashboard";

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
        className={`fixed top-0 bottom-0 left-0 z-50 lg:z-30 w-[240px] bg-card dark:bg-[#121620] border-r border-line dark:border-[#1a1f2e] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header with Official GX Logo (Both Desktop & Mobile) */}
        <div className="flex items-center justify-between p-4 lg:px-5 lg:py-4 border-b border-line dark:border-[#1a1f2e]">
          <Link href="/dashboard" onClick={onClose} className="focus:outline-none flex items-center">
            <GXLogo size="md" priority />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-control text-muted hover:text-fg hover:bg-raised transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items Matching Reference */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {isClient ? (
            clientNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3 h-11 rounded-control text-sm font-medium transition-all ${
                    isActive
                      ? "bg-red-600 text-white bg-brand text-brand-contrast shadow-lg shadow-brand/25"
                      : "text-muted hover:bg-raised hover:text-fg"
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-muted"}`} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
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
                    className={`flex items-center space-x-3 px-3 h-11 rounded-control text-sm font-medium transition-all ${
                      isActive
                        ? "bg-red-600 text-white bg-brand text-brand-contrast shadow-lg shadow-brand/25"
                        : "text-muted hover:bg-raised hover:text-fg"
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-muted"}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </Link>
                );
              })}

              {/* Secondary Tools Section */}
              <div className="pt-3 mt-3 border-t border-line dark:border-[#1a1f2e]/80">
                <p className="px-3 text-[10px] font-bold tracking-wider text-muted uppercase mb-1">
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
                        className={`flex items-center space-x-3 px-3 h-9 rounded-control text-xs font-medium transition-all ${
                          isActive
                            ? "bg-red-600 text-white bg-brand text-brand-contrast shadow-md"
                            : "text-muted hover:bg-raised hover:text-fg"
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-muted"}`} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        {/* Sidebar Footer with Accessible Red Logout Button */}
        <div className="p-3 border-t border-line dark:border-[#1a1f2e] bg-raised/40">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center space-x-2 px-3 h-11 rounded-control text-sm font-bold text-brand hover:bg-brand-soft border border-transparent hover:border-brand/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

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

  const adminCoachNavigationGroups = [
    {
      title: "Core Management",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/users", label: "User Management", icon: Users, roles: ["ADMIN", "HEAD_COACH"] },
        { href: "/clients", label: "Clients Directory", icon: Users, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/coaches", label: "Coaches Directory", icon: UserCheck, roles: ["ADMIN", "HEAD_COACH"] }
      ]
    },
    {
      title: "Training & Library",
      items: [
        { href: "/sports", label: "Sports Catalog", icon: Trophy, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/exercises", label: "Exercise Library", icon: Dumbbell, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/templates", label: "Workout Templates", icon: Layers, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/programs", label: "Training Programs", icon: BookOpen, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/assignments", label: "Assignments", icon: ClipboardList, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
      ]
    },
    {
      title: "Operations & Health",
      items: [
        { href: "/calendar", label: "Calendar & Schedule", icon: Calendar, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/attendance", label: "Attendance Tracking", icon: CheckCircle2, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/assessments", label: "Fitness Assessments", icon: Activity, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/nutrition", label: "Nutrition Plans", icon: Apple, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
        { href: "/memberships", label: "Memberships & Billing", icon: CreditCard, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
      ]
    },
    {
      title: "Reports & Governance",
      items: [
        { href: "/reports", label: "Analytics & Reports", icon: BarChart3, roles: ["ADMIN", "HEAD_COACH"] },
        { href: "/audit-logs", label: "Audit Trail", icon: ShieldAlert, roles: ["ADMIN"] },
        { href: "/settings", label: "System Settings", icon: Settings, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
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
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed top-0 lg:top-20 bottom-0 left-0 z-50 lg:z-30 w-72 lg:w-64 bg-white dark:bg-[#121620] border-r border-slate-200 dark:border-[#1a1f2e] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Sidebar Header with Logo and Close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#1a1f2e]">
          <GXLogo size="sm" priority />
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 custom-scrollbar">
          {activeGroups.map((group, groupIdx) => {
            const visibleItems = isClient
              ? group.items
              : (group.items as any[]).filter(item => !user || item.roles.includes(user.role));

            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1.5">
                <h3 className="px-3 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
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
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-red-500"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer with Accessible Red Logout Button */}
        <div className="p-4 border-t border-slate-200 dark:border-[#1a1f2e] bg-slate-50/50 dark:bg-[#07090e]/50">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-800/40 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

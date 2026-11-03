"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Calendar,
  Activity,
  Menu,
  User
} from "lucide-react";

interface BottomNavProps {
  onOpenSidebar: () => void;
}

export default function BottomNav({ onOpenSidebar }: BottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isClient = user?.role === "CLIENT";

  const myClient = user ? db.getClients().find(c => c.userId === user.id) : null;
  const myProfileHref = myClient ? `/clients/${myClient.id}` : "/dashboard";

  const navItems = isClient
    ? [
        { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: myProfileHref, label: "Profile", icon: User },
        { href: "/assignments", label: "Workouts", icon: Dumbbell, highlight: true },
        { href: "/assessments", label: "Assessments", icon: Activity }
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/clients", label: "Clients", icon: Users },
        { href: "/assignments", label: "Workouts", icon: Dumbbell },
        { href: "/calendar", label: "Calendar", icon: Calendar }
      ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#1a1f2e] text-slate-500 dark:text-slate-400 py-1.5 px-3 safe-area-pb shadow-2xl transition-colors duration-200">
      <div className="flex items-center justify-around">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-6 group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-600/35 group-active:scale-95 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition-colors ${
                isActive ? "text-red-600 dark:text-red-500 font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-red-600 dark:text-red-500" : "text-slate-400 dark:text-slate-500"}`} />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}

        {/* More Menu Drawer Trigger */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
          aria-label="More navigation options"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

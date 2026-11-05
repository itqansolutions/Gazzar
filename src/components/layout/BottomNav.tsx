"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
  const myProfileHref = user?.id ? `/clients/${user.id}` : "/dashboard";

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
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card/95 dark:bg-[#121620]/95 backdrop-blur-md border-t border-line dark:border-[#1a1f2e] text-muted h-16 px-2 safe-area-pb shadow-2xl transition-colors duration-200">
      <div className="flex items-center justify-around h-full">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group min-w-[44px] min-h-[44px]"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-brand/35 group-active:scale-95 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-red-600 dark:text-red-500 mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-control text-[10px] font-medium transition-colors min-w-[48px] min-h-[44px] ${
                isActive ? "text-red-600 dark:text-red-500 font-bold" : "text-muted hover:text-fg"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-red-600 dark:text-red-500" : "text-muted"}`} />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}

        {/* More Menu Drawer Trigger */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-control text-[10px] font-medium text-muted hover:text-fg cursor-pointer focus:outline-none min-w-[48px] min-h-[44px]"
          aria-label="More navigation options"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

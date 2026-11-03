"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/db";
import { UserRole } from "@/types";
import GXLogo from "@/components/brand/GXLogo";
import {
  Bell,
  Search,
  Shield,
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  Users,
  Activity,
  Dumbbell
} from "lucide-react";

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function Navbar({ onToggleSidebar, isSidebarOpen }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const roles: Record<UserRole, { title: string; color: string }> = {
    ADMIN: { title: "System Admin", color: "bg-red-600/20 text-red-400 border border-red-500/30" },
    HEAD_COACH: { title: "Head Coach", color: "bg-blue-600/20 text-blue-400 border border-blue-500/30" },
    COACH: { title: "Coach", color: "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" },
    CLIENT: { title: "Athlete", color: "bg-amber-600/20 text-amber-400 border border-amber-500/30" }
  };

  const currentRoleInfo = user?.role ? roles[user.role] : roles.ADMIN;

  const myClient = user ? db.getClients().find(c => c.userId === user.id) : null;
  const clientProfileLink = myClient ? `/clients/${myClient.id}` : "/dashboard";

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c0f17]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1a1f2e] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Left: Mobile hamburger & Official GX Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus:outline-none"
              aria-label="Toggle navigation drawer"
            >
              {isSidebarOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>

            <Link
              href="/dashboard"
              className="flex items-center space-x-2 group py-1 focus:outline-none"
              aria-label="GX Fitness Academy Dashboard"
            >
              {/* GX Crimson Red brand indicator */}
              <div className="hidden sm:flex w-2 h-8 rounded-full bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 opacity-90" />
              <GXLogo size="md" priority />
            </Link>
          </div>

          {/* Right Controls: Role, Theme, Notifications, User Menu */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* User Role Badge (Desktop only to prevent mobile crowding) */}
            <div
              className={`hidden md:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold select-none ${currentRoleInfo.color}`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{currentRoleInfo.title}</span>
            </div>

            {/* Search (matching reference circular button) */}
            <button
              type="button"
              className="p-2 sm:p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Notifications (matching reference circular bell with badge) */}
            <Link
              href="/dashboard"
              className="relative p-2 sm:p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-red-600 rounded-full ring-2 ring-white dark:ring-[#0c0f17]" />
            </Link>

            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-700" />
              )}
            </button>

            {/* User Account Menu with Dedicated Logout */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all cursor-pointer focus:outline-none"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                aria-label="User account menu"
              >
                <img
                  src={user?.avatar || "/coach_abdullah_portrait.png"}
                  alt={user?.name || "User"}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-red-600/40"
                />
                <span className="hidden sm:block text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                  {user?.name || "User"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  {/* Account Header */}
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1f2937]">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user?.email}
                    </p>
                    <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      <Shield className="w-3 h-3" />
                      <span>{currentRoleInfo.title}</span>
                    </div>
                  </div>

                  {/* Context Links */}
                  <div className="py-1">
                    {user?.role === "CLIENT" ? (
                      <>
                        <Link
                          href={clientProfileLink}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          <span>My Profile & Stats</span>
                        </Link>
                        <Link
                          href="/assignments"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        >
                          <Dumbbell className="w-4 h-4 text-slate-400" />
                          <span>My Workouts</span>
                        </Link>
                        <Link
                          href="/assessments"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        >
                          <Activity className="w-4 h-4 text-slate-400" />
                          <span>My Assessments</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        {(user?.role === "ADMIN" || user?.role === "HEAD_COACH") && (
                          <Link
                            href="/users"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                          >
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>User Management</span>
                          </Link>
                        )}
                        <Link
                          href="/settings"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>Settings</span>
                        </Link>
                      </>
                    )}
                  </div>

                  {/* Clearly Labeled, High-Visibility Logout Button */}
                  <div className="pt-1 mt-1 border-t border-slate-200 dark:border-[#1f2937]">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/db";
import { UserRole } from "@/types";
import {
  Globe,
  Bell,
  UserCheck,
  Shield,
  Dumbbell,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  User
} from "lucide-react";

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function Navbar({ onToggleSidebar, isSidebarOpen }: NavbarProps) {
  const { language, toggleLanguage, t, dir } = useLanguage();
  const { user, loginAsRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const roles: { role: UserRole; title: string; color: string }[] = [
    { role: "ADMIN", title: language === "ar" ? "مدير النظام" : "System Admin", color: "bg-purple-600" },
    { role: "HEAD_COACH", title: language === "ar" ? "كبير المدربين" : "Head Coach", color: "bg-blue-600" },
    { role: "COACH", title: language === "ar" ? "كابتن تدريب" : "Coach", color: "bg-emerald-600" },
    { role: "CLIENT", title: language === "ar" ? "مشترك / لاعب" : "Client Athlete", color: "bg-amber-600" }
  ];

  const currentRoleInfo = roles.find(r => r.role === user?.role) || roles[0];

  const myClient = user ? db.getClients().find(c => c.userId === user.id) : null;
  const clientProfileLink = myClient ? `/clients/${myClient.id}` : "/dashboard";

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile menu button & Brand */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link href="/dashboard" className="flex items-center space-x-3 rtl:space-x-reverse group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-lg leading-tight tracking-tight text-slate-900 dark:text-white">
                  {language === "ar" ? "أكاديمية الجزار" : "GAZZAR ACADEMY"}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {language === "ar" ? "نظام التدريب الاحترافي" : "Sports Coaching Platform"}
                </span>
              </div>
            </Link>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 rtl:space-x-reverse">
            {/* Quick Demo Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 ${currentRoleInfo.color}`}
                title={t("quickRoleSwitch")}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{currentRoleInfo.title}</span>
                <span className="sm:hidden">{user?.role}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {roleDropdownOpen && (
                <div
                  className="absolute top-full mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
                  style={{ [dir === "rtl" ? "left" : "right"]: 0 }}
                >
                  <div className="px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <span>{t("quickRoleSwitch")}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  {roles.map(r => (
                    <button
                      key={r.role}
                      onClick={() => {
                        loginAsRole(r.role);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-start px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${
                        user?.role === r.role ? "text-emerald-600 dark:text-emerald-400 font-bold bg-slate-100 dark:bg-slate-700/30" : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className={`w-2 h-2 rounded-full ${r.color}`} />
                        <span>{r.title}</span>
                      </span>
                      {user?.role === r.role && <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer"
              title={theme === "dark" ? "الوضع الفاتح" : "الوضع الليلي"}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-300" />
              )}
            </button>

            {/* Language Toggle AR / EN */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
              title="تغيير اللغة / Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold">{language === "ar" ? "EN" : "العربية"}</span>
            </button>

            {/* Notifications */}
            <Link
              href="/dashboard"
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </Link>

            {/* User Avatar & Menu */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 rtl:space-x-reverse p-1 rounded-full hover:ring-2 hover:ring-emerald-500/50 transition-all cursor-pointer"
              >
                <img
                  src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                  alt={user?.name || "User"}
                  className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute top-full mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
                  style={{ [dir === "rtl" ? "left" : "right"]: 0 }}
                >
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700/60">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  </div>

                  {user?.role === "CLIENT" ? (
                    <>
                      <Link
                        href={clientProfileLink}
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                      >
                        {language === "ar" ? "ملفي الشخصي والقياسات" : "My Profile & Stats"}
                      </Link>
                      <Link
                        href="/assessments"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                      >
                        {language === "ar" ? "تقييماتي البدنية" : "My Assessments"}
                      </Link>
                      <Link
                        href="/assignments"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                      >
                        {language === "ar" ? "جدول تماريني" : "My Workouts"}
                      </Link>
                    </>
                  ) : (
                    <>
                      {(user?.role === "ADMIN" || user?.role === "HEAD_COACH") && (
                        <Link
                          href="/users"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        >
                          {t("navUsers")}
                        </Link>
                      )}
                    </>
                  )}

                  <Link
                    href="/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                  >
                    {t("navSettings")}
                  </Link>

                  <button
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-start px-4 py-2 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-t border-slate-200 dark:border-slate-700/40 cursor-pointer"
                  >
                    {t("navLogout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

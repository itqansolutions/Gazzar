"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
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
  X,
  Globe,
  Tag,
  Image as ImageIcon,
  HelpCircle
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isClient = user?.role === "CLIENT";
  const myProfileHref = user?.id ? `/clients/${user.id}` : "/dashboard";

  // Athlete navigation (Unchanged routes; "My Workouts" label preserved)
  const clientNav = [
    { href: "/dashboard", label: t("navDashboard") || "Dashboard", icon: LayoutDashboard },
    { href: myProfileHref, label: t("navMyProfile") || "My Profile", icon: User },
    { href: "/assignments", label: t("navMyWorkouts") || "My Workouts", icon: Dumbbell },
    { href: "/calendar", label: t("navClasses") || "Classes", icon: Calendar },
    { href: "/nutrition", label: t("navNutrition") || "Nutrition", icon: Apple },
    { href: "/assessments", label: t("navAssessments") || "Assessments", icon: Activity },
    { href: "/memberships", label: t("navMemberships") || "Memberships", icon: CreditCard },
    { href: "/settings", label: t("navSettings") || "Settings", icon: Settings }
  ];

  // Staff Groups per Phase 3.5 specifications
  const libraryGroup = [
    { href: "/sports", label: t("navSports") || "Sports", icon: Trophy, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/exercises", label: t("navExercises") || "Exercises", icon: Layers, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/templates", label: t("navTemplates") || "Templates", icon: ClipboardList, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/programs", label: t("navPrograms") || "Programs", icon: BookOpen, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
  ];

  const planningGroup = [
    { href: "/assignments", label: t("navAssignments") || "Assignments", icon: Dumbbell, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/calendar", label: t("navClasses") || "Classes", icon: Calendar, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
  ];

  const athletesGroup = [
    { href: "/clients", label: t("navAthletes") || "Athletes", icon: Users, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/coaches", label: t("navCoaches") || "Coaches", icon: UserCheck, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/assessments", label: t("navFitnessAssessments") || "Fitness Assessments", icon: Activity, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/nutrition", label: t("navNutrition") || "Nutrition", icon: Apple, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
  ];

  const operationsGroup = [
    { href: "/attendance", label: t("navAttendance") || "Attendance", icon: CheckCircle2, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/memberships", label: t("navMemberships") || "Memberships", icon: CreditCard, roles: ["ADMIN", "HEAD_COACH", "COACH"] },
    { href: "/reports", label: t("navReports") || "Reports", icon: BarChart3, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
  ];

  const systemGroup = [
    { href: "/users", label: t("navUsers") || "Users", icon: Users, roles: ["ADMIN", "HEAD_COACH"] },
    { href: "/audit-logs", label: t("navAuditLogs") || "Audit Logs", icon: ShieldAlert, roles: ["ADMIN"] },
    { href: "/settings", label: t("navSettings") || "Settings", icon: Settings, roles: ["ADMIN", "HEAD_COACH", "COACH"] }
  ];

  const cmsGroup = [
    { href: "/admin-public", label: "CMS Overview", icon: Globe },
    { href: "/admin-public/packages", label: "Public Packages", icon: CreditCard },
    { href: "/admin-public/championships", label: "Championships", icon: Trophy },
    { href: "/admin-public/offers", label: "Offers", icon: Tag },
    { href: "/admin-public/coaches", label: "Public Coaches", icon: UserCheck },
    { href: "/admin-public/gallery", label: "Gallery & Media", icon: ImageIcon },
    { href: "/admin-public/settings", label: "Website Settings", icon: Settings }
  ];

  const renderNavItem = (item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }, isPrimary = false) => {
    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`flex items-center space-x-3 rtl:space-x-reverse px-3 ${
          isPrimary ? "h-10 text-sm font-semibold" : "h-9 text-xs font-medium"
        } rounded-control transition-all ${
          isActive
            ? "bg-red-600 text-white bg-brand text-brand-contrast shadow-md shadow-brand/20"
            : "text-muted hover:bg-raised hover:text-fg"
        }`}
      >
        <Icon className={`${isPrimary ? "w-5 h-5" : "w-4 h-4"} flex-shrink-0 ${isActive ? "text-white" : "text-muted"}`} />
        <span className="flex-1 truncate">{item.label}</span>
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      </Link>
    );
  };

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

        {/* Navigation Items Matching Phase 3.5 Grouping */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
          {isClient ? (
            <div className="space-y-1">
              {clientNav.map((item) => renderNavItem(item, true))}
            </div>
          ) : (
            <>
              {/* Dashboard */}
              <div className="space-y-1">
                {renderNavItem({ href: "/dashboard", label: t("navDashboard") || "Dashboard", icon: LayoutDashboard }, true)}
              </div>

              {/* Group 1: Library */}
              <div className="pt-2 border-t border-line dark:border-[#1a1f2e]/80">
                <p className="px-3 text-[10px] font-bold tracking-wider text-muted uppercase mb-1">
                  {t("navGroupLibrary") || "Library"}
                </p>
                <div className="space-y-0.5">
                  {libraryGroup
                    .filter((item) => !user || item.roles.includes(user.role))
                    .map((item) => renderNavItem(item))}
                </div>
              </div>

              {/* Group 2: Planning & Schedule */}
              <div className="pt-2 border-t border-line dark:border-[#1a1f2e]/80">
                <p className="px-3 text-[10px] font-bold tracking-wider text-muted uppercase mb-1">
                  {t("navGroupPlanning") || "Planning & Schedule"}
                </p>
                <div className="space-y-0.5">
                  {planningGroup
                    .filter((item) => !user || item.roles.includes(user.role))
                    .map((item) => renderNavItem(item))}
                </div>
              </div>

              {/* Group 3: Athletes & Staff */}
              <div className="pt-2 border-t border-line dark:border-[#1a1f2e]/80">
                <p className="px-3 text-[10px] font-bold tracking-wider text-muted uppercase mb-1">
                  {t("navGroupAthletes") || "Athletes & Staff"}
                </p>
                <div className="space-y-0.5">
                  {athletesGroup
                    .filter((item) => !user || item.roles.includes(user.role))
                    .map((item) => renderNavItem(item))}
                </div>
              </div>

              {/* Group 4: Operations */}
              <div className="pt-2 border-t border-line dark:border-[#1a1f2e]/80">
                <p className="px-3 text-[10px] font-bold tracking-wider text-muted uppercase mb-1">
                  {t("navGroupOperations") || "Operations"}
                </p>
                <div className="space-y-0.5">
                  {operationsGroup
                    .filter((item) => !user || item.roles.includes(user.role))
                    .map((item) => renderNavItem(item))}
                </div>
              </div>

              {/* Group 5: System & Management */}
              <div className="pt-2 border-t border-line dark:border-[#1a1f2e]/80">
                <p className="px-3 text-[10px] font-bold tracking-wider text-muted uppercase mb-1">
                  {t("navGroupSystem") || "System & Management"}
                </p>
                <div className="space-y-0.5">
                  {systemGroup
                    .filter((item) => !user || item.roles.includes(user.role))
                    .map((item) => renderNavItem(item))}
                </div>
              </div>

              {/* Group 6: Website CMS (ADMIN & HEAD_COACH only) */}
              {(user?.role === "ADMIN" || user?.role === "HEAD_COACH") && (
                <div className="pt-2 border-t border-line dark:border-[#1a1f2e]/80">
                  <div className="px-3 flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold tracking-wider text-brand uppercase">
                      {t("navGroupWebsite") || "Website CMS"}
                    </p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold uppercase">
                      Public
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {cmsGroup.map((item) => renderNavItem(item))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Footer with Help and Logout */}
        <div className="p-3 border-t border-line dark:border-[#1a1f2e] bg-raised/40 space-y-2">
          {/* In-app Help link */}
          <Link
            href="/help"
            onClick={onClose}
            className={`w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-3 h-9 rounded-control text-xs font-semibold transition-all cursor-pointer ${
              pathname === "/help"
                ? "bg-brand text-brand-contrast shadow-sm"
                : "text-muted hover:text-fg hover:bg-raised"
            }`}
          >
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            <span>{t("navHelp") || "Help & Guide"}</span>
          </Link>

          {/* Accessible Red Logout Button */}
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-3 h-10 rounded-control text-xs font-bold text-brand hover:bg-brand-soft border border-transparent hover:border-brand/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t("navLogout") || "Log out"}</span>
          </button>

          <div className="text-center text-[10px] text-muted select-none pt-0.5">
            Powered & Designed by{" "}
            <a
              href="https://itqansolutions.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-fg hover:text-brand transition-colors"
            >
              Itqan Solutions
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

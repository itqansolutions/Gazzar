"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import {
  HelpCircle,
  Search,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Dumbbell,
  BookOpen,
  Calendar,
  Users,
  Activity,
  Apple,
  CreditCard,
  Layers,
  ClipboardList,
  ShieldAlert,
  Globe,
  Settings,
  Image as ImageIcon,
  Compass,
  Info
} from "lucide-react";

interface WorkflowItem {
  id: number;
  taskEn: string;
  taskAr: string;
  sidebarLabel: string;
  url: string;
  model: string;
  group: string;
}

const WORKFLOW_DATA: WorkflowItem[] = [
  {
    id: 1,
    taskEn: "Assign a workout to an athlete for tomorrow",
    taskAr: "أريد تكليف رياضي بتمرين غداً",
    sidebarLabel: "Assignments",
    url: "/assignments",
    model: "ClientWorkoutAssignment",
    group: "Planning & Schedule"
  },
  {
    id: 2,
    taskEn: "Build a reusable workout blueprint (Supersets/Circuits)",
    taskAr: "أريد بناء قالب تمرين نموذجي بالمكتبة",
    sidebarLabel: "Templates",
    url: "/templates",
    model: "WorkoutTemplate, WorkoutBlock",
    group: "Library"
  },
  {
    id: 3,
    taskEn: "Create a multi-week periodized training roadmap",
    taskAr: "أريد تصميم برنامج تدريبي لعدة أسابيع",
    sidebarLabel: "Programs",
    url: "/programs",
    model: "TrainingProgram, ProgramWeek",
    group: "Library"
  },
  {
    id: 4,
    taskEn: "Enroll an athlete into a multi-week training program",
    taskAr: "أريد إلحاق لاعب ببرنامج تدريبي ممتد",
    sidebarLabel: "Programs / Assignments",
    url: "/assignments?mode=PROGRAM",
    model: "ProgramAssignment, bulk ClientWorkoutAssignment",
    group: "Planning & Schedule"
  },
  {
    id: 5,
    taskEn: "View list of all athletes, sports, and assigned coach",
    taskAr: "أريد استعراض قائمة الرياضيين والمدرب المسؤول",
    sidebarLabel: "Athletes",
    url: "/clients",
    model: "ClientProfile, ClientCoachAssignment",
    group: "Athletes & Staff"
  },
  {
    id: 6,
    taskEn: "Open an athlete's complete file (measurements, medical, photos)",
    taskAr: "أريد فتح الملف الشامل للاعب (القياسات، الموانع، الصور)",
    sidebarLabel: "Athletes → Select Row",
    url: "/clients",
    model: "ClientProfile (all 11 sub-tabs)",
    group: "Athletes & Staff"
  },
  {
    id: 7,
    taskEn: "Record an athlete's physical fitness test (pushups, VO2max)",
    taskAr: "أريد تسجيل اختبار اللياقة والقدرة البدنية",
    sidebarLabel: "Fitness Assessments",
    url: "/assessments",
    model: "ClientAssessment",
    group: "Athletes & Staff"
  },
  {
    id: 8,
    taskEn: "Record athlete scale weight, body fat %, and tape circumferences",
    taskAr: "أريد تسجيل وزن اللاعب ونسبة الدهون ومقاسات الجسم",
    sidebarLabel: "Athletes → Measurements Tab",
    url: "/clients",
    model: "ClientMeasurementHistory",
    group: "Athletes & Staff"
  },
  {
    id: 9,
    taskEn: "Upload private front/side/back progress photos",
    taskAr: "أريد رفع صور التطور البدني الخاصة باللاعب",
    sidebarLabel: "Athletes → Photos Tab",
    url: "/clients",
    model: "ClientProgressPhoto",
    group: "Athletes & Staff"
  },
  {
    id: 10,
    taskEn: "Configure check-in frequency (e.g. weigh-in every 7 days)",
    taskAr: "أريد تحديد مواعيد المتابعة الدورية للوزن والقياسات",
    sidebarLabel: "Athletes → Check-Ins Tab",
    url: "/clients",
    model: "AthleteCheckInSchedule",
    group: "Athletes & Staff"
  },
  {
    id: 11,
    taskEn: "Build a nutrition program or assign daily calories/macros",
    taskAr: "أريد إعداد خطة غذائية وتعيين السعرات والماكروز",
    sidebarLabel: "Nutrition",
    url: "/nutrition",
    model: "NutritionProgram, ClientNutritionAssignment",
    group: "Athletes & Staff"
  },
  {
    id: 12,
    taskEn: "Track athlete daily food intake and meal adherence",
    taskAr: "أريد متابعة التزام الرياضي بالوجبات اليومية",
    sidebarLabel: "Nutrition → Monitoring Tab",
    url: "/nutrition",
    model: "DailyNutritionLog",
    group: "Athletes & Staff"
  },
  {
    id: 13,
    taskEn: "Mark attendance for a scheduled training session",
    taskAr: "أريد تسجيل حضور وغياب الرياضيين في الحصة",
    sidebarLabel: "Attendance",
    url: "/attendance",
    model: "SessionAttendance",
    group: "Operations"
  },
  {
    id: 14,
    taskEn: "Add a new exercise to the academy exercise bank",
    taskAr: "أريد إضافة حركة أو تمرين جديد لدليل التمارين",
    sidebarLabel: "Exercises",
    url: "/exercises",
    model: "Exercise, ExerciseSport",
    group: "Library"
  },
  {
    id: 15,
    taskEn: "Add or manage academy sports (Boxing, Swimming, etc.)",
    taskAr: "أريد إدارة الرياضات المعتمدة بالأكاديمية",
    sidebarLabel: "Sports",
    url: "/sports",
    model: "Sport",
    group: "Library"
  },
  {
    id: 16,
    taskEn: "View the weekly schedule of classes/sessions",
    taskAr: "أريد استعراض جدول الحصص الأسبوعي",
    sidebarLabel: "Classes",
    url: "/calendar",
    model: "SessionCalendar",
    group: "Planning & Schedule"
  },
  {
    id: 17,
    taskEn: "Create a new user account (Coach, Admin) or send reset link",
    taskAr: "أريد إنشاء حساب جديد أو توليد رابط كلمة مرور",
    sidebarLabel: "Users",
    url: "/users",
    model: "User, CoachProfile, PasswordResetToken",
    group: "System & Management"
  },
  {
    id: 18,
    taskEn: "Edit public packages and pricing on the landing page",
    taskAr: "أريد تعديل باقات وأسعار الاشتراك على الموقع العام",
    sidebarLabel: "Public Packages",
    url: "/admin-public/packages",
    model: "PublicPackage",
    group: "Website CMS"
  },
  {
    id: 19,
    taskEn: "Upload gym gallery facility photos for the website",
    taskAr: "أريد رفع صور لمعرض صور الموقع العام",
    sidebarLabel: "Gallery & Media",
    url: "/admin-public/gallery",
    model: "GalleryImage",
    group: "Website CMS"
  },
  {
    id: 20,
    taskEn: "Inspect security logs of who created or modified data",
    taskAr: "أريد فحص سجل العمليات والرقابة الأمنية",
    sidebarLabel: "Audit Logs",
    url: "/audit-logs",
    model: "AuditLog",
    group: "System & Management"
  }
];

const ROUTE_MAPPING = [
  {
    label: "Assignments",
    section: "Planning & Schedule",
    url: "/assignments",
    explanation: "Previously labeled 'Workouts'. Manages daily scheduled workouts for athletes."
  },
  {
    label: "Classes",
    section: "Planning & Schedule",
    url: "/calendar",
    explanation: "Schedule view for group classes and 1-on-1 personal training sessions."
  },
  {
    label: "Athletes",
    section: "Athletes & Staff",
    url: "/clients",
    explanation: "Previously labeled 'Members'. Complete athlete roster and profiles."
  },
  {
    label: "Fitness Assessments",
    section: "Athletes & Staff",
    url: "/assessments",
    explanation: "Previously labeled 'Assessments'. Physical tests (pushups, VO2max), distinct from workouts."
  },
  {
    label: "Templates",
    section: "Library",
    url: "/templates",
    explanation: "Moved to Library group. Reusable workout blueprints with singles, supersets, and circuits."
  },
  {
    label: "Gallery & Media",
    section: "Website CMS",
    url: "/admin-public/gallery",
    explanation: "Restored to the CMS sidebar group. Manages public facility and event gallery media."
  }
];

export default function HelpPage() {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ALL");

  const isRtl = language === "ar";

  const filteredWorkflows = WORKFLOW_DATA.filter((item) => {
    const matchesSearch =
      item.taskEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.taskAr.includes(searchTerm) ||
      item.sidebarLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === "ALL" || item.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const uniqueGroups = ["ALL", "Library", "Planning & Schedule", "Athletes & Staff", "Operations", "System & Management", "Website CMS"];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-3 rtl:space-x-reverse">
            <span className="p-2.5 rounded-2xl bg-brand-crimson/15 text-brand-crimson">
              <Compass className="w-6 h-6" />
            </span>
            <span>Help & Navigation Guide / دليل الاستخدام والتنقل</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Quick reference guide for academy administrators and coaches. Find the exact screen to accomplish any workflow and understand where your data is stored.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1a1f2e] shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks in English or Arabic (e.g. assign workout, قياسات, photos)..."
            className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {uniqueGroups.map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedGroup === grp
                  ? "bg-brand-crimson text-white shadow-md shadow-brand-crimson/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {grp}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Cheat Sheet Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Which Screen to Use for What / دليلك لتنفيذ المهام</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredWorkflows.length} tasks
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] shadow-sm">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">What I Want to Do (English)</th>
                <th className="py-3 px-4">ما أريد فعله (عربي)</th>
                <th className="py-3 px-4">Sidebar Click</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredWorkflows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-mono">{item.id}</td>
                  <td className="py-3 px-4 text-slate-900 dark:text-white font-semibold">
                    {item.taskEn}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300" dir="rtl">
                    {item.taskAr}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-brand-crimson/10 text-brand-crimson font-bold border border-brand-crimson/20">
                      {item.sidebarLabel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{item.group}</td>
                  <td className="py-3 px-4">
                    <Link
                      href={item.url}
                      className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-crimson hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-[11px] font-bold transition-all"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar Label Mapping Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
          <Info className="w-4 h-4 text-blue-500" />
          <span>Sidebar Labels vs. Real URLs / مطابقة مسميات القائمة مع الروابط</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROUTE_MAPPING.map((m) => (
            <div
              key={m.url}
              className="p-4 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-brand-crimson/15 text-brand-crimson">
                  {m.label}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{m.url}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {m.explanation}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-400">Section: {m.section}</span>
                <Link
                  href={m.url}
                  className="text-[11px] text-brand-crimson hover:underline font-bold flex items-center gap-1"
                >
                  <span>Go to screen</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Domain Boundaries Explainer */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
          <Activity className="w-4 h-4 text-brand-crimson" />
          <span>Physical Data Boundaries: Assessments vs. Measurements vs. Check-Ins</span>
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          To prevent data confusion, GX maintains distinct domain boundaries:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-extrabold text-brand-crimson block">1. Fitness Assessments</span>
            <p className="text-slate-500">
              Functional performance tests (push-ups, pull-ups, plank seconds, 1km running time, VO2max). No scale weight.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-extrabold text-blue-500 block">2. Body Measurements</span>
            <p className="text-slate-500">
              Anthropometrics and composition (scale weight, body fat %, muscle mass kg, waist, chest, arms circumferences).
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-extrabold text-emerald-500 block">3. Check-In Cadences & Photos</span>
            <p className="text-slate-500">
              Automated rules for recurring weigh-ins and private progress photos (front/side/back) saved in the athlete dossier.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

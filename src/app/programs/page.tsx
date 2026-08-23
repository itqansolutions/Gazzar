"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { TrainingProgram, ProgramWeek, ProgramDay, GoalType, Difficulty, WorkoutTemplate } from "@/types";
import {
  BookOpen,
  PlusCircle,
  Clock,
  Target,
  Dumbbell,
  CheckCircle,
  X,
  Sparkles,
  Edit2,
  Trash2,
  Send,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Zap,
  Coffee,
  AlertTriangle,
  Flame,
  Award
} from "lucide-react";

export default function ProgramsPage() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();

  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Notification Toast
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [deleteConfirmProgram, setDeleteConfirmProgram] = useState<TrainingProgram | null>(null);

  // Apply Program Modal
  const [applyProgram, setApplyProgram] = useState<TrainingProgram | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Form states
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(4); // Default 1 full month
  const [sportId, setSportId] = useState("sport-1");
  const [goalType, setGoalType] = useState<GoalType>("MUSCLE_GAIN");
  const [difficulty, setDifficulty] = useState<Difficulty>("INTERMEDIATE");

  // Multi-Week Builder State
  const [activeWeekTab, setActiveWeekTab] = useState(1);
  const [programWeeks, setProgramWeeks] = useState<ProgramWeek[]>([]);

  const dayNamesAr = ["السبت (Day 1)", "الأحد (Day 2)", "الاثنين (Day 3)", "الثلاثاء (Day 4)", "الأربعاء (Day 5)", "الخميس (Day 6)", "الجمعة (Day 7)"];
  const dayNamesEn = ["Saturday (Day 1)", "Sunday (Day 2)", "Monday (Day 3)", "Tuesday (Day 4)", "Wednesday (Day 5)", "Thursday (Day 6)", "Friday (Day 7)"];

  const loadData = () => {
    setPrograms(db.getPrograms());
    setTemplates(db.getTemplates());
    setSports(db.getSports());
    setClients(db.getClients());
  };

  useEffect(() => {
    loadData();
    const handleDbChange = () => loadData();
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Helper to initialize default weeks & days
  const generateInitialWeeks = (numWeeks: number): ProgramWeek[] => {
    const defaultTemplateId = templates[0]?.id || "";
    const weeks: ProgramWeek[] = [];

    for (let w = 1; w <= numWeeks; w++) {
      const days: ProgramDay[] = [];
      for (let d = 1; d <= 7; d++) {
        const isRest = d === 5 || d === 7; // e.g. Day 5 & 7 as rest
        days.push({
          id: `day-${w}-${d}-${Date.now()}`,
          weekId: `week-${w}`,
          dayNumber: d,
          titleAr: isRest ? "يوم راحة واستشفاء" : `حصة تدريبية - يوم ${d}`,
          titleEn: isRest ? "Rest & Recovery" : `Workout Session Day ${d}`,
          isRestDay: isRest,
          workouts: isRest || !defaultTemplateId ? [] : [
            {
              id: `pw-${w}-${d}-${Date.now()}`,
              dayId: `day-${w}-${d}`,
              templateId: defaultTemplateId,
              template: templates.find(t => t.id === defaultTemplateId)!,
              orderIndex: 1
            }
          ]
        });
      }

      weeks.push({
        id: `week-${w}-${Date.now()}`,
        programId: "",
        weekNumber: w,
        focusAr: `تركيز الأسبوع ${w}`,
        focusEn: `Week ${w} Focus`,
        days
      });
    }

    return weeks;
  };

  const openAddModal = () => {
    setTitleAr("");
    setTitleEn("");
    setDescriptionAr("");
    setDurationWeeks(4);
    setSportId(sports[0]?.id || "sport-1");
    setGoalType("MUSCLE_GAIN");
    setDifficulty("INTERMEDIATE");
    setActiveWeekTab(1);
    setProgramWeeks(generateInitialWeeks(4));
    setIsAddModalOpen(true);
  };

  // Duplicate Week 1 to all weeks in the program
  const handleDuplicateWeek1ToAll = () => {
    if (programWeeks.length === 0) return;
    const week1 = programWeeks[0];

    const updatedWeeks = programWeeks.map((week, idx) => {
      if (idx === 0) return week;
      return {
        ...week,
        focusAr: week1.focusAr,
        days: week1.days.map(d => ({
          ...d,
          id: `day-${week.weekNumber}-${d.dayNumber}-${Date.now()}`,
          weekId: week.id,
          workouts: d.workouts.map(pw => ({
            ...pw,
            id: `pw-${week.weekNumber}-${d.dayNumber}-${Date.now()}`
          }))
        }))
      };
    });

    setProgramWeeks(updatedWeeks);
    showNotification(language === "ar" ? "تم نسخ جدول الأسبوع الأول لجميع أسابيع الشهر بنجاح! ⚡" : "Week 1 schedule copied to all weeks!");
  };

  // Update a specific day in the current active week
  const handleUpdateDay = (dayIdx: number, updates: Partial<ProgramDay>, templateId?: string) => {
    const currentWeek = programWeeks[activeWeekTab - 1];
    if (!currentWeek) return;

    const updatedDays = [...currentWeek.days];
    const targetDay = { ...updatedDays[dayIdx], ...updates };

    if (templateId !== undefined) {
      if (targetDay.isRestDay || !templateId) {
        targetDay.workouts = [];
      } else {
        const foundTpl = templates.find(t => t.id === templateId);
        if (foundTpl) {
          targetDay.workouts = [
            {
              id: `pw-${activeWeekTab}-${dayIdx + 1}-${Date.now()}`,
              dayId: targetDay.id,
              templateId: foundTpl.id,
              template: foundTpl,
              orderIndex: 1
            }
          ];
        }
      }
    }

    updatedDays[dayIdx] = targetDay;

    const updatedWeeks = [...programWeeks];
    updatedWeeks[activeWeekTab - 1] = {
      ...currentWeek,
      days: updatedDays
    };

    setProgramWeeks(updatedWeeks);
  };

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr) {
      showNotification("يرجى إدخال اسم البرنامج بالعربي", "error");
      return;
    }

    try {
      db.createProgram({
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || titleAr.trim(),
        descriptionAr: descriptionAr.trim() || "برنامج تدريبي شامل ومخصص",
        descriptionEn: descriptionAr.trim() || "Comprehensive custom training program",
        durationWeeks: Number(durationWeeks) || 4,
        sportId: sportId || sports[0]?.id || "sport-1",
        goalType,
        difficulty,
        isTemplate: true,
        weeks: programWeeks
      });

      loadData();
      setIsAddModalOpen(false);
      showNotification(language === "ar" ? "تم إنشاء البرنامج التدريبي وجدول الشهر بنجاح! ✓" : "Training program created successfully!");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء إنشاء البرنامج", "error");
    }
  };

  const openEditModal = (prog: TrainingProgram) => {
    setEditingProgram(prog);
    setTitleAr(prog.titleAr);
    setTitleEn(prog.titleEn);
    setDescriptionAr(prog.descriptionAr || "");
    setDurationWeeks(prog.durationWeeks || 4);
    setSportId(prog.sportId);
    setGoalType(prog.goalType);
    setDifficulty(prog.difficulty);
    setActiveWeekTab(1);
    setProgramWeeks(prog.weeks && prog.weeks.length > 0 ? prog.weeks : generateInitialWeeks(prog.durationWeeks || 4));
    setIsEditModalOpen(true);
  };

  const handleUpdateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;

    try {
      db.updateProgram(editingProgram.id, {
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || titleAr.trim(),
        descriptionAr: descriptionAr.trim(),
        durationWeeks: Number(durationWeeks) || 4,
        sportId,
        goalType,
        difficulty,
        weeks: programWeeks
      });

      loadData();
      setIsEditModalOpen(false);
      setEditingProgram(null);
      showNotification(language === "ar" ? "تم تحديث البرنامج التدريبي بنجاح! ✓" : "Program updated successfully!");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء التحديث", "error");
    }
  };

  const handleDeleteProgram = () => {
    if (!deleteConfirmProgram) return;
    try {
      db.deleteProgram(deleteConfirmProgram.id);
      setDeleteConfirmProgram(null);
      loadData();
      showNotification(language === "ar" ? "تم حذف البرنامج التدريبي" : "Program deleted");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء الحذف", "error");
    }
  };

  // --- Apply Full Month Program to Client ---
  const handleApplyProgramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyProgram || !selectedClientId) {
      showNotification("يرجى اختيار المشترك وتاريخ البدء", "error");
      return;
    }

    try {
      const assignedCount = db.applyProgramToClient(
        applyProgram.id,
        selectedClientId,
        startDate || new Date().toISOString().split("T")[0],
        user?.id || "user-admin"
      );

      setApplyProgram(null);
      loadData();
      showNotification(
        language === "ar"
          ? `تم تطبيق البرنامج لشهر كامل وتوزيع ${assignedCount} حصة تدريبية بنجاح! 🎯`
          : `Full program applied! Scheduled ${assignedCount} workouts for client!`
      );
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء تطبيق البرنامج", "error");
    }
  };

  const getGoalBadge = (g: GoalType) => {
    switch (g) {
      case "MUSCLE_GAIN":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{language === "ar" ? "بناء عضلات" : "Hypertrophy"}</span>;
      case "WEIGHT_LOSS":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{language === "ar" ? "خسارة وزن" : "Weight Loss"}</span>;
      case "STRENGTH":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">{language === "ar" ? "زيادة قوة" : "Strength"}</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">{language === "ar" ? "لياقة عامة" : "Fitness"}</span>;
    }
  };

  const getDifficultyBadge = (d: Difficulty) => {
    switch (d) {
      case "BEGINNER":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{language === "ar" ? "مبتدئ" : "Beginner"}</span>;
      case "INTERMEDIATE":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">{language === "ar" ? "متوسط" : "Intermediate"}</span>;
      case "ADVANCED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40">{language === "ar" ? "متقدم" : "Advanced"}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 end-5 z-50 flex items-center space-x-2.5 rtl:space-x-reverse px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30"
              : "bg-red-600 text-white border-red-500 shadow-red-600/30"
          }`}
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <BookOpen className="w-6 h-6 text-emerald-500" />
            <span>{t("navPrograms")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {programs.length} {language === "ar" ? "برنامج معتمد" : "programs"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "تصميم البرامج التدريبية الممتدة لعدة أسابيع، تحديد جدول كل يوم، وتطبيق شهر كامل للمتدرب بضغطة واحدة"
              : "Design multi-week training programs, configure daily workout schedules, and apply 1-month programs to athletes in 1 click"}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{language === "ar" ? "إنشاء برنامج تدريبي جديد +" : "Create Training Program +"}</span>
        </button>
      </div>

      {/* Programs Cards Grid */}
      {programs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === "ar" ? "لا توجد برامج تدريبية مسجلة حالياً" : "No training programs yet"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {language === "ar"
                ? "ابدأ بتصميم أول برنامج تدريبي شامل لمدة شهر (4 أسابيع) أو أكثر، وحدد جدول أيام الأسبوع وتطبيقها للمتدربين دفعة واحدة."
                : "Create multi-week programs and assign whole-month schedules to athletes effortlessly."}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all inline-flex items-center space-x-2 rtl:space-x-reverse cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === "ar" ? "إنشاء أول برنامج تدريبي الآن" : "Create First Program"}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map(prog => {
            const isExpanded = expandedId === prog.id;
            const totalWorkouts = (prog.weeks || []).reduce(
              (acc, w) => acc + (w.days || []).reduce((dAcc, d) => dAcc + (d.workouts?.length || 0), 0),
              0
            );

            return (
              <div
                key={prog.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-all"
              >
                {/* Program Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : prog.id)}
                  className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg shadow-emerald-500/20">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{prog.titleAr}</h3>
                        {getGoalBadge(prog.goalType)}
                        {getDifficultyBadge(prog.difficulty)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{prog.titleEn}</p>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs text-slate-600 dark:text-slate-300 mt-1">
                        <span className="flex items-center space-x-1 rtl:space-x-reverse font-bold text-emerald-600 dark:text-emerald-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{prog.durationWeeks} {language === "ar" ? "أسابيع تدريبية" : "weeks"}</span>
                        </span>
                        <span>•</span>
                        <span>{totalWorkouts} {language === "ar" ? "حصة تدريبية مجدولة" : "scheduled sessions"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions on Card */}
                  <div className="flex items-center space-x-2 rtl:space-x-reverse" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setApplyProgram(prog);
                        if (clients.length > 0) setSelectedClientId(clients[0].id);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer scale-100 hover:scale-105"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{language === "ar" ? "تطبيق البرنامج للمتدرب 🎯" : "Apply Program to Client 🎯"}</span>
                    </button>

                    <button
                      onClick={() => openEditModal(prog)}
                      title={language === "ar" ? "تعديل البرنامج" : "Edit program"}
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmProgram(prog)}
                      title={language === "ar" ? "حذف البرنامج" : "Delete program"}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : prog.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Multi-Week Schedule View */}
                {isExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 pt-2">
                      {language === "ar" ? "تفاصيل الجدول الزمني للبرنامج عبر الأسابيع:" : "Weekly schedule breakdown:"}
                    </p>

                    <div className="space-y-3">
                      {(prog.weeks || []).map(week => (
                        <div key={week.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              الأسبوع #{week.weekNumber} - {week.focusAr || "جدول تدريبي مكثف"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {(week.days || []).filter(d => !d.isRestDay).length} أيام تدريب / {(week.days || []).filter(d => d.isRestDay).length} أيام راحة
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                            {(week.days || []).map((day, dIdx) => (
                              <div
                                key={day.id || dIdx}
                                className={`p-3 rounded-xl border text-xs space-y-1.5 flex flex-col justify-between ${
                                  day.isRestDay
                                    ? "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-400"
                                    : "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/20 text-slate-900 dark:text-white"
                                }`}
                              >
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                                    {language === "ar" ? dayNamesAr[dIdx] : dayNamesEn[dIdx]}
                                  </span>
                                  <p className="font-bold text-xs mt-0.5 line-clamp-1">
                                    {day.isRestDay ? "راحة واستشفاء 💤" : (day.titleAr || "حصة تدريب")}
                                  </p>
                                </div>

                                {!day.isRestDay && day.workouts && day.workouts.length > 0 && (
                                  <div className="pt-1 border-t border-emerald-200/50 dark:border-emerald-500/20">
                                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block truncate">
                                      {day.workouts[0]?.template?.titleAr || "قالب تمرين"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- CREATE / EDIT PROGRAM MODAL --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  <span>{isAddModalOpen ? "تصميم برنامج تدريبي شامل وجدول الشهر" : "تعديل البرنامج التدريبي"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  حدد بيانات البرنامج، ثم حدد القوالب التدريبية لكل يوم من أيام الأسابيع
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isAddModalOpen ? handleCreateProgram : handleUpdateProgram} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم البرنامج بالعربي *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. برنامج كمال الأجسام والتضخيم - شهر 1"
                    value={titleAr}
                    onChange={e => setTitleAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الاسم بالإنجليزي</label>
                  <input
                    type="text"
                    placeholder="e.g. Hypertrophy Mastery - Month 1"
                    value={titleEn}
                    onChange={e => setTitleEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المدة بالأسابيع</label>
                  <select
                    value={durationWeeks}
                    onChange={e => {
                      const num = Number(e.target.value);
                      setDurationWeeks(num);
                      setProgramWeeks(generateInitialWeeks(num));
                      setActiveWeekTab(1);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                  >
                    <option value={4}>4 أسابيع (شهر كامل 🗓️)</option>
                    <option value={8}>8 أسابيع (شهران)</option>
                    <option value={12}>12 أسبوع (3 أشهر)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">هدف البرنامج</label>
                  <select
                    value={goalType}
                    onChange={e => setGoalType(e.target.value as GoalType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="MUSCLE_GAIN">بناء عضلات (Hypertrophy)</option>
                    <option value="WEIGHT_LOSS">خسارة وزن (Weight Loss)</option>
                    <option value="STRENGTH">زيادة القوة (Strength)</option>
                    <option value="GENERAL_FITNESS">لياقة وتحمل عام</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">مستوى الصعوبة</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">مبتدئ</option>
                    <option value="INTERMEDIATE">متوسط</option>
                    <option value="ADVANCED">متقدم</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">وصف البرنامج وإرشادات المشترك</label>
                <textarea
                  rows={2}
                  placeholder="إرشادات عامة للمتدرب بخصوص الالتزام، التغذية، وأيام الراحة..."
                  value={descriptionAr}
                  onChange={e => setDescriptionAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* --- MULTI-WEEK & DAILY SCHEDULE BUILDER --- */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>جدول أيام الأسبوع وتوزيع التمارين</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      حدد قالب التمرين لكل يوم، أو حدده كـ يوم راحة واستشفاء
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDuplicateWeek1ToAll}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer self-start sm:self-auto"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ جدول الأسبوع 1 لكل الأسابيع ⚡</span>
                  </button>
                </div>

                {/* Week Tabs */}
                <div className="flex space-x-2 rtl:space-x-reverse overflow-x-auto pb-1">
                  {programWeeks.map((week, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveWeekTab(idx + 1)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeWeekTab === idx + 1
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      الأسبوع #{idx + 1}
                    </button>
                  ))}
                </div>

                {/* Days Configuration in Active Week */}
                {programWeeks[activeWeekTab - 1] && (
                  <div className="space-y-2.5 pt-1">
                    {programWeeks[activeWeekTab - 1].days.map((day, dayIdx) => {
                      const curTemplateId = day.workouts?.[0]?.templateId || "";

                      return (
                        <div
                          key={day.id || dayIdx}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            day.isRestDay
                              ? "bg-slate-100/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xs"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {dayIdx + 1}
                              </span>
                              <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {language === "ar" ? dayNamesAr[dayIdx] : dayNamesEn[dayIdx]}
                                </span>
                                <input
                                  type="text"
                                  placeholder="عنوان الحصة (e.g. صدر وتراي / راحة)"
                                  value={day.titleAr}
                                  onChange={e => handleUpdateDay(dayIdx, { titleAr: e.target.value })}
                                  className="block mt-0.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white w-48"
                                />
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                              {/* Rest Day Checkbox */}
                              <label className="flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={day.isRestDay}
                                  onChange={e => {
                                    const isRest = e.target.checked;
                                    handleUpdateDay(
                                      dayIdx,
                                      {
                                        isRestDay: isRest,
                                        titleAr: isRest ? "يوم راحة واستشفاء" : `حصة تدريبية - يوم ${dayIdx + 1}`
                                      },
                                      isRest ? "" : (templates[0]?.id || "")
                                    );
                                  }}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                />
                                <span>يوم راحة واستشفاء 💤</span>
                              </label>

                              {/* Workout Template Select */}
                              {!day.isRestDay && (
                                <div className="min-w-[200px]">
                                  {templates.length === 0 ? (
                                    <span className="text-[11px] text-amber-500">لا توجد قوالب! أضف قالب من شاشة القوالب.</span>
                                  ) : (
                                    <select
                                      value={curTemplateId || templates[0]?.id}
                                      onChange={e => handleUpdateDay(dayIdx, {}, e.target.value)}
                                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                                    >
                                      {templates.map(tpl => (
                                        <option key={tpl.id} value={tpl.id}>
                                          🏋️ {tpl.titleAr} ({tpl.exercises?.length || 0} تمارين)
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  {isAddModalOpen ? "حفظ البرنامج وجدول الشهر ✓" : "تحديث البرنامج ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- APPLY FULL MONTH PROGRAM TO CLIENT MODAL --- */}
      {applyProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Send className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === "ar" ? "تطبيق البرنامج التدريبي للمتدرب (شهر كامل)" : "Apply Program to Athlete"}
                </h3>
              </div>
              <button onClick={() => setApplyProgram(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyProgramSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 text-xs space-y-1.5">
                <p className="font-bold text-emerald-800 dark:text-emerald-300">البرنامج المختار للتطبيق:</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{applyProgram.titleAr}</p>
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-slate-600 dark:text-slate-300 pt-1">
                  <span>🗓️ المدة: <strong>{applyProgram.durationWeeks} أسابيع</strong></span>
                  <span>•</span>
                  <span>🏋️ الحصص: <strong>{(applyProgram.weeks || []).reduce((acc, w) => acc + (w.days || []).filter(d => !d.isRestDay).length, 0)} يوم تدريب</strong></span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اختر المشترك *</label>
                {clients.length === 0 ? (
                  <p className="text-xs text-red-500 font-bold">لا يوجد مشتركون مسجلون حالياً. أضف مشتركين أولاً من شاشة المشتركين.</p>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                  >
                    <option value="">-- اضغط لاختيار المتدرب --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name} ({c.sport?.nameAr || "متدرب"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ بدء البرنامج *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  💡 سيتم توزيع وتوليد جميع حصص الشهر بالكامل تلقائياً في تقويم المتدرب ابتداءً من هذا التاريخ.
                </p>
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setApplyProgram(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!selectedClientId}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 cursor-pointer"
                >
                  تأكيد تطبيق البرنامج لشهر كامل 🎯
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {deleteConfirmProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">تأكيد حذف البرنامج</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                هل أنت متأكد من حذف البرنامج التدريبي "{deleteConfirmProgram.titleAr}"؟
              </p>
            </div>
            <div className="flex justify-center space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProgram(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteProgram}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 cursor-pointer"
              >
                نعم، احذف البرنامج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

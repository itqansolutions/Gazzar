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

  const dayNamesAr = ["Saturday (Day 1)", "Sunday (Day 2)", "Monday (Day 3)", "Tuesday (Day 4)", "Wednesday (Day 5)", "Thursday (Day 6)", "Friday (Day 7)"];
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
    window.addEventListener("gx_db_change", handleDbChange);
    return () => window.removeEventListener("gx_db_change", handleDbChange);
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
          titleAr: isRest ? "Rest & Recovery" : `Workout Session Day ${d}`,
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
        focusAr: `Week ${w} Focus`,
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
    showNotification("Week 1 schedule copied to all weeks successfully! ⚡");
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
      showNotification("Please enter program title", "error");
      return;
    }

    try {
      db.createProgram({
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || titleAr.trim(),
        descriptionAr: descriptionAr.trim() || "Comprehensive custom training program",
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
      showNotification("Training program created successfully! ✓");
    } catch (err: any) {
      showNotification(err.message || "An error occurred while creating the program", "error");
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
      showNotification("Program updated successfully! ✓");
    } catch (err: any) {
      showNotification(err.message || "An error occurred while updating the program", "error");
    }
  };

  const handleDeleteProgram = () => {
    if (!deleteConfirmProgram) return;
    try {
      db.deleteProgram(deleteConfirmProgram.id);
      setDeleteConfirmProgram(null);
      loadData();
      showNotification("Program deleted successfully");
    } catch (err: any) {
      showNotification(err.message || "An error occurred while deleting the program", "error");
    }
  };

  // --- Apply Full Month Program to Client ---
  const handleApplyProgramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyProgram || !selectedClientId) {
      showNotification("Please select a client and start date", "error");
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
      showNotification(`Program applied for a full month with ${assignedCount} workouts scheduled! 🎯`);
    } catch (err: any) {
      showNotification(err.message || "An error occurred while applying the program", "error");
    }
  };

  const getGoalBadge = (g: GoalType) => {
    switch (g) {
      case "MUSCLE_GAIN":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30">Muscle Gain</span>;
      case "WEIGHT_LOSS":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Weight Loss</span>;
      case "STRENGTH":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Strength</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Fitness</span>;
    }
  };

  const getDifficultyBadge = (d: Difficulty) => {
    switch (d) {
      case "BEGINNER":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Beginner</span>;
      case "INTERMEDIATE":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">Intermediate</span>;
      case "ADVANCED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40">Advanced</span>;
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
              ? "bg-brand-crimson text-white border-brand-crimson shadow-[0_0_20px_rgba(240,20,37,0.38)]"
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
            <BookOpen className="w-6 h-6 text-brand-crimson" />
            <span>{t("navPrograms")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {programs.length} programs
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Design multi-week training programs, configure daily workout schedules, and apply 1-month programs to athletes in 1 click
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Training Program +</span>
        </button>
      </div>

      {/* Programs Cards Grid */}
      {programs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No training programs yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Start designing your first multi-week program (4 weeks or more), set the daily schedule, and apply to clients easily.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all inline-flex items-center space-x-2 rtl:space-x-reverse cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Program</span>
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
                    <div className="w-12 h-12 rounded-2xl bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg shadow-[0_0_15px_rgba(240,20,37,0.3)]">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{prog.titleEn || prog.titleAr}</h3>
                        {getGoalBadge(prog.goalType)}
                        {getDifficultyBadge(prog.difficulty)}
                      </div>
                      {prog.titleEn && prog.titleAr && prog.titleEn !== prog.titleAr && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{prog.titleAr}</p>
                      )}
                      <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs text-slate-600 dark:text-slate-300 mt-1">
                        <span className="flex items-center space-x-1 rtl:space-x-reverse font-bold text-brand-crimson">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{prog.durationWeeks} weeks</span>
                        </span>
                        <span>•</span>
                        <span>{totalWorkouts} scheduled sessions</span>
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
                      className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer scale-100 hover:scale-105"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Apply Program to Client 🎯</span>
                    </button>

                    <button
                      onClick={() => openEditModal(prog)}
                      title="Edit program"
                      className="p-2 rounded-xl text-slate-400 hover:text-brand-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmProgram(prog)}
                      title="Delete program"
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
                      Weekly schedule breakdown:
                    </p>

                    <div className="space-y-3">
                      {(prog.weeks || []).map(week => (
                        <div key={week.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-xs font-bold text-brand-crimson">
                              Week #{week.weekNumber} - {week.focusEn || week.focusAr || "Intensive Training Schedule"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {(week.days || []).filter(d => !d.isRestDay).length} workout days / {(week.days || []).filter(d => d.isRestDay).length} rest days
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                            {(week.days || []).map((day, dIdx) => (
                              <div
                                key={day.id || dIdx}
                                className={`p-3 rounded-xl border text-xs space-y-1.5 flex flex-col justify-between ${
                                  day.isRestDay
                                    ? "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-400"
                                    : "bg-[#141416] border-[#26262A] dark:border-brand-crimson/30 text-slate-900 dark:text-white"
                                }`}
                              >
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                                    {dayNamesEn[dIdx]}
                                  </span>
                                  <p className="font-bold text-xs mt-0.5 line-clamp-1">
                                    {day.isRestDay ? "Rest & Recovery 💤" : (day.titleEn || day.titleAr || "Workout Session")}
                                  </p>
                                </div>

                                {!day.isRestDay && day.workouts && day.workouts.length > 0 && (
                                  <div className="pt-1 border-t border-[#26262A]/50 dark:border-brand-crimson/30">
                                    <span className="text-[10px] text-brand-crimson dark:text-brand-crimson font-bold block truncate">
                                      {day.workouts[0]?.template?.titleEn || day.workouts[0]?.template?.titleAr || "Workout Template"}
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
                  <BookOpen className="w-5 h-5 text-brand-crimson" />
                  <span>{isAddModalOpen ? "Design Training Program & Schedule" : "Edit Training Program"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure program info, then select workout templates or rest days for each week
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Program Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muscle Building & Hypertrophy - Month 1"
                    value={titleAr}
                    onChange={e => setTitleAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">English Title / Subtitle</label>
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration (Weeks)</label>
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
                    <option value={4}>4 Weeks (Full Month 🗓️)</option>
                    <option value={8}>8 Weeks (2 Months)</option>
                    <option value={12}>12 Weeks (3 Months)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Program Goal</label>
                  <select
                    value={goalType}
                    onChange={e => setGoalType(e.target.value as GoalType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="MUSCLE_GAIN">Muscle Gain (Hypertrophy)</option>
                    <option value="WEIGHT_LOSS">Weight Loss</option>
                    <option value="STRENGTH">Strength</option>
                    <option value="GENERAL_FITNESS">General Fitness</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description & Guidelines</label>
                <textarea
                  rows={2}
                  placeholder="General instructions for the athlete regarding consistency, nutrition, and rest..."
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
                      <Sparkles className="w-4 h-4 text-brand-crimson" />
                      <span>Weekly Schedule & Workout Distribution</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select workout template for each day, or mark as rest day
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDuplicateWeek1ToAll}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer self-start sm:self-auto"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Week 1 Schedule to All Weeks ⚡</span>
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
                          ? "bg-brand-crimson text-white shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      Week #{idx + 1}
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
                              <span className="w-6 h-6 rounded-lg bg-brand-crimson/15 text-brand-crimson font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {dayIdx + 1}
                              </span>
                              <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {dayNamesEn[dayIdx]}
                                </span>
                                <input
                                  type="text"
                                  placeholder="Session title (e.g. Chest & Triceps / Rest)"
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
                                        titleAr: isRest ? "Rest & Recovery" : `Workout Session Day ${dayIdx + 1}`
                                      },
                                      isRest ? "" : (templates[0]?.id || "")
                                    );
                                  }}
                                  className="rounded border-slate-300 text-brand-crimson focus:ring-brand-crimson w-4 h-4"
                                />
                                <span>Rest & Recovery 💤</span>
                              </label>

                              {/* Workout Template Select */}
                              {!day.isRestDay && (
                                <div className="min-w-[200px]">
                                  {templates.length === 0 ? (
                                    <span className="text-[11px] text-amber-500">No templates found! Add templates from the Templates screen.</span>
                                  ) : (
                                    <select
                                      value={curTemplateId || templates[0]?.id}
                                      onChange={e => handleUpdateDay(dayIdx, {}, e.target.value)}
                                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                                    >
                                      {templates.map(tpl => (
                                        <option key={tpl.id} value={tpl.id}>
                                          🏋️ {tpl.titleEn || tpl.titleAr} ({tpl.exercises?.length || 0} exercises)
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
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] cursor-pointer"
                >
                  {isAddModalOpen ? "Save Program & Schedule ✓" : "Update Program ✓"}
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
                <Send className="w-5 h-5 text-brand-crimson" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Apply Program to Athlete (Full Month)
                </h3>
              </div>
              <button onClick={() => setApplyProgram(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyProgramSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#141416] border border-[#26262A] dark:border-brand-crimson/30 text-xs space-y-1.5">
                <p className="font-bold text-white dark:text-brand-crimson">Selected Program:</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{applyProgram.titleEn || applyProgram.titleAr}</p>
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-slate-600 dark:text-slate-300 pt-1">
                  <span>🗓️ Duration: <strong>{applyProgram.durationWeeks} weeks</strong></span>
                  <span>•</span>
                  <span>🏋️ Sessions: <strong>{(applyProgram.weeks || []).reduce((acc, w) => acc + (w.days || []).filter(d => !d.isRestDay).length, 0)} workout days</strong></span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Client *</label>
                {clients.length === 0 ? (
                  <p className="text-xs text-red-500 font-bold">No registered clients found. Please add clients first from the Clients screen.</p>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                  >
                    <option value="">-- Click to select client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name} ({c.sport?.nameEn || c.sport?.nameAr || "Athlete"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Program Start Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  💡 All monthly sessions will be automatically scheduled in the client's calendar starting from this date.
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
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50 cursor-pointer"
                >
                  Confirm Full Month Program 🎯
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Delete Program</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete the program "{deleteConfirmProgram.titleEn || deleteConfirmProgram.titleAr}"?
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
                Yes, Delete Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

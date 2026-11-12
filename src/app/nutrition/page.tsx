"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  NutritionProgram,
  ClientNutritionAssignment,
  DailyNutritionLog,
  ClientProfile,
  CoachProfile,
  NutritionMeal,
  NutritionFoodItem,
  LoggedMeal,
  LoggedFoodItem
} from "@/types";
import {
  Apple,
  Flame,
  Droplets,
  PlusCircle,
  CheckCircle,
  Edit2,
  Trash2,
  X,
  Target,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  Info
} from "lucide-react";
import { getCairoDateKey, addCalendarDaysKey, toCalendarDateKey } from "@/lib/date-utils";

export default function NutritionPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isClient = user?.role === "CLIENT";

  // Sub-tabs for staff
  const [activeTab, setActiveTab] = useState<"library" | "assignments" | "monitoring">("library");

  // Selected date for athlete daily tracking
  const [selectedDate, setSelectedDate] = useState<string>(() => getCairoDateKey());

  // Data state
  const [libraryPrograms, setLibraryPrograms] = useState<NutritionProgram[]>([]);
  const [assignments, setAssignments] = useState<ClientNutritionAssignment[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [activeAthletePlan, setActiveAthletePlan] = useState<ClientNutritionAssignment | null>(null);
  const [todayLog, setTodayLog] = useState<DailyNutritionLog | null>(null);
  const [athleteHistoryLogs, setAthleteHistoryLogs] = useState<DailyNutritionLog[]>([]);
  const [adherenceData, setAdherenceData] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  // Filters for staff
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryActiveOnly, setLibraryActiveOnly] = useState(true);
  const [assignmentFilterClient, setAssignmentFilterClient] = useState("ALL");
  const [assignmentFilterMode, setAssignmentFilterMode] = useState("ALL");
  const [monitoringClientId, setMonitoringClientId] = useState("");

  // Library Program Builder Modal
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programTitle, setProgramTitle] = useState("");
  const [programDesc, setProgramDesc] = useState("");
  const [programGoal, setProgramGoal] = useState<any>("GENERAL_FITNESS");
  const [programCalories, setProgramCalories] = useState<string>("");
  const [programProtein, setProgramProtein] = useState<string>("");
  const [programCarbs, setProgramCarbs] = useState<string>("");
  const [programFats, setProgramFats] = useState<string>("");
  const [programWater, setProgramWater] = useState<string>("");
  const [programNotes, setProgramNotes] = useState("");
  const [builderMeals, setBuilderMeals] = useState<NutritionMeal[]>([]);

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignClientId, setAssignClientId] = useState("");
  const [assignProgramId, setAssignProgramId] = useState("");
  const [assignMode, setAssignMode] = useState<"MANUAL" | "CUSTOM_OVERRIDE">("MANUAL");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignStartDate, setAssignStartDate] = useState(getCairoDateKey());
  const [assignCalories, setAssignCalories] = useState<string>("");
  const [assignProtein, setAssignProtein] = useState<string>("");
  const [assignCarbs, setAssignCarbs] = useState<string>("");
  const [assignFats, setAssignFats] = useState<string>("");
  const [assignWater, setAssignWater] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState("");

  // Athlete Daily Log Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFats, setManualFats] = useState("");
  const [waterIntake, setWaterIntake] = useState(0);
  const [clientLogNotes, setClientLogNotes] = useState("");
  const [loggedMealsDraft, setLoggedMealsDraft] = useState<LoggedMeal[]>([]);

  // Coach Feedback Modal
  const [feedbackLogId, setFeedbackLogId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (isClient) {
        // Load athlete's active plan, daily log for selected date, and recent history
        const [assignRes, logRes, historyRes, adhRes] = await Promise.all([
          fetch("/api/nutrition/assignments").then((r) => r.json()),
          fetch(`/api/nutrition/daily-logs?date=${selectedDate}`).then((r) => r.json()),
          fetch("/api/nutrition/daily-logs?limit=14").then((r) => r.json()),
          fetch("/api/nutrition/daily-logs?action=ADHERENCE").then((r) => r.json())
        ]);

        if (assignRes.success && Array.isArray(assignRes.data)) {
          setAssignments(assignRes.data);
          const active = assignRes.data.find((a: any) => a.isActive) || assignRes.data[0] || null;
          setActiveAthletePlan(active);
        }
        if (logRes.success) {
          setTodayLog(logRes.data || null);
          if (logRes.data) {
            setWaterIntake(logRes.data.waterLiters || 0);
          } else {
            setWaterIntake(0);
          }
        }
        if (historyRes.success && Array.isArray(historyRes.data)) {
          setAthleteHistoryLogs(historyRes.data);
        }
        if (adhRes.success && adhRes.data) {
          setAdherenceData(adhRes.data);
        }
      } else {
        // Staff view: load library programs, assignments, clients, coaches
        const [libRes, assignRes, clientsRes, coachesRes] = await Promise.all([
          fetch("/api/nutrition-programs").then((r) => r.json()),
          fetch("/api/nutrition/assignments").then((r) => r.json()),
          fetch("/api/clients").then((r) => r.json()),
          fetch("/api/coaches").then((r) => r.json())
        ]);

        if (libRes.success && Array.isArray(libRes.data)) {
          setLibraryPrograms(libRes.data);
        }
        if (assignRes.success && Array.isArray(assignRes.data)) {
          setAssignments(assignRes.data);
        }
        if (clientsRes.success && Array.isArray(clientsRes.data)) {
          setClients(clientsRes.data);
          if (clientsRes.data.length > 0 && !monitoringClientId) {
            setMonitoringClientId(clientsRes.data[0].id);
            setAssignClientId(clientsRes.data[0].id);
          }
        }
        if (coachesRes.success && Array.isArray(coachesRes.data)) {
          setCoaches(coachesRes.data);
        }
      }
    } catch (err) {
      console.error("[NutritionPage] Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, isClient, selectedDate]);

  // Load monitoring athlete data when monitoringClientId changes
  useEffect(() => {
    if (!isClient && monitoringClientId) {
      Promise.all([
        fetch(`/api/nutrition/daily-logs?clientId=${monitoringClientId}&action=ADHERENCE`).then((r) => r.json()),
        fetch(`/api/nutrition/daily-logs?clientId=${monitoringClientId}&limit=14`).then((r) => r.json())
      ]).then(([adhRes, logsRes]) => {
        if (adhRes.success) setAdherenceData(adhRes.data);
        if (logsRes.success && Array.isArray(logsRes.data)) setAthleteHistoryLogs(logsRes.data);
      });
    }
  }, [monitoringClientId, isClient]);

  /* ================= LIBRARY CRUD HANDLERS ================= */

  const openProgramModal = (prog?: NutritionProgram) => {
    if (prog) {
      setEditingProgramId(prog.id);
      setProgramTitle(prog.title);
      setProgramDesc(prog.description || "");
      setProgramGoal(prog.goalType || "GENERAL_FITNESS");
      setProgramCalories(prog.dailyCalories ? String(prog.dailyCalories) : "");
      setProgramProtein(prog.proteinGrams ? String(prog.proteinGrams) : "");
      setProgramCarbs(prog.carbsGrams ? String(prog.carbsGrams) : "");
      setProgramFats(prog.fatsGrams ? String(prog.fatsGrams) : "");
      setProgramWater(prog.waterLiters ? String(prog.waterLiters) : "");
      setProgramNotes(prog.notes || "");
      if (Array.isArray(prog.mealsJson)) {
        setBuilderMeals(prog.mealsJson as any);
      } else {
        setBuilderMeals([]);
      }
    } else {
      setEditingProgramId(null);
      setProgramTitle("");
      setProgramDesc("");
      setProgramGoal("GENERAL_FITNESS");
      setProgramCalories("");
      setProgramProtein("");
      setProgramCarbs("");
      setProgramFats("");
      setProgramWater("");
      setProgramNotes("");
      setBuilderMeals([
        {
          id: `meal-${Date.now()}-1`,
          mealName: "Breakfast",
          mealTime: "08:00",
          instructions: "Oats with protein shake and banana",
          foodItems: [
            { id: `food-1`, nameEn: "Rolled Oats", servingSize: 80, servingUnit: "g", quantity: 1, calories: 300, proteinGrams: 10, carbsGrams: 54, fatsGrams: 5 },
            { id: `food-2`, nameEn: "Whey Protein", servingSize: 30, servingUnit: "g", quantity: 1, calories: 120, proteinGrams: 24, carbsGrams: 2, fatsGrams: 1 }
          ]
        },
        {
          id: `meal-${Date.now()}-2`,
          mealName: "Lunch",
          mealTime: "13:30",
          instructions: "Grilled chicken with basmati rice and fresh salad",
          foodItems: [
            { id: `food-3`, nameEn: "Grilled Chicken Breast", servingSize: 200, servingUnit: "g", quantity: 1, calories: 330, proteinGrams: 62, carbsGrams: 0, fatsGrams: 7 },
            { id: `food-4`, nameEn: "Cooked White Rice", servingSize: 150, servingUnit: "g", quantity: 1, calories: 195, proteinGrams: 4, carbsGrams: 42, fatsGrams: 0.5 }
          ]
        }
      ]);
    }
    setIsProgramModalOpen(true);
  };

  const handleAddMeal = () => {
    setBuilderMeals((prev) => [
      ...prev,
      {
        id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mealName: `Meal ${prev.length + 1}`,
        mealTime: "12:00",
        instructions: "",
        foodItems: []
      }
    ]);
  };

  const handleAddFoodItem = (mealIdx: number) => {
    setBuilderMeals((prev) => {
      const next = [...prev];
      next[mealIdx].foodItems.push({
        id: `food-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nameEn: "Food Item",
        servingSize: 100,
        servingUnit: "g",
        quantity: 1,
        calories: 100,
        proteinGrams: 10,
        carbsGrams: 10,
        fatsGrams: 2
      });
      return next;
    });
  };

  const handleAutoSumTargets = () => {
    let cal = 0;
    let pro = 0;
    let carb = 0;
    let fat = 0;
    for (const m of builderMeals) {
      for (const item of m.foodItems) {
        const q = item.quantity || 1;
        cal += (item.calories || 0) * q;
        pro += (item.proteinGrams || 0) * q;
        carb += (item.carbsGrams || 0) * q;
        fat += (item.fatsGrams || 0) * q;
      }
    }
    setProgramCalories(String(Math.round(cal)));
    setProgramProtein(String(Math.round(pro)));
    setProgramCarbs(String(Math.round(carb)));
    setProgramFats(String(Math.round(fat)));
    showToast("Targets auto-calculated from meals!");
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programTitle.trim()) {
      alert("Program title is required");
      return;
    }

    try {
      const payload = {
        title: programTitle.trim(),
        description: programDesc.trim() || null,
        goalType: programGoal,
        dailyCalories: programCalories ? Number(programCalories) : null,
        proteinGrams: programProtein ? Number(programProtein) : null,
        carbsGrams: programCarbs ? Number(programCarbs) : null,
        fatsGrams: programFats ? Number(programFats) : null,
        waterLiters: programWater ? Number(programWater) : null,
        notes: programNotes.trim() || null,
        mealsJson: builderMeals
      };

      const url = editingProgramId ? `/api/nutrition-programs/${editingProgramId}` : "/api/nutrition-programs";
      const method = editingProgramId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.error || "Failed to save nutrition program");
        return;
      }

      setIsProgramModalOpen(false);
      await loadData();
      showToast(editingProgramId ? "Nutrition program updated" : "Nutrition program created");
    } catch (err: any) {
      alert(err?.message || "Error saving program");
    }
  };

  const handleDeleteProgram = async (prog: NutritionProgram) => {
    if (!confirm(`Are you sure you want to delete "${prog.title}"?`)) return;
    try {
      const res = await fetch(`/api/nutrition-programs/${prog.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to delete program. It may be linked to athlete assignments.");
        return;
      }
      await loadData();
      showToast("Program deleted successfully");
    } catch (err: any) {
      alert(err?.message || "Error deleting program");
    }
  };

  const handleArchiveProgram = async (prog: NutritionProgram) => {
    try {
      const res = await fetch(`/api/nutrition-programs/${prog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !prog.isActive })
      });
      if (res.ok) {
        await loadData();
        showToast(prog.isActive ? "Program archived" : "Program reactivated");
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= ASSIGNMENT HANDLERS ================= */

  const openAssignModal = (preselectedProg?: NutritionProgram) => {
    if (preselectedProg) {
      setAssignProgramId(preselectedProg.id);
      setAssignTitle(preselectedProg.title);
      setAssignCalories(preselectedProg.dailyCalories ? String(preselectedProg.dailyCalories) : "");
      setAssignProtein(preselectedProg.proteinGrams ? String(preselectedProg.proteinGrams) : "");
      setAssignCarbs(preselectedProg.carbsGrams ? String(preselectedProg.carbsGrams) : "");
      setAssignFats(preselectedProg.fatsGrams ? String(preselectedProg.fatsGrams) : "");
      setAssignWater(preselectedProg.waterLiters ? String(preselectedProg.waterLiters) : "");
      setAssignNotes(preselectedProg.notes || "");
    } else {
      setAssignProgramId(libraryPrograms[0]?.id || "");
      setAssignTitle(libraryPrograms[0]?.title || "");
    }
    setAssignStartDate(getCairoDateKey());
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignClientId) {
      alert("Please select an athlete");
      return;
    }

    try {
      const payload: any = {
        clientId: assignClientId,
        nutritionProgramId: assignProgramId || null,
        mode: assignMode,
        title: assignTitle.trim() || undefined,
        startDate: assignStartDate,
        dailyCalories: assignCalories ? Number(assignCalories) : null,
        proteinGrams: assignProtein ? Number(assignProtein) : null,
        carbsGrams: assignCarbs ? Number(assignCarbs) : null,
        fatsGrams: assignFats ? Number(assignFats) : null,
        waterLiters: assignWater ? Number(assignWater) : null,
        notes: assignNotes.trim() || null,
        replaceActive: true
      };

      const res = await fetch("/api/nutrition/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to assign nutrition plan");
        return;
      }

      setIsAssignModalOpen(false);
      await loadData();
      showToast("Nutrition plan assigned to athlete!");
    } catch (err: any) {
      alert(err?.message || "Error assigning plan");
    }
  };

  /* ================= ATHLETE DAILY TRACKING HANDLERS ================= */

  const openLogModal = () => {
    if (todayLog) {
      setIsManualEntry(todayLog.isManualEntry);
      setManualCalories(String(todayLog.calories || ""));
      setManualProtein(String(todayLog.proteinGrams || ""));
      setManualCarbs(String(todayLog.carbsGrams || ""));
      setManualFats(String(todayLog.fatsGrams || ""));
      setWaterIntake(todayLog.waterLiters || 0);
      setClientLogNotes(todayLog.clientNotes || "");
      if (Array.isArray(todayLog.loggedMealsJson)) {
        setLoggedMealsDraft(todayLog.loggedMealsJson as any);
      } else {
        setLoggedMealsDraft([]);
      }
    } else {
      setIsManualEntry(false);
      setManualCalories("");
      setManualProtein("");
      setManualCarbs("");
      setManualFats("");
      setClientLogNotes("");
      setLoggedMealsDraft([
        {
          id: `logged-meal-1`,
          mealName: "Breakfast",
          foodItems: [
            { id: `lfood-1`, foodName: "Oatmeal with whey", servingSize: 1, servingUnit: "bowl", quantity: 1, calories: 350, proteinGrams: 28, carbsGrams: 50, fatsGrams: 6 }
          ]
        }
      ]);
    }
    setIsLogModalOpen(true);
  };

  const handleSaveDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        date: selectedDate,
        isManualEntry,
        waterLiters: waterIntake,
        clientNotes: clientLogNotes.trim() || null
      };

      if (isManualEntry) {
        payload.calories = Number(manualCalories) || 0;
        payload.proteinGrams = Number(manualProtein) || 0;
        payload.carbsGrams = Number(manualCarbs) || 0;
        payload.fatsGrams = Number(manualFats) || 0;
      } else {
        payload.loggedMeals = loggedMealsDraft;
      }

      const res = await fetch("/api/nutrition/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to save daily nutrition log");
        return;
      }

      setIsLogModalOpen(false);
      await loadData();
      showToast("Daily nutrition log saved!");
    } catch (err: any) {
      alert(err?.message || "Error saving log");
    }
  };

  const handleQuickAddWater = async (liters: number) => {
    const nextWater = Math.round((waterIntake + liters) * 10) / 10;
    setWaterIntake(nextWater);

    try {
      await fetch("/api/nutrition/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          waterLiters: nextWater,
          isManualEntry: todayLog ? todayLog.isManualEntry : false,
          calories: todayLog?.calories || 0,
          proteinGrams: todayLog?.proteinGrams || 0,
          carbsGrams: todayLog?.carbsGrams || 0,
          fatsGrams: todayLog?.fatsGrams || 0,
          loggedMeals: todayLog?.loggedMealsJson || []
        })
      });
      await loadData();
      showToast(`+${liters}L water logged!`);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLibrary = useMemo(() => {
    return libraryPrograms.filter((p) => {
      if (libraryActiveOnly && !p.isActive) return false;
      if (librarySearch.trim()) {
        const q = librarySearch.trim().toLowerCase();
        return p.title.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [libraryPrograms, libraryActiveOnly, librarySearch]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (assignmentFilterClient !== "ALL" && a.clientId !== assignmentFilterClient) return false;
      if (assignmentFilterMode !== "ALL" && a.mode !== assignmentFilterMode) return false;
      return true;
    });
  }, [assignments, assignmentFilterClient, assignmentFilterMode]);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-2xl flex items-center space-x-2 rtl:space-x-reverse animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <span className="w-9 h-9 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center">
              <Apple className="w-5 h-5" />
            </span>
            <span>Nutrition & Daily Macro Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isClient
              ? "Track your daily meals, macros, water intake, and follow your assigned plan."
              : "Manage academy nutrition library, customize athlete overrides, and monitor daily macro adherence."}
          </p>
        </div>

        {/* Staff Action Buttons */}
        {!isClient && (
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              onClick={() => openAssignModal()}
              className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer shadow-sm"
            >
              <Target className="w-3.5 h-3.5 text-blue-500" />
              <span>Assign Plan</span>
            </button>
            <button
              onClick={() => openProgramModal()}
              className="px-4 py-2.5 rounded-2xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-extrabold flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Create Program</span>
            </button>
          </div>
        )}
      </div>

      {/* Staff Sub-Tabs Navigation */}
      {!isClient && (
        <div className="flex space-x-2 rtl:space-x-reverse border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("library")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "library"
                ? "bg-brand-crimson text-white shadow-md shadow-[0_0_15px_rgba(240,20,37,0.3)]"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Nutrition Library & Builder ({libraryPrograms.length})
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "assignments"
                ? "bg-brand-crimson text-white shadow-md shadow-[0_0_15px_rgba(240,20,37,0.3)]"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Athlete Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab("monitoring")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "monitoring"
                ? "bg-brand-crimson text-white shadow-md shadow-[0_0_15px_rgba(240,20,37,0.3)]"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Adherence & Daily Monitoring
          </button>
        </div>
      )}

      {/* ================= ATHLETE VIEW ================= */}
      {isClient && (
        <div className="space-y-6">
          {/* Date Selector Row */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <button
                onClick={() => setSelectedDate(addCalendarDaysKey(selectedDate, -1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                ← Prev
              </button>
              <div className="text-center px-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Tracking Date</span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono">
                  {selectedDate} {selectedDate === getCairoDateKey() ? "(Today)" : ""}
                </span>
              </div>
              <button
                onClick={() => setSelectedDate(addCalendarDaysKey(selectedDate, 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Next →
              </button>
            </div>

            <button
              onClick={openLogModal}
              className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-extrabold flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer shadow-md shadow-[0_0_15px_rgba(240,20,37,0.35)]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{todayLog ? "Update Day Log" : "Log Meals & Macros"}</span>
            </button>
          </div>

          {/* Daily Macros Rings / Progress Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Calories Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-center space-x-1">
                <Flame className="w-3 h-3 text-orange-500" />
                <span>Calories</span>
              </span>
              <div className="my-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {todayLog ? todayLog.calories : 0}
                </span>
                <span className="text-xs text-slate-400 block font-semibold">
                  / {activeAthletePlan?.dailyCalories || "—"} kcal
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, activeAthletePlan?.dailyCalories ? ((todayLog?.calories || 0) / activeAthletePlan.dailyCalories) * 100 : 0)}%`
                  }}
                />
              </div>
            </div>

            {/* Protein Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Protein</span>
              <div className="my-2">
                <span className="text-xl sm:text-2xl font-black text-brand-crimson">
                  {todayLog ? todayLog.proteinGrams : 0}g
                </span>
                <span className="text-xs text-slate-400 block font-semibold">
                  / {activeAthletePlan?.proteinGrams || "—"}g
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-crimson h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, activeAthletePlan?.proteinGrams ? ((todayLog?.proteinGrams || 0) / activeAthletePlan.proteinGrams) * 100 : 0)}%`
                  }}
                />
              </div>
            </div>

            {/* Carbs Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Carbs</span>
              <div className="my-2">
                <span className="text-xl sm:text-2xl font-black text-amber-500">
                  {todayLog ? todayLog.carbsGrams : 0}g
                </span>
                <span className="text-xs text-slate-400 block font-semibold">
                  / {activeAthletePlan?.carbsGrams || "—"}g
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, activeAthletePlan?.carbsGrams ? ((todayLog?.carbsGrams || 0) / activeAthletePlan.carbsGrams) * 100 : 0)}%`
                  }}
                />
              </div>
            </div>

            {/* Fats Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fats</span>
              <div className="my-2">
                <span className="text-xl sm:text-2xl font-black text-purple-500">
                  {todayLog ? todayLog.fatsGrams : 0}g
                </span>
                <span className="text-xs text-slate-400 block font-semibold">
                  / {activeAthletePlan?.fatsGrams || "—"}g
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, activeAthletePlan?.fatsGrams ? ((todayLog?.fatsGrams || 0) / activeAthletePlan.fatsGrams) * 100 : 0)}%`
                  }}
                />
              </div>
            </div>

            {/* Water Tracker Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-center space-x-1">
                <Droplets className="w-3 h-3 text-blue-500" />
                <span>Water</span>
              </span>
              <div className="my-2">
                <span className="text-xl sm:text-2xl font-black text-blue-500">
                  {todayLog ? todayLog.waterLiters : 0}L
                </span>
                <span className="text-xs text-slate-400 block font-semibold">
                  / {activeAthletePlan?.waterLiters || "—"}L
                </span>
              </div>
              <div className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse mt-2">
                <button
                  onClick={() => handleQuickAddWater(0.25)}
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                >
                  +250ml
                </button>
                <button
                  onClick={() => handleQuickAddWater(0.5)}
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                >
                  +500ml
                </button>
              </div>
            </div>
          </div>

          {/* Coach Feedback Banner if present on today's log */}
          {todayLog?.coachFeedback && (
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-900 dark:text-purple-200 flex items-start space-x-3 rtl:space-x-reverse">
              <MessageSquare className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block mb-0.5">Coach Review on Today&apos;s Nutrition:</span>
                <p>{todayLog.coachFeedback}</p>
              </div>
            </div>
          )}

          {/* Active Nutrition Plan Overview */}
          {activeAthletePlan ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                  <span className="w-8 h-8 rounded-xl bg-brand-crimson/10 text-brand-crimson flex items-center justify-center font-bold text-xs">
                    <Apple className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      My Plan: {activeAthletePlan.title}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      Assigned by {activeAthletePlan.coach?.user?.name || "GX Academy"} • Mode: {activeAthletePlan.mode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Meals list */}
              {Array.isArray(activeAthletePlan.mealsJson) && (activeAthletePlan.mealsJson as any[]).length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Planned Meals & Preparation Guide
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(activeAthletePlan.mealsJson as NutritionMeal[]).map((meal, mIdx) => (
                      <div
                        key={meal.id || mIdx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                            <Clock className="w-3.5 h-3.5 text-brand-crimson" />
                            <span>{meal.mealName} {meal.mealTime ? `(${meal.mealTime})` : ""}</span>
                          </span>
                        </div>

                        {meal.instructions && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            &quot;{meal.instructions}&quot;
                          </p>
                        )}

                        {meal.foodItems && meal.foodItems.length > 0 && (
                          <div className="space-y-1 pt-1">
                            {meal.foodItems.map((fi, fIdx) => (
                              <div
                                key={fi.id || fIdx}
                                className="flex items-center justify-between text-xs py-1 border-t border-slate-200/50 dark:border-slate-700/40"
                              >
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {fi.nameEn} ({fi.servingSize}{fi.servingUnit}) × {fi.quantity}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  {fi.calories ? `${fi.calories * fi.quantity} kcal` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                activeAthletePlan.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {activeAthletePlan.notes}
                  </p>
                )
              )}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No active nutrition plan currently assigned. Contact your coach to set up your plan.
            </div>
          )}

          {/* Past Nutrition Logs History */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Recent Nutrition Logs (Last 14 Days)
            </h3>
            {athleteHistoryLogs.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No past nutrition logs recorded.
              </div>
            ) : (
              <div className="space-y-2">
                {athleteHistoryLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse font-mono font-bold text-slate-900 dark:text-white">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{toCalendarDateKey(log.date)}</span>
                    </div>

                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <span><strong>{log.calories}</strong> kcal</span>
                      <span className="text-brand-crimson"><strong>{log.proteinGrams}g</strong> P</span>
                      <span className="text-amber-500"><strong>{log.carbsGrams}g</strong> C</span>
                      <span className="text-purple-500"><strong>{log.fatsGrams}g</strong> F</span>
                      <span className="text-blue-500"><strong>{log.waterLiters}L</strong> Water</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= STAFF VIEW: TAB 1 (LIBRARY) ================= */}
      {!isClient && activeTab === "library" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:right-3 top-2.5" />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search nutrition programs..."
                className="w-full text-xs pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
              />
            </div>
            <label className="flex items-center space-x-2 rtl:space-x-reverse text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={libraryActiveOnly}
                onChange={(e) => setLibraryActiveOnly(e.target.checked)}
                className="rounded accent-brand-crimson"
              />
              <span>Active Only</span>
            </label>
          </div>

          {/* Library Cards Grid */}
          {filteredLibrary.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs space-y-3">
              <Apple className="w-8 h-8 text-slate-400 mx-auto" />
              <p>No nutrition programs found matching filters.</p>
              <button
                onClick={() => openProgramModal()}
                className="px-4 py-2 rounded-xl bg-brand-crimson text-white text-xs font-bold"
              >
                + Create First Program
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLibrary.map((prog) => {
                const mealsCount = Array.isArray(prog.mealsJson) ? (prog.mealsJson as any[]).length : 0;

                return (
                  <div
                    key={prog.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                          {prog.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            prog.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                          }`}
                        >
                          {prog.isActive ? "ACTIVE" : "ARCHIVED"}
                        </span>
                      </div>

                      {prog.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {prog.description}
                        </p>
                      )}

                      {/* Macro Targets Row */}
                      <div className="grid grid-cols-4 gap-1 text-center text-xs py-2 border-y border-slate-100 dark:border-slate-800 font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Kcal</span>
                          <span className="font-bold text-slate-900 dark:text-white">{prog.dailyCalories || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-brand-crimson block">P (g)</span>
                          <span className="font-bold text-slate-900 dark:text-white">{prog.proteinGrams || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-500 block">C (g)</span>
                          <span className="font-bold text-slate-900 dark:text-white">{prog.carbsGrams || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-purple-500 block">F (g)</span>
                          <span className="font-bold text-slate-900 dark:text-white">{prog.fatsGrams || "—"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{mealsCount} structured meal(s)</span>
                        <span>{prog._count?.clientAssignments || 0} athlete(s)</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                        <button
                          onClick={() => openProgramModal(prog)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800"
                          title="Edit Program"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchiveProgram(prog)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 text-[11px] font-bold"
                          title={prog.isActive ? "Archive" : "Activate"}
                        >
                          {prog.isActive ? "Archive" : "Reactivate"}
                        </button>
                        <button
                          onClick={() => handleDeleteProgram(prog)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
                          title="Delete Program"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => openAssignModal(prog)}
                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold hover:bg-blue-500/20"
                      >
                        Assign →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= STAFF VIEW: TAB 2 (ASSIGNMENTS) ================= */}
      {!isClient && activeTab === "assignments" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="font-bold text-slate-500">Athlete:</span>
              <select
                value={assignmentFilterClient}
                onChange={(e) => setAssignmentFilterClient(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              >
                <option value="ALL">All Athletes</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="font-bold text-slate-500">Mode:</span>
              <select
                value={assignmentFilterMode}
                onChange={(e) => setAssignmentFilterMode(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              >
                <option value="ALL">All Modes</option>
                <option value="INHERITED">Inherited (Training Program)</option>
                <option value="OVERRIDE">Custom Override</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
          </div>

          {/* Assignments List */}
          {filteredAssignments.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No nutrition assignments found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {a.client?.user?.name || "Athlete"}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-xs text-brand-crimson">{a.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          a.mode === "INHERITED"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : a.mode === "CUSTOM_OVERRIDE"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {a.mode}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Starts {toCalendarDateKey(a.startDate)} • Target: {a.dailyCalories || "—"} kcal • {a.proteinGrams || "—"}g P • {a.waterLiters || "—"}L Water
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <button
                      onClick={() => {
                        setMonitoringClientId(a.clientId);
                        setActiveTab("monitoring");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                    >
                      View Adherence
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= STAFF VIEW: TAB 3 (MONITORING) ================= */}
      {!isClient && activeTab === "monitoring" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3 rtl:space-x-reverse text-xs">
            <span className="font-bold text-slate-500">Select Athlete:</span>
            <select
              value={monitoringClientId}
              onChange={(e) => setMonitoringClientId(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.user?.name}
                </option>
              ))}
            </select>
          </div>

          {adherenceData && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    7-Day Adherence Performance
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Logged {adherenceData.loggedDays} of {adherenceData.totalDays} days
                  </p>
                </div>
                <div className="text-end">
                  <span className="text-xs font-bold text-slate-400 block">Compliance</span>
                  <span className={`text-lg font-black ${
                    adherenceData.overallComplianceScore >= 80 ? "text-emerald-500" : "text-amber-500"
                  }`}>
                    {adherenceData.overallComplianceScore}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">Avg Calories</span>
                  <span className="font-black text-slate-900 dark:text-white">{adherenceData.avgCalories} kcal</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">Avg Protein</span>
                  <span className="font-black text-brand-crimson">{adherenceData.avgProtein}g</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">Avg Water</span>
                  <span className="font-black text-blue-500">{adherenceData.avgWater}L</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">Missing Days</span>
                  <span className="font-black text-amber-500">{adherenceData.missingLogDays.length}</span>
                </div>
              </div>

              {adherenceData.missingLogDays.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center space-x-2 rtl:space-x-reverse">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>Missing meal logs on: {adherenceData.missingLogDays.join(", ")}</span>
                </div>
              )}
            </div>
          )}

          {/* Historical logs with Coach Feedback */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Athlete Daily Logs & Coach Reviews
            </h4>

            {athleteHistoryLogs.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No logs recorded yet for this athlete.
              </div>
            ) : (
              athleteHistoryLogs.map((log) => {
                const dateKey = toCalendarDateKey(log.date);
                const isFeedbackOpen = feedbackLogId === log.id;

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                        {dateKey}
                      </span>
                      <button
                        onClick={() => {
                          setFeedbackLogId(isFeedbackOpen ? null : log.id);
                          setFeedbackText(log.coachFeedback || "");
                        }}
                        className="text-xs font-bold text-brand-crimson hover:underline cursor-pointer"
                      >
                        {log.coachFeedback ? "Edit Feedback" : "+ Coach Feedback"}
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] text-slate-400 block">Calories</span>
                        <span className="font-bold">{log.calories}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] text-slate-400 block">Protein</span>
                        <span className="font-bold text-brand-crimson">{log.proteinGrams}g</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] text-slate-400 block">Carbs</span>
                        <span className="font-bold text-amber-500">{log.carbsGrams}g</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] text-slate-400 block">Fats</span>
                        <span className="font-bold text-purple-500">{log.fatsGrams}g</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] text-slate-400 block">Water</span>
                        <span className="font-bold text-blue-500">{log.waterLiters}L</span>
                      </div>
                    </div>

                    {log.clientNotes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        Athlete: &quot;{log.clientNotes}&quot;
                      </p>
                    )}

                    {log.coachFeedback && !isFeedbackOpen && (
                      <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200">
                        <span className="font-bold block mb-0.5">Coach Guidance:</span>
                        {log.coachFeedback}
                      </div>
                    )}

                    {isFeedbackOpen && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Write guidance for athlete..."
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
                          rows={2}
                        />
                        <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                          <button
                            onClick={() => setFeedbackLogId(null)}
                            className="px-3 py-1 rounded-lg text-xs font-bold text-slate-400"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              setSavingFeedback(true);
                              try {
                                const res = await fetch(`/api/nutrition/daily-logs/${log.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "COACH_FEEDBACK", coachFeedback: feedbackText })
                                });
                                if (res.ok) {
                                  setFeedbackLogId(null);
                                  await loadData();
                                }
                              } finally {
                                setSavingFeedback(false);
                              }
                            }}
                            disabled={savingFeedback}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-brand-crimson text-white hover:bg-[#FF2D3B]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL 1: PROGRAM BUILDER ================= */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Apple className="w-5 h-5 text-brand-crimson" />
                <span>{editingProgramId ? "Edit Nutrition Program" : "Build Nutrition Program"}</span>
              </h3>
              <button onClick={() => setIsProgramModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Program Title *
                </label>
                <input
                  type="text"
                  value={programTitle}
                  onChange={(e) => setProgramTitle(e.target.value)}
                  placeholder="e.g. High Protein Hypertrophy Meal Plan"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description & Guidelines
                </label>
                <textarea
                  value={programDesc}
                  onChange={(e) => setProgramDesc(e.target.value)}
                  placeholder="Summary of meal timing, macros, and dietary guidance..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
                  rows={2}
                />
              </div>

              {/* Target Macros & Auto-Sum Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Daily Macro Targets (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoSumTargets}
                    className="text-[11px] font-bold text-brand-crimson hover:underline flex items-center space-x-1 rtl:space-x-reverse cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Sum from Meals</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Calories (kcal)</label>
                    <input
                      type="number"
                      value={programCalories}
                      onChange={(e) => setProgramCalories(e.target.value)}
                      placeholder="2400"
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={programProtein}
                      onChange={(e) => setProgramProtein(e.target.value)}
                      placeholder="180"
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={programCarbs}
                      onChange={(e) => setProgramCarbs(e.target.value)}
                      placeholder="250"
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Fats (g)</label>
                    <input
                      type="number"
                      value={programFats}
                      onChange={(e) => setProgramFats(e.target.value)}
                      placeholder="65"
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Water (L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={programWater}
                      onChange={(e) => setProgramWater(e.target.value)}
                      placeholder="3.5"
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Meals & Food Items Builder */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Meals & Food Items ({builderMeals.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddMeal}
                    className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    + Add Meal
                  </button>
                </div>

                <div className="space-y-3">
                  {builderMeals.map((meal, mIdx) => (
                    <div
                      key={meal.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={meal.mealName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBuilderMeals((prev) => {
                              const n = [...prev];
                              n[mIdx].mealName = val;
                              return n;
                            });
                          }}
                          className="font-bold text-xs bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none pb-0.5"
                          placeholder="Meal Name (e.g. Breakfast)"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setBuilderMeals((prev) => prev.filter((_, idx) => idx !== mIdx));
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={meal.instructions || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBuilderMeals((prev) => {
                            const n = [...prev];
                            n[mIdx].instructions = val;
                            return n;
                          });
                        }}
                        placeholder="Preparation instructions / timings..."
                        className="w-full text-[11px] p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                      />

                      {/* Food items inside this meal */}
                      <div className="space-y-2 pl-2">
                        {meal.foodItems.map((item, fIdx) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-12 gap-1.5 items-center text-xs bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800"
                          >
                            <input
                              type="text"
                              value={item.nameEn}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBuilderMeals((prev) => {
                                  const n = [...prev];
                                  n[mIdx].foodItems[fIdx].nameEn = val;
                                  return n;
                                });
                              }}
                              className="col-span-4 p-1 text-xs bg-transparent outline-none font-semibold"
                              placeholder="Food name"
                            />
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setBuilderMeals((prev) => {
                                  const n = [...prev];
                                  n[mIdx].foodItems[fIdx].quantity = val;
                                  return n;
                                });
                              }}
                              className="col-span-2 p-1 text-xs bg-transparent border-b border-slate-200 dark:border-slate-700 text-center"
                              placeholder="Qty"
                            />
                            <input
                              type="number"
                              value={item.calories || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setBuilderMeals((prev) => {
                                  const n = [...prev];
                                  n[mIdx].foodItems[fIdx].calories = val;
                                  return n;
                                });
                              }}
                              className="col-span-2 p-1 text-xs bg-transparent border-b border-slate-200 dark:border-slate-700 text-center"
                              placeholder="Kcal"
                            />
                            <input
                              type="number"
                              value={item.proteinGrams || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setBuilderMeals((prev) => {
                                  const n = [...prev];
                                  n[mIdx].foodItems[fIdx].proteinGrams = val;
                                  return n;
                                });
                              }}
                              className="col-span-2 p-1 text-xs bg-transparent border-b border-slate-200 dark:border-slate-700 text-center text-brand-crimson"
                              placeholder="Prot"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setBuilderMeals((prev) => {
                                  const n = [...prev];
                                  n[mIdx].foodItems = n[mIdx].foodItems.filter((_, idx) => idx !== fIdx);
                                  return n;
                                });
                              }}
                              className="col-span-2 text-slate-400 hover:text-red-500 text-center"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddFoodItem(mIdx)}
                          className="text-[11px] font-bold text-blue-500 hover:underline cursor-pointer"
                        >
                          + Add Food Item
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProgramModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-[0_0_15px_rgba(240,20,37,0.3)]"
                >
                  Save Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ASSIGN PLAN ================= */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Target className="w-5 h-5 text-blue-500" />
                <span>Assign Nutrition Plan to Athlete</span>
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Athlete *</label>
                <select
                  value={assignClientId}
                  onChange={(e) => setAssignClientId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.user?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assignment Mode</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAssignMode("MANUAL")}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                      assignMode === "MANUAL"
                        ? "bg-brand-crimson text-white border-brand-crimson"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Manual Library Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode("CUSTOM_OVERRIDE")}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                      assignMode === "CUSTOM_OVERRIDE"
                        ? "bg-brand-crimson text-white border-brand-crimson"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Custom Override Plan
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Base Library Program (Optional)
                </label>
                <select
                  value={assignProgramId}
                  onChange={(e) => {
                    setAssignProgramId(e.target.value);
                    const selected = libraryPrograms.find((p) => p.id === e.target.value);
                    if (selected) {
                      setAssignTitle(selected.title);
                      setAssignCalories(selected.dailyCalories ? String(selected.dailyCalories) : "");
                      setAssignProtein(selected.proteinGrams ? String(selected.proteinGrams) : "");
                      setAssignCarbs(selected.carbsGrams ? String(selected.carbsGrams) : "");
                      setAssignFats(selected.fatsGrams ? String(selected.fatsGrams) : "");
                      setAssignWater(selected.waterLiters ? String(selected.waterLiters) : "");
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                >
                  <option value="">-- Custom Athlete Plan --</option>
                  {libraryPrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Plan Title *</label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Calories</label>
                  <input
                    type="number"
                    value={assignCalories}
                    onChange={(e) => setAssignCalories(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={assignProtein}
                    onChange={(e) => setAssignProtein(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={assignCarbs}
                    onChange={(e) => setAssignCarbs(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Water (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={assignWater}
                    onChange={(e) => setAssignWater(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-[0_0_15px_rgba(240,20,37,0.3)]"
                >
                  Assign to Athlete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: ATHLETE LOG MEALS ================= */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Flame className="w-5 h-5 text-orange-500" />
                <span>Log Nutrition for {selectedDate}</span>
              </h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDailyLog} className="space-y-4">
              {/* Manual Entry Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Quick Manual Entry</span>
                  <span className="text-[10px] text-slate-400">Directly enter macro totals instead of food items</span>
                </div>
                <input
                  type="checkbox"
                  checked={isManualEntry}
                  onChange={(e) => setIsManualEntry(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-crimson"
                />
              </div>

              {isManualEntry ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Calories (kcal)</label>
                    <input
                      type="number"
                      value={manualCalories}
                      onChange={(e) => setManualCalories(e.target.value)}
                      placeholder="2100"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={manualProtein}
                      onChange={(e) => setManualProtein(e.target.value)}
                      placeholder="160"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={manualCarbs}
                      onChange={(e) => setManualCarbs(e.target.value)}
                      placeholder="220"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Fats (g)</label>
                    <input
                      type="number"
                      value={manualFats}
                      onChange={(e) => setManualFats(e.target.value)}
                      placeholder="60"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Logged Meals</span>
                  {loggedMealsDraft.map((meal, mIdx) => (
                    <div key={meal.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{meal.mealName}</span>
                      </div>
                      {meal.foodItems.map((fi, fIdx) => (
                        <div key={fi.id} className="grid grid-cols-12 gap-1.5 items-center text-xs">
                          <input
                            type="text"
                            value={fi.foodName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLoggedMealsDraft((prev) => {
                                const n = [...prev];
                                n[mIdx].foodItems[fIdx].foodName = val;
                                return n;
                              });
                            }}
                            className="col-span-5 p-1 bg-transparent border-b border-slate-300 dark:border-slate-700"
                            placeholder="Food name"
                          />
                          <input
                            type="number"
                            value={fi.calories || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setLoggedMealsDraft((prev) => {
                                const n = [...prev];
                                n[mIdx].foodItems[fIdx].calories = val;
                                return n;
                              });
                            }}
                            className="col-span-3 p-1 bg-transparent border-b border-slate-300 dark:border-slate-700 text-center"
                            placeholder="Kcal"
                          />
                          <input
                            type="number"
                            value={fi.proteinGrams || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setLoggedMealsDraft((prev) => {
                                const n = [...prev];
                                n[mIdx].foodItems[fIdx].proteinGrams = val;
                                return n;
                              });
                            }}
                            className="col-span-3 p-1 bg-transparent border-b border-slate-300 dark:border-slate-700 text-center text-brand-crimson"
                            placeholder="Prot"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Water Intake (Liters)</label>
                <input
                  type="number"
                  step="0.1"
                  value={waterIntake}
                  onChange={(e) => setWaterIntake(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Athlete Notes (Optional)</label>
                <textarea
                  value={clientLogNotes}
                  onChange={(e) => setClientLogNotes(e.target.value)}
                  placeholder="How was your energy and appetite today?"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-[0_0_15px_rgba(240,20,37,0.3)]"
                >
                  Save Daily Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

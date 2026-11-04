"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { MealPlan, ClientProfile } from "@/types";
import {
  Apple,
  Flame,
  Droplets,
  PlusCircle,
  Sparkles,
  Coffee,
  Sun,
  Moon,
  Cookie,
  User,
  CheckCircle,
  Edit2,
  Trash2,
  X,
  Target,
  ChevronDown,
  ChevronUp,
  Award
} from "lucide-react";

export default function NutritionPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const isClient = user?.role === "CLIENT";
  const myClient = isClient && user ? db.getClients().find(c => c.userId === user.id) : null;

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [waterGlasses, setWaterGlasses] = useState(6);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<MealPlan | null>(null);

  // Form states
  const [targetClientId, setTargetClientId] = useState("");
  const [title, setTitle] = useState("");
  const [dailyCalories, setDailyCalories] = useState(2400);
  const [proteinGrams, setProteinGrams] = useState(160);
  const [carbsGrams, setCarbsGrams] = useState(240);
  const [fatsGrams, setFatsGrams] = useState(65);
  const [waterLiters, setWaterLiters] = useState(3.5);
  const [breakfast, setBreakfast] = useState("4 egg whites + 1 whole egg + 80g oats with almond milk and banana");
  const [lunch, setLunch] = useState("200g grilled chicken breast + 150g steamed basmati rice + green salad with olive oil");
  const [dinner, setDinner] = useState("150g grilled fish fillet or tuna + baked sweet potato + steamed vegetables");
  const [snacks, setSnacks] = useState("1 scoop whey protein post workout + 30g raw almonds + green apple");
  const [notes, setNotes] = useState("Drink a glass of water 30 minutes before each meal, avoid refined sugars.");
  const [isActive, setIsActive] = useState(true);

  const loadData = () => {
    const allClients = db.getClients();
    setClients(allClients);

    if (isClient && myClient) {
      setMealPlans(db.getMealPlans(myClient.id));
    } else if (selectedClientId !== "ALL") {
      setMealPlans(db.getMealPlans(selectedClientId));
    } else {
      setMealPlans(db.getMealPlans());
    }
  };

  useEffect(() => {
    loadData();
    const handleDbChange = () => loadData();
    window.addEventListener("gx_db_change", handleDbChange);
    return () => window.removeEventListener("gx_db_change", handleDbChange);
  }, [isClient, myClient?.id, selectedClientId]);

  const openAddModal = () => {
    if (clients.length > 0) setTargetClientId(clients[0].id);
    setTitle("Balanced Nutrition & Meal Plan");
    setDailyCalories(2400);
    setProteinGrams(160);
    setCarbsGrams(240);
    setFatsGrams(65);
    setWaterLiters(3.5);
    setBreakfast("4 egg whites + 1 whole egg + 80g oats with almond milk and banana");
    setLunch("200g grilled chicken breast + 150g steamed basmati rice + green salad with olive oil");
    setDinner("150g grilled fish fillet or tuna + baked sweet potato + steamed vegetables");
    setSnacks("1 scoop whey protein post workout + 30g raw nuts + apple");
    setNotes("Adhere to meal timings and maintain adequate hydration.");
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClientId || !title) return;

    db.createMealPlan({
      clientId: targetClientId,
      coachId: user?.id || "user-coach-1",
      title,
      dailyCalories: Number(dailyCalories),
      proteinGrams: Number(proteinGrams),
      carbsGrams: Number(carbsGrams),
      fatsGrams: Number(fatsGrams),
      waterLiters: Number(waterLiters),
      breakfast,
      lunch,
      dinner,
      snacks,
      notes,
      isActive
    });

    setIsAddModalOpen(false);
    loadData();
  };

  const openEditModal = (plan: MealPlan) => {
    setEditingPlan(plan);
    setTargetClientId(plan.clientId);
    setTitle(plan.title);
    setDailyCalories(plan.dailyCalories);
    setProteinGrams(plan.proteinGrams);
    setCarbsGrams(plan.carbsGrams);
    setFatsGrams(plan.fatsGrams);
    setWaterLiters(plan.waterLiters);
    setBreakfast(plan.breakfast || "");
    setLunch(plan.lunch || "");
    setDinner(plan.dinner || "");
    setSnacks(plan.snacks || "");
    setNotes(plan.notes || "");
    setIsActive(plan.isActive);
    setIsEditModalOpen(true);
  };

  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    db.updateMealPlan(editingPlan.id, {
      clientId: targetClientId,
      title,
      dailyCalories: Number(dailyCalories),
      proteinGrams: Number(proteinGrams),
      carbsGrams: Number(carbsGrams),
      fatsGrams: Number(fatsGrams),
      waterLiters: Number(waterLiters),
      breakfast,
      lunch,
      dinner,
      snacks,
      notes,
      isActive
    });

    setIsEditModalOpen(false);
    setEditingPlan(null);
    loadData();
  };

  const handleToggleActive = (plan: MealPlan) => {
    db.updateMealPlan(plan.id, { isActive: !plan.isActive });
    loadData();
  };

  const handleDeletePlan = () => {
    if (!deleteConfirmPlan) return;
    db.deleteMealPlan(deleteConfirmPlan.id);
    setDeleteConfirmPlan(null);
    loadData();
  };

  // Active client plan (for Client Portal)
  const clientActivePlan = isClient ? (mealPlans.find(m => m.isActive) || mealPlans[0]) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Apple className="w-6 h-6 text-brand-crimson" />
            <span>{isClient ? "My Nutrition & Meal Plan" : t("navNutrition")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {mealPlans.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isClient
              ? "Your customized daily meals, macronutrient targets & hydration tracker"
              : "Design, manage and assign custom meal plans, calorie targets and macronutrients per client"}
          </p>
        </div>

        {!isClient && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all self-start sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Meal Plan +</span>
          </button>
        )}
      </div>

      {/* Filter by Client for Coach / Admin */}
      {!isClient && (
        <div className="flex items-center space-x-3 rtl:space-x-reverse bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl max-w-md shadow-sm">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Filter by client:</span>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
          >
            <option value="ALL">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.user?.name} ({c.sport?.nameEn || c.sport?.nameAr || "Client"})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* --- CLIENT PORTAL VIEW --- */}
      {isClient && (
        <div>
          {!clientActivePlan ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <Apple className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No active meal plan assigned yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Your coach or sports nutritionist will assign your customized nutrition plan soon.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Daily Macros Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                      <Sparkles className="w-5 h-5 text-brand-crimson" />
                      <span>{clientActivePlan.title}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Custom nutrition plan tailored for your goals
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30 self-start sm:self-auto">
                    ✓ Active Plan
                  </span>
                </div>

                {/* Macros Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Daily Calories</span>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{clientActivePlan.dailyCalories} <span className="text-xs font-normal text-slate-500">Kcal</span></p>
                  </div>

                  <div className="p-4 rounded-2xl bg-brand-crimson/15 border border-brand-crimson/30 space-y-1">
                    <span className="text-[11px] font-bold text-brand-crimson dark:text-brand-crimson">Protein</span>
                    <p className="text-2xl font-black text-brand-crimson">{clientActivePlan.proteinGrams} <span className="text-xs font-normal text-slate-500">g</span></p>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Carbohydrates</span>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{clientActivePlan.carbsGrams} <span className="text-xs font-normal text-slate-500">g</span></p>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">Healthy Fats</span>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{clientActivePlan.fatsGrams} <span className="text-xs font-normal text-slate-500">g</span></p>
                  </div>
                </div>

                {/* Hydration Tracker */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-slate-950 border border-blue-200 dark:border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <Droplets className="w-6 h-6 text-blue-500 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Daily Hydration Tracker ({clientActivePlan.waterLiters}L Target)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Logged {(waterGlasses * 0.35).toFixed(1)}L so far ({waterGlasses} glasses)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <button
                      onClick={() => setWaterGlasses(Math.max(0, waterGlasses - 1))}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-black text-sm text-blue-600 dark:text-blue-400 px-2">{waterGlasses} glasses</span>
                    <button
                      onClick={() => setWaterGlasses(waterGlasses + 1)}
                      className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Meals Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Breakfast */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <Coffee className="w-4 h-4" />
                    <span>Breakfast</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {clientActivePlan.breakfast}
                  </p>
                </div>

                {/* Lunch */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-brand-crimson font-bold text-xs">
                    <Sun className="w-4 h-4" />
                    <span>Lunch</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {clientActivePlan.lunch}
                  </p>
                </div>

                {/* Dinner */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    <Moon className="w-4 h-4" />
                    <span>Dinner</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {clientActivePlan.dinner}
                  </p>
                </div>

                {/* Snacks & Pre-workout */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-teal-600 dark:text-teal-400 font-bold text-xs">
                    <Cookie className="w-4 h-4" />
                    <span>Snacks & Pre-Workout</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {clientActivePlan.snacks}
                  </p>
                </div>
              </div>

              {clientActivePlan.notes && (
                <div className="p-4 rounded-2xl bg-[#141416] border border-[#26262A] dark:border-brand-crimson/30 text-xs text-slate-800 dark:text-slate-200">
                  <span className="font-bold text-brand-crimson dark:text-brand-crimson">💡 Nutritionist Guidance & Notes:</span> {clientActivePlan.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- COACH / ADMIN PORTAL VIEW --- */}
      {!isClient && (
        <div className="space-y-4">
          {mealPlans.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <Apple className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No meal plans registered yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Start by designing a customized meal plan for a client with calories, macros, and meals.
              </p>
              <button
                onClick={openAddModal}
                className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all inline-flex items-center space-x-2 rtl:space-x-reverse cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Meal Plan Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {mealPlans.map(plan => {
                const isExpanded = expandedPlanId === plan.id;
                const clientObj = plan.client || clients.find(c => c.id === plan.clientId);

                return (
                  <div
                    key={plan.id}
                    className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-all"
                  >
                    {/* Plan Header */}
                    <div
                      onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                      className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                        <div className="w-12 h-12 rounded-2xl bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg shadow-[0_0_15px_rgba(240,20,37,0.3)]">
                          <Apple className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.title}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              plan.isActive
                                ? "bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            }`}>
                              {plan.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              👤 Client: {clientObj?.user?.name || "Client"}
                            </span>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{plan.dailyCalories} Kcal</span>
                            <span>•</span>
                            <span>Protein: {plan.proteinGrams}g</span>
                            <span>•</span>
                            <span>Carbs: {plan.carbsGrams}g</span>
                            <span>•</span>
                            <span>Fats: {plan.fatsGrams}g</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 rtl:space-x-reverse" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleActive(plan)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            plan.isActive
                              ? "bg-brand-crimson text-white shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          {plan.isActive ? "Active Plan ✓" : "Set as Active 🎯"}
                        </button>

                        <button
                          onClick={() => openEditModal(plan)}
                          className="p-2 rounded-xl text-slate-400 hover:text-brand-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmPlan(plan)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Meals View */}
                    {isExpanded && (
                      <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1 rtl:space-x-reverse">
                              <Coffee className="w-3.5 h-3.5" />
                              <span>Breakfast:</span>
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{plan.breakfast || "Not specified"}</p>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                            <span className="font-bold text-brand-crimson flex items-center space-x-1 rtl:space-x-reverse">
                              <Sun className="w-3.5 h-3.5" />
                              <span>Main Lunch:</span>
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{plan.lunch || "Not specified"}</p>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1 rtl:space-x-reverse">
                              <Moon className="w-3.5 h-3.5" />
                              <span>Dinner:</span>
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{plan.dinner || "Not specified"}</p>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                            <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center space-x-1 rtl:space-x-reverse">
                              <Cookie className="w-3.5 h-3.5" />
                              <span>Snacks & Supplements:</span>
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{plan.snacks || "Not specified"}</p>
                          </div>
                        </div>

                        {plan.notes && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                            💡 <span className="font-bold">Notes:</span> {plan.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- CREATE / EDIT MEAL PLAN MODAL --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Apple className="w-5 h-5 text-brand-crimson" />
                <span>{isAddModalOpen ? "Design New Meal Plan" : "Edit Meal Plan"}</span>
              </h3>
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

            <form onSubmit={isAddModalOpen ? handleCreatePlan : handleUpdatePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Client *</label>
                  <select
                    value={targetClientId}
                    onChange={e => setTargetClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name} ({c.sport?.nameEn || c.sport?.nameAr || "Client"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Meal Plan Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lean Bulk Nutrition Plan - 2600 Kcal"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Macros Input */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Calories (Kcal)</label>
                  <input
                    type="number"
                    required
                    value={dailyCalories}
                    onChange={e => setDailyCalories(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    required
                    value={proteinGrams}
                    onChange={e => setProteinGrams(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    required
                    value={carbsGrams}
                    onChange={e => setCarbsGrams(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Fats (g)</label>
                  <input
                    type="number"
                    required
                    value={fatsGrams}
                    onChange={e => setFatsGrams(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Water (L)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={waterLiters}
                    onChange={e => setWaterLiters(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
              </div>

              {/* Meals Input */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">🍳 Breakfast Details</label>
                  <textarea
                    rows={2}
                    value={breakfast}
                    onChange={e => setBreakfast(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">🥗 Main Lunch Details</label>
                  <textarea
                    rows={2}
                    value={lunch}
                    onChange={e => setLunch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">🍲 Dinner Details</label>
                  <textarea
                    rows={2}
                    value={dinner}
                    onChange={e => setDinner(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">🥜 Snacks & Pre/Post Workout</label>
                  <textarea
                    rows={2}
                    value={snacks}
                    onChange={e => setSnacks(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">💡 General Guidance & Rules</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="rounded text-brand-crimson w-4 h-4"
                  />
                  <span>Set as active plan for this client currently ✓</span>
                </label>

                <div className="flex space-x-2 rtl:space-x-reverse">
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
                    {isAddModalOpen ? "Save & Assign Meal Plan ✓" : "Update Meal Plan ✓"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {deleteConfirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Meal Plan Deletion</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete meal plan "{deleteConfirmPlan.title}"?
              </p>
            </div>
            <div className="flex justify-center space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPlan(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeletePlan}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Yes, Delete Meal Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

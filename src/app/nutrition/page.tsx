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
  const [breakfast, setBreakfast] = useState("4 بياض بيض + 1 بيضة كاملة + 80جم شوفان مع حليب لوز وموزة");
  const [lunch, setLunch] = useState("200جم صدور دجاج مشوية + 150جم أرز بسمتي مسلوق + طبق سلطة خضراء وزيت زيتون");
  const [dinner, setDinner] = useState("150جم سمك فيليه مشوي أو تونة مصفاة + بطاطا حلوة مشوية + خضار سوتيه");
  const [snacks, setSnacks] = useState("سكوب واي بروتين بعد التمرين + 30جم لوز ني + تفاحة خضراء");
  const [notes, setNotes] = useState("شرب كوب ماء قبل كل وجبة بنصف ساعة، والابتعاد عن السكريات المكررة.");
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
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, [isClient, myClient?.id, selectedClientId]);

  const openAddModal = () => {
    if (clients.length > 0) setTargetClientId(clients[0].id);
    setTitle("خطة التغذية المتوازنة والمخصصة");
    setDailyCalories(2400);
    setProteinGrams(160);
    setCarbsGrams(240);
    setFatsGrams(65);
    setWaterLiters(3.5);
    setBreakfast("4 بياض بيض + 1 بيضة كاملة + 80جم شوفان مع حليب لوز وموزة");
    setLunch("200جم صدور دجاج مشوية + 150جم أرز بسمتي مسلوق + طبق سلطة خضراء وزيت زيتون");
    setDinner("150جم سمك فيليه مشوي أو تونة مصفاة + بطاطا حلوة مشوية + خضار سوتيه");
    setSnacks("سكوب واي بروتين بعد التمرين + 30جم مكسرات نية + تفاحة");
    setNotes("الالتزام بمواعيد الوجبات وشرب الماء الكافي.");
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
            <Apple className="w-6 h-6 text-emerald-500" />
            <span>{isClient ? (language === "ar" ? "خطتي الغذائية والماكروز" : "My Nutrition & Meal Plan") : t("navNutrition")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {mealPlans.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isClient
              ? (language === "ar" ? "جدول وجباتك اليومية المعتمدة، توزيع السعرات والماكروز، ومتابعة شرب الماء" : "Your customized daily meals, macronutrient targets & hydration tracker")
              : (language === "ar" ? "تصميم وتعديل الأنظمة الغذائية لكل مشترك، حساب السعرات والماكروز، وتوزيع الوجبات" : "Design, manage and assign custom meal plans, calorie targets and macronutrients per client")}
          </p>
        </div>

        {!isClient && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all self-start sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === "ar" ? "تصميم خطة غذائية جديدة لمشترك +" : "Create Meal Plan +"}</span>
          </button>
        )}
      </div>

      {/* Filter by Client for Coach / Admin */}
      {!isClient && (
        <div className="flex items-center space-x-3 rtl:space-x-reverse bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl max-w-md shadow-sm">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">تصفية بحسب المتدرب:</span>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
          >
            <option value="ALL">جميع المشتركين</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.user?.name} ({c.sport?.nameAr || "متدرب"})
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
                {language === "ar" ? "لم يتم تعيين خطة غذائية لك بعد" : "No active meal plan assigned yet"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {language === "ar"
                  ? "سيقوم الكابتن أو أخصائي التغذية المشرف بتصميم جدولك الغذائي المخصص وحساب سعراتك وتوزيعه هنا قريباً."
                  : "Your coach or sports nutritionist will assign your customized nutrition plan soon."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Daily Macros Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                      <Sparkles className="w-5 h-5 text-emerald-500" />
                      <span>{clientActivePlan.title}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === "ar" ? "خطة معتمدة ومخصصة لأهدافك التدريبية" : "Custom nutrition plan tailored for your goals"}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
                    ✓ {language === "ar" ? "خطة نشطة" : "Active Plan"}
                  </span>
                </div>

                {/* Macros Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">السعرات اليومية</span>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{clientActivePlan.dailyCalories} <span className="text-xs font-normal text-slate-500">Kcal</span></p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">البروتين (Protein)</span>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{clientActivePlan.proteinGrams} <span className="text-xs font-normal text-slate-500">g</span></p>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">الكاربوهيدرات (Carbs)</span>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{clientActivePlan.carbsGrams} <span className="text-xs font-normal text-slate-500">g</span></p>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">الدهون الصحية (Fats)</span>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{clientActivePlan.fatsGrams} <span className="text-xs font-normal text-slate-500">g</span></p>
                  </div>
                </div>

                {/* Hydration Tracker */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-slate-950 border border-blue-200 dark:border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <Droplets className="w-6 h-6 text-blue-500 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        تتبع شرب الماء اليومي ({clientActivePlan.waterLiters} لتر مستهدف)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        تم شرب {(waterGlasses * 0.35).toFixed(1)} لتر حتى الآن ({waterGlasses} أكواب)
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
                    <span className="font-black text-sm text-blue-600 dark:text-blue-400 px-2">{waterGlasses} أكواب</span>
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
                    <span>وجبة الإفطار (Breakfast)</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {clientActivePlan.breakfast}
                  </p>
                </div>

                {/* Lunch */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <Sun className="w-4 h-4" />
                    <span>وجبة الغداء الأساسية (Lunch)</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {clientActivePlan.lunch}
                  </p>
                </div>

                {/* Dinner */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    <Moon className="w-4 h-4" />
                    <span>وجبة العشاء (Dinner)</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {clientActivePlan.dinner}
                  </p>
                </div>

                {/* Snacks & Pre-workout */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-teal-600 dark:text-teal-400 font-bold text-xs">
                    <Cookie className="w-4 h-4" />
                    <span>السناكس وقبل التمرين (Snacks)</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {clientActivePlan.snacks}
                  </p>
                </div>
              </div>

              {clientActivePlan.notes && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 text-xs text-slate-800 dark:text-slate-200">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">💡 تعليمات وتوجيهات أخصائي التغذية:</span> {clientActivePlan.notes}
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">لا توجد خطط غذائية مسجلة حالياً</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                ابدأ بتصميم أول نظام غذائي مخصص لمشترك وحدد سعراته وماكروزه ووجباته اليومية.
              </p>
              <button
                onClick={openAddModal}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all inline-flex items-center space-x-2 rtl:space-x-reverse cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>تصميم خطة غذائية الآن</span>
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
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg shadow-emerald-500/20">
                          <Apple className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.title}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              plan.isActive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            }`}>
                              {plan.isActive ? "نشطة (Active)" : "غير نشطة"}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              👤 المتدرب: {clientObj?.user?.name || "متدرب"}
                            </span>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{plan.dailyCalories} Kcal</span>
                            <span>•</span>
                            <span>بروتين: {plan.proteinGrams}g</span>
                            <span>•</span>
                            <span>كارب: {plan.carbsGrams}g</span>
                            <span>•</span>
                            <span>دهون: {plan.fatsGrams}g</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 rtl:space-x-reverse" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleActive(plan)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            plan.isActive
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          {plan.isActive ? "الخطة النشطة ✓" : "تعيين كنشطة 🎯"}
                        </button>

                        <button
                          onClick={() => openEditModal(plan)}
                          className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                              <span>الإفطار:</span>
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{plan.breakfast || "غير محدد"}</p>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 rtl:space-x-reverse">
                              <Sun className="w-3.5 h-3.5" />
                              <span>الغداء الأساسي:</span>
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{plan.lunch || "غير محدد"}</p>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1 rtl:space-x-reverse">
                              <Moon className="w-3.5 h-3.5" />
                              <span>العشاء:</span>
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{plan.dinner || "غير محدد"}</p>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                            <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center space-x-1 rtl:space-x-reverse">
                              <Cookie className="w-3.5 h-3.5" />
                              <span>السناكس والمكملات:</span>
                            </span>
                            <p className="text-slate-700 dark:text-slate-300">{plan.snacks || "غير محدد"}</p>
                          </div>
                        </div>

                        {plan.notes && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                            💡 <span className="font-bold">ملاحظات:</span> {plan.notes}
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
                <Apple className="w-5 h-5 text-emerald-500" />
                <span>{isAddModalOpen ? "تصميم نظام وخطة غذائية جديدة" : "تعديل الخطة الغذائية"}</span>
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المشترك المستهدف *</label>
                  <select
                    value={targetClientId}
                    onChange={e => setTargetClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name} ({c.sport?.nameAr || "متدرب"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">عنوان الخطة الغذائية *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. خطة التضخيم النظيف - 2600 سعرة"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Macros Input */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">السعرات (Kcal)</label>
                  <input
                    type="number"
                    required
                    value={dailyCalories}
                    onChange={e => setDailyCalories(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">البروتين (جم)</label>
                  <input
                    type="number"
                    required
                    value={proteinGrams}
                    onChange={e => setProteinGrams(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">الكارب (جم)</label>
                  <input
                    type="number"
                    required
                    value={carbsGrams}
                    onChange={e => setCarbsGrams(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">الدهون (جم)</label>
                  <input
                    type="number"
                    required
                    value={fatsGrams}
                    onChange={e => setFatsGrams(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">الماء (لتر)</label>
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">🍳 تفاصيل وجبة الإفطار</label>
                  <textarea
                    rows={2}
                    value={breakfast}
                    onChange={e => setBreakfast(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">🥗 تفاصيل وجبة الغداء الأساسية</label>
                  <textarea
                    rows={2}
                    value={lunch}
                    onChange={e => setLunch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">🍲 تفاصيل وجبة العشاء</label>
                  <textarea
                    rows={2}
                    value={dinner}
                    onChange={e => setDinner(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">🥜 السناكس وقبل/بعد التمرين</label>
                  <textarea
                    rows={2}
                    value={snacks}
                    onChange={e => setSnacks(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">💡 تعليمات وإرشادات عامة</label>
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
                    className="rounded text-emerald-600 w-4 h-4"
                  />
                  <span>تعيين كخطة نشطة للمتدرب حالياً ✓</span>
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
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    {isAddModalOpen ? "حفظ وتعيين الخطة الغذائية ✓" : "تحديث الخطة الغذائية ✓"}
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">تأكيد حذف الخطة الغذائية</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                هل أنت متأكد من حذف الخطة الغذائية "{deleteConfirmPlan.title}"؟
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
                نعم، احذف الخطة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { Sport } from "@/types";
import {
  Trophy,
  PlusCircle,
  CheckCircle,
  Activity,
  X,
  Edit2,
  Trash2,
  Search,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Dumbbell
} from "lucide-react";

export default function SportsPage() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();

  const [sports, setSports] = useState<Sport[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [deleteConfirmSport, setDeleteConfirmSport] = useState<Sport | null>(null);

  // Form states
  const [formNameAr, setFormNameAr] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formIcon, setFormIcon] = useState("🏆");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDescriptionAr, setFormDescriptionAr] = useState("");
  const [formDescriptionEn, setFormDescriptionEn] = useState("");
  const [formCategories, setFormCategories] = useState("");

  const refreshSports = () => {
    setSports(db.getSports());
  };

  useEffect(() => {
    refreshSports();
    const handleDbChange = () => refreshSports();
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Handle Add Sport
  const handleAddSport = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cats = formCategories
        .split(/[،,]/)
        .map(c => c.trim())
        .filter(Boolean);

      db.createSport({
        nameAr: formNameAr.trim(),
        nameEn: formNameEn.trim() || formNameAr.trim(),
        icon: formIcon.trim() || "🏆",
        imageUrl: formImageUrl.trim() || undefined,
        descriptionAr: formDescriptionAr.trim() || "رياضة وتخصص تدريبي معتمد",
        descriptionEn: formDescriptionEn.trim() || "Certified athletic discipline",
        categories: cats.length > 0 ? cats : ["تدريب عام", "لياقة بدنية"]
      });

      refreshSports();
      setIsAddModalOpen(false);
      setFormNameAr("");
      setFormNameEn("");
      setFormImageUrl("");
      setFormDescriptionAr("");
      setFormDescriptionEn("");
      setFormCategories("");
      showNotification(language === "ar" ? "تمت إضافة الرياضة بنجاح! ✓" : "Sport added successfully!");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء إضافة الرياضة", "error");
    }
  };

  // Handle Update Sport
  const handleUpdateSport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSport) return;

    try {
      const cats = formCategories
        .split(/[،,]/)
        .map(c => c.trim())
        .filter(Boolean);

      db.updateSport(editingSport.id, {
        nameAr: formNameAr.trim(),
        nameEn: formNameEn.trim() || formNameAr.trim(),
        icon: formIcon.trim() || "🏆",
        imageUrl: formImageUrl.trim() || undefined,
        descriptionAr: formDescriptionAr.trim(),
        descriptionEn: formDescriptionEn.trim(),
        categories: cats
      });

      refreshSports();
      setIsEditModalOpen(false);
      setEditingSport(null);
      showNotification(language === "ar" ? "تم تحديث بيانات الرياضة بنجاح! ✓" : "Sport updated successfully!");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء التحديث", "error");
    }
  };

  // Handle Delete Sport
  const handleDeleteSport = () => {
    if (!deleteConfirmSport) return;
    try {
      db.deleteSport(deleteConfirmSport.id);
      refreshSports();
      setDeleteConfirmSport(null);
      showNotification(language === "ar" ? "تم حذف الرياضة بنجاح" : "Sport deleted successfully");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء الحذف", "error");
    }
  };

  const openEditModal = (sp: Sport) => {
    setEditingSport(sp);
    setFormNameAr(sp.nameAr);
    setFormNameEn(sp.nameEn);
    setFormIcon(sp.icon || "🏆");
    setFormImageUrl(sp.imageUrl || "");
    setFormDescriptionAr(sp.descriptionAr || "");
    setFormDescriptionEn(sp.descriptionEn || "");
    setFormCategories(sp.categories?.join("، ") || "");
    setIsEditModalOpen(true);
  };

  const filteredSports = sports.filter(sp =>
    sp.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sp.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sp.descriptionAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sp.categories?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Trophy className="w-6 h-6 text-emerald-500" />
            <span>{t("navSports")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {filteredSports.length} {language === "ar" ? "رياضات وتخصصات" : "sports"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "دليل الرياضات المعتمدة، التخصصات، مقاييس التدريب، والصور التوضيحية"
              : "Supported sports catalog, athletic disciplines, visual covers, and performance categories"}
          </p>
        </div>

        <button
          onClick={() => {
            setFormNameAr("");
            setFormNameEn("");
            setFormIcon("🏆");
            setFormImageUrl("");
            setFormDescriptionAr("");
            setFormDescriptionEn("");
            setFormCategories("بناء أجسام، قوة بدنية، فتنس");
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{language === "ar" ? "إضافة رياضة جديدة +" : "Create New Sport +"}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
        <input
          type="text"
          placeholder={language === "ar" ? "بحث باسم الرياضة، التصنيف، أو الوصف..." : "Search sport name, discipline, description..."}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-sm"
        />
      </div>

      {/* Sports Grid */}
      {filteredSports.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === "ar" ? "لا توجد رياضات مسجلة حالياً" : "No sports registered yet"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {language === "ar"
                ? "ابدأ بتعريف الرياضات والتخصصات التي تقدمها الأكاديمية (مثل: كمال الأجسام، الملاكمة، السباحة، الكروس فيت) مع إضافة صورها التوضيحية."
                : "Define sports and athletic disciplines offered by your academy with custom cover images."}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all inline-flex items-center space-x-2 rtl:space-x-reverse"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === "ar" ? "إضافة أول رياضة الآن" : "Add First Sport Now"}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSports.map(sp => (
            <div
              key={sp.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between overflow-hidden relative group"
            >
              {/* Optional Sport Cover Image */}
              {sp.imageUrl && (
                <div className="w-full h-36 -mx-6 -mt-6 mb-2 overflow-hidden bg-slate-950 relative">
                  <img
                    src={sp.imageUrl}
                    alt={sp.nameAr}
                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/20 flex-shrink-0">
                      {sp.icon || "🏆"}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{sp.nameAr}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{sp.nameEn}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <button
                      onClick={() => openEditModal(sp)}
                      title={language === "ar" ? "تعديل الرياضة" : "Edit sport"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmSport(sp)}
                      title={language === "ar" ? "حذف الرياضة" : "Delete sport"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {sp.descriptionAr && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {sp.descriptionAr}
                  </p>
                )}

                {sp.categories && sp.categories.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">التصنيفات والأنواع:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sp.categories.map((c, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD SPORT MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <PlusCircle className="w-5 h-5 text-emerald-500" />
                  <span>{language === "ar" ? "إضافة رياضة وتخصص جديد" : "Create New Sport"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === "ar" ? "أدخل اسم الرياضة، التصنيفات، ورابط الصورة" : "Enter sport details and cover image"}
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSport} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الرياضة بالعربي *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. كمال الأجسام واللياقة"
                    value={formNameAr}
                    onChange={e => setFormNameAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الأيقونة (Emoji)</label>
                  <input
                    type="text"
                    placeholder="🏋️ أو 🥊"
                    value={formIcon}
                    onChange={e => setFormIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الرياضة بالإنجليزي</label>
                <input
                  type="text"
                  placeholder="e.g. Bodybuilding & Fitness"
                  value={formNameEn}
                  onChange={e => setFormNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>رابط صورة الرياضة (Image URL)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formImageUrl}
                  onChange={e => setFormImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
                {formImageUrl && (
                  <div className="mt-2 w-full h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">التصنيفات والأنواع (مفصولة بفواصل)</label>
                <input
                  type="text"
                  placeholder="تضخيم، تنشيف، قوة، تحمل"
                  value={formCategories}
                  onChange={e => setFormCategories(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">وصف الرياضة</label>
                <textarea
                  rows={2}
                  placeholder="وصف تفصيلي لأهداف الرياضة ومميزاتها..."
                  value={formDescriptionAr}
                  onChange={e => setFormDescriptionAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  {language === "ar" ? "حفظ الرياضة ✓" : "Save Sport"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT SPORT MODAL --- */}
      {isEditModalOpen && editingSport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <Edit2 className="w-5 h-5 text-emerald-500" />
                  <span>{language === "ar" ? "تعديل بيانات الرياضة" : "Edit Sport"}</span>
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSport} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الرياضة بالعربي *</label>
                  <input
                    type="text"
                    required
                    value={formNameAr}
                    onChange={e => setFormNameAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الأيقونة (Emoji)</label>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={e => setFormIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الرياضة بالإنجليزي</label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={e => setFormNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>رابط صورة الرياضة (Image URL)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formImageUrl}
                  onChange={e => setFormImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">التصنيفات والأنواع</label>
                <input
                  type="text"
                  value={formCategories}
                  onChange={e => setFormCategories(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الوصف</label>
                <textarea
                  rows={2}
                  value={formDescriptionAr}
                  onChange={e => setFormDescriptionAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  {language === "ar" ? "حفظ التعديلات ✓" : "Update Sport"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE SPORT CONFIRMATION MODAL --- */}
      {deleteConfirmSport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === "ar" ? "تأكيد حذف الرياضة" : "Confirm Sport Deletion"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === "ar"
                  ? `هل أنت متأكد من حذف رياضة "${deleteConfirmSport.nameAr}" نهائياً؟`
                  : `Are you sure you want to delete sport "${deleteConfirmSport.nameAr}"?`}
              </p>
            </div>
            <div className="flex justify-center space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSport(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteSport}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30"
              >
                {language === "ar" ? "نعم، احذف الرياضة" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

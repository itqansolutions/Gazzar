"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { CoachProfile, UserRole } from "@/types";
import {
  Shield,
  Users,
  Award,
  Star,
  PlusCircle,
  Dumbbell,
  Search,
  Mail,
  Phone,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  UserCheck,
  Briefcase
} from "lucide-react";

export default function CoachesPage() {
  const { t, language, dir } = useLanguage();
  const { user: currentUser } = useAuth();

  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("ALL");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<CoachProfile | null>(null);
  const [deleteConfirmCoach, setDeleteConfirmCoach] = useState<CoachProfile | null>(null);

  // Form states for Add Coach
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("A@123456");
  const [formPhone, setFormPhone] = useState("+20 100 000 0000");
  const [formRole, setFormRole] = useState<UserRole>("COACH");
  const [formBio, setFormBio] = useState("");
  const [formExperience, setFormExperience] = useState<number>(3);
  const [formSpecialties, setFormSpecialties] = useState<string>("لياقة بدنية، كمال أجسام");

  const refreshCoaches = () => {
    setCoaches(db.getCoaches());
  };

  useEffect(() => {
    refreshCoaches();

    const handleDbChange = () => refreshCoaches();
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Handle Add Coach
  const handleAddCoach = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const specs = formSpecialties
        .split(/[،,]/)
        .map(s => s.trim())
        .filter(Boolean);

      db.createUser({
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword.trim() || "A@123456",
        phone: formPhone.trim(),
        role: formRole,
        bio: formBio.trim() || "كابتن ومدرب معتمد في الأكاديمية",
        yearsOfExperience: Number(formExperience) || 3,
        specialties: specs.length > 0 ? specs : ["لياقة بدنية", "كمال أجسام"]
      });

      refreshCoaches();
      setIsAddModalOpen(false);
      setFormName("");
      setFormEmail("");
      setFormBio("");
      showNotification(language === "ar" ? "تم إضافة الكابتن الجديد بنجاح! ✓" : "Coach added successfully!");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء إضافة الكابتن", "error");
    }
  };

  // Handle Edit Coach
  const handleUpdateCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoach) return;

    try {
      const specs = formSpecialties
        .split(/[،,]/)
        .map(s => s.trim())
        .filter(Boolean);

      // Update User info
      db.updateUser(editingCoach.userId, {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        role: formRole
      });

      // Update Coach Profile
      const index = db.getCoaches().findIndex(c => c.id === editingCoach.id);
      if (index !== -1) {
        editingCoach.bio = formBio.trim();
        editingCoach.yearsOfExperience = Number(formExperience);
        editingCoach.specialties = specs;
      }

      refreshCoaches();
      setIsEditModalOpen(false);
      setEditingCoach(null);
      showNotification(language === "ar" ? "تم تحديث بيانات الكابتن بنجاح! ✓" : "Coach updated successfully!");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء التحديث", "error");
    }
  };

  // Handle Delete Coach
  const handleDeleteCoach = () => {
    if (!deleteConfirmCoach) return;
    try {
      db.deleteUser(deleteConfirmCoach.userId);
      refreshCoaches();
      setDeleteConfirmCoach(null);
      showNotification(language === "ar" ? "تم حذف حساب الكابتن بنجاح" : "Coach account deleted successfully");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء الحذف", "error");
    }
  };

  const openEditModal = (co: CoachProfile) => {
    setEditingCoach(co);
    setFormName(co.user?.name || "");
    setFormEmail(co.user?.email || "");
    setFormPhone(co.user?.phone || "");
    setFormRole(co.user?.role || "COACH");
    setFormBio(co.bio || "");
    setFormExperience(co.yearsOfExperience || 3);
    setFormSpecialties(co.specialties?.join("، ") || "");
    setIsEditModalOpen(true);
  };

  // Filtered coaches
  const filteredCoaches = coaches.filter(co => {
    const matchQuery =
      co.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      co.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      co.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      co.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchSpec =
      selectedSpecialty === "ALL" ||
      co.specialties?.some(s => s.toLowerCase().includes(selectedSpecialty.toLowerCase()));

    return matchQuery && matchSpec;
  });

  const allSpecialties = Array.from(
    new Set(coaches.flatMap(c => c.specialties || []))
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
          {notification.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Shield className="w-6 h-6 text-emerald-500" />
            <span>{t("navCoaches")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {filteredCoaches.length} {language === "ar" ? "مدرب" : "coaches"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "إدارة الكباتن، المشرفين (Head Coaches)، التخصصات الرياضية وتوزيع المتدربين"
              : "Coaching staff directory, Head Coach oversight, specialties & assigned athletes"}
          </p>
        </div>

        <button
          onClick={() => {
            setFormName("");
            setFormEmail("");
            setFormBio("");
            setFormSpecialties("لياقة بدنية، كمال أجسام");
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{language === "ar" ? "إضافة كابتن جديد +" : "Create New Coach +"}</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
          <input
            type="text"
            placeholder={language === "ar" ? "بحث باسم الكابتن، التخصص، أو البريد..." : "Search coach name, specialty, email..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-sm"
          />
        </div>

        <div>
          <select
            value={selectedSpecialty}
            onChange={e => setSelectedSpecialty(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-sm"
          >
            <option value="ALL">{language === "ar" ? "جميع التخصصات" : "All Specialties"}</option>
            {allSpecialties.map((s, idx) => (
              <option key={idx} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Coaches Cards Grid */}
      {filteredCoaches.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === "ar" ? "لا يوجد كباتن مسجلون حالياً" : "No coaches registered yet"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {language === "ar"
                ? "ابدأ بتسجيل أول كابتن أو مشرف تدريب في الأكاديمية لبدء تعيين المتدربين والتمارين."
                : "Add your first coach or head coach to start assigning athletes and workouts."}
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all inline-flex items-center space-x-2 rtl:space-x-reverse"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === "ar" ? "إضافة أول كابتن الآن" : "Add First Coach Now"}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCoaches.map(co => (
            <div
              key={co.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <img
                      src={co.user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}
                      alt={co.user?.name || "Coach"}
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"; }}
                      className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-500 shadow-md shadow-emerald-500/20"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                        <span>{co.user?.name}</span>
                        {co.user?.role === "HEAD_COACH" && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        )}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {co.user?.role === "HEAD_COACH" ? (language === "ar" ? "كبير المدربين" : "Head Coach") : (language === "ar" ? "كابتن تدريب" : "Coach")}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{co.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                    <button
                      onClick={() => openEditModal(co)}
                      title={language === "ar" ? "تعديل الكابتن" : "Edit coach"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmCoach(co)}
                      title={language === "ar" ? "حذف الكابتن" : "Delete coach"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {co.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {co.bio}
                  </p>
                )}

                <div className="space-y-2 text-xs">
                  {co.specialties && co.specialties.length > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">التخصصات الرياضية:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {co.specialties.map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">الخبرة:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{co.yearsOfExperience || 3} سنوات</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">الهاتف:</span>
                      <span className="font-bold text-slate-900 dark:text-white text-[10px] font-mono">{co.user?.phone || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1 rtl:space-x-reverse">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  <span>المتدربون النشطون:</span>
                </span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  {co.assignedClientsCount || 0} مشترك
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD COACH MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <PlusCircle className="w-5 h-5 text-emerald-500" />
                  <span>{language === "ar" ? "إضافة كابتن / مدرب جديد" : "Create New Coach"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === "ar" ? "أدخل بيانات الكابتن لإنشاء حسابه وربطه بالجداول التدريبية" : "Enter coach credentials and details"}
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCoach} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الكابتن *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. كابتن حسام حسن"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    placeholder="coach@gazzar.com"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="+20 100 000 0000"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الدور والصلاحية</label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="COACH">كابتن ومدرب (Coach)</option>
                    <option value="HEAD_COACH">مشرف عام تدريب (Head Coach)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">سنوات الخبرة</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formExperience}
                    onChange={e => setFormExperience(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">التخصصات (مفصولة بفواصل)</label>
                <input
                  type="text"
                  placeholder="كمال أجسام، فتنس، تغذية رياضية"
                  value={formSpecialties}
                  onChange={e => setFormSpecialties(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نبذة تعريفية (Bio)</label>
                <textarea
                  rows={2}
                  placeholder="نبذة عن خبرات الكابتن وإنجازاته التدريبية..."
                  value={formBio}
                  onChange={e => setFormBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  {language === "ar" ? "حفظ الكابتن ✓" : "Save Coach"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT COACH MODAL --- */}
      {isEditModalOpen && editingCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <Edit2 className="w-5 h-5 text-emerald-500" />
                  <span>{language === "ar" ? "تعديل بيانات الكابتن" : "Edit Coach Profile"}</span>
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoach} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الكابتن *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الدور والصلاحية</label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="COACH">كابتن ومدرب (Coach)</option>
                    <option value="HEAD_COACH">مشرف عام تدريب (Head Coach)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">سنوات الخبرة</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formExperience}
                    onChange={e => setFormExperience(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">التخصصات</label>
                <input
                  type="text"
                  value={formSpecialties}
                  onChange={e => setFormSpecialties(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نبذة تعريفية (Bio)</label>
                <textarea
                  rows={2}
                  value={formBio}
                  onChange={e => setFormBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  {language === "ar" ? "حفظ التعديلات ✓" : "Update Coach"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE COACH CONFIRMATION MODAL --- */}
      {deleteConfirmCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === "ar" ? "تأكيد حذف حساب الكابتن" : "Confirm Coach Deletion"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === "ar"
                  ? `هل أنت متأكد من حذف الكابتن "${deleteConfirmCoach.user?.name}" نهائياً من النظام؟`
                  : `Are you sure you want to delete coach "${deleteConfirmCoach.user?.name}"?`}
              </p>
            </div>
            <div className="flex justify-center space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCoach(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteCoach}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30"
              >
                {language === "ar" ? "نعم، احذف الكابتن" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

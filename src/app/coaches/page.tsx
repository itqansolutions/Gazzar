"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { CoachProfile, UserRole, Sport } from "@/types";
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
  Briefcase,
  Check,
  Plus
} from "lucide-react";

export default function CoachesPage() {
  const { t, language, dir } = useLanguage();
  const { user: currentUser } = useAuth();

  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
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
  const [formSpecialties, setFormSpecialties] = useState<string[]>([]);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState("");

  const refreshData = () => {
    setCoaches(db.getCoaches());
    setSports(db.getSports());
  };

  useEffect(() => {
    refreshData();

    const handleDbChange = () => refreshData();
    window.addEventListener("gx_db_change", handleDbChange);
    return () => window.removeEventListener("gx_db_change", handleDbChange);
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const addCustomSpecialty = () => {
    const trimmed = customSpecialtyInput.trim();
    if (trimmed && !formSpecialties.includes(trimmed)) {
      setFormSpecialties(prev => [...prev, trimmed]);
      setCustomSpecialtyInput("");
    }
  };

  // Handle Add Coach
  const handleAddCoach = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const defaultSport = sports[0] ? (language === "ar" ? sports[0].nameAr : (sports[0].nameEn || sports[0].nameAr)) : (language === "ar" ? "لياقة بدنية" : "Fitness");
      const specs = formSpecialties.length > 0 ? formSpecialties : [defaultSport];

      db.createUser({
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword.trim() || "A@123456",
        phone: formPhone.trim(),
        role: formRole,
        bio: formBio.trim() || "كابتن ومدرب معتمد في الأكاديمية",
        yearsOfExperience: Number(formExperience) || 3,
        specialties: specs
      });

      refreshData();
      setIsAddModalOpen(false);
      setFormName("");
      setFormEmail("");
      setFormBio("");
      setFormSpecialties([]);
      setCustomSpecialtyInput("");
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
      const defaultSport = sports[0] ? (language === "ar" ? sports[0].nameAr : (sports[0].nameEn || sports[0].nameAr)) : (language === "ar" ? "لياقة بدنية" : "Fitness");
      const specs = formSpecialties.length > 0 ? formSpecialties : [defaultSport];

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

      refreshData();
      setIsEditModalOpen(false);
      setEditingCoach(null);
      setCustomSpecialtyInput("");
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
      refreshData();
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
    setFormSpecialties(co.specialties || []);
    setCustomSpecialtyInput("");
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
    new Set([
      ...sports.map(s => language === "ar" ? s.nameAr : (s.nameEn || s.nameAr)),
      ...coaches.flatMap(c => c.specialties || [])
    ])
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
            setFormSpecialties([]);
            setCustomSpecialtyInput("");
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map(co => (
            <div
              key={co.id}
              className="relative bg-white rounded-3xl border border-slate-200 hover:border-emerald-500/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
            >
              {/* Top Gradient Line */}
              <div className={`h-1.5 w-full ${co.user?.role === "HEAD_COACH" ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500" : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"}`} />

              <div className="p-5 sm:p-6 space-y-4">
                {/* Header: Avatar, Name, Role, Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3.5 rtl:space-x-reverse min-w-0">
                    <div className="relative flex-shrink-0">
                      <img
                        src={co.user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}
                        alt={co.user?.name || "Coach"}
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"; }}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10"
                      />
                      {co.user?.role === "HEAD_COACH" && (
                        <div className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                          <Star className="w-3 h-3 fill-white text-white" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold text-slate-900 truncate">
                        {co.user?.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {co.user?.role === "HEAD_COACH" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            <span>{language === "ar" ? "كبير المدربين" : "Head Coach"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Shield className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{language === "ar" ? "كابتن تدريب" : "Coach"}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center space-x-1 rtl:space-x-reverse flex-shrink-0">
                    <button
                      onClick={() => openEditModal(co)}
                      title={language === "ar" ? "تعديل الكابتن" : "Edit Coach"}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-100 hover:border-emerald-200 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmCoach(co)}
                      title={language === "ar" ? "حذف الكابتن" : "Delete Coach"}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-100 hover:border-red-200 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact Meta */}
                <div className="space-y-1.5 pt-1 text-xs text-slate-500">
                  <div className="flex items-center gap-2 font-mono text-[11px] truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{co.user?.email}</span>
                  </div>
                  {co.user?.phone && (
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{co.user.phone}</span>
                    </div>
                  )}
                </div>

                {/* Bio Quote */}
                {co.bio && (
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 bg-slate-50/70 px-3 py-2 rounded-xl border border-slate-100 italic">
                    "{co.bio}"
                  </p>
                )}

                {/* Specialties */}
                {co.specialties && co.specialties.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === "ar" ? "التخصصات التدريبية" : "Specialties"}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {co.specialties.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-lg bg-emerald-50/80 border border-emerald-100 text-emerald-800 font-semibold text-[11px]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Stats Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center space-x-2.5 rtl:space-x-reverse">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {language === "ar" ? "الخبرة" : "Experience"}
                      </span>
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {co.yearsOfExperience || 3} {language === "ar" ? "سنوات" : "Years"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center space-x-2.5 rtl:space-x-reverse">
                    <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {language === "ar" ? "المتدربون النشطون" : "Active Athletes"}
                      </span>
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {co.assignedClientsCount || 0} {language === "ar" ? "مشترك" : "Athletes"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === "ar" ? "حالة الكابتن:" : "Status:"}</span>
                  <span className="font-bold text-emerald-600">{language === "ar" ? "نشط" : "Active"}</span>
                </span>
                <button
                  onClick={() => openEditModal(co)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  {language === "ar" ? "تعديل البيانات" : "Manage Profile"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD COACH MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 rtl:space-x-reverse">
                  <PlusCircle className="w-5 h-5 text-emerald-500" />
                  <span>{language === "ar" ? "إضافة كابتن / مدرب جديد" : "Create New Coach"}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {language === "ar" ? "أدخل بيانات الكابتن لإنشاء حسابه وربطه بالجداول التدريبية" : "Enter coach credentials and details to set up account"}
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCoach} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "اسم الكابتن *" : "Coach Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "e.g. كابتن حسام حسن" : "e.g. Coach John Doe"}
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "البريد الإلكتروني *" : "Email Address *"}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="coach@gxacademy.com"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "رقم الهاتف" : "Phone Number"}
                  </label>
                  <input
                    type="text"
                    placeholder="+20 100 000 0000"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "الدور والصلاحية" : "Role & Permission"}
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  >
                    <option value="COACH">{language === "ar" ? "كابتن ومدرب (Coach)" : "Coach"}</option>
                    <option value="HEAD_COACH">{language === "ar" ? "مشرف عام تدريب (Head Coach)" : "Head Coach"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "سنوات الخبرة" : "Years of Experience"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formExperience}
                    onChange={e => setFormExperience(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {language === "ar" ? "التخصصات الرياضية (اختر من قائمة الرياضات) *" : "Sports & Specialties (Select from Catalog) *"}
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {formSpecialties.length} {language === "ar" ? "تخصص محدد" : "selected"}
                  </span>
                </div>

                {sports.length > 0 ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <p className="text-[11px] text-slate-500">
                      {language === "ar"
                        ? "اختر الرياضات المعتمدة للكابتن من الدليل التدريبي للأكاديمية:"
                        : "Select sports from the academy catalog for this coach:"}
                    </p>

                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-0.5">
                      {sports.map(sport => {
                        const sportName = language === "ar" ? sport.nameAr : (sport.nameEn || sport.nameAr);
                        const isSelected = formSpecialties.some(
                          s => s === sport.nameAr || s === sport.nameEn || s.toLowerCase() === (sport.nameEn || "").toLowerCase()
                        );

                        return (
                          <button
                            type="button"
                            key={sport.id}
                            onClick={() => {
                              if (isSelected) {
                                setFormSpecialties(prev => prev.filter(s => s !== sport.nameAr && s !== sport.nameEn && s.toLowerCase() !== (sport.nameEn || "").toLowerCase()));
                              } else {
                                setFormSpecialties(prev => [...prev, sportName]);
                              }
                            }}
                            className={`flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                                : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                            }`}
                          >
                            <span>{sport.icon || "🏆"}</span>
                            <span>{sportName}</span>
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 ms-1 text-white" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 ms-1 text-slate-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add custom specialty input */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={language === "ar" ? "أو أضف تخصصاً يدوياً..." : "Or add custom specialty..."}
                        value={customSpecialtyInput}
                        onChange={e => setCustomSpecialtyInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomSpecialty();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={addCustomSpecialty}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        {language === "ar" ? "إضافة +" : "Add +"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                    <span>{language === "ar" ? "لا توجد رياضات في الدليل بعد." : "No sports in catalog yet."}</span>
                    <Link href="/sports" className="underline font-bold">{language === "ar" ? "إضافة رياضة الآن" : "Add Sport Now"}</Link>
                  </div>
                )}

                {/* Selected specialties chips */}
                {formSpecialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formSpecialties.map((spec, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold"
                      >
                        <span>{spec}</span>
                        <button
                          type="button"
                          onClick={() => setFormSpecialties(prev => prev.filter((_, i) => i !== idx))}
                          className="p-0.5 hover:bg-emerald-200/60 rounded text-emerald-600 hover:text-emerald-900 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "نبذة تعريفية (Bio)" : "Bio / Background"}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === "ar" ? "نبذة عن خبرات الكابتن وإنجازاته التدريبية..." : "Brief background, certifications, and achievements..."}
                  value={formBio}
                  onChange={e => setFormBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 rtl:space-x-reverse">
                  <Edit2 className="w-5 h-5 text-emerald-500" />
                  <span>{language === "ar" ? "تعديل بيانات الكابتن" : "Edit Coach Profile"}</span>
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoach} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "اسم الكابتن *" : "Coach Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "البريد الإلكتروني *" : "Email Address *"}
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "رقم الهاتف" : "Phone Number"}
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "الدور والصلاحية" : "Role & Permission"}
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  >
                    <option value="COACH">{language === "ar" ? "كابتن ومدرب (Coach)" : "Coach"}</option>
                    <option value="HEAD_COACH">{language === "ar" ? "مشرف عام تدريب (Head Coach)" : "Head Coach"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "سنوات الخبرة" : "Years of Experience"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formExperience}
                    onChange={e => setFormExperience(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {language === "ar" ? "التخصصات الرياضية (اختر من قائمة الرياضات) *" : "Sports & Specialties (Select from Catalog) *"}
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {formSpecialties.length} {language === "ar" ? "تخصص محدد" : "selected"}
                  </span>
                </div>

                {sports.length > 0 ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <p className="text-[11px] text-slate-500">
                      {language === "ar"
                        ? "اختر الرياضات المعتمدة للكابتن من الدليل التدريبي للأكاديمية:"
                        : "Select sports from the academy catalog for this coach:"}
                    </p>

                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-0.5">
                      {sports.map(sport => {
                        const sportName = language === "ar" ? sport.nameAr : (sport.nameEn || sport.nameAr);
                        const isSelected = formSpecialties.some(
                          s => s === sport.nameAr || s === sport.nameEn || s.toLowerCase() === (sport.nameEn || "").toLowerCase()
                        );

                        return (
                          <button
                            type="button"
                            key={sport.id}
                            onClick={() => {
                              if (isSelected) {
                                setFormSpecialties(prev => prev.filter(s => s !== sport.nameAr && s !== sport.nameEn && s.toLowerCase() !== (sport.nameEn || "").toLowerCase()));
                              } else {
                                setFormSpecialties(prev => [...prev, sportName]);
                              }
                            }}
                            className={`flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                                : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                            }`}
                          >
                            <span>{sport.icon || "🏆"}</span>
                            <span>{sportName}</span>
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 ms-1 text-white" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 ms-1 text-slate-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add custom specialty input */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={language === "ar" ? "أو أضف تخصصاً يدوياً..." : "Or add custom specialty..."}
                        value={customSpecialtyInput}
                        onChange={e => setCustomSpecialtyInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomSpecialty();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={addCustomSpecialty}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        {language === "ar" ? "إضافة +" : "Add +"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                    <span>{language === "ar" ? "لا توجد رياضات في الدليل بعد." : "No sports in catalog yet."}</span>
                    <Link href="/sports" className="underline font-bold">{language === "ar" ? "إضافة رياضة الآن" : "Add Sport Now"}</Link>
                  </div>
                )}

                {/* Selected specialties chips */}
                {formSpecialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formSpecialties.map((spec, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1 rtl:space-x-reverse px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold"
                      >
                        <span>{spec}</span>
                        <button
                          type="button"
                          onClick={() => setFormSpecialties(prev => prev.filter((_, i) => i !== idx))}
                          className="p-0.5 hover:bg-emerald-200/60 rounded text-emerald-600 hover:text-emerald-900 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "نبذة تعريفية (Bio)" : "Bio / Background"}
                </label>
                <textarea
                  rows={2}
                  value={formBio}
                  onChange={e => setFormBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  {language === "ar" ? "حفظ التعديلات ✓" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE COACH CONFIRMATION MODAL --- */}
      {deleteConfirmCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {language === "ar" ? "تأكيد حذف حساب الكابتن" : "Confirm Coach Deletion"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === "ar"
                  ? `هل أنت متأكد من حذف الكابتن "${deleteConfirmCoach.user?.name}" نهائياً من النظام؟`
                  : `Are you sure you want to permanently delete coach "${deleteConfirmCoach.user?.name}"?`}
              </p>
            </div>
            <div className="flex justify-center space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCoach(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteCoach}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30"
              >
                {language === "ar" ? "نعم، احذف الكابتن" : "Yes, Delete Coach"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

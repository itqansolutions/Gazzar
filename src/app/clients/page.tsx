"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { ClientProfile, ClientStatus } from "@/types";
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Dumbbell,
  CheckCircle,
  X,
  Phone,
  Calendar,
  Edit,
  Trash2,
  UserCheck
} from "lucide-react";

export default function ClientsPage() {
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [coachFilter, setCoachFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);

  // New Client Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newGender, setNewGender] = useState<"MALE" | "FEMALE">("MALE");
  const [newHeight, setNewHeight] = useState(178);
  const [newWeight, setNewWeight] = useState(85);
  const [newSportId, setNewSportId] = useState("sport-bodybuilding");
  const [newStatus, setNewStatus] = useState<ClientStatus>("ACTIVE");

  const coaches = db.getCoaches();
  const sports = db.getSports();

  const loadClients = () => {
    setClients(db.getClients());
  };

  useEffect(() => {
    loadClients();
    const handleDbChange = () => loadClients();
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, []);

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    db.createClient({
      name: newName,
      email: newEmail,
      phone: newPhone,
      gender: newGender,
      heightCm: Number(newHeight),
      weightKg: Number(newWeight),
      preferredSportId: newSportId,
      status: newStatus
    });

    setIsAddModalOpen(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    loadClients();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    db.updateClient(selectedClient.id, {
      name: selectedClient.user?.name,
      email: selectedClient.user?.email,
      phone: selectedClient.user?.phone,
      status: selectedClient.status,
      weightKg: Number(selectedClient.weightKg),
      heightCm: Number(selectedClient.heightCm),
      preferredSportId: selectedClient.preferredSportId
    });

    setIsEditModalOpen(false);
    setSelectedClient(null);
    loadClients();
  };

  const handleDeleteClient = (id: string, name: string) => {
    if (confirm(language === "ar" ? `هل أنت متأكد من حذف المشترك ${name} نهائياً؟` : `Delete client ${name} permanently?`)) {
      db.deleteClient(id);
      loadClients();
    }
  };

  const filteredClients = clients.filter(c => {
    const name = c.user?.name || "";
    const email = c.user?.email || "";
    const phone = c.user?.phone || "";
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery);

    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesCoach =
      coachFilter === "ALL" ||
      c.coaches?.some(ca => ca.coachId === coachFilter && ca.active);

    return matchesSearch && matchesStatus && matchesCoach;
  });

  const getStatusBadge = (status: ClientStatus) => {
    switch (status) {
      case "ACTIVE":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active</span>;
      case "LEAD":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">Lead</span>;
      case "FROZEN":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Frozen</span>;
      case "EXPIRED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Expired</span>;
      case "SUSPENDED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">Suspended</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Users className="w-6 h-6 text-emerald-500" />
            <span>{t("navClients")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {filteredClients.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "إدارة المشتركين، توزيع الكباتن، متابعة الحالات، التعديل والحذف الفوري"
              : "Athlete directory, coach assignments, live status tracking, editing and removal"}
          </p>
        </div>

        {user?.role !== "CLIENT" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === "ar" ? "إضافة مشترك جديد +" : "Add New Client +"}</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
          <input
            type="text"
            placeholder={language === "ar" ? "بحث بالاسم، البريد أو الهاتف..." : "Search name, email, phone..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">{language === "ar" ? "جميع الحالات" : "All Statuses"}</option>
            <option value="ACTIVE">Active (نشط)</option>
            <option value="LEAD">Lead (عميل محتمل)</option>
            <option value="FROZEN">Frozen (مجمّد)</option>
            <option value="EXPIRED">Expired (منتهي)</option>
            <option value="SUSPENDED">Suspended (موقوف)</option>
          </select>
        </div>

        <div>
          <select
            value={coachFilter}
            onChange={e => setCoachFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">{language === "ar" ? "جميع الكباتن" : "All Coaches"}</option>
            {coaches.map(co => (
              <option key={co.id} value={co.id}>{co.user?.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => {
          const hasMedicalAlert = (client.medicalRestrictions?.length || 0) > 0;
          const primaryCoach = client.coaches?.find(ca => ca.role === "PRIMARY")?.coach?.user?.name;

          return (
            <div
              key={client.id}
              className="group bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <img
                      src={client.user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                      alt={client.user?.name || "Client"}
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"; }}
                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-300 dark:border-slate-700 group-hover:border-emerald-400 transition-colors"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                        {client.user?.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{client.user?.phone || client.user?.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(client.status)}
                </div>

                {/* Medical Alert Tag ⚠ */}
                {hasMedicalAlert && (
                  <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center space-x-2 rtl:space-x-reverse">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-300 truncate">
                      {client.medicalRestrictions![0].conditionName}
                    </span>
                  </div>
                )}

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-slate-200 dark:border-slate-800/80 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">{t("weight")}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{client.weightKg} KG</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{t("height")}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{client.heightCm} CM</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{t("sport")}</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate block">{client.sport?.nameAr || "لياقة"}</span>
                  </div>
                </div>

                {/* Coaches Pills */}
                <div className="space-y-1 mt-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">الكابتن المسؤول:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{primaryCoach || "غير محدد"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">انتهاء الاشتراك:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{client.membershipExpiry || "2026-12-31"}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                <Link
                  href={`/clients/${client.id}`}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 rtl:space-x-reverse"
                >
                  <span>{t("viewDetails")} (360°)</span>
                  {dir === "rtl" ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </Link>

                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                  <button
                    onClick={() => {
                      setSelectedClient(JSON.parse(JSON.stringify(client)));
                      setIsEditModalOpen(true);
                    }}
                    title="تعديل المشترك"
                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteClient(client.id, client.user?.name || "المشترك")}
                    title="حذف المشترك"
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD CLIENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                <span>{language === "ar" ? "تسجيل مشترك جديد" : "Add New Athlete"}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="محمد أحمد علي"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الوزن الحالي (KG)</label>
                  <input
                    type="number"
                    value={newWeight}
                    onChange={e => setNewWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الطول (CM)</label>
                  <input
                    type="number"
                    value={newHeight}
                    onChange={e => setNewHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الرياضة المفضلة</label>
                  <select
                    value={newSportId}
                    onChange={e => setNewSportId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    {sports.map(s => (
                      <option key={s.id} value={s.id}>{s.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">حالة الاشتراك</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as ClientStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVE">Active (نشط)</option>
                    <option value="LEAD">Lead (محتمل)</option>
                    <option value="FROZEN">Frozen (مجمّد)</option>
                    <option value="EXPIRED">Expired (منتهي)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  حفظ المشترك
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {isEditModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Edit className="w-5 h-5 text-blue-500" />
                <span>تعديل بيانات المشترك</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الاسم بالكامل</label>
                <input
                  type="text"
                  required
                  value={selectedClient.user?.name || ""}
                  onChange={e => setSelectedClient({ ...selectedClient, user: { ...selectedClient.user, name: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    value={selectedClient.user?.email || ""}
                    onChange={e => setSelectedClient({ ...selectedClient, user: { ...selectedClient.user, email: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={selectedClient.user?.phone || ""}
                    onChange={e => setSelectedClient({ ...selectedClient, user: { ...selectedClient.user, phone: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الوزن (KG)</label>
                  <input
                    type="number"
                    value={selectedClient.weightKg || 80}
                    onChange={e => setSelectedClient({ ...selectedClient, weightKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الطول (CM)</label>
                  <input
                    type="number"
                    value={selectedClient.heightCm || 175}
                    onChange={e => setSelectedClient({ ...selectedClient, heightCm: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">الرياضة</label>
                  <select
                    value={selectedClient.preferredSportId || "sport-bodybuilding"}
                    onChange={e => setSelectedClient({ ...selectedClient, preferredSportId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {sports.map(s => (
                      <option key={s.id} value={s.id}>{s.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">حالة الحساب</label>
                  <select
                    value={selectedClient.status}
                    onChange={e => setSelectedClient({ ...selectedClient, status: e.target.value as ClientStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="LEAD">LEAD</option>
                    <option value="FROZEN">FROZEN</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
                >
                  تأكيد التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

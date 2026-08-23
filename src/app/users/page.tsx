"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { User, UserRole } from "@/types";
import {
  Users,
  UserPlus,
  Shield,
  UserCheck,
  Dumbbell,
  Search,
  Filter,
  Trash2,
  Edit,
  Key,
  LogIn,
  CheckCircle,
  AlertTriangle,
  X,
  Phone,
  Mail,
  Calendar,
  Sparkles
} from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user: currentUser, loginAsRole, updateCurrentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "A@123456",
    role: "COACH" as UserRole,
    phone: "",
    avatar: "",
    specialties: "",
    yearsOfExperience: 3,
    weightKg: 80,
    heightCm: 175
  });

  const [newPassword, setNewPassword] = useState("A@123456");

  const refreshUsers = () => {
    setUsers(db.getUsers());
  };

  useEffect(() => {
    refreshUsers();
    const handleDbChange = () => refreshUsers();
    window.addEventListener("gazzar_db_change", handleDbChange);
    return () => window.removeEventListener("gazzar_db_change", handleDbChange);
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showNotification(language === "ar" ? "يرجى إدخال الاسم والبريد الإلكتروني" : "Please enter name and email", "error");
      return;
    }

    try {
      db.createUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        password: formData.password || "A@123456",
        phone: formData.phone.trim() || "+20 100 000 0000",
        avatar: formData.avatar.trim() || undefined,
        specialties: formData.specialties ? formData.specialties.split(",").map(s => s.trim()) : undefined,
        yearsOfExperience: Number(formData.yearsOfExperience) || 3,
        weightKg: Number(formData.weightKg) || 80,
        heightCm: Number(formData.heightCm) || 175
      });

      refreshUsers();
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        email: "",
        password: "A@123456",
        role: "COACH",
        phone: "",
        avatar: "",
        specialties: "",
        yearsOfExperience: 3,
        weightKg: 80,
        heightCm: 175
      });
      showNotification(language === "ar" ? "تم إنشاء المستخدم بنجاح! ✓" : "User created successfully!");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء إنشاء المستخدم", "error");
    }
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const updatedUser = db.updateUser(selectedUser.id, {
        name: selectedUser.name.trim(),
        email: selectedUser.email.trim().toLowerCase(),
        role: selectedUser.role,
        phone: selectedUser.phone,
        avatar: selectedUser.avatar
      });

      if (currentUser && (currentUser.id === selectedUser.id || currentUser.email.toLowerCase() === selectedUser.email.toLowerCase())) {
        updateCurrentUser({
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          avatar: updatedUser.avatar,
          phone: updatedUser.phone
        });
      }

      refreshUsers();
      setIsEditModalOpen(false);
      setSelectedUser(null);
      showNotification(language === "ar" ? "تم تحديث بيانات المستخدم بنجاح! ✓" : "User updated successfully!");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء التحديث", "error");
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword.trim()) return;

    try {
      db.updateUser(selectedUser.id, {
        password: newPassword.trim()
      });

      refreshUsers();
      setIsPasswordModalOpen(false);
      setSelectedUser(null);
      setNewPassword("A@123456");
      showNotification(language === "ar" ? "تم تغيير كلمة المرور بنجاح! ✓" : "Password updated successfully!");
    } catch (err: any) {
      showNotification(err.message || "حدث خطأ أثناء تغيير كلمة المرور", "error");
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (!confirm(language === "ar" ? `هل أنت متأكد من حذف المستخدم "${name}" نهائياً؟` : `Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      db.deleteUser(id);
      refreshUsers();
      showNotification(language === "ar" ? "تم حذف المستخدم بنجاح" : "User deleted successfully");
    } catch (err: any) {
      showNotification(err.message || "لا يمكن حذف هذا المستخدم", "error");
    }
  };

  const handleQuickLoginAs = (userToLogin: User) => {
    loginAsRole(userToLogin.role);
    showNotification(language === "ar" ? `تم التبديل إلى حساب: ${userToLogin.name}` : `Switched to: ${userToLogin.name}`);
    router.push("/dashboard");
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.phone && u.phone.includes(searchQuery));
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">👑 {language === "ar" ? "مدير نظام" : "Admin"}</span>;
      case "HEAD_COACH":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">⭐ {language === "ar" ? "مشرف عام" : "Head Coach"}</span>;
      case "COACH":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">🏋️ {language === "ar" ? "كابتن" : "Coach"}</span>;
      case "CLIENT":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">🏃 {language === "ar" ? "مشترك" : "Client"}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Users className="w-6 h-6 text-emerald-500" />
            <span>{language === "ar" ? "إدارة المستخدمين والحسابات" : "User & Account Management"}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "إنشاء والتحكم في كافة مستخدمي الأكاديمية (المدراء، الكباتن، المشتركون)، وتعيين كلمات المرور والصلاحيات"
              : "Create, edit and manage academy users, roles, credentials and access rights"}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>{language === "ar" ? "إضافة مستخدم جديد +" : "Create New User +"}</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 rtl:space-x-reverse animate-in fade-in ${
          notification.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
            : "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-300"
        }`}>
          {notification.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">{language === "ar" ? "إجمالي الحسابات" : "Total Users"}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-purple-600 dark:text-purple-400">{language === "ar" ? "المدراء (Admin)" : "Admins"}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{users.filter(u => u.role === "ADMIN").length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-blue-600 dark:text-blue-400">{language === "ar" ? "المشرفون (Head Coach)" : "Head Coaches"}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{users.filter(u => u.role === "HEAD_COACH").length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{language === "ar" ? "الكباتن (Coaches)" : "Coaches"}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{users.filter(u => u.role === "COACH").length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs text-amber-600 dark:text-amber-400">{language === "ar" ? "المشتركون (Clients)" : "Clients"}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{users.filter(u => u.role === "CLIENT").length}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
          <input
            type="text"
            placeholder={language === "ar" ? "بحث بالاسم أو الإيميل أو الهاتف..." : "Search by name, email, phone..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {["ALL", "ADMIN", "HEAD_COACH", "COACH", "CLIENT"].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === r
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {r === "ALL" ? (language === "ar" ? "الكل" : "All") : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5 text-start font-bold">{language === "ar" ? "المستخدم" : "User"}</th>
                <th className="px-4 py-3.5 text-start font-bold">{language === "ar" ? "الصلاحية / الدور" : "Role"}</th>
                <th className="px-4 py-3.5 text-start font-bold">{language === "ar" ? "البريد الإلكتروني" : "Email"}</th>
                <th className="px-4 py-3.5 text-start font-bold">{language === "ar" ? "الهاتف" : "Phone"}</th>
                <th className="px-4 py-3.5 text-start font-bold">{language === "ar" ? "تاريخ الإنشاء" : "Created Date"}</th>
                <th className="px-4 py-3.5 text-center font-bold">{language === "ar" ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <img
                        src={u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                        alt={u.name}
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"; }}
                        className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                      />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {getRoleBadge(u.role)}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-600 dark:text-slate-300">
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{u.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{u.phone || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center space-x-1.5 rtl:space-x-reverse">
                      <button
                        onClick={() => handleQuickLoginAs(u)}
                        title={language === "ar" ? "دخول فوري بهذا الحساب" : "Login as this user"}
                        className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        <LogIn className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setIsPasswordModalOpen(true);
                        }}
                        title={language === "ar" ? "تغيير كلمة المرور" : "Reset Password"}
                        className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <Key className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedUser({ ...u });
                          setIsEditModalOpen(true);
                        }}
                        title={language === "ar" ? "تعديل البيانات" : "Edit User"}
                        className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        title={language === "ar" ? "حذف المستخدم" : "Delete User"}
                        className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                <span>{language === "ar" ? "إضافة مستخدم جديد للنظام" : "Create New User"}</span>
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كابتن إسلام أحمد"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@gazzar.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">كلمة المرور *</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">الدور والصلاحية *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="ADMIN">مدير نظام (Admin)</option>
                    <option value="HEAD_COACH">كبير المدربين (Head Coach)</option>
                    <option value="COACH">كابتن تدريب (Coach)</option>
                    <option value="CLIENT">مشترك / متدرب (Client)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="+20 100 000 0000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {(formData.role === "COACH" || formData.role === "HEAD_COACH") && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">🏋️ بيانات الكابتن الإضافية:</p>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">التخصصات (مفصولة بفواصل)</label>
                    <input
                      type="text"
                      placeholder="كمال أجسام، كروس فيت، تغذية"
                      value={formData.specialties}
                      onChange={e => setFormData({ ...formData, specialties: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {formData.role === "CLIENT" && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">🏃 بيانات المشترك المبدئية:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">الوزن (KG)</label>
                      <input
                        type="number"
                        value={formData.weightKg}
                        onChange={e => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">الطول (CM)</label>
                      <input
                        type="number"
                        value={formData.heightCm}
                        onChange={e => setFormData({ ...formData, heightCm: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  حفظ وإنشاء المستخدم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Edit className="w-5 h-5 text-blue-500" />
                <span>تعديل بيانات المستخدم</span>
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">الاسم</label>
                <input
                  type="text"
                  required
                  value={selectedUser.name}
                  onChange={e => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={selectedUser.email}
                  onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">الصلاحية</label>
                  <select
                    value={selectedUser.role}
                    onChange={e => setSelectedUser({ ...selectedUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="HEAD_COACH">HEAD_COACH</option>
                    <option value="COACH">COACH</option>
                    <option value="CLIENT">CLIENT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">الهاتف</label>
                  <input
                    type="text"
                    value={selectedUser.phone || ""}
                    onChange={e => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Key className="w-5 h-5 text-amber-500" />
                <span>تعيين كلمة مرور جديدة</span>
              </h2>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تعيين كلمة مرور جديدة للمستخدم: <strong className="text-slate-900 dark:text-white">{selectedUser.name}</strong>
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">كلمة المرور الجديدة</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md"
                >
                  تأكيد الحفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Sport } from "@/types";
import {
  Trophy,
  PlusCircle,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  Search,
  Image as ImageIcon,
  Archive,
  RotateCcw,
  Dumbbell,
  Layers,
  BookOpen,
  Users,
  AlertTriangle
} from "lucide-react";

export default function SportsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const canManageSports = user?.role === "ADMIN" || user?.role === "HEAD_COACH";

  const [sports, setSports] = useState<Sport[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [deleteConfirmSport, setDeleteConfirmSport] = useState<Sport | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("🏆");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategories, setFormCategories] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const refreshSports = async () => {
    try {
      const res = await fetch("/api/sports");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSports(json.data);
        }
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading sports:", err);
    }
  };

  useEffect(() => {
    refreshSports();
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle Add Sport
  const handleAddSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const cats = formCategories
        .split(",")
        .map(c => c.trim())
        .filter(Boolean);

      const res = await fetch("/api/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          nameAr: formName.trim(),
          nameEn: formName.trim(),
          icon: formIcon.trim() || "🏆",
          imageUrl: formImageUrl.trim() || null,
          description: formDescription.trim() || "Certified athletic discipline",
          categories: cats.length > 0 ? cats : ["Training", "Fitness"],
          isActive: formIsActive
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to add sport");

      await refreshSports();
      setIsAddModalOpen(false);
      setFormName("");
      setFormImageUrl("");
      setFormDescription("");
      setFormCategories("");
      setFormIsActive(true);
      showNotification("Sport added successfully");
    } catch (err: any) {
      showNotification(err.message || "Error adding sport", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update Sport
  const handleUpdateSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSport || !formName.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const cats = formCategories
        .split(",")
        .map(c => c.trim())
        .filter(Boolean);

      const res = await fetch(`/api/sports/${editingSport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          nameAr: formName.trim(),
          nameEn: formName.trim(),
          icon: formIcon.trim() || "🏆",
          imageUrl: formImageUrl.trim() || null,
          description: formDescription.trim() || null,
          categories: cats,
          isActive: formIsActive
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update sport");

      await refreshSports();
      setIsEditModalOpen(false);
      setEditingSport(null);
      showNotification("Sport updated successfully");
    } catch (err: any) {
      showNotification(err.message || "Error updating sport", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (sp: Sport, nextActive: boolean) => {
    try {
      const res = await fetch(`/api/sports/${sp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update sport status");

      await refreshSports();
      setDeleteConfirmSport(null);
      setDeleteError(null);
      showNotification(nextActive ? `"${sp.nameEn}" reactivated` : `"${sp.nameEn}" archived`);
    } catch (err: any) {
      showNotification(err.message || "Error updating status", "error");
    }
  };

  // Handle Delete Sport
  const handleDeleteSport = async () => {
    if (!deleteConfirmSport || isSubmitting) return;
    setIsSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/sports/${deleteConfirmSport.id}`, {
        method: "DELETE"
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (res.status === 409) {
          setDeleteError(json.error || "Sport has active dependencies and cannot be deleted.");
          return;
        }
        throw new Error(json.error || "Failed to delete sport");
      }

      await refreshSports();
      setDeleteConfirmSport(null);
      showNotification("Sport deleted successfully");
    } catch (err: any) {
      showNotification(err.message || "Error deleting sport", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (sp: Sport) => {
    setEditingSport(sp);
    setFormName(sp.nameEn || sp.nameAr);
    setFormIcon(sp.icon || "🏆");
    setFormImageUrl(sp.imageUrl || "");
    setFormDescription(sp.descriptionEn || sp.descriptionAr || "");
    setFormCategories(sp.categories?.join(", ") || "");
    setFormIsActive(sp.isActive ?? true);
    setIsEditModalOpen(true);
  };

  const filteredSports = sports.filter(sp => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      sp.nameAr?.toLowerCase().includes(q) ||
      sp.nameEn?.toLowerCase().includes(q) ||
      sp.descriptionEn?.toLowerCase().includes(q) ||
      sp.categories?.some(c => c.toLowerCase().includes(q));

    const activeFlag = sp.isActive ?? true;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && activeFlag) ||
      (statusFilter === "ARCHIVED" && !activeFlag);

    return matchesSearch && matchesStatus;
  });

  const activeCount = sports.filter(s => s.isActive ?? true).length;
  const archivedCount = sports.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 end-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === "success"
              ? "bg-brand-crimson text-white border-brand-crimson shadow-[0_0_20px_rgba(240,20,37,0.38)]"
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5">
            <Trophy className="w-6 h-6 text-brand-crimson" />
            <span>{t("navSports")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {filteredSports.length} sports
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Academy sports catalog, athletic disciplines, active/archived status, and linked usage counts
          </p>
        </div>

        {canManageSports && (
          <button
            type="button"
            onClick={() => {
              setFormName("");
              setFormIcon("🏆");
              setFormImageUrl("");
              setFormDescription("");
              setFormCategories("Strength, Conditioning");
              setFormIsActive(true);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Sport +</span>
          </button>
        )}
      </div>

      {/* Search & Status Filter Bar */}
      <search className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="sports-search" className="sr-only">Search sports</label>
          <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
          <input
            id="sports-search"
            type="search"
            placeholder="Search sport name, discipline, description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson shadow-sm"
          />
        </div>

        <div className="inline-flex rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 shadow-sm">
          {(["ALL", "ACTIVE", "ARCHIVED"] as const).map((tab) => {
            const label =
              tab === "ALL"
                ? `All (${sports.length})`
                : tab === "ACTIVE"
                  ? `Active (${activeCount})`
                  : `Archived (${archivedCount})`;
            const selected = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selected
                    ? "bg-brand-crimson text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </search>

      {/* Sports Grid */}
      {filteredSports.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No matching sports found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Define sports and athletic disciplines offered by your academy or adjust your search filters.
            </p>
          </div>
          {canManageSports && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all inline-flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add First Sport Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSports.map(sp => {
            const isActive = sp.isActive ?? true;
            const exerciseCount = Math.max(sp._count?.exerciseSports ?? 0, sp._count?.exercises ?? 0);
            const templateCount = sp._count?.templates ?? 0;
            const programCount = sp._count?.programs ?? 0;
            const clientCount = sp._count?.clients ?? 0;

            return (
              <div
                key={sp.id}
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900/90 border shadow-sm dark:shadow-xl space-y-4 transition-all flex flex-col justify-between overflow-hidden relative group ${
                  isActive
                    ? "border-slate-200 dark:border-slate-800 hover:border-brand-crimson/40"
                    : "border-slate-200/70 dark:border-slate-800/70 opacity-80"
                }`}
              >
                {/* Optional Sport Cover Image */}
                {sp.imageUrl && (
                  <div className="w-full h-36 -mx-6 -mt-6 mb-2 overflow-hidden bg-slate-950 relative">
                    <img
                      src={sp.imageUrl}
                      alt={sp.nameEn || sp.nameAr}
                      onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30 flex items-center justify-center text-2xl shadow-lg shadow-[0_0_15px_rgba(240,20,37,0.3)] flex-shrink-0">
                        {sp.icon || "🏆"}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{sp.nameEn || sp.nameAr}</h3>
                        <span
                          className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30"
                          }`}
                        >
                          {isActive ? "Active" : "Archived"}
                        </span>
                      </div>
                    </div>

                    {canManageSports && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(sp)}
                          title="Edit sport"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(sp, !isActive)}
                          title={isActive ? "Archive sport" : "Reactivate sport"}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        >
                          {isActive ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteConfirmSport(sp);
                          }}
                          title="Delete sport"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {(sp.descriptionEn || sp.descriptionAr) && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {sp.descriptionEn || sp.descriptionAr}
                    </p>
                  )}

                  {/* Linked Usage Counts */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-bold">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                      <Dumbbell className="w-3 h-3 text-brand-crimson mx-auto mb-0.5" />
                      <div className="text-slate-900 dark:text-white">{exerciseCount}</div>
                      <div className="text-slate-500 font-medium">Exercises</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                      <Layers className="w-3 h-3 text-brand-crimson mx-auto mb-0.5" />
                      <div className="text-slate-900 dark:text-white">{templateCount}</div>
                      <div className="text-slate-500 font-medium">Templates</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                      <BookOpen className="w-3 h-3 text-brand-crimson mx-auto mb-0.5" />
                      <div className="text-slate-900 dark:text-white">{programCount}</div>
                      <div className="text-slate-500 font-medium">Programs</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center">
                      <Users className="w-3 h-3 text-brand-crimson mx-auto mb-0.5" />
                      <div className="text-slate-900 dark:text-white">{clientCount}</div>
                      <div className="text-slate-500 font-medium">Athletes</div>
                    </div>
                  </div>

                  {sp.categories && sp.categories.length > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Categories:</span>
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
            );
          })}
        </div>
      )}

      {/* --- ADD SPORT MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <PlusCircle className="w-5 h-5 text-brand-crimson" />
                  <span>Create New Sport</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter sport name, categories, and cover image
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSport} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sport Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bodybuilding & Fitness"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Icon (Emoji)</label>
                  <input
                    type="text"
                    placeholder="🏋️ or 🥊"
                    value={formIcon}
                    onChange={e => setFormIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-crimson" />
                  <span>Cover Image URL</span>
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Categories (comma separated)</label>
                <input
                  type="text"
                  placeholder="Strength, Hypertrophy, Endurance"
                  value={formCategories}
                  onChange={e => setFormCategories(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Goals, training methods, and overview..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                >
                  Save Sport ✓
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Edit2 className="w-5 h-5 text-brand-crimson" />
                  <span>Edit Sport</span>
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSport} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sport Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Icon (Emoji)</label>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={e => setFormIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-crimson" />
                  <span>Cover Image URL</span>
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Categories (comma separated)</label>
                <input
                  type="text"
                  value={formCategories}
                  onChange={e => setFormCategories(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  id="edit-sport-active"
                  type="checkbox"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 accent-brand-crimson rounded"
                />
                <label htmlFor="edit-sport-active" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Sport is Active in Academy Catalog
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                >
                  {isSubmitting ? "Saving..." : "Update Sport ✓"}
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
              {deleteError ? <AlertTriangle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {deleteError ? "Sport Has Active Records" : "Confirm Sport Deletion"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {deleteError || `Are you sure you want to delete sport "${deleteConfirmSport.nameEn || deleteConfirmSport.nameAr}"?`}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmSport(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                {t("cancel")}
              </button>
              {(deleteError || (deleteConfirmSport.isActive ?? true)) && (
                <button
                  type="button"
                  onClick={() => handleToggleActive(deleteConfirmSport, false)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center space-x-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Instead</span>
                </button>
              )}
              {!deleteError && (
                <button
                  type="button"
                  onClick={handleDeleteSport}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-red-600/30"
                >
                  {isSubmitting ? "Deleting..." : "Yes, Delete"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  X,
  Edit2,
  Trash2,
  Search,
  Image as ImageIcon
} from "lucide-react";

export default function SportsPage() {
  const { t } = useLanguage();
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
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("🏆");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategories, setFormCategories] = useState("");

  const refreshSports = () => {
    setSports(db.getSports());
  };

  useEffect(() => {
    refreshSports();
    const handleDbChange = () => refreshSports();
    window.addEventListener("gx_db_change", handleDbChange);
    return () => window.removeEventListener("gx_db_change", handleDbChange);
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
        .split(",")
        .map(c => c.trim())
        .filter(Boolean);

      db.createSport({
        nameAr: formName.trim(),
        nameEn: formName.trim(),
        icon: formIcon.trim() || "🏆",
        imageUrl: formImageUrl.trim() || undefined,
        descriptionAr: formDescription.trim() || "Certified athletic discipline",
        descriptionEn: formDescription.trim() || "Certified athletic discipline",
        categories: cats.length > 0 ? cats : ["Training", "Fitness"]
      });

      refreshSports();
      setIsAddModalOpen(false);
      setFormName("");
      setFormImageUrl("");
      setFormDescription("");
      setFormCategories("");
      showNotification("Sport added successfully! ✓");
    } catch (err: any) {
      showNotification(err.message || "Error adding sport", "error");
    }
  };

  // Handle Update Sport
  const handleUpdateSport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSport) return;

    try {
      const cats = formCategories
        .split(",")
        .map(c => c.trim())
        .filter(Boolean);

      db.updateSport(editingSport.id, {
        nameAr: formName.trim(),
        nameEn: formName.trim(),
        icon: formIcon.trim() || "🏆",
        imageUrl: formImageUrl.trim() || undefined,
        descriptionAr: formDescription.trim(),
        descriptionEn: formDescription.trim(),
        categories: cats
      });

      refreshSports();
      setIsEditModalOpen(false);
      setEditingSport(null);
      showNotification("Sport updated successfully! ✓");
    } catch (err: any) {
      showNotification(err.message || "Error updating sport", "error");
    }
  };

  // Handle Delete Sport
  const handleDeleteSport = () => {
    if (!deleteConfirmSport) return;
    try {
      db.deleteSport(deleteConfirmSport.id);
      refreshSports();
      setDeleteConfirmSport(null);
      showNotification("Sport deleted successfully");
    } catch (err: any) {
      showNotification(err.message || "Error deleting sport", "error");
    }
  };

  const openEditModal = (sp: Sport) => {
    setEditingSport(sp);
    setFormName(sp.nameEn || sp.nameAr);
    setFormIcon(sp.icon || "🏆");
    setFormImageUrl(sp.imageUrl || "");
    setFormDescription(sp.descriptionEn || sp.descriptionAr || "");
    setFormCategories(sp.categories?.join(", ") || "");
    setIsEditModalOpen(true);
  };

  const filteredSports = sports.filter(sp =>
    sp.nameAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sp.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sp.descriptionEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sp.categories?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
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
            Supported sports catalog, athletic disciplines, visual covers, and performance categories
          </p>
        </div>

        <button
          onClick={() => {
            setFormName("");
            setFormIcon("🏆");
            setFormImageUrl("");
            setFormDescription("");
            setFormCategories("Bodybuilding, Strength, Fitness");
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Sport +</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
        <input
          type="text"
          placeholder="Search sport name, discipline, description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson shadow-sm"
        />
      </div>

      {/* Sports Grid */}
      {filteredSports.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No sports registered yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Define sports and athletic disciplines offered by your academy with custom cover images.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all inline-flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add First Sport Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSports.map(sp => (
            <div
              key={sp.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4 hover:border-brand-crimson/40 transition-all flex flex-col justify-between overflow-hidden relative group"
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
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30 flex items-center justify-center text-2xl shadow-lg shadow-[0_0_15px_rgba(240,20,37,0.3)] flex-shrink-0">
                      {sp.icon || "🏆"}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{sp.nameEn || sp.nameAr}</h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(sp)}
                      title="Edit sport"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmSport(sp)}
                      title="Delete sport"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {(sp.descriptionEn || sp.descriptionAr) && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {sp.descriptionEn || sp.descriptionAr}
                  </p>
                )}

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
          ))}
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
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                >
                  Update Sport ✓
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
                Confirm Sport Deletion
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {`Are you sure you want to delete sport "${deleteConfirmSport.nameEn || deleteConfirmSport.nameAr}"?`}
              </p>
            </div>
            <div className="flex justify-center space-x-3 pt-2">
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
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

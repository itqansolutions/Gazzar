"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  ArrowLeft,
  X
} from "lucide-react";

interface ChampionshipItem {
  id: string;
  title: string;
  description?: string | null;
  year?: number | null;
  results?: string | null;
  imageUrls: string[];
  isPublished: boolean;
  isFeatured: boolean;
  displayOrder: number;
}

export default function AdminChampionshipsPage() {
  const [championships, setChampionships] = useState<ChampionshipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChamp, setEditingChamp] = useState<ChampionshipItem | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    year: new Date().getFullYear(),
    results: "",
    imageUrl: "/coach_dark_hero.jpg",
    isPublished: true,
    isFeatured: false,
    displayOrder: 1
  });

  const loadChampionships = () => {
    setLoading(true);
    fetch("/api/admin-public/championships")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setChampionships(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadChampionships();
  }, []);

  const openAddModal = () => {
    setEditingChamp(null);
    setFormData({
      title: "",
      description: "",
      year: new Date().getFullYear(),
      results: "1st Place Team Division",
      imageUrl: "/coach_dark_hero.jpg",
      isPublished: true,
      isFeatured: false,
      displayOrder: championships.length + 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ch: ChampionshipItem) => {
    setEditingChamp(ch);
    setFormData({
      title: ch.title,
      description: ch.description || "",
      year: ch.year || new Date().getFullYear(),
      results: ch.results || "",
      imageUrl: ch.imageUrls?.[0] || "/coach_dark_hero.jpg",
      isPublished: ch.isPublished,
      isFeatured: ch.isFeatured,
      displayOrder: ch.displayOrder
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      description: formData.description || null,
      year: Number(formData.year),
      results: formData.results || null,
      imageUrls: formData.imageUrl ? [formData.imageUrl] : [],
      isPublished: formData.isPublished,
      isFeatured: formData.isFeatured,
      displayOrder: Number(formData.displayOrder)
    };

    try {
      if (editingChamp) {
        await fetch(`/api/admin-public/championships/${editingChamp.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch("/api/admin-public/championships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      loadChampionships();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this championship record?")) return;
    try {
      await fetch(`/api/admin-public/championships/${id}`, { method: "DELETE" });
      loadChampionships();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin-public"
              className="p-1.5 rounded-lg hover:bg-raised text-muted hover:text-fg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-fg tracking-tight">
              Championships & Medals
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Showcase tournament titles, medals, and team trophies on the academy homepage
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-brand text-brand-contrast text-xs font-bold hover:bg-brand-hover shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Championship</span>
        </button>
      </div>

      <div className="bg-card border border-line rounded-card overflow-hidden shadow-card">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted font-bold">
            Loading championship records...
          </div>
        ) : championships.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted font-medium">
            No championships found. Click &quot;Add Championship&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-raised border-b border-line text-muted uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3">Year</th>
                  <th className="px-5 py-3">Tournament Title</th>
                  <th className="px-5 py-3">Medal / Results</th>
                  <th className="px-5 py-3">Featured</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {championships.map((ch) => (
                  <tr key={ch.id} className="hover:bg-raised/40 transition-colors">
                    <td className="px-5 py-4 font-black text-amber-500">{ch.year || "—"}</td>
                    <td className="px-5 py-4 font-bold text-fg max-w-xs">{ch.title}</td>
                    <td className="px-5 py-4 font-medium text-slate-300">
                      {ch.results || "—"}
                    </td>
                    <td className="px-5 py-4">
                      {ch.isFeatured ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/30">
                          <Star className="w-3 h-3 fill-amber-500" /> Featured
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {ch.isPublished ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                          <CheckCircle className="w-3 h-3" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-muted">
                          <XCircle className="w-3 h-3" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(ch)}
                        className="p-1.5 rounded-control bg-raised hover:bg-overlay text-fg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ch.id)}
                        className="p-1.5 rounded-control bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-line rounded-card max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-base font-bold text-fg">
                {editingChamp ? "Edit Championship Record" : "Add Championship Record"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-control text-muted hover:text-fg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Tournament Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  placeholder="e.g. National Cross-Training Championship"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Results / Placement
                </label>
                <input
                  type="text"
                  value={formData.results}
                  onChange={(e) => setFormData({ ...formData, results: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  placeholder="e.g. 1st Place Team Division, Gold Medal"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  placeholder="Details about the event, squad roster, and performance..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Image Path / URL
                </label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  placeholder="/coach_dark_hero.jpg"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFeaturedChamp"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded text-brand focus:ring-brand"
                  />
                  <label htmlFor="isFeaturedChamp" className="text-xs font-bold text-fg cursor-pointer">
                    Featured Event
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublishedChamp"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="rounded text-brand focus:ring-brand"
                  />
                  <label htmlFor="isPublishedChamp" className="text-xs font-bold text-fg cursor-pointer">
                    Published
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-control bg-raised hover:bg-overlay text-fg text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-control bg-brand hover:bg-brand-hover text-brand-contrast text-xs font-bold shadow-glow transition-all"
                >
                  {editingChamp ? "Save Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

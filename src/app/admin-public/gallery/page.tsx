"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  X
} from "lucide-react";

interface GalleryItem {
  id: string;
  imageUrl: string;
  caption?: string | null;
  category?: string | null;
  isActive: boolean;
  displayOrder: number;
}

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    imageUrl: "/coach_dark_hero.jpg",
    caption: "",
    category: "training",
    isActive: true,
    displayOrder: 1
  });

  const loadImages = () => {
    setLoading(true);
    fetch("/api/admin-public/gallery")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) setImages(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadImages();
  }, []);

  const openAddModal = () => {
    setFormData({
      imageUrl: "/coach_dark_hero.jpg",
      caption: "Athletes training at peak intensity",
      category: "training",
      isActive: true,
      displayOrder: images.length + 1
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/admin-public/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: formData.imageUrl,
          caption: formData.caption || null,
          category: formData.category || null,
          isActive: formData.isActive,
          displayOrder: Number(formData.displayOrder)
        })
      });
      setIsModalOpen(false);
      loadImages();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gallery item?")) return;
    try {
      await fetch(`/api/admin-public/gallery/${id}`, { method: "DELETE" });
      loadImages();
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
              Gallery & Media Assets
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Manage photo highlights, facility snapshots, and training moments
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-brand text-brand-contrast text-xs font-bold hover:bg-brand-hover shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Media Image</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full p-10 text-center text-xs text-muted font-bold">
            Loading gallery images...
          </div>
        ) : images.length === 0 ? (
          <div className="col-span-full p-10 text-center text-xs text-muted font-medium bg-card border border-line rounded-card">
            No gallery images configured yet. Click &quot;Add Media Image&quot; to add one.
          </div>
        ) : (
          images.map((img) => (
            <div
              key={img.id}
              className="relative rounded-card bg-card border border-line overflow-hidden shadow-card flex flex-col justify-between"
            >
              <div className="relative aspect-video w-full bg-raised">
                <Image
                  src={img.imageUrl}
                  alt={img.caption || "Gallery item"}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </div>

              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-raised border border-line text-muted uppercase">
                    {img.category || "General"}
                  </span>
                  <span className="text-[10px] font-bold text-muted">#{img.displayOrder}</span>
                </div>

                <p className="text-xs text-fg font-medium line-clamp-2">
                  {img.caption || img.imageUrl}
                </p>

                <div className="pt-2 border-t border-line flex items-center justify-between">
                  {img.isActive ? (
                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-muted flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}

                  <button
                    onClick={() => handleDelete(img.id)}
                    className="p-1 rounded-control text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-line rounded-card max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-base font-bold text-fg">Add Gallery Image</h3>
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
                  Image Path / URL *
                </label>
                <input
                  type="text"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand font-mono"
                  placeholder="/coach_dark_hero.jpg"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Caption / Title
                </label>
                <input
                  type="text"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  placeholder="e.g. Morning Conditioning Workout"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  >
                    <option value="training">Training</option>
                    <option value="championships">Championships</option>
                    <option value="facility">Facility</option>
                    <option value="athletes">Athletes</option>
                  </select>
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

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveGallery"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-brand focus:ring-brand"
                />
                <label htmlFor="isActiveGallery" className="text-xs font-bold text-fg cursor-pointer">
                  Active (Visible in Gallery)
                </label>
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
                  Add Image
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

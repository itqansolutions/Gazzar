"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Flame,
  ArrowLeft,
  X
} from "lucide-react";

interface PublicPackageItem {
  id: string;
  nameEn: string;
  nameAr?: string | null;
  descriptionEn?: string | null;
  price: number;
  currency: string;
  durationDays: number;
  sessionsCount?: number | null;
  benefits: string[];
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<PublicPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PublicPackageItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nameEn: "",
    nameAr: "",
    descriptionEn: "",
    price: 1500,
    currency: "EGP",
    durationDays: 30,
    sessionsCount: "",
    benefits: "",
    isActive: true,
    isFeatured: false,
    displayOrder: 1
  });

  const loadPackages = () => {
    setLoading(true);
    fetch("/api/admin-public/packages")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setPackages(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const openAddModal = () => {
    setEditingPkg(null);
    setFormData({
      nameEn: "",
      nameAr: "",
      descriptionEn: "",
      price: 1500,
      currency: "EGP",
      durationDays: 30,
      sessionsCount: "",
      benefits: "Full gym floor access\nLocker & shower facilities\nInBody assessment",
      isActive: true,
      isFeatured: false,
      displayOrder: packages.length + 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: PublicPackageItem) => {
    setEditingPkg(pkg);
    setFormData({
      nameEn: pkg.nameEn,
      nameAr: pkg.nameAr || "",
      descriptionEn: pkg.descriptionEn || "",
      price: pkg.price,
      currency: pkg.currency || "EGP",
      durationDays: pkg.durationDays,
      sessionsCount: pkg.sessionsCount ? String(pkg.sessionsCount) : "",
      benefits: pkg.benefits.join("\n"),
      isActive: pkg.isActive,
      isFeatured: pkg.isFeatured,
      displayOrder: pkg.displayOrder
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nameEn: formData.nameEn,
      nameAr: formData.nameAr || null,
      descriptionEn: formData.descriptionEn || null,
      price: Number(formData.price),
      currency: formData.currency,
      durationDays: Number(formData.durationDays),
      sessionsCount: formData.sessionsCount ? Number(formData.sessionsCount) : null,
      benefits: formData.benefits
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean),
      isActive: formData.isActive,
      isFeatured: formData.isFeatured,
      displayOrder: Number(formData.displayOrder)
    };

    try {
      if (editingPkg) {
        await fetch(`/api/admin-public/packages/${editingPkg.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch("/api/admin-public/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      loadPackages();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this public package?")) return;
    try {
      await fetch(`/api/admin-public/packages/${id}`, { method: "DELETE" });
      loadPackages();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
              Public Packages & Pricing
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Configure rates, benefits, and WhatsApp subscription links displayed on the homepage
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-brand text-brand-contrast text-xs font-bold hover:bg-brand-hover shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Package</span>
        </button>
      </div>

      {/* Packages Table / List */}
      <div className="bg-card border border-line rounded-card overflow-hidden shadow-card">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted font-bold">
            Loading public packages...
          </div>
        ) : packages.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted font-medium">
            No public packages found. Click &quot;Add New Package&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-raised border-b border-line text-muted uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Package Name</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Featured</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-raised/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-fg">#{pkg.displayOrder}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-fg">{pkg.nameEn}</div>
                      {pkg.nameAr && <div className="text-muted text-[11px]">{pkg.nameAr}</div>}
                    </td>
                    <td className="px-5 py-4 font-black text-brand">
                      {pkg.price} {pkg.currency}
                    </td>
                    <td className="px-5 py-4 text-fg font-medium">{pkg.durationDays} Days</td>
                    <td className="px-5 py-4">
                      {pkg.isFeatured ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600/15 text-red-500 border border-red-500/30">
                          <Flame className="w-3 h-3" /> Featured
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {pkg.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-muted">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(pkg)}
                        className="p-1.5 rounded-control bg-raised hover:bg-overlay text-fg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg.id)}
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-line rounded-card max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-base font-bold text-fg">
                {editingPkg ? "Edit Public Package" : "Add New Public Package"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-control text-muted hover:text-fg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    English Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                    placeholder="e.g. 3 Months Transformation"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Arabic Name
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                    placeholder="باقة التحول"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.durationDays}
                    onChange={(e) =>
                      setFormData({ ...formData, durationDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.descriptionEn}
                  onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  placeholder="Summary of the membership..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Benefits (One per line)
                </label>
                <textarea
                  rows={4}
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand font-mono"
                  placeholder="Full gym floor access&#10;Locker & shower facilities&#10;InBody assessment"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 items-center">
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

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded text-brand focus:ring-brand"
                  />
                  <label htmlFor="isFeatured" className="text-xs font-bold text-fg cursor-pointer">
                    Featured
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-brand focus:ring-brand"
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-fg cursor-pointer">
                    Active
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
                  {editingPkg ? "Save Changes" : "Create Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

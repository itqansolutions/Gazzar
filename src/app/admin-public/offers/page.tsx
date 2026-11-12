"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  X
} from "lucide-react";

interface PublicOfferItem {
  id: string;
  packageId?: string | null;
  package?: { id: string; nameEn: string; price: number; currency: string } | null;
  title: string;
  description?: string | null;
  discount?: number | null;
  promoPrice?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface PackageOption {
  id: string;
  nameEn: string;
  price: number;
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<PublicOfferItem[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PublicOfferItem | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    packageId: "",
    description: "",
    discount: "",
    promoPrice: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    isActive: true
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin-public/offers").then((r) => r.json()),
      fetch("/api/admin-public/packages").then((r) => r.json())
    ])
      .then(([offersRes, pkgsRes]) => {
        if (offersRes.success && offersRes.data) setOffers(offersRes.data);
        if (pkgsRes.success && pkgsRes.data) setPackages(pkgsRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingOffer(null);
    setFormData({
      title: "",
      packageId: packages[0]?.id || "",
      description: "Limited season promotional registration discount.",
      discount: "15",
      promoPrice: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (o: PublicOfferItem) => {
    setEditingOffer(o);
    setFormData({
      title: o.title,
      packageId: o.packageId || "",
      description: o.description || "",
      discount: o.discount ? String(o.discount) : "",
      promoPrice: o.promoPrice ? String(o.promoPrice) : "",
      startDate: o.startDate.split("T")[0],
      endDate: o.endDate.split("T")[0],
      isActive: o.isActive
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      packageId: formData.packageId || null,
      description: formData.description || null,
      discount: formData.discount ? Number(formData.discount) : null,
      promoPrice: formData.promoPrice ? Number(formData.promoPrice) : null,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      isActive: formData.isActive
    };

    try {
      if (editingOffer) {
        await fetch(`/api/admin-public/offers/${editingOffer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch("/api/admin-public/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotional offer?")) return;
    try {
      await fetch(`/api/admin-public/offers/${id}`, { method: "DELETE" });
      loadData();
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
              Promotional Offers & Discounts
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Configure time-limited discounts and promo rates displayed on the homepage
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-brand text-brand-contrast text-xs font-bold hover:bg-brand-hover shadow-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Offer</span>
        </button>
      </div>

      <div className="bg-card border border-line rounded-card overflow-hidden shadow-card">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted font-bold">
            Loading promotional offers...
          </div>
        ) : offers.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted font-medium">
            No promotional offers configured. Click &quot;Add New Offer&quot; to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-raised border-b border-line text-muted uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3">Offer Title</th>
                  <th className="px-5 py-3">Linked Package</th>
                  <th className="px-5 py-3">Benefit / Discount</th>
                  <th className="px-5 py-3">Valid Until</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {offers.map((o) => (
                  <tr key={o.id} className="hover:bg-raised/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-fg">{o.title}</td>
                    <td className="px-5 py-4 text-muted">
                      {o.package ? o.package.nameEn : "All Packages"}
                    </td>
                    <td className="px-5 py-4 font-black text-brand">
                      {o.discount ? `${o.discount}% OFF` : o.promoPrice ? `${o.promoPrice} EGP` : "Deal"}
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {new Date(o.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      {o.isActive ? (
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
                        onClick={() => openEditModal(o)}
                        className="p-1.5 rounded-control bg-raised hover:bg-overlay text-fg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(o.id)}
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
                {editingOffer ? "Edit Promotional Offer" : "Add Promotional Offer"}
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
                  Offer Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  placeholder="e.g. Early Bird Spring Pass"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Applicable Package (Optional)
                </label>
                <select
                  value={formData.packageId}
                  onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                >
                  <option value="">All Packages / General Offer</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn} ({p.price} EGP)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                    placeholder="e.g. 15"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Special Promo Price (EGP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.promoPrice}
                    onChange={(e) => setFormData({ ...formData, promoPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                    placeholder="e.g. 3200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  placeholder="Explain eligibility, bonuses, or promo conditions..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveOffer"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-brand focus:ring-brand"
                />
                <label htmlFor="isActiveOffer" className="text-xs font-bold text-fg cursor-pointer">
                  Active (Show on Public Site)
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
                  {editingOffer ? "Save Changes" : "Create Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

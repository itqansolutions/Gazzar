"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  UserCheck,
  Edit2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  X,
  Award
} from "lucide-react";

interface CoachItem {
  id: string;
  specialties: string[];
  bio?: string | null;
  yearsOfExperience: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  publicProfile?: {
    id: string;
    isPublic: boolean;
    displayOrder: number;
    publicTitle?: string | null;
    publicBio?: string | null;
  } | null;
}

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<CoachItem | null>(null);

  const [formData, setFormData] = useState({
    isPublic: true,
    publicTitle: "",
    publicBio: "",
    displayOrder: 1
  });

  const loadCoaches = () => {
    setLoading(true);
    fetch("/api/admin-public/coaches")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) setCoaches(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCoaches();
  }, []);

  const openEditModal = (c: CoachItem) => {
    setEditingCoach(c);
    setFormData({
      isPublic: c.publicProfile ? c.publicProfile.isPublic : false,
      publicTitle:
        c.publicProfile?.publicTitle ||
        (c.specialties?.[0] ? `Head Coach — ${c.specialties[0]}` : "Elite Coach"),
      publicBio: c.publicProfile?.publicBio || c.bio || "",
      displayOrder: c.publicProfile?.displayOrder || 1
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoach) return;

    try {
      await fetch("/api/admin-public/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachProfileId: editingCoach.id,
          isPublic: formData.isPublic,
          publicTitle: formData.publicTitle || null,
          publicBio: formData.publicBio || null,
          displayOrder: Number(formData.displayOrder)
        })
      });
      setIsModalOpen(false);
      loadCoaches();
    } catch (err) {
      console.error("Save error:", err);
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
              Coach Public Profiles
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Control which coaches appear on the public landing page, along with their custom titles and bios
          </p>
        </div>
      </div>

      <div className="bg-card border border-line rounded-card overflow-hidden shadow-card">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted font-bold">
            Loading coaches...
          </div>
        ) : coaches.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted font-medium">
            No coach profiles found in database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-raised border-b border-line text-muted uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3">Coach</th>
                  <th className="px-5 py-3">Public Title</th>
                  <th className="px-5 py-3">Specialties</th>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Public Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {coaches.map((c) => {
                  const isPub = Boolean(c.publicProfile?.isPublic);
                  return (
                    <tr key={c.id} className="hover:bg-raised/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-raised flex-shrink-0">
                            <Image
                              src={c.user.avatar || "/coach_abdullah_portrait.png"}
                              alt={c.user.name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-fg">{c.user.name}</div>
                            <div className="text-muted text-[11px]">{c.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-fg">
                        {c.publicProfile?.publicTitle || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {c.specialties?.slice(0, 2).map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded bg-raised border border-line text-[10px] text-muted font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-fg">
                        #{c.publicProfile?.displayOrder ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        {isPub ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                            <CheckCircle className="w-3 h-3" /> Visible on Homepage
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-muted">
                            <XCircle className="w-3 h-3" /> Hidden
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openEditModal(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-raised hover:bg-overlay text-fg text-xs font-bold transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Configure</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && editingCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-line rounded-card max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-base font-bold text-fg">
                Public Settings for {editingCoach.user.name}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-control text-muted hover:text-fg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-control bg-raised border border-line">
                <input
                  type="checkbox"
                  id="isPublicCoach"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="rounded text-brand focus:ring-brand w-4 h-4"
                />
                <label htmlFor="isPublicCoach" className="text-xs font-bold text-fg cursor-pointer">
                  Feature Coach on Public Homepage
                </label>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Public Title / Role
                </label>
                <input
                  type="text"
                  value={formData.publicTitle}
                  onChange={(e) => setFormData({ ...formData, publicTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  placeholder="e.g. Master Boxing & Strength Coach"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Display Sequence Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Public Bio (Homepage excerpt)
                </label>
                <textarea
                  rows={4}
                  value={formData.publicBio}
                  onChange={(e) => setFormData({ ...formData, publicBio: e.target.value })}
                  className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                  placeholder="Coach credentials, philosophy, or personal message to new athletes..."
                />
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
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

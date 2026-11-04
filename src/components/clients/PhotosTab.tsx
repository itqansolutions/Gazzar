"use client";

import React, { useState } from "react";
import { ClientProgressPhoto } from "@/types";
import { db } from "@/lib/db";
import { PlusCircle, X } from "lucide-react";

interface PhotosTabProps {
  photos: ClientProgressPhoto[];
  clientId: string;
}

export default function PhotosTab({ photos, clientId }: PhotosTabProps) {
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [poseType, setPoseType] = useState<"FRONT" | "BACK" | "SIDE">("FRONT");

  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) return;

    db.addProgressPhoto(clientId, {
      date: new Date().toISOString().slice(0, 10),
      frontImageUrl: poseType === "FRONT" ? photoUrl : undefined,
      sideImageUrl: poseType === "SIDE" ? photoUrl : undefined,
      backImageUrl: poseType === "BACK" ? photoUrl : undefined,
      notes: `${poseType} pose`
    });

    setPhotoModalOpen(false);
    setPhotoUrl("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Transformation & Progress Photos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visual body transformation tracking over time
          </p>
        </div>

        <button
          onClick={() => setPhotoModalOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs flex items-center space-x-1 cursor-pointer shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Add Photo</span>
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          No progress photos uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map(p => (
            <div key={p.id} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 relative group">
              <img
                src={p.frontImageUrl || p.sideImageUrl || p.backImageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"}
                alt="Progress"
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-950/80 to-transparent text-white text-[11px]">
                <p className="font-bold">{p.date}</p>
                <p className="text-slate-300 text-[10px]">{p.notes || "Progress photo"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {photoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Progress Photo</h3>
              <button onClick={() => setPhotoModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPhoto} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Image URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pose Type</label>
                <select
                  value={poseType}
                  onChange={e => setPoseType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                >
                  <option value="FRONT">Front</option>
                  <option value="BACK">Back</option>
                  <option value="SIDE">Side</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                >
                  Save Photo ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { ClientProgressPhoto } from "@/types";
import { PlusCircle, X } from "lucide-react";

interface PhotosTabProps {
  photos: ClientProgressPhoto[];
  clientId: string;
}

export default function PhotosTab({ photos: initialPhotos, clientId }: PhotosTabProps) {
  const [photos, setPhotos] = useState<ClientProgressPhoto[]>(initialPhotos || []);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [poseType, setPoseType] = useState<"FRONT" | "BACK" | "SIDE">("FRONT");
  const [submitting, setSubmitting] = useState(false);

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/clients/${clientId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontImageUrl: poseType === "FRONT" ? photoUrl : undefined,
          sideImageUrl: poseType === "SIDE" ? photoUrl : undefined,
          backImageUrl: poseType === "BACK" ? photoUrl : undefined,
          notes: `${poseType} pose`
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPhotos((prev) => [json.data, ...prev]);
        }
        setPhotoModalOpen(false);
        setPhotoUrl("");
      }
    } catch (err) {
      console.error("[PhotosTab] Error saving photo:", err);
    } finally {
      setSubmitting(false);
    }
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
          className="px-3.5 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse cursor-pointer shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
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
          {photos.map((p) => {
            const url = p.frontImageUrl || p.sideImageUrl || p.backImageUrl;
            return (
              <div
                key={p.id}
                className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 aspect-[3/4] shadow-sm hover:border-brand-crimson/50 transition-all"
              >
                {url ? (
                  <img
                    src={url}
                    alt="Progress"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                    No image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                  <span className="text-[10px] font-bold text-brand-crimson uppercase tracking-wider">
                    {p.frontImageUrl ? "FRONT" : p.sideImageUrl ? "SIDE" : "BACK"}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {p.date ? new Date(p.date).toISOString().slice(0, 10) : "N/A"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setPhotoModalOpen(false)}
              className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Add Progress Photo
            </h3>

            <form onSubmit={handleAddPhoto} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pose Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["FRONT", "SIDE", "BACK"] as const).map((pose) => (
                    <button
                      type="button"
                      key={pose}
                      onClick={() => setPoseType(pose)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        poseType === pose
                          ? "bg-brand-crimson text-white border-brand-crimson"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {pose}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Photo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

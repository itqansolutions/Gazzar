"use client";

import React, { useState } from "react";
import { PlusCircle, X, Upload, Camera, FileText } from "lucide-react";

interface PhotoAsset {
  id: string;
  angle: "FRONT" | "SIDE" | "BACK" | "FULL" | "NOT_APPLICABLE";
  storageKey: string;
  mimeType: string;
}

interface PhotoRecord {
  id: string;
  date: string;
  recordType?: "PHYSIQUE_SET" | "INBODY_SCAN" | "OTHER";
  frontImageUrl?: string | null;
  sideImageUrl?: string | null;
  backImageUrl?: string | null;
  notes?: string | null;
  assets?: PhotoAsset[];
}

interface PhotosTabProps {
  photos: PhotoRecord[];
  clientId: string;
}

export default function PhotosTab({ photos: initialPhotos, clientId }: PhotosTabProps) {
  const [photos, setPhotos] = useState<PhotoRecord[]>(initialPhotos || []);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"FILE" | "URL">("FILE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [poseType, setPoseType] = useState<"FRONT" | "BACK" | "SIDE" | "FULL">("FRONT");
  const [recordType, setRecordType] = useState<"PHYSIQUE_SET" | "INBODY_SCAN" | "OTHER">("PHYSIQUE_SET");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      if (uploadMode === "FILE") {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("angle", poseType);
        formData.append("recordType", recordType);
        if (notes) formData.append("notes", notes);

        const res = await fetch(`/api/clients/${clientId}/photos/upload`, {
          method: "POST",
          body: formData
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            // Refresh list
            const refreshRes = await fetch(`/api/clients/${clientId}/photos`);
            if (refreshRes.ok) {
              const refreshJson = await refreshRes.json();
              if (refreshJson.success) setPhotos(refreshJson.data || []);
            }
          }
          setPhotoModalOpen(false);
          setSelectedFile(null);
          setNotes("");
        } else {
          const err = await res.json();
          alert(err.error || "Failed to upload photo");
        }
      } else {
        // Legacy URL upload
        if (!photoUrl) return;
        const res = await fetch(`/api/clients/${clientId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frontImageUrl: poseType === "FRONT" ? photoUrl : undefined,
            sideImageUrl: poseType === "SIDE" ? photoUrl : undefined,
            backImageUrl: poseType === "BACK" ? photoUrl : undefined,
            notes: notes || `${poseType} pose`
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setPhotos((prev) => [json.data, ...prev]);
          }
          setPhotoModalOpen(false);
          setPhotoUrl("");
          setNotes("");
        }
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
            Secure private progress photos & InBody scans with role-based access
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
            // Determine image stream URL or fallback URL
            let imageUrl: string | null = null;
            let displayAngle = "FRONT";

            if (p.assets && p.assets.length > 0) {
              const firstAsset = p.assets[0];
              imageUrl = `/api/clients/${clientId}/photos/${p.id}/assets/${firstAsset.id}/file`;
              displayAngle = firstAsset.angle;
            } else {
              imageUrl = p.frontImageUrl || p.sideImageUrl || p.backImageUrl || null;
              displayAngle = p.frontImageUrl ? "FRONT" : p.sideImageUrl ? "SIDE" : "BACK";
            }

            return (
              <div
                key={p.id}
                className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 aspect-[3/4] shadow-sm hover:border-brand-crimson/50 transition-all"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Progress"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                    No image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-brand-crimson uppercase tracking-wider">
                      {p.recordType === "INBODY_SCAN" ? "INBODY SCAN" : displayAngle}
                    </span>
                    <span className="text-[10px] text-slate-300 font-semibold">
                      {p.date ? new Date(p.date).toISOString().slice(0, 10) : "N/A"}
                    </span>
                  </div>
                  {p.notes && <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.notes}</p>}
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
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Add Secure Progress Photo
            </h3>

            {/* Mode Toggle */}
            <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 mb-4">
              <button
                type="button"
                onClick={() => setUploadMode("FILE")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  uploadMode === "FILE"
                    ? "bg-white dark:bg-slate-900 text-brand-crimson shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Upload File (Secure Volume)
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("URL")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  uploadMode === "URL"
                    ? "bg-white dark:bg-slate-900 text-brand-crimson shadow-sm"
                    : "text-slate-500"
                }`}
              >
                External URL
              </button>
            </div>

            <form onSubmit={handleUploadPhoto} className="space-y-4">
              {/* Record Type */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Photo Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecordType("PHYSIQUE_SET");
                      if (poseType === "FULL") setPoseType("FRONT");
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      recordType === "PHYSIQUE_SET"
                        ? "bg-brand-crimson text-white border-brand-crimson"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Physique Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordType("INBODY_SCAN");
                      setPoseType("FULL");
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      recordType === "INBODY_SCAN"
                        ? "bg-brand-crimson text-white border-brand-crimson"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    InBody Scan
                  </button>
                </div>
              </div>

              {/* Pose Angle if Physique */}
              {recordType === "PHYSIQUE_SET" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Pose Angle
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
              )}

              {/* File Input or URL Input */}
              {uploadMode === "FILE" ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Image File (Max 10MB)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-crimson file:text-white hover:file:bg-[#FF2D3B] cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              ) : (
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
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning fasted physique, 4 weeks into cut"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
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
                  disabled={submitting || (uploadMode === "FILE" && !selectedFile)}
                  className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50"
                >
                  {submitting ? "Uploading..." : "Save Photo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PRESET_AVATARS, resolveAvatar } from "@/lib/avatars";

export default function AvatarPicker({ onClose, onChanged }: { onClose: () => void; onChanged?: (src: string) => void }) {
  const { user, updateCurrentUser } = useAuth();
  const current = resolveAvatar(user?.avatar);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const choose = async (src: string) => {
    setSaving(src);
    setError("");
    try {
      const res = await fetch("/api/auth/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: src })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Could not save");
      updateCurrentUser({ avatar: src });
      onChanged?.(src);
      onClose();
    } catch (e: any) {
      setError(e.message || "Could not save");
    } finally {
      setSaving(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-white">Choose your avatar</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {PRESET_AVATARS.map((a) => (
            <button
              key={a.id}
              onClick={() => choose(a.src)}
              disabled={!!saving}
              aria-label={`Avatar ${a.id}`}
              className={`relative rounded-full overflow-hidden aspect-square border-2 transition ${
                current === a.src ? "border-brand-crimson" : "border-transparent hover:border-slate-400"
              }`}
            >
              <img src={a.src} alt={a.id} className="w-full h-full object-cover" />
              {current === a.src && (
                <span className="absolute bottom-0 right-0 bg-brand-crimson text-white rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>,
    document.body
  );
}

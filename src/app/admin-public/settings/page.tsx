"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  Save,
  ArrowLeft,
  CheckCircle,
  Phone,
  MessageCircle,
  Globe,
  MapPin,
  Mail,
  Instagram,
  Facebook,
  Flame
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    whatsapp_number: "+201000000000",
    academy_name: "GX Fitness Academy",
    academy_tagline: "Train Hard. Live Strong.",
    academy_description:
      "A premier athletic training academy built for athletic excellence, strength mastery, and life-changing physical transformation.",
    years_experience: "10+",
    athletes_trained: "1,500+",
    sports_offered: "8+",
    email: "info@gxfitness.academy",
    phone: "+20 100 000 0000",
    location: "New Cairo, Cairo, Egypt",
    instagram_url: "https://instagram.com/gxfitnessacademy",
    facebook_url: "https://facebook.com/gxfitnessacademy",
    tiktok_url: "https://tiktok.com/@gxfitnessacademy"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/admin-public/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/admin-public/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
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
              Academy Public Settings
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Global academy information, WhatsApp acquisition number, address, and social links
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold border border-emerald-500/30">
            <CheckCircle className="w-4 h-4" />
            <span>Settings Saved Successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* WhatsApp & Core Admissions */}
        <div className="p-6 rounded-card bg-card border border-line shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-line text-sm font-bold text-fg">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Admissions & WhatsApp Conversion</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                WhatsApp Phone Number (with Country Code) *
              </label>
              <input
                type="text"
                required
                value={settings.whatsapp_number || ""}
                onChange={(e) => handleChange("whatsapp_number", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand font-mono"
                placeholder="+201000000000"
              />
              <span className="text-[10px] text-muted block mt-1">
                Used for all one-click &quot;Subscribe on WhatsApp&quot; buttons and floating chat.
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Display Phone Number
              </label>
              <input
                type="text"
                value={settings.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                placeholder="+20 100 000 0000"
              />
            </div>
          </div>
        </div>

        {/* Academy Branding & Copy */}
        <div className="p-6 rounded-card bg-card border border-line shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-line text-sm font-bold text-fg">
            <Globe className="w-4 h-4 text-brand" />
            <span>Academy Identity & Messaging</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Academy Name *
              </label>
              <input
                type="text"
                required
                value={settings.academy_name || ""}
                onChange={(e) => handleChange("academy_name", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Tagline / Motto *
              </label>
              <input
                type="text"
                required
                value={settings.academy_tagline || ""}
                onChange={(e) => handleChange("academy_tagline", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted block mb-1">
              Academy Description & Mission
            </label>
            <textarea
              rows={3}
              value={settings.academy_description || ""}
              onChange={(e) => handleChange("academy_description", e.target.value)}
              className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand leading-relaxed"
            />
          </div>

          {/* Stats Bar Counters */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Years Experience
              </label>
              <input
                type="text"
                value={settings.years_experience || ""}
                onChange={(e) => handleChange("years_experience", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                placeholder="10+"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Athletes Coached
              </label>
              <input
                type="text"
                value={settings.athletes_trained || ""}
                onChange={(e) => handleChange("athletes_trained", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                placeholder="1,500+"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Sports Offered
              </label>
              <input
                type="text"
                value={settings.sports_offered || ""}
                onChange={(e) => handleChange("sports_offered", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                placeholder="8+"
              />
            </div>
          </div>
        </div>

        {/* Location & Social Links */}
        <div className="p-6 rounded-card bg-card border border-line shadow-card space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-line text-sm font-bold text-fg">
            <MapPin className="w-4 h-4 text-purple-400" />
            <span>Location, Email & Social Media</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Location / Facility Address
              </label>
              <input
                type="text"
                value={settings.location || ""}
                onChange={(e) => handleChange("location", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                placeholder="New Cairo, Cairo, Egypt"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={settings.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                placeholder="info@gxfitness.academy"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Instagram URL
              </label>
              <input
                type="url"
                value={settings.instagram_url || ""}
                onChange={(e) => handleChange("instagram_url", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                placeholder="https://instagram.com/..."
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Facebook URL
              </label>
              <input
                type="url"
                value={settings.facebook_url || ""}
                onChange={(e) => handleChange("facebook_url", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                placeholder="https://facebook.com/..."
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                TikTok URL
              </label>
              <input
                type="url"
                value={settings.tiktok_url || ""}
                onChange={(e) => handleChange("tiktok_url", e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-raised border border-line text-fg text-xs focus:outline-none focus:border-brand"
                placeholder="https://tiktok.com/@..."
              />
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-control bg-brand hover:bg-brand-hover text-brand-contrast text-xs font-bold shadow-glow transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Academy Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

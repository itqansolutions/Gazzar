"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Package,
  Trophy,
  Tag,
  UserCheck,
  Settings,
  Image as ImageIcon,
  ExternalLink,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminPublicDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    packagesCount: 0,
    championshipsCount: 0,
    offersCount: 0,
    coachesCount: 0,
    galleryCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin-public/packages").then((r) => r.json()),
      fetch("/api/admin-public/championships").then((r) => r.json()),
      fetch("/api/admin-public/offers").then((r) => r.json()),
      fetch("/api/admin-public/coaches").then((r) => r.json()),
      fetch("/api/admin-public/gallery").then((r) => r.json())
    ])
      .then(([pkgs, champs, offs, cchs, gals]) => {
        setStats({
          packagesCount: pkgs.data?.length || 0,
          championshipsCount: champs.data?.length || 0,
          offersCount: offs.data?.length || 0,
          coachesCount: cchs.data?.filter((c: any) => c.publicProfile?.isPublic).length || 0,
          galleryCount: gals.data?.length || 0
        });
      })
      .catch((err) => console.error("[AdminPublicDashboard] Error:", err))
      .finally(() => setLoading(false));
  }, []);

  const cmsCards = [
    {
      title: "Public Membership Packages",
      description: "Manage membership tiers, prices, durations, benefits, and featured flags.",
      count: stats.packagesCount,
      icon: Package,
      href: "/admin-public/packages",
      color: "text-red-500",
      bg: "bg-red-500/10"
    },
    {
      title: "Championship Records",
      description: "Publish tournament titles, medals, podium finishes, and event years.",
      count: stats.championshipsCount,
      icon: Trophy,
      href: "/admin-public/championships",
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: "Promotional Offers",
      description: "Configure seasonal discounts, promo rates, expiry dates, and WhatsApp campaigns.",
      count: stats.offersCount,
      icon: Tag,
      href: "/admin-public/offers",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    {
      title: "Coach Public Profiles",
      description: "Toggle landing page visibility, custom titles, bios, and display sequence.",
      count: stats.coachesCount,
      icon: UserCheck,
      href: "/admin-public/coaches",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Academy Settings",
      description: "Configure WhatsApp number, mission, tagline, social links, and contact info.",
      count: "Live",
      icon: Settings,
      href: "/admin-public/settings",
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      title: "Gallery & Media",
      description: "Manage visual banners, gym facility images, and athlete training moments.",
      count: stats.galleryCount,
      icon: ImageIcon,
      href: "/admin-public/gallery",
      color: "text-cyan-500",
      bg: "bg-cyan-500/10"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-brand" />
            <h1 className="text-xl sm:text-2xl font-black text-fg tracking-tight">
              Website CMS & Content Hub
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Manage public website sections, membership rates, trophies, coaches, and contact channels
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-raised hover:bg-overlay border border-line text-xs font-bold text-fg transition-all"
          >
            <span>Live Website Preview</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted" />
          </Link>
        </div>
      </div>

      {/* Grid of CMS Section Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cmsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group p-6 rounded-card bg-card border border-line hover:border-brand/40 shadow-card hover:shadow-glow transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-control ${card.bg} ${card.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-raised border border-line text-fg">
                    {loading ? "..." : card.count}
                  </span>
                </div>

                <h3 className="text-base font-bold text-fg group-hover:text-brand transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1.5">
                  {card.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-line flex items-center justify-between text-xs font-bold text-brand group-hover:translate-x-0.5 transition-transform">
                <span>Manage Section</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

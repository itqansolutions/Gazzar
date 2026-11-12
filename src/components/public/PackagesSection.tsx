"use client";

import React, { useState, useEffect } from "react";
import { Check, Flame, MessageCircle, Sparkles, PhoneCall } from "lucide-react";

interface PublicPackageItem {
  id: string;
  nameEn: string;
  nameAr?: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  price: number;
  currency: string;
  durationDays: number;
  sessionsCount?: number | null;
  sportsIncluded?: string[];
  benefits: string[];
  isActive: boolean;
  isFeatured: boolean;
}

interface PackagesSectionProps {
  initialPackages?: PublicPackageItem[];
  whatsappNumber?: string;
}

export default function PackagesSection({
  initialPackages,
  whatsappNumber = ""
}: PackagesSectionProps) {
  const [packages, setPackages] = useState<PublicPackageItem[]>(
    initialPackages?.filter((p) => p.isActive) || []
  );
  const [loading, setLoading] = useState(!initialPackages);

  useEffect(() => {
    if (!initialPackages) {
      fetch("/api/public/packages")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setPackages(json.data.filter((p: PublicPackageItem) => p.isActive));
          } else {
            setPackages([]);
          }
        })
        .catch(() => setPackages([]))
        .finally(() => setLoading(false));
    }
  }, [initialPackages]);

  const cleanWhatsApp = (whatsappNumber || "").replace(/[^0-9]/g, "");

  const formatDuration = (days: number) => {
    if (days === 30) return "1 Month";
    if (days === 90) return "3 Months";
    if (days === 180) return "6 Months";
    if (days === 365) return "1 Year";
    return `${days} Days`;
  };

  return (
    <section id="packages" className="py-20 lg:py-28 bg-[#0b0c13] text-white border-t border-white/[0.06] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            <span>Memberships & Rates</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
            Invest in Your Performance
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">
            Transparent pricing with zero hidden fees. Select your tier and start your training regime immediately.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        {packages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {packages.map((pkg) => {
              const isFeatured = pkg.isFeatured;
              const waText = `Hello GX Fitness Academy, I am interested in subscribing to the ${pkg.nameEn} package at ${pkg.price} ${pkg.currency}. Please contact me to complete my registration.`;
              const hasWhatsApp = Boolean(cleanWhatsApp);
              const waUrl = hasWhatsApp
                ? `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(waText)}`
                : "#contact";

              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                    isFeatured
                      ? "bg-[#141724] border-2 border-red-500/80 shadow-[0_12px_45px_rgba(220,38,38,0.22)] -translate-y-1 lg:-translate-y-2"
                      : "bg-[#11131c] border border-white/[0.08] hover:border-white/20 shadow-xl"
                  }`}
                >
                  {/* Featured Badge */}
                  {isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                      <Flame className="w-3.5 h-3.5 fill-white" />
                      <span>Most Popular</span>
                    </div>
                  )}

                  <div>
                    {/* Package Title & Duration */}
                    <div className="mb-4">
                      <h3 className="text-lg font-black text-white break-words">{pkg.nameEn}</h3>
                      {pkg.nameAr && (
                        <p className="text-xs text-slate-400 font-medium mt-0.5" dir="rtl">
                          {pkg.nameAr}
                        </p>
                      )}
                      <div className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-white/[0.06] text-slate-300 mt-2">
                        {formatDuration(pkg.durationDays)} • {pkg.sessionsCount ? `${pkg.sessionsCount} Sessions` : "Unlimited Access"}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="my-5 pb-5 border-b border-white/[0.08]">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                          {pkg.price.toLocaleString()}
                        </span>
                        <span className="text-sm font-bold text-red-500 uppercase">
                          {pkg.currency}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Billed for full {formatDuration(pkg.durationDays)}
                      </span>
                    </div>

                    {/* Description */}
                    {pkg.descriptionEn && (
                      <p className="text-xs text-slate-400 leading-relaxed mb-6">
                        {pkg.descriptionEn}
                      </p>
                    )}

                    {/* Benefits Checklist */}
                    {pkg.benefits && pkg.benefits.length > 0 && (
                      <div className="space-y-3 mb-8">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          What&apos;s Included:
                        </p>
                        {pkg.benefits.map((benefit, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                            <div className="w-4 h-4 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span className="leading-snug break-words">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Subscription CTA */}
                  <div>
                    <a
                      href={waUrl}
                      target={hasWhatsApp ? "_blank" : undefined}
                      rel={hasWhatsApp ? "noopener noreferrer" : undefined}
                      className={`w-full py-3.5 px-4 rounded-xl min-h-[44px] flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md active:scale-[0.98] ${
                        isFeatured
                          ? "bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:brightness-110 text-white shadow-[0_4px_20px_rgba(220,38,38,0.4)]"
                          : "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
                      }`}
                    >
                      {hasWhatsApp ? (
                        <>
                          <MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>Subscribe via WhatsApp</span>
                        </>
                      ) : (
                        <>
                          <PhoneCall className="w-4 h-4 text-slate-300 flex-shrink-0" />
                          <span>Contact Academy</span>
                        </>
                      )}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-xl mx-auto rounded-3xl p-8 bg-[#12141e] border border-white/[0.08] text-center shadow-xl space-y-3">
            <Sparkles className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">Membership Season Opening</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              New training tiers and enrollment passes are being finalized for the upcoming season. Contact our admissions team directly for early registration access.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

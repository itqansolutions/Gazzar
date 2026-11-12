"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Dumbbell, ArrowRight, MessageCircle, PhoneCall } from "lucide-react";

interface SportItem {
  id: string;
  nameEn: string;
  nameAr?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  categories?: string[];
}

interface SportsSectionProps {
  initialSports?: SportItem[];
  whatsappNumber?: string;
}

export default function SportsSection({
  initialSports,
  whatsappNumber = ""
}: SportsSectionProps) {
  const [sports, setSports] = useState<SportItem[]>(initialSports || []);
  const [loading, setLoading] = useState(!initialSports);

  useEffect(() => {
    if (!initialSports) {
      fetch("/api/public/sports")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setSports(json.data);
          } else {
            setSports([]);
          }
        })
        .catch(() => setSports([]))
        .finally(() => setLoading(false));
    }
  }, [initialSports]);

  const cleanWhatsApp = (whatsappNumber || "").replace(/[^0-9]/g, "");

  return (
    <section id="sports" className="py-20 lg:py-28 bg-[#09090f] text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Dumbbell className="w-3.5 h-3.5 text-red-500" />
            <span>Athletic Disciplines</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
            Sports & Training Programs
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">
            From explosive functional conditioning to Olympic lifting and combat disciplines, each program is built on proven sports science.
          </p>
        </div>

        {/* Sports Cards Grid */}
        {sports.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sports.map((sport) => {
              const hasImage = sport.imageUrl && sport.imageUrl.startsWith("/");
              const imgSrc = hasImage ? sport.imageUrl! : "/coach_dark_hero.jpg";
              const hasWhatsApp = Boolean(cleanWhatsApp);
              const waUrl = hasWhatsApp
                ? `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(
                    `Hello GX Fitness Academy, I would like to inquire about training in ${sport.nameEn}.`
                  )}`
                : "#contact";

              return (
                <div
                  key={sport.id}
                  className="group rounded-3xl bg-[#12141e] border border-white/[0.08] hover:border-red-500/40 overflow-hidden shadow-xl hover:shadow-[0_12px_40px_rgba(220,38,38,0.18)] transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Image Cover */}
                  <div className="relative aspect-[16/10] w-full bg-[#181a26] overflow-hidden">
                    <Image
                      src={imgSrc}
                      alt={sport.nameEn}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#12141e] via-[#12141e]/50 to-transparent" />

                    {/* Sport Badges */}
                    {sport.categories && sport.categories.length > 0 && (
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {sport.categories.slice(0, 2).map((cat) => (
                          <span
                            key={cat}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-slate-200 border border-white/10"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">
                        {sport.nameEn}
                      </h3>
                      {sport.nameAr && (
                        <p className="text-xs text-slate-400 font-medium mt-0.5" dir="rtl">
                          {sport.nameAr}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 leading-relaxed mt-2.5 line-clamp-3">
                        {sport.descriptionEn || "Structured conditioning and strength fundamentals designed for athletes of all skill levels."}
                      </p>
                    </div>

                    {/* Action Link with min 44px touch target */}
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <a
                        href={waUrl}
                        target={hasWhatsApp ? "_blank" : undefined}
                        rel={hasWhatsApp ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-1.5 min-h-[44px] text-xs font-bold text-red-500 hover:text-red-400 transition-colors"
                      >
                        {hasWhatsApp ? (
                          <>
                            <MessageCircle className="w-4 h-4 text-emerald-400" />
                            <span>Inquire on WhatsApp</span>
                          </>
                        ) : (
                          <>
                            <PhoneCall className="w-4 h-4 text-slate-300" />
                            <span>Contact Academy</span>
                          </>
                        )}
                      </a>

                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-xl mx-auto rounded-3xl p-8 bg-[#12141e] border border-white/[0.08] text-center shadow-xl space-y-3">
            <Dumbbell className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">Sports Schedule Update</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our training program roster is being updated with the latest semester schedule. Contact admissions for sport enrollment details.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

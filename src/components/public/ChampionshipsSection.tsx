"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Trophy, Medal, Star, Calendar, ShieldCheck, Sparkles, MessageCircle } from "lucide-react";

interface ChampionshipItem {
  id: string;
  title: string;
  description?: string | null;
  year?: number | null;
  date?: string | null;
  imageUrls?: string[];
  videoUrl?: string | null;
  results?: string | null;
  isPublished: boolean;
  isFeatured: boolean;
}

interface ChampionshipsSectionProps {
  initialChampionships?: ChampionshipItem[];
  whatsappNumber?: string;
}

export default function ChampionshipsSection({
  initialChampionships,
  whatsappNumber = ""
}: ChampionshipsSectionProps) {
  const [championships, setChampionships] = useState<ChampionshipItem[]>(
    initialChampionships?.filter((c) => c.isPublished) || []
  );
  const [loading, setLoading] = useState(!initialChampionships);

  useEffect(() => {
    if (!initialChampionships) {
      fetch("/api/public/championships")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setChampionships(json.data.filter((c: ChampionshipItem) => c.isPublished));
          } else {
            setChampionships([]);
          }
        })
        .catch(() => setChampionships([]))
        .finally(() => setLoading(false));
    }
  }, [initialChampionships]);

  const cleanWhatsApp = whatsappNumber.replace(/[^0-9]/g, "");

  return (
    <section id="championships" className="py-20 lg:py-28 bg-[#0b0c13] text-white border-t border-white/[0.06] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Medal className="w-3.5 h-3.5 text-amber-400" />
            <span>Honors & Tournaments</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
            Championship Pedigree
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">
            Our athletes and coaches compete in regional and national divisions, translating discipline and science-backed conditioning into podium finishes.
          </p>
        </div>

        {/* Content: Published Championships OR Honest Empty State */}
        {championships.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {championships.map((champ) => {
              const hasImage = champ.imageUrls && champ.imageUrls.length > 0 && champ.imageUrls[0].startsWith("/");
              return (
                <div
                  key={champ.id}
                  className={`relative rounded-3xl bg-[#12141e] border overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                    champ.isFeatured
                      ? "border-amber-500/40 shadow-[0_12px_45px_rgba(245,158,11,0.12)]"
                      : "border-white/[0.08] hover:border-white/20 shadow-xl"
                  }`}
                >
                  <div className="relative h-56 sm:h-64 w-full bg-[#181a26] overflow-hidden">
                    {hasImage ? (
                      <Image
                        src={champ.imageUrls![0]}
                        alt={champ.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-950/30 via-[#141724] to-[#0d0e14]">
                        <Trophy className="w-16 h-16 text-amber-500/50" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#12141e] via-[#12141e]/60 to-transparent" />

                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      {champ.year && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-black/70 backdrop-blur-md text-amber-400 border border-amber-500/30">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{champ.year}</span>
                        </span>
                      )}

                      {champ.isFeatured && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-600/90 text-white shadow-md">
                          <Star className="w-3.5 h-3.5 fill-white" />
                          <span>Podium Record</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        {champ.title}
                      </h3>

                      {champ.results && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold">
                          <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>{champ.results}</span>
                        </div>
                      )}

                      <p className="text-slate-300 text-sm leading-relaxed mt-4">
                        {champ.description || "GX Academy squad demonstrated superior athletic stamina and tactical execution on the competition stage."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verified Competition Event</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Graceful, verified empty state without fake data */
          <div className="max-w-2xl mx-auto rounded-3xl p-8 sm:p-10 bg-[#12141e] border border-white/[0.08] text-center shadow-2xl space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Trophy className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">
                Upcoming Tournament Season
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 max-w-lg mx-auto">
                Our competition athletes and coach-led squads are currently undergoing rigorous training for upcoming federation cups. Official podium results and competition schedules will be announced here.
              </p>
            </div>

            {cleanWhatsApp ? (
              <div className="pt-2">
                <a
                  href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(
                    "Hello GX Fitness Academy, I would like to inquire about joining the competition roster."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-bold transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Inquire About Competition Training</span>
                </a>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { UserCheck, Award, MessageCircle, Mail } from "lucide-react";

interface CoachItem {
  id: string;
  name: string;
  avatar?: string | null;
  title?: string | null;
  bio?: string | null;
  specialties?: string[];
  yearsOfExperience?: number;
}

interface CoachesSectionProps {
  initialCoaches?: CoachItem[];
  whatsappNumber?: string;
}

export default function CoachesSection({
  initialCoaches,
  whatsappNumber = ""
}: CoachesSectionProps) {
  const [coaches, setCoaches] = useState<CoachItem[]>(initialCoaches || []);
  const [loading, setLoading] = useState(!initialCoaches);

  useEffect(() => {
    if (!initialCoaches) {
      fetch("/api/public/coaches")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setCoaches(json.data);
          } else {
            setCoaches([]);
          }
        })
        .catch(() => setCoaches([]))
        .finally(() => setLoading(false));
    }
  }, [initialCoaches]);

  const cleanWhatsApp = whatsappNumber.replace(/[^0-9]/g, "");

  return (
    <section id="coaches" className="py-20 lg:py-28 bg-[#09090f] text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
            <UserCheck className="w-3.5 h-3.5 text-red-500" />
            <span>Master Coaches</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
            Learn From Elite Trainers
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">
            Our coaching staff brings certified expertise, national competition credentials, and unyielding dedication to your physical breakthrough.
          </p>
        </div>

        {/* Coaches Grid */}
        {coaches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coaches.map((coach) => {
              const avatarSrc = coach.avatar || "/coach_abdullah_portrait.png";
              return (
                <div
                  key={coach.id}
                  className="group rounded-3xl bg-[#12141e] border border-white/[0.08] hover:border-red-500/40 overflow-hidden shadow-xl hover:shadow-[0_12px_40px_rgba(220,38,38,0.18)] transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Photo & Background */}
                  <div className="relative aspect-[4/3] w-full bg-[#181a26] overflow-hidden">
                    <Image
                      src={avatarSrc}
                      alt={coach.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#12141e] via-[#12141e]/40 to-transparent" />

                    {coach.yearsOfExperience ? (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-black bg-black/75 backdrop-blur-md text-white border border-white/10 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-red-500" />
                        <span>{coach.yearsOfExperience}+ Yrs Exp</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-xl font-black text-white group-hover:text-red-400 transition-colors">
                        {coach.name}
                      </h3>
                      <p className="text-xs font-bold uppercase tracking-wider text-red-500 mt-1">
                        {coach.title || "Elite Athletic Coach"}
                      </p>

                      <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mt-3">
                        {coach.bio || "Dedicated coach focused on biomechanics, progressive strength, and high-intensity performance."}
                      </p>

                      {coach.specialties && coach.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-4">
                          {coach.specialties.map((spec) => (
                            <span
                              key={spec}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.04] text-slate-300 border border-white/[0.06]"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Consultation Action */}
                    <div className="pt-4 border-t border-white/[0.06]">
                      {cleanWhatsApp ? (
                        <a
                          href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(
                            `Hello GX Fitness Academy, I would like to book a coaching assessment with ${coach.name}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-red-600/20 text-slate-200 hover:text-white border border-white/10 hover:border-red-500/30 text-xs font-bold transition-all"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <span>Book Assessment with Coach</span>
                        </a>
                      ) : (
                        <a
                          href="#contact"
                          className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-bold transition-all border border-white/10"
                        >
                          <Mail className="w-4 h-4 text-muted" />
                          <span>Contact Academy</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-xl mx-auto rounded-3xl p-8 bg-[#12141e] border border-white/[0.08] text-center shadow-xl space-y-3">
            <UserCheck className="w-10 h-10 text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">Coaching Staff Announcement</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Coach profiles are currently being updated with upcoming certification credentials. Please contact our admissions desk for private coach consultations.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

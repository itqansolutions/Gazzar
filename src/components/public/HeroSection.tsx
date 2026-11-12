"use client";

import React from "react";
import Image from "next/image";
import { ArrowRight, Flame, MessageCircle, PhoneCall } from "lucide-react";

interface HeroSectionProps {
  academyName?: string;
  tagline?: string;
  description?: string;
  whatsappNumber?: string;
}

export default function HeroSection({
  academyName = "GX Fitness Academy",
  tagline = "Train Hard. Live Strong.",
  description = "A premier sports and fitness training academy built for athletic excellence, strength mastery, and life-changing physical transformation.",
  whatsappNumber = ""
}: HeroSectionProps) {
  const cleanWhatsApp = (whatsappNumber || "").replace(/[^0-9]/g, "");
  const hasWhatsApp = Boolean(cleanWhatsApp);

  const handleScrollToPackages = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.querySelector("#packages");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[92vh] lg:min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden bg-[#09090f] text-white">
      {/* Background Graphic & Atmospheric Overlays */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Image
          src="/gx-background-dark.png"
          alt="GX Fitness Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-40 mix-blend-luminosity"
        />

        {/* Deep dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] via-[#09090f]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090f] via-transparent to-[#09090f]/80" />

        {/* Red Glow Atmospheric Radial */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] max-w-full h-[350px] bg-red-600/15 blur-[120px] rounded-full pointer-events-none" />

        {/* Subtle Athletic Hatch Pattern */}
        <div className="texture-hatch opacity-30" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center w-full">
        {/* Badge Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/15 border border-red-500/30 text-red-400 text-xs sm:text-sm font-bold tracking-wide uppercase mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <Flame className="w-4 h-4 text-red-500 fill-red-500" />
          <span>{tagline}</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight uppercase leading-[1.05] sm:leading-[0.95] max-w-5xl mb-6 break-words">
          Train Like A{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-600 to-rose-400 italic">
            Champion.
          </span>
        </h1>

        {/* Subtitle / Mission */}
        <p className="text-sm sm:text-xl text-slate-300 font-medium max-w-2xl sm:max-w-3xl leading-relaxed mb-10 text-balance">
          {description}
        </p>

        {/* Action Buttons with min 48px height for touch */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16 max-w-md sm:max-w-none">
          <a
            href="#packages"
            onClick={handleScrollToPackages}
            className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:brightness-110 active:scale-[0.98] text-white text-sm sm:text-base font-bold shadow-[0_4px_30px_rgba(220,38,38,0.45)] transition-all cursor-pointer"
          >
            <span>Explore Memberships</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </a>

          <a
            href={
              hasWhatsApp
                ? `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(
                    "Hello GX Fitness Academy, I want to inquire about subscribing and trial sessions."
                  )}`
                : "#contact"
            }
            target={hasWhatsApp ? "_blank" : undefined}
            rel={hasWhatsApp ? "noopener noreferrer" : undefined}
            className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-sm sm:text-base font-bold backdrop-blur-md transition-all cursor-pointer"
          >
            {hasWhatsApp ? (
              <>
                <MessageCircle className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                <span>Contact on WhatsApp</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-5 h-5 text-slate-300" />
                <span>Contact Academy</span>
              </>
            )}
          </a>
        </div>

        {/* Key Academy Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 w-full max-w-4xl pt-8 border-t border-white/[0.08]">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm text-center">
            <div className="text-xl sm:text-3xl font-black text-white">1,500+</div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Athletes Coached</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm text-center">
            <div className="text-xl sm:text-3xl font-black text-red-500">8+</div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Sports Disciplines</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm text-center">
            <div className="text-xl sm:text-3xl font-black text-white">10+</div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Years Experience</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm text-center">
            <div className="text-xl sm:text-3xl font-black text-emerald-400">100%</div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Dedicated Support</div>
          </div>
        </div>
      </div>
    </section>
  );
}

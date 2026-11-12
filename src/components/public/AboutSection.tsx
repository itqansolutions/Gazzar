import React from "react";
import Image from "next/image";
import { Award, Target, Zap, CheckCircle2, ShieldCheck } from "lucide-react";

interface AboutSectionProps {
  academyName?: string;
  description?: string;
  yearsExperience?: string;
  athletesTrained?: string;
  sportsOffered?: string;
}

export default function AboutSection({
  academyName = "GX Fitness Academy",
  description = "GX Fitness Academy was founded on the conviction that real athletic development requires uncompromising discipline, science-backed programming, and world-class coaching. Whether you are aiming for podium-level championship competition or lifelong athletic conditioning, our academy provides the arena, the knowledge, and the community to push your limits.",
  yearsExperience = "10+",
  athletesTrained = "1,500+",
  sportsOffered = "8+"
}: AboutSectionProps) {
  const pillars = [
    {
      icon: Target,
      title: "Data-Driven Performance",
      description:
        "Every rep, pace, and biometric marker is tracked to eliminate guesswork and guarantee tangible, measurable physical adaptation."
    },
    {
      icon: Award,
      title: "Championship Lineage",
      description:
        "Led by certified national coaches with proven records in competitive cross-training, strength sports, and conditioning."
    },
    {
      icon: Zap,
      title: "Holistic Athlete Care",
      description:
        "From customized nutrition guidance and body composition scans to mobility and medical restriction management."
    }
  ];

  return (
    <section id="about" className="py-20 lg:py-28 bg-[#0b0c13] border-t border-white/[0.06] text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Atmospheric Image Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-[420px] lg:max-w-none rounded-3xl overflow-hidden border border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              <div className="aspect-[4/5] relative">
                <Image
                  src="/coach_abdullah_action.png"
                  alt="Coach in Action - GX Academy"
                  fill
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090f] via-transparent to-transparent opacity-80" />
              </div>

              {/* Floating Stat Card Badge */}
              <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-[#141724]/90 backdrop-blur-md border border-white/10 shadow-xl flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Standard of Excellence</div>
                  <div className="text-base font-black text-white mt-0.5">Top-Tier Athletic Facility</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center font-black">
                  GX
                </div>
              </div>
            </div>

            {/* Red Accent Radial Behind Image */}
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-red-600/20 rounded-full blur-[80px] pointer-events-none -z-10" />
          </div>

          {/* Right Column: Mission, Intro & Pillars */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>About GX Academy</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-tight">
                Built For Discipline.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400">
                  Engineered For Results.
                </span>
              </h2>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-5">
                {description}
              </p>
            </div>

            {/* Three Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-red-500/30 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-600/15 text-red-500 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">{pillar.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{pillar.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Key Stats Counter Grid */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.08]">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white">{yearsExperience}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Years Coaching</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-red-500">{athletesTrained}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Athletes Coached</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white">{sportsOffered}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Sports Disciplines</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

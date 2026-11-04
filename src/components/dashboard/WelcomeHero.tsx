import React from "react";
import Link from "next/link";
import { PlusCircle, Calendar } from "lucide-react";

export interface WelcomeHeroProps {
  displayName: string;
  theme?: "dark" | "light";
  classesCount?: number;
  checkinsCount?: number;
}

export function WelcomeHero({
  displayName,
  theme = "dark",
  classesCount = 3,
  checkinsCount = 12,
}: WelcomeHeroProps) {
  const isLight = theme === "light";
  const photoSrc = isLight ? "/coach_light_hero.jpg" : "/coach_dark_hero.jpg";

  return (
    <section className="relative overflow-hidden min-h-[180px] sm:min-h-[190px] rounded-[20px] border border-line bg-card shadow-card p-6 sm:p-8 flex items-center mb-6">
      {/* Background Photo */}
      <img
        src={photoSrc}
        alt="Coach Abdullah"
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-[55%] sm:w-[50%] lg:w-[46%] object-cover object-[60%_14%] select-none"
      />

      {/* Atmospheric Gradient Veil */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isLight
            ? "linear-gradient(90deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 38%, rgba(255, 255, 255, 0.4) 70%, rgba(255, 255, 255, 0) 100%)"
            : "linear-gradient(90deg, rgba(20, 20, 22, 1) 0%, rgba(20, 20, 22, 0.94) 38%, rgba(20, 20, 22, 0.3) 70%, rgba(20, 20, 22, 0) 100%)",
        }}
      />

      {/* Dynamic Red Athletic Slash */}
      <div
        className="pointer-events-none absolute top-[-30px] left-[42%] sm:left-[46%] w-[70px] h-[260px] opacity-80"
        style={{
          transform: "skewX(-22deg)",
          background: "linear-gradient(180deg, var(--brand), rgba(0,0,0,0))",
        }}
        aria-hidden="true"
      />

      {/* Hero Content */}
      <div className="relative z-10 max-w-[480px]">
        <p className="text-xs font-bold text-brand uppercase tracking-[0.14em] mb-1.5">
          Today at the academy
        </p>
        <h2 className="font-display italic font-bold uppercase text-3xl sm:text-[40px] leading-none text-fg tracking-tight mb-2">
          Good morning, {displayName}
        </h2>
        <p className="text-xs sm:text-sm text-muted mb-4 font-medium">
          {classesCount} classes today · {checkinsCount} check-ins waiting
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/programs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-brand hover:bg-brand-hover text-brand-contrast font-bold text-xs shadow-glow transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create program</span>
          </Link>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-surface border border-line hover:bg-raised text-fg font-semibold text-xs transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Calendar className="w-3.5 h-3.5 text-muted" />
            <span>Schedule class</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default WelcomeHero;

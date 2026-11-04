import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export type KPIAccent = "brand" | "purple" | "blue" | "neutral";

export interface KPICardProps {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    positive?: boolean;
  } | string;
  icon: React.ReactNode;
  accent?: KPIAccent;
  href?: string;
}

const ACCENT_STYLES: Record<KPIAccent, { bg: string; text: string; border: string }> = {
  brand: {
    bg: "bg-brand-soft",
    text: "text-brand",
    border: "border-brand/20",
  },
  purple: {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  blue: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  neutral: {
    bg: "bg-muted/15",
    text: "text-muted",
    border: "border-line",
  },
};

export function KPICard({
  label,
  value,
  delta,
  icon,
  accent = "brand",
}: KPICardProps) {
  const accentStyle = ACCENT_STYLES[accent] || ACCENT_STYLES.brand;

  const parsedDelta =
    typeof delta === "string"
      ? { value: delta, positive: !delta.trim().startsWith("-") }
      : delta;

  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-card p-4 sm:p-5 shadow-card transition-all duration-200 hover:border-brand/40 group">
      {/* Subtle top-to-bottom dark gradient overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-100"
        style={{
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-center gap-3.5">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 flex-shrink-0 ${accentStyle.bg} ${accentStyle.text} ${accentStyle.border}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted tracking-wide truncate">
            {label}
          </p>
          <p className="text-2xl sm:text-[28px] font-bold font-sans tracking-tight tabular-nums text-fg leading-tight mt-0.5">
            {value}
          </p>
          {parsedDelta && (
            <div
              className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums mt-0.5 ${
                parsedDelta.positive
                  ? "text-emerald-500 dark:text-brand-crimson"
                  : "text-rose-500 dark:text-rose-400"
              }`}
            >
              {parsedDelta.positive ? (
                <TrendingUp className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              ) : (
                <TrendingDown className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              )}
              <span>{parsedDelta.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KPICard;

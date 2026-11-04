import React from "react";

export interface ProgramStat {
  name: string;
  percentage: number;
}

export interface TopProgramsProps {
  programs?: ProgramStat[];
  title?: string;
}

const DEFAULT_PROGRAMS: ProgramStat[] = [
  { name: "CrossFit Foundations", percentage: 86 },
  { name: "Strength Cycle", percentage: 72 },
  { name: "Mobility & Recovery", percentage: 64 },
  { name: "Olympic Lifting", percentage: 48 },
];

export function TopPrograms({
  programs = DEFAULT_PROGRAMS,
  title = "Top Programs",
}: TopProgramsProps) {
  return (
    <div className="flex h-full w-full flex-col justify-between rounded-card border border-line bg-card p-5 sm:p-6 shadow-card">
      <h2 className="text-base sm:text-lg font-bold text-fg tracking-tight mb-4">
        {title}
      </h2>

      <div className="space-y-4">
        {programs.map((p) => (
          <div key={p.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-fg">{p.name}</span>
              <span className="text-muted tabular-nums">{p.percentage}%</span>
            </div>
            <div className="h-1.5 w-full rounded-pill bg-raised overflow-hidden">
              <div
                className="h-full rounded-pill bg-brand transition-all duration-500"
                style={{ width: `${p.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopPrograms;

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export interface MembershipsDonutProps {
  percentage?: number;
  delta?: string;
  title?: string;
  subtitle?: string;
  comparisonText?: string;
  isLoading?: boolean;
}

export function MembershipsDonut({
  percentage = 76,
  delta = "+12%",
  title = "Memberships",
  subtitle = "Active membership ratio",
  comparisonText = "+12% vs. last month",
  isLoading = false,
}: MembershipsDonutProps) {
  if (isLoading) {
    return (
      <div className="flex h-72 sm:h-80 w-full flex-col justify-between rounded-card border border-line bg-card p-5 sm:p-6 shadow-card">
        <div className="space-y-2 animate-pulse">
          <div className="h-4 w-28 rounded bg-raised" />
          <div className="h-3 w-40 rounded bg-raised" />
        </div>
        <div className="h-36 w-36 mx-auto rounded-full bg-raised/40 animate-pulse" />
      </div>
    );
  }

  const data = [
    { name: "Active", value: percentage },
    { name: "Remaining", value: Math.max(0, 100 - percentage) },
  ];

  return (
    <div className="flex h-full w-full flex-col justify-between rounded-card border border-line bg-card p-5 sm:p-6 shadow-card text-center">
      <div className="text-left">
        <h2 className="text-base sm:text-lg font-bold text-fg tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-muted mt-0.5">{subtitle}</p>
      </div>

      <div className="relative h-44 w-full flex items-center justify-center my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={64}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              <Cell fill="var(--brand)" />
              <Cell fill="var(--border-subtle)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centered KPI label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl sm:text-3xl font-bold font-sans tracking-tight tabular-nums text-fg leading-none">
            {percentage}%
          </span>
          {delta && (
            <span className="text-[11px] font-semibold text-emerald-500 dark:text-emerald-400 mt-1">
              {delta}
            </span>
          )}
        </div>
      </div>

      {comparisonText && (
        <p className="text-xs font-medium text-muted">{comparisonText}</p>
      )}
    </div>
  );
}

export default MembershipsDonut;

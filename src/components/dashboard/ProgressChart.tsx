import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp } from "lucide-react";

export interface ProgressDataPoint {
  month: string;
  progress: number;
}

export interface ProgressChartProps {
  data: ProgressDataPoint[];
  title?: string;
  subtitle?: string;
  trend?: string;
  isLoading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-control border border-line bg-raised px-3 py-2 shadow-card">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="text-sm font-bold text-fg tabular-nums">
          {payload[0].value}% <span className="text-xs font-normal text-muted">progress</span>
        </p>
      </div>
    );
  }
  return null;
}

export function ProgressChart({
  data,
  title = "Progress Overview",
  subtitle = "Monthly performance progressions",
  trend = "+24%",
  isLoading = false,
}: ProgressChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-72 sm:h-80 w-full flex-col justify-between rounded-card border border-line bg-card p-5 sm:p-6 shadow-card">
        <div className="space-y-2 animate-pulse">
          <div className="h-4 w-32 rounded bg-raised" />
          <div className="h-3 w-48 rounded bg-raised" />
        </div>
        <div className="h-48 w-full rounded bg-raised/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col justify-between rounded-card border border-line bg-card p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-fg tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-muted mt-0.5">{subtitle}</p>
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-brand-soft text-brand text-xs font-bold">
            <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{trend}</span>
          </div>
        )}
      </div>

      <div className="h-56 sm:h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            No progress data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="progress" radius={[6, 6, 0, 0]}>
                {data.map((_, index) => {
                  const isLatest = index === data.length - 1;
                  return (
                    <Cell
                      key={`bar-${index}`}
                      fill={isLatest ? "var(--brand)" : "var(--surface-raised)"}
                      stroke={isLatest ? "none" : "var(--border-subtle)"}
                      style={isLatest ? { filter: "drop-shadow(0 0 8px rgba(240,20,37,.6))" } : undefined}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default ProgressChart;

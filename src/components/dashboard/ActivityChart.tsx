import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ActivityDataPoint {
  day: string;
  members: number;
}

export interface ActivityChartProps {
  data: ActivityDataPoint[];
  title?: string;
  subtitle?: string;
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
          {payload[0].value} <span className="text-xs font-normal text-muted">members</span>
        </p>
      </div>
    );
  }
  return null;
}

export function ActivityChart({
  data,
  title = "Members Activity",
  subtitle = "Weekly attendance and training volume",
  isLoading = false,
}: ActivityChartProps) {
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
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-brand animate-pulse" />
          <span className="text-xs font-semibold text-muted">Live Volume</span>
        </div>
      </div>

      <div className="h-56 sm:h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            No activity recorded this week
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="brandWaveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--brand)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
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
              <Area
                type="monotone"
                dataKey="members"
                stroke="var(--brand)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#brandWaveGradient)"
                style={{ filter: "drop-shadow(0 0 6px rgba(240,20,37,.65))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default ActivityChart;

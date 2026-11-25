"use client";

import React from "react";
import { Clock } from "lucide-react";
import { fmtClock, describeFormat, isTimedFormat } from "@/lib/block-formats";

/** Coach-facing summary: how long each part (warm-up, strength, ...) took. */
export default function PartTimings({ blocks }: { blocks?: any[] | null }) {
  const parts = (blocks || []).filter((b) => b && (b.startedAt || b.finishedAt));
  if (parts.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" data-testid="part-timings">
      {parts.map((b) => {
        const start = b.startedAt ? new Date(b.startedAt).getTime() : null;
        const end = b.finishedAt ? new Date(b.finishedAt).getTime() : null;
        const secs = start && end ? Math.max(0, Math.round((end - start) / 1000)) : null;
        const name = b.partLabel || b.title || `Part ${b.orderIndex}`;
        let result = "";
        if (b.type === "AMRAP" && (b.resultRounds != null || b.resultReps != null)) {
          result = ` · ${b.resultRounds ?? 0} rounds + ${b.resultReps ?? 0} reps`;
        } else if (b.type === "FOR_TIME" && b.resultTimeSeconds != null) {
          result = ` · result ${fmtClock(b.resultTimeSeconds)}`;
        }
        return (
          <span
            key={b.id}
            title={`${b.startedAt ? "Start " + new Date(b.startedAt).toLocaleTimeString() : ""}${b.finishedAt ? " · Finish " + new Date(b.finishedAt).toLocaleTimeString() : ""}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              end ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
            }`}
          >
            <Clock className="w-3 h-3" />
            {name}
            {isTimedFormat(b.type) ? ` (${describeFormat(b)})` : ""}: {secs !== null ? fmtClock(secs) : "in progress"}
            {result}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Shared helpers for workout block "parts" (Warm-up / Strength / ...) and CrossFit-style formats.
 * Pure and dependency free so it can be unit tested with node:test.
 */

export type TimedFormat = "AMRAP" | "FOR_TIME" | "EMOM" | "TABATA";

export const PART_LABELS = ["Warm-up", "Strength", "Core", "Endurance", "Conditioning", "Cool-down"] as const;

export const PART_LABELS_AR: Record<string, string> = {
  "Warm-up": "إحماء",
  Strength: "قوة",
  Core: "كور",
  Endurance: "تحمل",
  Conditioning: "كاندشنج",
  "Cool-down": "تهدئة"
};

export const TIMED_FORMATS: TimedFormat[] = ["AMRAP", "FOR_TIME", "EMOM", "TABATA"];

export function isTimedFormat(type: string | null | undefined): type is TimedFormat {
  return type === "AMRAP" || type === "FOR_TIME" || type === "EMOM" || type === "TABATA";
}

export interface BlockFormatParams {
  type?: string | null;
  rounds?: number | null;
  durationSeconds?: number | null;
  workSeconds?: number | null;
  restSeconds?: number | null;
  intervalSeconds?: number | null;
}

/** Default parameters when a coach adds a block of a CrossFit format. */
export function defaultFormatParams(type: TimedFormat): Required<Omit<BlockFormatParams, "type">> {
  switch (type) {
    case "AMRAP":
      return { rounds: 1, durationSeconds: 600, workSeconds: 0, restSeconds: 0, intervalSeconds: 0 } as any;
    case "FOR_TIME":
      return { rounds: 1, durationSeconds: 900, workSeconds: 0, restSeconds: 0, intervalSeconds: 0 } as any;
    case "EMOM":
      return { rounds: 10, durationSeconds: 600, workSeconds: 0, restSeconds: 0, intervalSeconds: 60 } as any;
    case "TABATA":
      return { rounds: 8, durationSeconds: 240, workSeconds: 20, restSeconds: 10, intervalSeconds: 0 } as any;
  }
}

export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** Normalised, validated parameters used by both the builder preview and the athlete timer. */
export function resolveFormat(b: BlockFormatParams): {
  type: TimedFormat | null;
  totalSeconds: number | null;
  rounds: number;
  workSeconds: number;
  restSeconds: number;
  intervalSeconds: number;
} {
  const type = isTimedFormat(b.type) ? b.type : null;
  const pos = (v: number | null | undefined, d: number) => (typeof v === "number" && v > 0 ? Math.round(v) : d);
  if (type === "TABATA") {
    const work = pos(b.workSeconds, 20);
    const rest = pos(b.restSeconds, 10);
    const rounds = pos(b.rounds, 8);
    return { type, totalSeconds: rounds * (work + rest), rounds, workSeconds: work, restSeconds: rest, intervalSeconds: 0 };
  }
  if (type === "EMOM") {
    const interval = pos(b.intervalSeconds, 60);
    const rounds = b.rounds && b.rounds > 0 ? Math.round(b.rounds) : Math.max(1, Math.floor(pos(b.durationSeconds, 600) / interval));
    return { type, totalSeconds: rounds * interval, rounds, workSeconds: 0, restSeconds: 0, intervalSeconds: interval };
  }
  if (type === "AMRAP") {
    return { type, totalSeconds: pos(b.durationSeconds, 600), rounds: 1, workSeconds: 0, restSeconds: 0, intervalSeconds: 0 };
  }
  if (type === "FOR_TIME") {
    return { type, totalSeconds: b.durationSeconds && b.durationSeconds > 0 ? Math.round(b.durationSeconds) : null, rounds: 1, workSeconds: 0, restSeconds: 0, intervalSeconds: 0 };
  }
  return { type: null, totalSeconds: null, rounds: 1, workSeconds: 0, restSeconds: 0, intervalSeconds: 0 };
}

/** Short human description, e.g. "AMRAP 10 min", "EMOM 10 x 60s", "Tabata 8 x 20s/10s". */
export function describeFormat(b: BlockFormatParams): string {
  const f = resolveFormat(b);
  switch (f.type) {
    case "AMRAP":
      return `AMRAP ${Math.round((f.totalSeconds || 0) / 60 * 10) / 10} min`;
    case "FOR_TIME":
      return f.totalSeconds ? `For Time (cap ${Math.round(f.totalSeconds / 60 * 10) / 10} min)` : "For Time";
    case "EMOM":
      return `EMOM ${f.rounds} x ${f.intervalSeconds}s`;
    case "TABATA":
      return `Tabata ${f.rounds} x ${f.workSeconds}s/${f.restSeconds}s`;
    default:
      return "";
  }
}

export type TimerPhase = { label: "work" | "rest" | "round" | "go"; round: number; secondsLeft: number; phaseSeconds: number; done: boolean };

/**
 * Where the timer is after `elapsed` seconds. AMRAP/FOR_TIME: single countdown (FOR_TIME counts up when no cap).
 * EMOM: new round every interval. TABATA: alternating work/rest.
 */
export function timerPhaseAt(b: BlockFormatParams, elapsed: number): TimerPhase {
  const f = resolveFormat(b);
  const e = Math.max(0, Math.floor(elapsed));
  if (f.type === "TABATA") {
    const cycle = f.workSeconds + f.restSeconds;
    const total = f.rounds * cycle;
    if (e >= total) return { label: "rest", round: f.rounds, secondsLeft: 0, phaseSeconds: f.restSeconds, done: true };
    const round = Math.floor(e / cycle) + 1;
    const inCycle = e % cycle;
    if (inCycle < f.workSeconds) return { label: "work", round, secondsLeft: f.workSeconds - inCycle, phaseSeconds: f.workSeconds, done: false };
    return { label: "rest", round, secondsLeft: cycle - inCycle, phaseSeconds: f.restSeconds, done: false };
  }
  if (f.type === "EMOM") {
    const total = f.rounds * f.intervalSeconds;
    if (e >= total) return { label: "round", round: f.rounds, secondsLeft: 0, phaseSeconds: f.intervalSeconds, done: true };
    const round = Math.floor(e / f.intervalSeconds) + 1;
    return { label: "round", round, secondsLeft: f.intervalSeconds - (e % f.intervalSeconds), phaseSeconds: f.intervalSeconds, done: false };
  }
  if (f.type === "AMRAP" || (f.type === "FOR_TIME" && f.totalSeconds)) {
    const total = f.totalSeconds || 0;
    return { label: "go", round: 1, secondsLeft: Math.max(0, total - e), phaseSeconds: total, done: e >= total };
  }
  return { label: "go", round: 1, secondsLeft: e, phaseSeconds: 0, done: false };
}

/** Phase changes that should trigger a beep between two elapsed readings (inclusive of `to`). */
export function beepsBetween(b: BlockFormatParams, fromElapsed: number, toElapsed: number): number {
  const f = resolveFormat(b);
  let count = 0;
  for (let t = Math.floor(fromElapsed) + 1; t <= Math.floor(toElapsed); t++) {
    const prev = timerPhaseAt(b, t - 1);
    const cur = timerPhaseAt(b, t);
    if (cur.done && !prev.done) count += 3;
    else if (prev.label !== cur.label || prev.round !== cur.round) count += 1;
    else if (!cur.done && cur.secondsLeft > 0 && cur.secondsLeft <= 3 && f.type) count += 1;
  }
  return count;
}

export function formatBlockPartLabel(label: string | null | undefined, rtl = false): string {
  if (!label) return "";
  return rtl ? PART_LABELS_AR[label] || label : label;
}

/** Template/athlete-day naming convention: "Athlete - Day - Part". Empty pieces are skipped. */
export function buildTemplateName(athlete: string, day: string, part: string): string {
  return [athlete, day, part].map((s) => (s || "").trim()).filter(Boolean).join(" - ");
}

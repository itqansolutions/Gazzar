"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, CheckCircle, Lock, X, Volume2, VolumeX, ListChecks, Flag } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  beepsBetween,
  describeFormat,
  fmtClock,
  isTimedFormat,
  resolveFormat,
  timerPhaseAt,
  formatBlockPartLabel
} from "@/lib/block-formats";

export interface PartsWorkoutViewProps {
  assignmentId: string;
  onClose: () => void;
  onUpdated?: () => void;
  onSwitchDetailed?: () => void;
  standalone?: boolean;
}

function itemTargets(it: any): string {
  const parts: string[] = [];
  if (it.targetSets && it.targetReps) parts.push(`${it.targetSets} x ${it.targetReps}`);
  else if (it.targetReps) parts.push(`${it.targetReps} reps`);
  else if (it.targetSets) parts.push(`${it.targetSets} sets`);
  if (it.targetWeightKg) parts.push(`${it.targetWeightKg} kg`);
  if (it.targetDistanceKm) parts.push(`${it.targetDistanceKm} km`);
  if (it.targetTimeSeconds) parts.push(`${it.targetTimeSeconds}s`);
  if (it.restSeconds) parts.push(`rest ${it.restSeconds}s`);
  return parts.join(" · ");
}

export default function PartsWorkoutView({ assignmentId, onClose, onUpdated, onSwitchDetailed, standalone }: PartsWorkoutViewProps) {
  const { language, dir } = useLanguage();
  const isRtl = dir === "rtl" || language === "ar";
  const t = (en: string, ar: string) => (isRtl ? ar : en);

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Timer state for the current part
  const [runningBlockId, setRunningBlockId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startMsRef = useRef<number>(0);
  const lastBeepSecRef = useRef<number>(0);
  const audioRef = useRef<AudioContext | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  // Result entry
  const [resRounds, setResRounds] = useState("");
  const [resReps, setResReps] = useState("");
  const [resTime, setResTime] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/workouts/${assignmentId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load workout");
      setAssignment(json.data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load workout");
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const blocks: any[] = useMemo(() => assignment?.assignmentBlocks || [], [assignment]);
  const isCompleted = assignment?.status === "COMPLETED";
  const currentIdx = blocks.findIndex((b) => !b.finishedAt);
  const current = currentIdx >= 0 ? blocks[currentIdx] : null;
  const allFinished = blocks.length > 0 && currentIdx === -1;

  const beep = useCallback(
    (count: number) => {
      if (!soundOn || count <= 0) return;
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        if (!audioRef.current) audioRef.current = new Ctx();
        const ctx = audioRef.current!;
        for (let i = 0; i < Math.min(count, 3); i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.value = count >= 3 ? 1000 : 780;
          gain.gain.value = 0.25;
          osc.connect(gain);
          gain.connect(ctx.destination);
          const at = ctx.currentTime + i * 0.22;
          osc.start(at);
          osc.stop(at + 0.15);
        }
        if (navigator.vibrate) navigator.vibrate(count >= 3 ? [200, 100, 200] : 120);
      } catch {
        // audio is best effort
      }
    },
    [soundOn]
  );

  // Ticker (wall-clock based so it survives throttled tabs)
  useEffect(() => {
    if (!runningBlockId) return;
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - startMsRef.current) / 1000);
      setElapsed(sec);
      const blk = blocks.find((b) => b.id === runningBlockId);
      if (blk && isTimedFormat(blk.type) && sec > lastBeepSecRef.current) {
        beep(beepsBetween(blk, lastBeepSecRef.current, sec));
      }
      lastBeepSecRef.current = sec;
    }, 250);
    return () => clearInterval(id);
  }, [runningBlockId, blocks, beep]);

  const call = async (body: any) => {
    const res = await fetch(`/api/workouts/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Request failed");
    return json.data;
  };

  const startPart = async (blk: any) => {
    setBusy(true);
    try {
      // Unlock audio on this user gesture
      beep(0);
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx && !audioRef.current) audioRef.current = new Ctx();
        await audioRef.current?.resume();
      } catch {}
      const part = await call({ action: "PART_START", blockId: blk.id });
      startMsRef.current = part?.startedAt ? new Date(part.startedAt).getTime() : Date.now();
      const already = Math.max(0, Math.floor((Date.now() - startMsRef.current) / 1000));
      lastBeepSecRef.current = already;
      setElapsed(already);
      setRunningBlockId(blk.id);
      beep(1);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const finishPart = async (blk: any) => {
    setBusy(true);
    try {
      const payload: any = { action: "PART_FINISH", blockId: blk.id };
      if (blk.type === "AMRAP") {
        payload.resultRounds = resRounds === "" ? null : Number(resRounds);
        payload.resultReps = resReps === "" ? null : Number(resReps);
      }
      if (blk.type === "FOR_TIME") {
        const mm = resTime.includes(":") ? resTime.split(":") : null;
        const secs = mm ? Number(mm[0]) * 60 + Number(mm[1] || 0) : resTime === "" ? elapsed : Number(resTime);
        payload.resultTimeSeconds = Number.isFinite(secs) ? Math.round(secs) : elapsed;
      }
      await call(payload);
      setRunningBlockId(null);
      setFinishing(false);
      setResRounds("");
      setResReps("");
      setResTime("");
      await load();
      onUpdated?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const finishWorkout = async () => {
    setBusy(true);
    try {
      const firstStart = blocks.map((b) => (b.startedAt ? new Date(b.startedAt).getTime() : Infinity)).reduce((a, b) => Math.min(a, b), Infinity);
      const lastEnd = blocks.map((b) => (b.finishedAt ? new Date(b.finishedAt).getTime() : 0)).reduce((a, b) => Math.max(a, b), 0);
      const mins = Number.isFinite(firstStart) && lastEnd > firstStart ? Math.max(1, Math.round((lastEnd - firstStart) / 60000)) : 1;
      await call({ action: "COMPLETE", durationMinutes: mins });
      setDone(true);
      await load();
      onUpdated?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const title = assignment?.title || assignment?.template?.titleEn || t("Workout", "التمرين");

  // Workouts without blocks (legacy) cannot use the simple per-part view
  const legacy = !loading && assignment && blocks.length === 0;

  const body = (
    <div className="w-full max-w-2xl mx-auto bg-slate-950 text-white rounded-2xl border border-slate-800 overflow-hidden" dir={isRtl ? "rtl" : "ltr"} data-testid="parts-workout-view">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold leading-tight line-clamp-2 break-words">{title}</h2>
          <p className="text-[11px] text-slate-400">{t("Complete each part in order", "اخلص كل جزء بالترتيب")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setSoundOn((v) => !v)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700" aria-label="Sound">
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onSwitchDetailed && (
            <button type="button" onClick={onSwitchDetailed} aria-label="Detailed logging" className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1">
              <ListChecks className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("Detailed logging", "تسجيل تفصيلي")}</span>
            </button>
          )}
          <button type="button" onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading && <p className="text-sm text-slate-400">{t("Loading...", "جاري التحميل...")}</p>}
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

        {legacy && (
          <div className="text-sm text-slate-300 space-y-3">
            <p>{t("This workout has no parts. Use detailed logging.", "التمرين ده من غير أجزاء. استخدم التسجيل التفصيلي.")}</p>
            {onSwitchDetailed && (
              <button onClick={onSwitchDetailed} className="px-4 py-2 rounded-xl bg-brand-crimson font-bold text-sm">
                {t("Open detailed logging", "افتح التسجيل التفصيلي")}
              </button>
            )}
          </div>
        )}

        {blocks.map((blk, idx) => {
          const isCurrent = current?.id === blk.id && !isCompleted;
          const finished = Boolean(blk.finishedAt);
          const locked = !finished && !isCurrent;
          const running = runningBlockId === blk.id;
          const label = formatBlockPartLabel(blk.partLabel, isRtl);
          const heading = label || blk.title || `${t("Part", "جزء")} ${idx + 1}`;
          const secs = blk.startedAt && blk.finishedAt ? Math.round((new Date(blk.finishedAt).getTime() - new Date(blk.startedAt).getTime()) / 1000) : null;
          const timed = isTimedFormat(blk.type);
          const phase = timed && running ? timerPhaseAt(blk, elapsed) : null;
          const fmt = timed ? resolveFormat(blk) : null;
          const started = Boolean(blk.startedAt) && !finished;

          return (
            <section
              key={blk.id}
              data-testid={`part-${idx + 1}`}
              className={`rounded-2xl border p-4 ${
                finished ? "border-rose-600/40 bg-rose-950/20" : isCurrent ? "border-brand-crimson bg-slate-900" : "border-slate-800 bg-slate-900/40 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-slate-800 text-xs font-extrabold flex items-center justify-center">{idx + 1}</span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold truncate">{heading}</h3>
                    {blk.title && label && <p className="text-[11px] text-slate-400 truncate">{blk.title}</p>}
                  </div>
                  {timed && <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold">{describeFormat(blk)}</span>}
                </div>
                <div className="text-[11px] font-bold shrink-0">
                  {finished && (
                    <span className="text-rose-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {secs !== null ? fmtClock(secs) : t("Done", "تم")}
                    </span>
                  )}
                  {locked && <Lock className="w-4 h-4 text-slate-500" />}
                </div>
              </div>

              {(isCurrent || finished) && (
                <ul className="mt-3 space-y-1.5">
                  {(blk.items || []).map((it: any) => (
                    <li key={it.id} className="text-sm">
                      {it.itemType === "EXERCISE" && (
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold">{it.exerciseNameSnapshot || it.exercise?.nameEn || it.exercise?.nameAr || "Exercise"}</span>
                          <span className="text-xs text-slate-400 text-end">{itemTargets(it)}</span>
                        </div>
                      )}
                      {it.itemType === "REST" && <span className="text-xs text-slate-400">{t("Rest", "راحة")} {it.restSeconds || it.targetTimeSeconds || ""}s</span>}
                      {it.itemType === "NOTE" && <span className="text-xs text-amber-300">{it.instructions}</span>}
                      {it.itemType === "EXERCISE" && it.instructions && <p className="text-[11px] text-slate-400">{it.instructions}</p>}
                    </li>
                  ))}
                  {blk.notes && <li className="text-xs text-amber-300">{blk.notes}</li>}
                </ul>
              )}

              {isCurrent && (
                <div className="mt-4 space-y-3">
                  {timed && (running || started) && running && phase && (
                    <div className="text-center py-3" data-testid="big-timer">
                      <p className={`text-xs font-extrabold uppercase tracking-widest ${phase.label === "work" ? "text-rose-400" : phase.label === "rest" ? "text-sky-400" : "text-amber-300"}`}>
                        {blk.type === "TABATA"
                          ? `${phase.label === "work" ? t("WORK", "اشتغل") : t("REST", "راحة")} · ${t("Round", "جولة")} ${phase.round}/${fmt?.rounds}`
                          : blk.type === "EMOM"
                          ? `${t("Round", "جولة")} ${phase.round}/${fmt?.rounds}`
                          : blk.type === "AMRAP"
                          ? t("AMRAP", "AMRAP")
                          : t("FOR TIME", "FOR TIME")}
                      </p>
                      <p className="text-7xl font-black font-mono tabular-nums leading-none mt-1">{fmtClock(phase.secondsLeft)}</p>
                      {blk.type !== "FOR_TIME" || fmt?.totalSeconds ? (
                        <p className="text-xs text-slate-400 mt-1">
                          {t("Elapsed", "الوقت")} {fmtClock(elapsed)} / {fmtClock(fmt?.totalSeconds || 0)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">{t("Stopwatch", "ستوب ووتش")}</p>
                      )}
                      {phase.done && <p className="text-sm font-bold text-rose-400 mt-2">{t("Time is up!", "الوقت خلص!")}</p>}
                    </div>
                  )}

                  {!running && !finishing && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startPart(blk)}
                      className="w-full py-3 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      {started ? t("Resume timer", "كمل التايمر") : t("Start", "ابدأ")}
                    </button>
                  )}

                  {(running || started) && !finishing && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => (blk.type === "AMRAP" || blk.type === "FOR_TIME" ? setFinishing(true) : finishPart(blk))}
                      className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {t("Done", "خلصت")}
                    </button>
                  )}

                  {!running && !started && !finishing && !timed && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => finishPart(blk)}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold disabled:opacity-60"
                    >
                      {t("Mark done without timer", "علّم إنه خلص من غير تايمر")}
                    </button>
                  )}

                  {finishing && (
                    <div className="rounded-xl bg-slate-800 p-3 space-y-2">
                      {blk.type === "AMRAP" && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-300 flex-1">
                            {t("Rounds completed", "عدد الجولات")}
                            <input type="number" min="0" inputMode="numeric" value={resRounds} onChange={(e) => setResRounds(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-base font-bold" />
                          </label>
                          <label className="text-xs text-slate-300 flex-1">
                            {t("Extra reps", "تكرارات زيادة")}
                            <input type="number" min="0" inputMode="numeric" value={resReps} onChange={(e) => setResReps(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-base font-bold" />
                          </label>
                        </div>
                      )}
                      {blk.type === "FOR_TIME" && (
                        <label className="text-xs text-slate-300 block">
                          {t("Your time (mm:ss)", "وقتك (دقيقة:ثانية)")}
                          <input type="text" inputMode="numeric" placeholder={fmtClock(elapsed)} value={resTime} onChange={(e) => setResTime(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-base font-bold" />
                        </label>
                      )}
                      <button type="button" disabled={busy} onClick={() => finishPart(blk)} className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-extrabold text-sm disabled:opacity-60">
                        {t("Save result", "احفظ النتيجة")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {finished && blk.type === "AMRAP" && (blk.resultRounds != null || blk.resultReps != null) && (
                <p className="mt-2 text-xs text-rose-300">{blk.resultRounds ?? 0} {t("rounds", "جولة")} + {blk.resultReps ?? 0} {t("reps", "تكرار")}</p>
              )}
              {finished && blk.type === "FOR_TIME" && blk.resultTimeSeconds != null && (
                <p className="mt-2 text-xs text-rose-300">{t("Time", "الوقت")} {fmtClock(blk.resultTimeSeconds)}</p>
              )}
            </section>
          );
        })}

        {allFinished && !isCompleted && !done && (
          <button type="button" disabled={busy} onClick={finishWorkout} className="w-full py-3.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] font-extrabold flex items-center justify-center gap-2 disabled:opacity-60">
            <Flag className="w-4 h-4" />
            {t("Finish workout", "إنهاء التمرين")}
          </button>
        )}
        {(isCompleted || done) && (
          <p className="text-center text-sm font-bold text-rose-400 py-2">{t("Workout completed. Great job!", "التمرين خلص. شغل ممتاز!")}</p>
        )}
      </div>
    </div>
  );

  return standalone ? body : <div className="fixed inset-0 z-[80] bg-black/70 overflow-y-auto p-3 sm:p-6 flex items-start justify-center">{body}</div>;
}

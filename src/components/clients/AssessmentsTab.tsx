"use client";

import React, { useState } from "react";
import { ClientAssessment } from "@/types";
import { Activity, PlusCircle, Flame, Clock, Sparkles, Award, Calendar, User, X } from "lucide-react";

interface AssessmentsTabProps {
  clientId: string;
  assessments: ClientAssessment[];
  isClient?: boolean;
  onRefresh: () => void;
}

export default function AssessmentsTab({
  clientId,
  assessments = [],
  isClient = false,
  onRefresh
}: AssessmentsTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("Performance & Fitness Assessment");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pushups, setPushups] = useState<number | "">("");
  const [pullups, setPullups] = useState<number | "">("");
  const [plankSec, setPlankSec] = useState<number | "">("");
  const [runningSec, setRunningSec] = useState<number | "">("");
  const [flexibility, setFlexibility] = useState<number | "">("");
  const [vo2, setVo2] = useState<number | "">("");
  const [coachNotes, setCoachNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          title,
          date,
          pushupsCount: pushups !== "" ? Number(pushups) : undefined,
          pullupsCount: pullups !== "" ? Number(pullups) : undefined,
          plankSeconds: plankSec !== "" ? Number(plankSec) : undefined,
          runningKmTimeSec: runningSec !== "" ? Number(runningSec) : undefined,
          flexibilityScore: flexibility !== "" ? Number(flexibility) : undefined,
          vo2Max: vo2 !== "" ? Number(vo2) : undefined,
          coachNotes
        })
      });

      if (res.ok) {
        setModalOpen(false);
        // Reset form
        setPushups("");
        setPullups("");
        setPlankSec("");
        setRunningSec("");
        setFlexibility("");
        setVo2("");
        setCoachNotes("");
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save assessment");
      }
    } catch (err) {
      console.error("[AssessmentsTab] Error creating assessment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Physical Assessments & Fitness Testing
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Strength, endurance, speed, and aerobic capacity benchmarks over time
          </p>
        </div>

        {!isClient && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse cursor-pointer shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] self-start sm:self-auto"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Assessment</span>
          </button>
        )}
      </div>

      {assessments.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          No physical assessments recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {assessments.map((a) => (
            <div
              key={a.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-9 h-9 rounded-xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center font-bold">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{a.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2 rtl:space-x-reverse mt-0.5">
                      <span className="flex items-center space-x-1 rtl:space-x-reverse">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(a.date).toLocaleDateString()}</span>
                      </span>
                      {a.coach?.user?.name && (
                        <span className="flex items-center space-x-1 rtl:space-x-reverse">
                          <User className="w-3 h-3" />
                          <span>Evaluated by {a.coach.user.name}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Benchmark Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Pushups</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {a.pushupsCount ?? "—"} <span className="text-[10px] text-slate-400 font-normal">reps</span>
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Pullups</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {a.pullupsCount ?? "—"} <span className="text-[10px] text-slate-400 font-normal">reps</span>
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Plank</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {a.plankSeconds ?? "—"} <span className="text-[10px] text-slate-400 font-normal">sec</span>
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">1km Run</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {a.runningKmTimeSec ? `${Math.floor(a.runningKmTimeSec / 60)}m ${a.runningKmTimeSec % 60}s` : "—"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Flexibility</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {a.flexibilityScore ? `${a.flexibilityScore}/10` : "—"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">VO2 Max</span>
                  <span className="text-sm font-black text-brand-crimson">
                    {a.vo2Max ?? "—"}
                  </span>
                </div>
              </div>

              {a.coachNotes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Coach Evaluation Notes</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{a.coachNotes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Record Assessment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Record Physical Assessment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Enter athlete test results to track fitness development
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assessment Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assessment Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Pushups (Reps)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 35"
                    value={pushups}
                    onChange={(e) => setPushups(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Pullups (Reps)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 12"
                    value={pullups}
                    onChange={(e) => setPullups(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Plank (Seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 90"
                    value={plankSec}
                    onChange={(e) => setPlankSec(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    1km Run Time (Seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 240 (4 mins)"
                    value={runningSec}
                    onChange={(e) => setRunningSec(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Flexibility Score (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="e.g. 8"
                    value={flexibility}
                    onChange={(e) => setFlexibility(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    VO2 Max
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="10"
                    max="90"
                    placeholder="e.g. 48.5"
                    value={vo2}
                    onChange={(e) => setVo2(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Coach Observations & Feedback
                </label>
                <textarea
                  rows={3}
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  placeholder="Notes on technique, endurance threshold, recommendations..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

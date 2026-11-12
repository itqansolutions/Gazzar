"use client";

import React, { useState, useEffect } from "react";
import { Apple, Flame, Droplets, Target, Calendar, CheckCircle, AlertTriangle, MessageSquare } from "lucide-react";
import { toCalendarDateKey } from "@/lib/date-utils";

interface NutritionTabProps {
  clientId: string;
  isClient?: boolean;
}

export default function NutritionTab({ clientId, isClient = false }: NutritionTabProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [adherence, setAdherence] = useState<any>(null);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLogId, setFeedbackLogId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignRes, adhRes, logsRes] = await Promise.all([
        fetch(`/api/nutrition/assignments?clientId=${clientId}`).then((r) => r.json()),
        fetch(`/api/nutrition/daily-logs?clientId=${clientId}&action=ADHERENCE`).then((r) => r.json()),
        fetch(`/api/nutrition/daily-logs?clientId=${clientId}&limit=14`).then((r) => r.json())
      ]);

      if (assignRes.success && Array.isArray(assignRes.data)) {
        setAssignments(assignRes.data);
      }
      if (adhRes.success && adhRes.data) {
        setAdherence(adhRes.data);
      }
      if (logsRes.success && Array.isArray(logsRes.data)) {
        setDailyLogs(logsRes.data);
      }
    } catch (err) {
      console.error("[NutritionTab] Error loading nutrition data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const activePlan = assignments.find((a) => a.isActive) || assignments[0] || null;

  const handleSaveFeedback = async (logId: string) => {
    if (!feedbackText.trim()) return;
    setSavingFeedback(true);
    try {
      const res = await fetch(`/api/nutrition/daily-logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "COACH_FEEDBACK",
          coachFeedback: feedbackText.trim()
        })
      });
      if (res.ok) {
        setFeedbackLogId(null);
        setFeedbackText("");
        await loadData();
      }
    } catch (err) {
      console.error("[NutritionTab] Error saving feedback:", err);
    } finally {
      setSavingFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
            <Apple className="w-4 h-4 text-brand-crimson" />
            <span>Nutrition & Daily Macro Monitoring</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Assigned nutrition plans, daily logged intake, and adherence tracking
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
          Loading athlete nutrition profile...
        </div>
      ) : (
        <>
          {/* Active Nutrition Plan Card */}
          {activePlan ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                  <span className="w-8 h-8 rounded-xl bg-brand-crimson/10 text-brand-crimson flex items-center justify-center font-bold text-xs">
                    <Apple className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {activePlan.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 flex items-center space-x-1 rtl:space-x-reverse">
                      <Calendar className="w-3 h-3" />
                      <span>Starts {toCalendarDateKey(activePlan.startDate)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      activePlan.mode === "INHERITED"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        : activePlan.mode === "CUSTOM_OVERRIDE" || activePlan.mode === "OVERRIDE"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {activePlan.mode}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* Target Macros Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-bold block">Calories Target</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {activePlan.dailyCalories ? `${activePlan.dailyCalories} kcal` : "Unset"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-bold block">Protein</span>
                  <span className="text-base font-black text-brand-crimson">
                    {activePlan.proteinGrams ? `${activePlan.proteinGrams}g` : "Unset"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-bold block">Carbs</span>
                  <span className="text-base font-black text-amber-500">
                    {activePlan.carbsGrams ? `${activePlan.carbsGrams}g` : "Unset"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-bold block">Fats</span>
                  <span className="text-base font-black text-purple-500">
                    {activePlan.fatsGrams ? `${activePlan.fatsGrams}g` : "Unset"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 font-bold block">Water</span>
                  <span className="text-base font-black text-blue-500">
                    {activePlan.waterLiters ? `${activePlan.waterLiters}L` : "Unset"}
                  </span>
                </div>
              </div>

              {activePlan.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Plan Notes & Instructions:</span>
                  {activePlan.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No active nutrition plan assigned to this athlete.
            </div>
          )}

          {/* Adherence & Compliance Overview */}
          {adherence && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Target className="w-3.5 h-3.5 text-brand-crimson" />
                    <span>7-Day Adherence Performance</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {adherence.dateFrom} to {adherence.dateTo} ({adherence.loggedDays}/{adherence.totalDays} days logged)
                  </p>
                </div>
                <div className="text-end">
                  <span className="text-xs font-bold text-slate-400 block">Compliance</span>
                  <span className={`text-base font-black ${
                    adherence.overallComplianceScore >= 80 ? "text-emerald-500" : adherence.overallComplianceScore >= 50 ? "text-amber-500" : "text-brand-crimson"
                  }`}>
                    {adherence.overallComplianceScore}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 font-bold block">Avg Calories</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{adherence.avgCalories} kcal</span>
                  {adherence.calorieAdherencePercentage !== null && (
                    <span className="text-[10px] text-emerald-500 block font-bold mt-0.5">
                      {adherence.calorieAdherencePercentage}% Match
                    </span>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 font-bold block">Avg Protein</span>
                  <span className="text-sm font-black text-brand-crimson">{adherence.avgProtein}g</span>
                  {adherence.proteinAdherencePercentage !== null && (
                    <span className="text-[10px] text-emerald-500 block font-bold mt-0.5">
                      {adherence.proteinAdherencePercentage}% Match
                    </span>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 font-bold block">Avg Water</span>
                  <span className="text-sm font-black text-blue-500">{adherence.avgWater}L</span>
                  {adherence.waterAdherencePercentage !== null && (
                    <span className="text-[10px] text-emerald-500 block font-bold mt-0.5">
                      {adherence.waterAdherencePercentage}% Match
                    </span>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 font-bold block">Missing Logs</span>
                  <span className={`text-sm font-black ${
                    adherence.missingLogDays.length > 0 ? "text-amber-500" : "text-emerald-500"
                  }`}>
                    {adherence.missingLogDays.length} day(s)
                  </span>
                </div>
              </div>

              {adherence.missingLogDays.length > 0 && (
                <div className="flex items-center space-x-2 rtl:space-x-reverse p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>Missing daily nutrition logs on: {adherence.missingLogDays.join(", ")}</span>
                </div>
              )}
            </div>
          )}

          {/* Recent Daily Logs List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Recent Nutrition Logs History
            </h4>

            {dailyLogs.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No nutrition logs recorded yet.
              </div>
            ) : (
              dailyLogs.map((log) => {
                const dateKey = toCalendarDateKey(log.date);
                const isFeedbackOpen = feedbackLogId === log.id;

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                          {dateKey}
                        </span>
                        {log.isManualEntry ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Manual Entry
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Calculated
                          </span>
                        )}
                      </div>

                      {!isClient && (
                        <button
                          onClick={() => {
                            setFeedbackLogId(isFeedbackOpen ? null : log.id);
                            setFeedbackText(log.coachFeedback || "");
                          }}
                          className="text-[11px] font-bold text-brand-crimson hover:underline flex items-center space-x-1 rtl:space-x-reverse cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{log.coachFeedback ? "Edit Feedback" : "Add Coach Feedback"}</span>
                        </button>
                      )}
                    </div>

                    {/* Actual macros */}
                    <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] text-slate-400 block">Calories</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">{log.calories} kcal</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] text-slate-400 block">Protein</span>
                        <span className="font-extrabold text-brand-crimson">{log.proteinGrams}g</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] text-slate-400 block">Carbs</span>
                        <span className="font-extrabold text-amber-500">{log.carbsGrams}g</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] text-slate-400 block">Fats</span>
                        <span className="font-extrabold text-purple-500">{log.fatsGrams}g</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-[10px] text-slate-400 block">Water</span>
                        <span className="font-extrabold text-blue-500">{log.waterLiters}L</span>
                      </div>
                    </div>

                    {log.clientNotes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                        Athlete note: &quot;{log.clientNotes}&quot;
                      </p>
                    )}

                    {log.coachFeedback && !isFeedbackOpen && (
                      <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200">
                        <span className="font-bold block mb-0.5">Coach Review Feedback:</span>
                        {log.coachFeedback}
                      </div>
                    )}

                    {/* Inline Coach Feedback Form */}
                    {isFeedbackOpen && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                          Coach Review & Guidance:
                        </label>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="e.g. Great protein adherence today, try to increase water by 500ml."
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-crimson"
                          rows={2}
                        />
                        <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                          <button
                            onClick={() => setFeedbackLogId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveFeedback(log.id)}
                            disabled={savingFeedback}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-brand-crimson text-white hover:bg-[#FF2D3B] disabled:opacity-50"
                          >
                            {savingFeedback ? "Saving..." : "Save Feedback"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  Target,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  TrendingUp,
  AlertCircle
} from "lucide-react";

export type GoalTypeEnum =
  | "WEIGHT_LOSS"
  | "MUSCLE_GAIN"
  | "STRENGTH"
  | "ENDURANCE"
  | "PERFORMANCE"
  | "REHABILITATION"
  | "GENERAL_FITNESS";

export type GoalStatusEnum = "IN_PROGRESS" | "ACHIEVED" | "ABANDONED";

export interface ClientGoalItem {
  id: string;
  clientId: string;
  title: string;
  goalType: GoalTypeEnum;
  startingValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline?: string | null;
  status: GoalStatusEnum;
  createdAt?: string;
  updatedAt?: string;
}

interface GoalsTabProps {
  clientId: string;
  goals: ClientGoalItem[];
  isClient?: boolean;
  onRefresh?: () => void;
}

const GOAL_TYPE_LABELS: Record<GoalTypeEnum, string> = {
  WEIGHT_LOSS: "Weight Loss",
  MUSCLE_GAIN: "Muscle Gain",
  STRENGTH: "Strength",
  ENDURANCE: "Endurance",
  PERFORMANCE: "Performance",
  REHABILITATION: "Rehabilitation",
  GENERAL_FITNESS: "General Fitness"
};

function calculateProgress(goal: ClientGoalItem): number {
  if (goal.status === "ACHIEVED") return 100;
  const start = goal.startingValue ?? 0;
  const current = goal.currentValue ?? start;
  const target = goal.targetValue;

  if (target === start) return current >= target ? 100 : 0;

  let pct: number;
  if (target > start) {
    pct = ((current - start) / (target - start)) * 100;
  } else {
    // Target is lower (e.g. weight loss)
    pct = ((start - current) / (start - target)) * 100;
  }
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export default function GoalsTab({
  clientId,
  goals = [],
  isClient = false,
  onRefresh
}: GoalsTabProps) {
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ClientGoalItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Add form state
  const [addForm, setAddForm] = useState({
    title: "",
    goalType: "STRENGTH" as GoalTypeEnum,
    startingValue: 0,
    currentValue: 0,
    targetValue: 0,
    unit: "KG",
    deadline: ""
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: "",
    status: "IN_PROGRESS" as GoalStatusEnum,
    currentValue: 0,
    targetValue: 0
  });

  const handleOpenAdd = () => {
    setAddForm({
      title: "",
      goalType: "STRENGTH",
      startingValue: 0,
      currentValue: 0,
      targetValue: 0,
      unit: "KG",
      deadline: ""
    });
    setErrorMessage("");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (goal: ClientGoalItem) => {
    setEditingGoal(goal);
    setEditForm({
      title: goal.title,
      status: goal.status,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue
    });
    setErrorMessage("");
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.title.trim()) {
      setErrorMessage("Please enter a goal title.");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/clients/${clientId}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addForm.title.trim(),
          goalType: addForm.goalType,
          startingValue: Number(addForm.startingValue),
          currentValue: Number(addForm.currentValue),
          targetValue: Number(addForm.targetValue),
          unit: addForm.unit.trim().toUpperCase() || "KG",
          deadline: addForm.deadline || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create goal");
      }
      setIsAddModalOpen(false);
      onRefresh?.();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create goal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/clients/${clientId}/goals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: editingGoal.id,
          title: editForm.title.trim(),
          status: editForm.status,
          currentValue: Number(editForm.currentValue),
          targetValue: Number(editForm.targetValue)
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update goal");
      }
      setEditingGoal(null);
      onRefresh?.();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update goal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal? This cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/clients/${clientId}/goals?goalId=${goalId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete goal");
        return;
      }
      onRefresh?.();
    } catch (err: any) {
      console.error("[GoalsTab] Error deleting goal:", err);
      alert("Failed to delete goal");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Target className="w-4 h-4 text-brand-crimson" />
            <span>Training & Athletic Goals</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Target progression metrics, milestone tracking, and completion status
          </p>
        </div>

        {!isClient && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Goal</span>
          </button>
        )}
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs space-y-3">
          <p>{isClient ? "No goals assigned by your coach yet." : "No goals specified yet."}</p>
          {!isClient && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create First Goal</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g) => {
            const progress = calculateProgress(g);

            const statusBadgeCls =
              g.status === "ACHIEVED"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : g.status === "ABANDONED"
                ? "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";

            const progressBarColor =
              g.status === "ACHIEVED"
                ? "bg-emerald-500"
                : g.status === "ABANDONED"
                ? "bg-slate-500"
                : "bg-brand-crimson";

            return (
              <div
                key={g.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Title, Category, Status & Coach Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {g.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {GOAL_TYPE_LABELS[g.goalType] || g.goalType}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${statusBadgeCls}`}>
                        {g.status === "ACHIEVED" && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {g.status === "ABANDONED" && <XCircle className="w-2.5 h-2.5" />}
                        {g.status === "IN_PROGRESS" && <Clock className="w-2.5 h-2.5" />}
                        <span>
                          {g.status === "IN_PROGRESS"
                            ? "In Progress"
                            : g.status === "ACHIEVED"
                            ? "Achieved ✓"
                            : "Abandoned"}
                        </span>
                      </span>

                      {!isClient && (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => handleOpenEdit(g)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit goal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete goal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Progress
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* 3-Point Comparison: Start / Current / Target */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Starting</span>
                      <strong className="text-xs text-slate-700 dark:text-slate-300">
                        {g.startingValue ?? 0} {g.unit || "KG"}
                      </strong>
                    </div>
                    <div className="border-x border-slate-200 dark:border-slate-700/60">
                      <span className="text-[10px] text-brand-crimson font-bold block">Current</span>
                      <strong className="text-xs text-brand-crimson">
                        {g.currentValue ?? g.startingValue ?? 0} {g.unit || "KG"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Target</span>
                      <strong className="text-xs text-slate-900 dark:text-white">
                        {g.targetValue} {g.unit || "KG"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Footer: Target Deadline */}
                {g.deadline && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <Clock className="w-3 h-3" />
                    <span>Deadline: {new Date(g.deadline).toLocaleDateString()}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          CREATE GOAL MODAL
          ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-crimson" />
                <span>Create Athletic Goal</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Back Squat 140kg, Body Fat 12%"
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={addForm.goalType}
                    onChange={(e) => setAddForm({ ...addForm, goalType: e.target.value as GoalTypeEnum })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                  >
                    <option value="STRENGTH">Strength</option>
                    <option value="WEIGHT_LOSS">Weight Loss</option>
                    <option value="MUSCLE_GAIN">Muscle Gain</option>
                    <option value="ENDURANCE">Endurance</option>
                    <option value="PERFORMANCE">Performance</option>
                    <option value="REHABILITATION">Rehabilitation</option>
                    <option value="GENERAL_FITNESS">General Fitness</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="KG, LBS, KM, REPS"
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Starting Value
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={addForm.startingValue}
                    onChange={(e) => setAddForm({ ...addForm, startingValue: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Value
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={addForm.currentValue}
                    onChange={(e) => setAddForm({ ...addForm, currentValue: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={addForm.targetValue}
                    onChange={(e) => setAddForm({ ...addForm, targetValue: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={addForm.deadline}
                  onChange={(e) => setAddForm({ ...addForm, deadline: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-brand-crimson/30 transition-all disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          EDIT GOAL MODAL
          ========================================================================= */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-crimson" />
                <span>Update Goal Progress</span>
              </h3>
              <button
                onClick={() => setEditingGoal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as GoalStatusEnum })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ACHIEVED">Achieved ✓</option>
                  <option value="ABANDONED">Abandoned</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Value ({editingGoal.unit})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.currentValue}
                    onChange={(e) => setEditForm({ ...editForm, currentValue: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Value ({editingGoal.unit})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.targetValue}
                    onChange={(e) => setEditForm({ ...editForm, targetValue: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson font-bold text-center"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-brand-crimson/30 transition-all disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

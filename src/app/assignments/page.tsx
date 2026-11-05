"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  ClientWorkoutAssignment,
  WorkoutTemplate,
  ClientProfile,
  CoachProfile
} from "@/types";
import {
  ClipboardList,
  Calendar,
  CheckCircle,
  Play,
  PlusCircle,
  Dumbbell
} from "lucide-react";

export default function AssignmentsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ClientWorkoutAssignment[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"SCHEDULED" | "COMPLETED">("SCHEDULED");

  const isClient = user?.role === "CLIENT";

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const url = isClient && user?.id ? `/api/workouts?clientId=${user.id}` : "/api/workouts";
      const [workoutsRes, clientsRes, coachesRes] = await Promise.all([
        fetch(url).then((r) => r.json()),
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/coaches").then((r) => r.json())
      ]);

      if (workoutsRes.success && workoutsRes.data) {
        setAssignments(workoutsRes.data.assignments || []);
        setTemplates(workoutsRes.data.templates || []);
        if (workoutsRes.data.templates?.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(workoutsRes.data.templates[0].id);
        }
      }

      if (clientsRes.success && Array.isArray(clientsRes.data)) {
        setClients(clientsRes.data);
        if (clientsRes.data.length > 0 && !selectedClientId) {
          setSelectedClientId(clientsRes.data[0].id);
        }
      }

      if (coachesRes.success && Array.isArray(coachesRes.data)) {
        setCoaches(coachesRes.data);
        if (coachesRes.data.length > 0 && !selectedCoachId) {
          setSelectedCoachId(coachesRes.data[0].id);
        }
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading assignments:", err);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedTemplateId) return;

    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          coachId: selectedCoachId || coaches[0]?.id || "coach-1",
          templateId: selectedTemplateId,
          scheduledDate,
          coachNotes
        })
      });

      if (res.ok) {
        setSuccessMessage("Workout assigned successfully to PostgreSQL! 🚀");
        await loadData();
        setTimeout(() => setSuccessMessage(""), 4000);
      }
    } catch (err) {
      console.error("[PostgreSQL] Error assigning workout:", err);
    }
  };

  const scheduledAssignments = assignments.filter(a => a.status === "SCHEDULED");
  const completedAssignments = assignments.filter(a => a.status === "COMPLETED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5">
          <ClipboardList className="w-6 h-6 text-brand-crimson" />
          <span>{isClient ? "My Workouts & Sessions" : t("navAssignments")}</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            {assignments.length}
          </span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isClient
            ? "Your active training schedule, live workout logger, and session history"
            : "Assign workouts to clients with live medical restriction screening & alerts"}
        </p>
      </div>

      {/* --- FOR COACH / ADMIN ONLY: ASSIGN WORKOUT FORM --- */}
      {!isClient && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <PlusCircle className="w-4 h-4 text-brand-crimson" />
            <span>Assign Workout to Client</span>
          </h3>

          {successMessage && (
            <div className="p-3 rounded-xl bg-brand-crimson/15 border border-brand-crimson/40 text-xs text-brand-crimson font-bold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-brand-crimson" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleAssign} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Client *</label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.user?.name || "Client"} ({c.sport?.nameEn || c.sport?.nameAr || "Sport"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Workout Template *</label>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.titleEn || t.titleAr} ({t.exercises?.length || 0} exercises)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Scheduled Date *</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Coach</label>
                <select
                  value={selectedCoachId}
                  onChange={e => setSelectedCoachId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                >
                  {coaches.map(co => (
                    <option key={co.id} value={co.id}>{co.user?.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Coach Instructions & Notes</label>
              <textarea
                rows={2}
                placeholder="Warmup cues, target intensity, rest times..."
                value={coachNotes}
                onChange={e => setCoachNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all cursor-pointer"
              >
                Schedule Workout ✓
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs for Client / Coach view */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("SCHEDULED")}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "SCHEDULED"
              ? "bg-brand-crimson text-white shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
          }`}
        >
          🏋️ Scheduled Workouts ({scheduledAssignments.length})
        </button>

        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "COMPLETED"
              ? "bg-brand-crimson text-white shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
          }`}
        >
          ✓ Completed History ({completedAssignments.length})
        </button>
      </div>

      {/* Workouts List */}
      <div className="space-y-3">
        {(activeTab === "SCHEDULED" ? scheduledAssignments : completedAssignments).length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
            {activeTab === "SCHEDULED"
              ? "No scheduled workouts right now."
              : "No completed workouts yet. Start your first workout!"}
          </div>
        ) : (
          (activeTab === "SCHEDULED" ? scheduledAssignments : completedAssignments).map(a => (
            <div
              key={a.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center font-bold text-lg flex-shrink-0">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {a.template?.titleEn || a.template?.titleAr || "Custom Training Session"}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({a.template?.exercises?.length || 0} exercises)
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{a.scheduledDate}</span>
                    </span>
                    {!isClient && a.client && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Client: {a.client.user?.name}</span>
                      </>
                    )}
                    {a.coach && (
                      <>
                        <span>•</span>
                        <span>Coach: {a.coach.user?.name}</span>
                      </>
                    )}
                  </div>

                  {a.coachNotes && (
                    <p className="text-[11px] text-brand-crimson mt-1">
                      💡 {a.coachNotes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-center">
                {a.status === "SCHEDULED" ? (
                  <Link
                    href={`/workout/${a.id}/execute`}
                    className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] flex items-center space-x-1.5 transition-all cursor-pointer scale-100 hover:scale-105"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Start & Log Workout 🏋️‍♂️</span>
                  </Link>
                ) : (
                  <div className="text-end">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30 block">
                      ✓ Completed ({a.workoutLog?.durationMinutes || 45} mins)
                    </span>
                    {a.workoutLog?.overallRpe && (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        RPE: {a.workoutLog.overallRpe}/10
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

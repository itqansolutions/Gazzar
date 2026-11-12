"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Scale,
  Camera,
  Ruler,
  Settings,
  PlusCircle,
  X,
  FileText
} from "lucide-react";
import { CheckInStatusSummary } from "@/server/services/checkin-schedule.service";

interface CheckInsTabProps {
  clientId: string;
  isClient?: boolean;
  onOpenMeasurementModal: () => void;
  onRefresh: () => void;
}

export default function CheckInsTab({
  clientId,
  isClient = false,
  onOpenMeasurementModal,
  onRefresh
}: CheckInsTabProps) {
  const [scheduleData, setScheduleData] = useState<{
    schedule: any;
    status: CheckInStatusSummary;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [weightDays, setWeightDays] = useState<number | "">(7);
  const [measurementDays, setMeasurementDays] = useState<number | "">(14);
  const [photoDays, setPhotoDays] = useState<number | "">(30);
  const [otherDays, setOtherDays] = useState<number | "">("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/check-in-schedule`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setScheduleData(json.data);
          const s = json.data.schedule;
          if (s) {
            setWeightDays(s.weightFrequencyDays ?? "");
            setMeasurementDays(s.measurementFrequencyDays ?? "");
            setPhotoDays(s.photoFrequencyDays ?? "");
            setOtherDays(s.otherReadingFrequencyDays ?? "");
            setScheduleNotes(s.notes ?? "");
          }
        }
      }
    } catch (err) {
      console.error("[CheckInsTab] Error fetching schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [clientId]);

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/check-in-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightFrequencyDays: weightDays === "" ? null : Number(weightDays),
          measurementFrequencyDays: measurementDays === "" ? null : Number(measurementDays),
          photoFrequencyDays: photoDays === "" ? null : Number(photoDays),
          otherReadingFrequencyDays: otherDays === "" ? null : Number(otherDays),
          notes: scheduleNotes
        })
      });

      if (res.ok) {
        setConfigModalOpen(false);
        await loadSchedule();
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update schedule");
      }
    } catch (err) {
      console.error("[CheckInsTab] Error saving schedule:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const status = scheduleData?.status;
  const schedule = scheduleData?.schedule;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Athlete Check-in Schedule & Compliance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated tracking of weigh-ins, body circumference, and progress photos
          </p>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse self-start sm:self-auto">
          {!isClient && (
            <button
              onClick={() => setConfigModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Configure Schedule</span>
            </button>
          )}

          <button
            onClick={onOpenMeasurementModal}
            className="px-3 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse cursor-pointer shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Log Check-in Now</span>
          </button>
        </div>
      </div>

      {/* Compliance Overview Banner */}
      {status && status.overallStatus !== "NOT_CONFIGURED" && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
            status.overallStatus === "OVERDUE"
              ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
              : status.overallStatus === "DUE_SOON"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            {status.overallStatus === "OVERDUE" ? (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            ) : status.overallStatus === "DUE_SOON" ? (
              <Clock className="w-5 h-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <div>
              <h4 className="text-xs font-bold">
                {status.overallStatus === "OVERDUE"
                  ? `${status.overdueCount} check-in ${status.overdueCount > 1 ? "items are" : "item is"} overdue!`
                  : status.overallStatus === "DUE_SOON"
                  ? "Upcoming check-in due within 48 hours"
                  : "All scheduled check-ins are up to date"}
              </h4>
              <p className="text-[11px] opacity-90 mt-0.5">
                {status.overallStatus === "OVERDUE"
                  ? "Please submit the pending readings or notify the athlete."
                  : status.overallStatus === "DUE_SOON"
                  ? "Reminder sent to athlete for scheduled check-in window."
                  : "Athlete is consistently logging required measurements."}
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/60 dark:bg-slate-900/60 border border-current">
            {status.overallStatus.replace("_", " ")}
          </span>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weight Check-in Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Weight Check-in</h4>
            </div>

            {status?.weight.isConfigured ? (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  status.weight.isOverdue
                    ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                    : status.weight.isDueSoon
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {status.weight.isOverdue
                  ? `Overdue (${status.weight.daysOverdue}d)`
                  : status.weight.isDueSoon
                  ? `Due in ${status.weight.daysRemaining}d`
                  : "On Track"}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Not configured</span>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Frequency:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.weight.frequencyDays ? `Every ${status.weight.frequencyDays} days` : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Last Recorded:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.weight.lastAt ? new Date(status.weight.lastAt).toLocaleDateString() : "Never"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Next Due:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.weight.nextDueAt ? new Date(status.weight.nextDueAt).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Circumference & Body Fat Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Ruler className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Measurements & Fat %</h4>
            </div>

            {status?.measurement.isConfigured ? (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  status.measurement.isOverdue
                    ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                    : status.measurement.isDueSoon
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {status.measurement.isOverdue
                  ? `Overdue (${status.measurement.daysOverdue}d)`
                  : status.measurement.isDueSoon
                  ? `Due in ${status.measurement.daysRemaining}d`
                  : "On Track"}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Not configured</span>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Frequency:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.measurement.frequencyDays
                  ? `Every ${status.measurement.frequencyDays} days`
                  : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Last Recorded:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.measurement.lastAt ? new Date(status.measurement.lastAt).toLocaleDateString() : "Never"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Next Due:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.measurement.nextDueAt
                  ? new Date(status.measurement.nextDueAt).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Photos Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Progress Photos</h4>
            </div>

            {status?.photo.isConfigured ? (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  status.photo.isOverdue
                    ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                    : status.photo.isDueSoon
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {status.photo.isOverdue
                  ? `Overdue (${status.photo.daysOverdue}d)`
                  : status.photo.isDueSoon
                  ? `Due in ${status.photo.daysRemaining}d`
                  : "On Track"}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Not configured</span>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Frequency:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.photo.frequencyDays ? `Every ${status.photo.frequencyDays} days` : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Last Recorded:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.photo.lastAt ? new Date(status.photo.lastAt).toLocaleDateString() : "Never"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Next Due:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.photo.nextDueAt ? new Date(status.photo.nextDueAt).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {schedule?.notes && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start space-x-3 rtl:space-x-reverse">
          <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">Coach Schedule Instructions</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{schedule.notes}</p>
          </div>
        </div>
      )}

      {/* Configure Schedule Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setConfigModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Configure Check-in Frequencies
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Set how often the athlete should submit metrics and photos
            </p>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Weigh-in Frequency (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  placeholder="e.g. 7 (weekly)"
                  value={weightDays}
                  onChange={(e) => setWeightDays(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Body Measurements Frequency (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  placeholder="e.g. 14 (bi-weekly)"
                  value={measurementDays}
                  onChange={(e) => setMeasurementDays(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Progress Photos Frequency (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  placeholder="e.g. 30 (monthly)"
                  value={photoDays}
                  onChange={(e) => setPhotoDays(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Schedule Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="e.g. Take measurements in morning on an empty stomach..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

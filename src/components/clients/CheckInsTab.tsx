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
  FileText,
  Send,
  MessageSquare,
  AlertCircle,
  Check,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { CheckInStatusSummary } from "@/server/services/checkin-schedule.service";
import { CHECKIN_METRICS } from "@/lib/checkin-metrics";

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
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selfCheckInModalOpen, setSelfCheckInModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Schedule form state
  const [weightDays, setWeightDays] = useState<number | "">(7);
  const [measurementDays, setMeasurementDays] = useState<number | "">(14);
  const [photoDays, setPhotoDays] = useState<number | "">(30);
  const [otherDays, setOtherDays] = useState<number | "">("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  // Self check-in form state
  const [checkInWeight, setCheckInWeight] = useState<number | "">("");
  const [checkInWaist, setCheckInWaist] = useState<number | "">("");
  const [checkInChest, setCheckInChest] = useState<number | "">("");
  const [checkInArms, setCheckInArms] = useState<number | "">("");
  const [checkInThigh, setCheckInThigh] = useState<number | "">("");
  const [checkInIssues, setCheckInIssues] = useState("");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [correctsSubmissionId, setCorrectsSubmissionId] = useState<string | null>(null);

  // Coach request form state
  const [reqMetrics, setReqMetrics] = useState<string[]>([CHECKIN_METRICS.WEIGHT]);
  const [reqDueDays, setReqDueDays] = useState<number>(2);
  const [reqNotes, setReqNotes] = useState("");

  // Review form state
  const [reviewStatus, setReviewStatus] = useState<"REVIEWED" | "FLAGGED">("REVIEWED");
  const [reviewNotes, setReviewNotes] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [schedRes, subRes, reqRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/check-in-schedule`),
        fetch(`/api/clients/${clientId}/check-in-submissions`),
        fetch(`/api/clients/${clientId}/check-in-requests`)
      ]);

      if (schedRes.ok) {
        const json = await schedRes.json();
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

      if (subRes.ok) {
        const json = await subRes.json();
        if (json.success) setSubmissions(json.data || []);
      }

      if (reqRes.ok) {
        const json = await reqRes.json();
        if (json.success) setRequests(json.data || []);
      }
    } catch (err) {
      console.error("[CheckInsTab] Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  // Handle schedule configuration save
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
        await loadData();
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

  // Handle athlete self check-in submission
  const handleSubmitCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/check-in-submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: checkInWeight === "" ? null : Number(checkInWeight),
          waistCm: checkInWaist === "" ? null : Number(checkInWaist),
          chestCm: checkInChest === "" ? null : Number(checkInChest),
          armsCm: checkInArms === "" ? null : Number(checkInArms),
          thighCm: checkInThigh === "" ? null : Number(checkInThigh),
          currentIssues: checkInIssues || null,
          athleteNotes: checkInNotes || null,
          checkInRequestId: selectedRequestId,
          correctsSubmissionId: correctsSubmissionId
        })
      });

      if (res.ok) {
        setSelfCheckInModalOpen(false);
        // Reset form
        setCheckInWeight("");
        setCheckInWaist("");
        setCheckInChest("");
        setCheckInArms("");
        setCheckInThigh("");
        setCheckInIssues("");
        setCheckInNotes("");
        setSelectedRequestId(null);
        setCorrectsSubmissionId(null);
        await loadData();
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit check-in");
      }
    } catch (err) {
      console.error("[CheckInsTab] Error submitting check-in:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle coach request creation
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + reqDueDays);

      const res = await fetch(`/api/clients/${clientId}/check-in-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedMetrics: reqMetrics,
          dueAt: dueAt.toISOString(),
          notes: reqNotes || null
        })
      });

      if (res.ok) {
        setRequestModalOpen(false);
        setReqNotes("");
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create check-in request");
      }
    } catch (err) {
      console.error("[CheckInsTab] Error creating request:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle coach reviewing a submission
  const handleReviewSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalOpen) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/check-in-submissions/${reviewModalOpen}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStatus,
          coachReviewNotes: reviewNotes || null
        })
      });

      if (res.ok) {
        setReviewModalOpen(null);
        setReviewNotes("");
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit review");
      }
    } catch (err) {
      console.error("[CheckInsTab] Error submitting review:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle coach verifying a measurement directly
  const handleVerifyMeasurement = async (measurementId: string, status: "VERIFIED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/clients/${clientId}/measurements/${measurementId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: status })
      });
      if (res.ok) {
        await loadData();
        onRefresh();
      }
    } catch (err) {
      console.error("[CheckInsTab] Error verifying measurement:", err);
    }
  };

  const status = scheduleData?.status;
  const schedule = scheduleData?.schedule;
  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Athlete Check-in Schedule & Compliance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track metrics, automated cadence, and athlete self-reports
          </p>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse self-start sm:self-auto flex-wrap gap-2">
          {!isClient && (
            <>
              <button
                onClick={() => setConfigModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer shadow-sm"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Configure Cadence</span>
              </button>

              <button
                onClick={() => setRequestModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-brand-crimson/30 bg-brand-crimson/10 hover:bg-brand-crimson/20 text-brand-crimson font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request Check-in Now</span>
              </button>
            </>
          )}

          {isClient && (
            <button
              onClick={() => {
                setSelectedRequestId(pendingRequests[0]?.id || null);
                setSelfCheckInModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Submit Check-in Form</span>
            </button>
          )}

          <button
            onClick={onOpenMeasurementModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-slate-400" />
            <span>Quick Log</span>
          </button>
        </div>
      </div>

      {/* Pending Coach Request Banner */}
      {pendingRequests.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-crimson/15 via-red-500/10 to-transparent border border-brand-crimson/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-brand-crimson/20 text-brand-crimson flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                Active Check-in Request from Coach
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Requested: {pendingRequests[0].requestedMetrics?.join(", ") || "Metrics"} • Due:{" "}
                {new Date(pendingRequests[0].dueAt).toLocaleDateString()}
                {pendingRequests[0].notes && ` — "${pendingRequests[0].notes}"`}
              </p>
            </div>
          </div>

          {isClient && (
            <button
              onClick={() => {
                setSelectedRequestId(pendingRequests[0].id);
                setSelfCheckInModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-brand-crimson text-white text-xs font-bold hover:bg-[#FF2D3B] shadow-sm"
            >
              Fulfill Request
            </button>
          )}
        </div>
      )}

      {/* Compliance Overview Banner */}
      {status && status.overallStatus !== "NOT_CONFIGURED" && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
            status.overallStatus === "OVERDUE"
              ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
              : status.overallStatus === "DUE_SOON"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            {status.overallStatus === "OVERDUE" && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            {status.overallStatus === "DUE_SOON" && <Clock className="w-5 h-5 flex-shrink-0" />}
            {status.overallStatus === "UP_TO_DATE" && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">
                {status.overallStatus === "OVERDUE"
                  ? `Check-in Overdue (${status.overdueCount} metric${status.overdueCount > 1 ? "s" : ""})`
                  : status.overallStatus === "DUE_SOON"
                  ? `Check-in Due Soon (${status.dueSoonCount} metric${status.dueSoonCount > 1 ? "s" : ""})`
                  : "All Check-ins Up to Date"}
              </h4>
              <p className="text-[11px] opacity-80 mt-0.5">
                {status.overallStatus === "OVERDUE"
                  ? "Please submit your overdue measurements to keep training programs calibrated."
                  : status.overallStatus === "DUE_SOON"
                  ? "Upcoming check-in due within the next 48 hours."
                  : "Compliance is on track according to the coach's schedule."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cadence Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Weight */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Weigh-in</h4>
            </div>

            {status?.weight.isConfigured ? (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  status.weight.isOverdue
                    ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                    : status.weight.isDueSoon
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
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

          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Frequency:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.weight.frequencyDays ? `Every ${status.weight.frequencyDays} days` : "Disabled"}
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

        {/* Body Circumferences */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Ruler className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Circumferences</h4>
            </div>

            {status?.measurement.isConfigured ? (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  status.measurement.isOverdue
                    ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                    : status.measurement.isDueSoon
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
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

          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Frequency:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.measurement.frequencyDays ? `Every ${status.measurement.frequencyDays} days` : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Next Due:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.measurement.nextDueAt ? new Date(status.measurement.nextDueAt).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Photos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
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
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
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

          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-[11px] text-slate-500">Frequency:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {status?.photo.frequencyDays ? `Every ${status.photo.frequencyDays} days` : "Disabled"}
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

      {/* Submissions History Table */}
      <div className="space-y-3 pt-4">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2 rtl:space-x-reverse">
          <FileText className="w-4 h-4 text-brand-crimson" />
          <span>Self-Check-in Submissions History</span>
        </h4>

        {submissions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No self check-in submissions logged yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-4 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {new Date(sub.submittedAt).toLocaleDateString()} at{" "}
                        {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {sub.correctsSubmissionId && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                          Correction
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          sub.reviewStatus === "REVIEWED"
                            ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                            : sub.reviewStatus === "FLAGGED"
                            ? "bg-red-500/15 text-red-600 border border-red-500/30"
                            : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                        }`}
                      >
                        {sub.reviewStatus}
                      </span>

                      {!isClient && (
                        <button
                          onClick={() => {
                            setReviewModalOpen(sub.id);
                            setReviewNotes(sub.coachReviewNotes || "");
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submission Content Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                    {sub.weightKg !== null && (
                      <div>
                        <span className="text-slate-400">Weight:</span>{" "}
                        <span className="font-bold">{sub.weightKg} kg</span>
                      </div>
                    )}
                    {sub.waistCm !== null && (
                      <div>
                        <span className="text-slate-400">Waist:</span>{" "}
                        <span className="font-bold">{sub.waistCm} cm</span>
                      </div>
                    )}
                    {sub.chestCm !== null && (
                      <div>
                        <span className="text-slate-400">Chest:</span>{" "}
                        <span className="font-bold">{sub.chestCm} cm</span>
                      </div>
                    )}
                    {sub.armsCm !== null && (
                      <div>
                        <span className="text-slate-400">Arms:</span>{" "}
                        <span className="font-bold">{sub.armsCm} cm</span>
                      </div>
                    )}
                  </div>

                  {sub.currentIssues && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start space-x-2 rtl:space-x-reverse">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Reported Issues / Fatigue: </span>
                        {sub.currentIssues}
                      </div>
                    </div>
                  )}

                  {sub.coachReviewNotes && (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2 rtl:space-x-reverse">
                      <MessageSquare className="w-4 h-4 text-brand-crimson flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Coach Feedback: </span>
                        {sub.coachReviewNotes}
                      </div>
                    </div>
                  )}

                  {/* Associated CMH Record Provenance */}
                  {sub.generatedMeasurement && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>
                        Promoted to measurement history:{" "}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {sub.generatedMeasurement.source}
                        </strong>{" "}
                        • Status:{" "}
                        <strong
                          className={
                            sub.generatedMeasurement.verificationStatus === "VERIFIED"
                              ? "text-rose-500"
                              : sub.generatedMeasurement.verificationStatus === "REJECTED"
                              ? "text-red-500"
                              : "text-amber-500"
                          }
                        >
                          {sub.generatedMeasurement.verificationStatus}
                        </strong>
                      </span>

                      {!isClient && sub.generatedMeasurement.verificationStatus === "PENDING_REVIEW" && (
                        <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                          <button
                            onClick={() => handleVerifyMeasurement(sub.generatedMeasurement.id, "VERIFIED")}
                            className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 text-[10px] font-bold"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleVerifyMeasurement(sub.generatedMeasurement.id, "REJECTED")}
                            className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30 text-[10px] font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ATHLETE SELF CHECK-IN MODAL */}
      {selfCheckInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelfCheckInModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Athlete Self-Check-In
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Submit your latest body measurements, pain/fatigue symptoms, and notes for your coach.
            </p>

            <form onSubmit={handleSubmitCheckIn} className="space-y-4">
              {/* Weight */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Current Weight (KG)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 84.5"
                  value={checkInWeight}
                  onChange={(e) => setCheckInWeight(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              {/* Circumferences */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Waist (CM)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 82"
                    value={checkInWaist}
                    onChange={(e) => setCheckInWaist(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Chest (CM)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 102"
                    value={checkInChest}
                    onChange={(e) => setCheckInChest(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Current Issues / Pain / Fatigue */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Current Issues / Pain / Muscle Fatigue
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Left knee soreness after squats, high fatigue on Thursday..."
                  value={checkInIssues}
                  onChange={(e) => setCheckInIssues(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Athlete Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  General Notes for Coach
                </label>
                <textarea
                  rows={2}
                  placeholder="Any dietary comments, sleep quality, energy levels..."
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Optional: Correction Chain Link */}
              {submissions.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Is this correcting a previous submission?
                  </label>
                  <select
                    value={correctsSubmissionId || ""}
                    onChange={(e) => setCorrectsSubmissionId(e.target.value || null)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <option value="">No — This is a new check-in</option>
                    {submissions.map((s) => (
                      <option key={s.id} value={s.id}>
                        Correct submission from {new Date(s.submittedAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setSelfCheckInModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Check-In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COACH REQUEST MODAL */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setRequestModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Request Check-In Now
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Send an in-app check-in request notification to the athlete with specific metrics.
            </p>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Select Requested Metrics
                </label>
                <div className="space-y-2">
                  {Object.values(CHECKIN_METRICS).map((metric) => (
                    <label key={metric} className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reqMetrics.includes(metric)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setReqMetrics([...reqMetrics, metric]);
                          } else {
                            setReqMetrics(reqMetrics.filter((m) => m !== metric));
                          }
                        }}
                        className="rounded text-brand-crimson"
                      />
                      <span className="text-slate-800 dark:text-slate-200">{metric}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Due In (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={reqDueDays}
                  onChange={(e) => setReqDueDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Instructions / Coach Message
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please take measurements in the morning..."
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || reqMetrics.length === 0}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COACH REVIEW MODAL */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setReviewModalOpen(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Review Athlete Check-In
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Add feedback and assign review status.
            </p>

            <form onSubmit={handleReviewSubmission} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus("REVIEWED")}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      reviewStatus === "REVIEWED"
                        ? "bg-rose-500 text-white border-rose-500"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    REVIEWED (OK)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus("FLAGGED")}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      reviewStatus === "FLAGGED"
                        ? "bg-red-500 text-white border-red-500"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    FLAGGED (Needs Attention)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Coach Feedback Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide recommendations, congratulations, or adjustments..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE CADENCE MODAL */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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

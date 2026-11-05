"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { SessionCalendar, AttendanceStatus } from "@/types";
import {
  CheckCircle2,
  Users,
  Clock,
  Check,
  X,
  AlertCircle,
  Award
} from "lucide-react";

export default function AttendancePage() {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<SessionCalendar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSessions(json.data);
        }
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading attendance sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (sessionId: string, clientId: string, status: AttendanceStatus) => {
    // Optimistic UI update
    setSessions((prev) =>
      prev.map((sess) => {
        if (sess.id !== sessionId) return sess;
        return {
          ...sess,
          attendances: sess.attendances?.map((att) =>
            att.clientId === clientId ? { ...att, status } : att
          )
        };
      })
    );

    try {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, clientId, status })
      });
    } catch (err) {
      console.error("[PostgreSQL] Error updating attendance status:", err);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <CheckCircle2 className="w-6 h-6 text-brand-crimson" />
          <span>{t("navAttendance")}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Record session check-in, late arrivals, excused absences and adherence rates directly in PostgreSQL
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold">
          Loading sessions & attendance from database...
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          No training sessions found. Create a session to start tracking attendance.
        </div>
      ) : (
        /* Sessions Attendance Cards */
        <div className="space-y-4">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{sess.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(sess.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Coach: {sess.coach?.user?.name || "GX Coach"}
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-brand-crimson border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                  {sess.attendances?.length || 0} Registered Clients
                </span>
              </div>

              {/* Athletes Check-in Table */}
              <div className="space-y-2">
                {sess.attendances?.map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <img
                        src={att.client?.user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                        alt={att.client?.user?.name || "Athlete"}
                        className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{att.client?.user?.name || "Athlete"}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Weight: {att.client?.weightKg || "--"} KG</p>
                      </div>
                    </div>

                    {/* Status Toggle Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateStatus(sess.id, att.clientId, "PRESENT")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          att.status === "PRESENT"
                            ? "bg-brand-crimson text-white shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                            : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        ✓ {t("present")}
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(sess.id, att.clientId, "LATE")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          att.status === "LATE"
                            ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                            : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        ⏱ {t("late")}
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(sess.id, att.clientId, "EXCUSED")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          att.status === "EXCUSED"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                            : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        ℹ {t("excused")}
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(sess.id, att.clientId, "ABSENT")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          att.status === "ABSENT"
                            ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                            : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        ✕ {t("absent")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
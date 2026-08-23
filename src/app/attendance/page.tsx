"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
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
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState<SessionCalendar[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setSessions(db.getCalendars());
  };

  const handleUpdateStatus = (sessionId: string, clientId: string, status: AttendanceStatus) => {
    db.updateSessionAttendance(sessionId, clientId, status);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <span>{t("navAttendance")}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {language === "ar"
            ? "تسجيل حضور وغياب المشتركين للحصص الفردية والجماعية وحساب نسب الالتزام"
            : "Record session check-in, late arrivals, excused absences & adherence rates"}
        </p>
      </div>

      {/* Sessions Attendance Cards */}
      <div className="space-y-4">
        {sessions.map(sess => (
          <div
            key={sess.id}
            className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">{sess.title}</h3>
                <p className="text-xs text-slate-400">
                  {new Date(sess.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • الكابتن: {sess.coach?.user?.name}
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 self-start sm:self-auto">
                {sess.attendances?.length || 0} مشتركون مسجلون
              </span>
            </div>

            {/* Athletes Check-in Table */}
            <div className="space-y-2">
              {sess.attendances?.map(att => (
                <div
                  key={att.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <img
                      src={att.client?.user.avatar}
                      alt={att.client?.user.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{att.client?.user.name}</h4>
                      <p className="text-[10px] text-slate-400">الوزن: {att.client?.weightKg} KG</p>
                    </div>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => handleUpdateStatus(sess.id, att.clientId, "PRESENT")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        att.status === "PRESENT"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-400"
                      }`}
                    >
                      ✓ {t("present")}
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(sess.id, att.clientId, "LATE")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        att.status === "LATE"
                          ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-400"
                      }`}
                    >
                      ⏱ {t("late")}
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(sess.id, att.clientId, "EXCUSED")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        att.status === "EXCUSED"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-400"
                      }`}
                    >
                      ℹ {t("excused")}
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(sess.id, att.clientId, "ABSENT")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        att.status === "ABSENT"
                          ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-400"
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
    </div>
  );
}
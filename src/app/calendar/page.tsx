"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { SessionCalendar } from "@/types";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  PlusCircle,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function CalendarPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionCalendar[]>([]);

  useEffect(() => {
    setSessions(db.getCalendars());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <CalendarIcon className="w-6 h-6 text-emerald-400" />
            <span>{t("navCalendar")}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "جدول حصص التدريب الفردية (PT) والتدريب الجماعي (CrossFit & Classes)"
              : "Individual PT sessions and Group Class schedule"}
          </p>
        </div>
      </div>

      {/* Calendar Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sessions.map(sess => (
          <div
            key={sess.id}
            className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  sess.sessionType === "GROUP"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}>
                  {sess.sessionType === "GROUP" ? "تدريب جماعي (Group Class)" : "تدريب فردي (Personal Training)"}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white pt-1">{sess.title}</h3>
                <p className="text-xs text-slate-400">الكابتن: {sess.coach?.user?.name}</p>
              </div>

              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                <CalendarIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-slate-700 dark:text-slate-300">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{new Date(sess.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-slate-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="truncate">{sess.location || "صالة التدريب"}</span>
              </div>
            </div>

            {/* Attendance list in session */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                المشتركون المسجلون ({sess.attendances?.length || 0} / {sess.maxParticipants}):
              </span>
              <div className="space-y-1.5">
                {sess.attendances?.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs"
                  >
                    <span className="font-semibold text-white">{att.client?.user.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      att.status === "PRESENT"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {att.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
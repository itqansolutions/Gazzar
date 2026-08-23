"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/db";
import { AuditLog } from "@/types";
import {
  FileCode2,
  Clock,
  User,
  Shield,
  Activity,
  Search,
  Filter
} from "lucide-react";

export default function AuditLogsPage() {
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLogs(db.getAuditLogs());
  }, []);

  const filteredLogs = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.entityType.toLowerCase().includes(search.toLowerCase()) ||
    (l.userName && l.userName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <FileCode2 className="w-6 h-6 text-emerald-400" />
          <span>{t("navAuditLogs")}</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-700">
            {filteredLogs.length} سجل
          </span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {language === "ar"
            ? "سجل الأمان والعمليات الشامل: تتبع من قام بإنشاء أو تعديل أي بيانات باللحظة والتواريخ"
            : "Enterprise audit trail: Track who created, updated, or deleted records in real-time"}
        </p>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="بحث في سجلات النظام..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Audit Logs Table */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 text-start">الوقت والتاريخ</th>
                <th className="p-3 text-start">المستخدم المسؤول</th>
                <th className="p-3 text-center">نوع الإجراء</th>
                <th className="p-3 text-center">الكائن المستهدف</th>
                <th className="p-3 text-start">التفاصيل والتغييرات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono text-[11px] text-slate-400">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 font-bold text-white">
                    {l.userName || "نظام الأكاديمية"}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {l.action}
                    </span>
                  </td>
                  <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                    {l.entityType}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-400 max-w-md truncate">
                    {JSON.stringify(l.newValues || l.oldValues || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
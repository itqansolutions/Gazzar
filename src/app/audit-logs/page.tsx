"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
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
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setLogs(json.data);
        }
      })
      .catch((err) => console.error("[PostgreSQL] Error loading audit logs:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.entityType?.toLowerCase().includes(search.toLowerCase()) ||
      (l.userName && l.userName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <FileCode2 className="w-6 h-6 text-brand-crimson" />
          <span>{t("navAuditLogs")}</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {filteredLogs.length} Records
          </span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Enterprise audit trail: Track operations, logins, mutations, and database events in PostgreSQL
        </p>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Search audit records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-crimson"
        />
      </div>

      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold">
          Loading audit trail from PostgreSQL...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          No audit log entries matching your criteria.
        </div>
      ) : (
        /* Audit Logs Table */
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">Timestamp</th>
                  <th className="p-3 text-start">Operator</th>
                  <th className="p-3 text-center">Action</th>
                  <th className="p-3 text-center">Entity</th>
                  <th className="p-3 text-start">Details / Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Just now"}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <User className="w-3.5 h-3.5 text-brand-crimson" />
                        <span>{log.userName || "System"}</span>
                        {log.userRole && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {log.userRole}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.action.includes("CREATE")
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : log.action.includes("DELETE")
                            ? "bg-red-500/20 text-red-600 dark:text-red-400"
                            : "bg-brand-crimson/20 text-brand-crimson"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {log.newValues || log.oldValues || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
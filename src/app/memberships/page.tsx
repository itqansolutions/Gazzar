"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

export default function MembershipsPage() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memberships")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setPlans(json.data.packages || []);
          setMemberships(json.data.memberships || []);
        }
      })
      .catch((err) => console.error("[PostgreSQL] Error loading memberships:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <CreditCard className="w-6 h-6 text-brand-crimson" />
          <span>{t("navMemberships")}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Subscription packages, payment history & renewal tracking stored securely in PostgreSQL
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold">
          Loading membership plans & subscriptions from database...
        </div>
      ) : (
        <>
          {/* Plans Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4 hover:border-brand-crimson/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.nameEn || p.nameAr}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-brand-crimson/20 text-brand-crimson">
                      {p.currency} {p.price}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{p.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{p.durationDays} Days</span>
                  </div>
                  {p.sessionsCount && (
                    <div className="flex justify-between">
                      <span>1-on-1 Sessions:</span>
                      <span className="font-bold text-brand-crimson">{p.sessionsCount} Sessions</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Client Subscriptions Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Client Memberships & Payments</h3>

            {memberships.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active memberships recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-start">Client</th>
                      <th className="p-3 text-start">Plan</th>
                      <th className="p-3 text-center">Start Date</th>
                      <th className="p-3 text-center">End Date</th>
                      <th className="p-3 text-center">Paid</th>
                      <th className="p-3 text-center">Remaining</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {memberships.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{m.client?.user?.name || "Client"}</td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{m.planType}</td>
                        <td className="p-3 text-center text-slate-500 dark:text-slate-400">
                          {m.startDate ? new Date(m.startDate).toISOString().slice(0, 10) : "N/A"}
                        </td>
                        <td className="p-3 text-center font-semibold text-brand-crimson">
                          {m.endDate ? new Date(m.endDate).toISOString().slice(0, 10) : "N/A"}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-white">{m.paidAmount} EGP</td>
                        <td className="p-3 text-center font-bold text-amber-500">{m.remainingAmount || 0} EGP</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              m.paymentStatus === "PAID"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-brand-crimson/20 text-brand-crimson border border-brand-crimson/40"
                            }`}
                          >
                            {m.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
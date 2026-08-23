"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/db";
import { MembershipPackage, Membership } from "@/types";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
  PlusCircle,
  Sparkles
} from "lucide-react";

export default function MembershipsPage() {
  const { t, language } = useLanguage();
  const [plans, setPlans] = useState<MembershipPackage[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    setPlans(db.getMembershipPlans());
    setMemberships(db.getMemberships() as any);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
          <CreditCard className="w-6 h-6 text-emerald-400" />
          <span>{t("navMemberships")}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {language === "ar"
            ? "باقات الاشتراكات، الحصص الفردية، المدفوعات وتواريخ انتهاء العضوية"
            : "Subscription packages, session packages, payment history & renewal tracking"}
        </p>
      </div>

      {/* Plans Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map(p => (
          <div
            key={p.id}
            className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 hover:border-emerald-500/50 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.nameAr}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400">
                  {p.currency} {p.price}
                </span>
              </div>
              <p className="text-xs text-slate-400">{p.nameEn}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{p.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>المدة:</span>
                <span className="font-bold text-white">{p.durationDays} يوم</span>
              </div>
              {p.sessionsCount && (
                <div className="flex justify-between">
                  <span>عدد الحصص الفردية:</span>
                  <span className="font-bold text-emerald-400">{p.sessionsCount} حصة</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Client Subscriptions Table */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">سجل اشتراكات المتدربين النشطة والمدفوعات</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 text-start">المشترك</th>
                <th className="p-3 text-start">الباقة</th>
                <th className="p-3 text-center">تاريخ البدء</th>
                <th className="p-3 text-center">تاريخ الانتهاء</th>
                <th className="p-3 text-center">المدفوع</th>
                <th className="p-3 text-center">المتبقي</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {memberships.map(m => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-bold text-white">{m.client?.user?.name || "مشترك"}</td>
                  <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{(m as any).plan?.nameAr || "باقة تدريب"}</td>
                  <td className="p-3 text-center text-slate-400">{m.startDate}</td>
                  <td className="p-3 text-center font-semibold text-emerald-400">{m.endDate}</td>
                  <td className="p-3 text-center font-bold text-white">{m.paidAmount} EGP</td>
                  <td className="p-3 text-center font-bold text-amber-400">{m.remainingAmount || 0} EGP</td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {m.paymentStatus}
                    </span>
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
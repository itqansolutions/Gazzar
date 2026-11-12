"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  PauseCircle,
  Activity
} from "lucide-react";

interface SubscriptionData {
  id: string;
  planType: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
  remainingDays: number;
  computedStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "SUSPENDED" | "NO_ACTIVE_SUBSCRIPTION";
  clientStatus?: string;
  isSessionBased?: boolean;
  attendedSessions?: number;
  totalSessions?: number | null;
  sessionDetailsNote?: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  MONTHLY: "1 Month Standard",
  THREE_MONTHS: "3 Months Transformation",
  SIX_MONTHS: "6 Months Elite",
  ANNUAL: "Annual Championship",
  PERSONAL_TRAINING: "1-on-1 VIP Personal Training",
  GROUP_CLASS: "Group Fitness Classes"
};

export default function SubscriptionCard({ clientId }: { clientId?: string }) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noSubscription, setNoSubscription] = useState(false);

  useEffect(() => {
    const url = clientId
      ? `/api/athlete/subscription?clientId=${encodeURIComponent(clientId)}`
      : "/api/athlete/subscription";

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSubscription(json.data);
        } else {
          setNoSubscription(true);
        }
      })
      .catch((err) => {
        console.error("[SubscriptionCard] Error loading membership:", err);
        setNoSubscription(true);
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="bg-card border border-line rounded-card p-5 sm:p-6 shadow-card animate-pulse space-y-4">
        <div className="h-5 w-48 bg-raised rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="h-16 bg-raised rounded-control" />
          <div className="h-16 bg-raised rounded-control" />
          <div className="h-16 bg-raised rounded-control" />
          <div className="h-16 bg-raised rounded-control" />
        </div>
      </div>
    );
  }

  const status = subscription?.computedStatus || (noSubscription ? "NO_ACTIVE_SUBSCRIPTION" : "NO_ACTIVE_SUBSCRIPTION");

  const getStatusBadge = () => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Active</span>
          </span>
        );
      case "EXPIRING_SOON":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Expiring Soon ({subscription?.remainingDays} days)</span>
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-500 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>Expired</span>
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Suspended / Frozen</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>No Active Subscription</span>
          </span>
        );
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-card border border-line rounded-card p-5 sm:p-6 shadow-card transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-control bg-brand-soft text-brand flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-fg tracking-tight">
              My Membership & Subscription
            </h2>
            <p className="text-xs text-muted">
              Live athlete access pass & renewal tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <Link
            href="/memberships"
            className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
          >
            <span>All Plans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {subscription ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Plan Type */}
            <div className="p-3.5 rounded-control bg-raised border border-line">
              <span className="text-[11px] font-medium text-muted block mb-1">
                Membership Plan
              </span>
              <p className="text-sm font-bold text-fg truncate">
                {PLAN_LABELS[subscription.planType] || subscription.planType}
              </p>
            </div>

            {/* Start Date */}
            <div className="p-3.5 rounded-control bg-raised border border-line">
              <span className="text-[11px] font-medium text-muted block mb-1">
                Start Date
              </span>
              <p className="text-sm font-bold text-fg">
                {formatDate(subscription.startDate)}
              </p>
            </div>

            {/* End Date */}
            <div className="p-3.5 rounded-control bg-raised border border-line">
              <span className="text-[11px] font-medium text-muted block mb-1">
                Expiry Date
              </span>
              <p className="text-sm font-bold text-fg">
                {formatDate(subscription.endDate)}
              </p>
            </div>

            {/* Remaining Days */}
            <div className="p-3.5 rounded-control bg-raised border border-line">
              <span className="text-[11px] font-medium text-muted block mb-1">
                Remaining Days
              </span>
              <p
                className={`text-sm font-bold ${
                  status === "EXPIRED"
                    ? "text-red-500"
                    : status === "SUSPENDED"
                    ? "text-sky-400"
                    : status === "EXPIRING_SOON"
                    ? "text-amber-500"
                    : "text-emerald-500"
                }`}
              >
                {status === "EXPIRED"
                  ? "Expired"
                  : status === "SUSPENDED"
                  ? "Frozen"
                  : `${subscription.remainingDays} Day${subscription.remainingDays === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          {/* Session Allowance Banner (if Personal Training / Group Class) */}
          {subscription.isSessionBased && (
            <div className="p-3.5 rounded-control bg-raised/60 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand flex-shrink-0" />
                <span className="font-semibold text-fg">
                  Session Attendance:{" "}
                  <strong className="text-brand">
                    {subscription.attendedSessions ?? 0}
                  </strong>{" "}
                  {subscription.totalSessions ? `/ ${subscription.totalSessions} completed` : "attended in period"}
                </span>
              </div>
              {subscription.sessionDetailsNote && (
                <span className="text-muted italic">
                  {subscription.sessionDetailsNote}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center rounded-control bg-raised/50 border border-dashed border-line">
          <p className="text-xs text-muted font-medium mb-3">
            You do not currently have an active membership registered in the system.
          </p>
          <Link
            href="/memberships"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-brand text-brand-contrast text-xs font-bold hover:bg-brand-hover shadow-glow transition-all"
          >
            <span>Explore Academy Memberships</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

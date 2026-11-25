"use client";

import React, { useEffect, useState } from "react";
import { X, CreditCard, AlertCircle } from "lucide-react";

type Pkg = {
  id: string;
  nameEn: string;
  price: number;
  currency: string;
  durationDays: number;
  planType: string;
};

interface Props {
  open: boolean;
  clientId: string;
  clientName: string;
  onClose: () => void;
  onSaved: () => void;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const addDays = (dateKey: string, days: number) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};

export default function AssignMembershipModal({ open, clientId, clientName, onClose, onSaved }: Props) {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [pkgId, setPkgId] = useState("");
  const [startDate, setStartDate] = useState(localToday());
  const [endDate, setEndDate] = useState("");
  const [price, setPrice] = useState("");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNotes("");
    setStartDate(localToday());
    fetch("/api/memberships")
      .then((r) => r.json())
      .then((j) => {
        const list: Pkg[] = j?.data?.packages || [];
        setPackages(list);
        if (list[0]) applyPackage(list[0], localToday());
      })
      .catch(() => setError("Could not load membership packages."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyPackage = (p: Pkg, start: string) => {
    setPkgId(p.id);
    setPrice(String(p.price));
    setPaid(String(p.price));
    setEndDate(addDays(start, p.durationDays));
  };

  if (!open) return null;

  const selected = packages.find((p) => p.id === pkgId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const total = Number(price);
    const paidNum = Number(paid);
    if (!selected) return setError("Choose a membership plan.");
    if (!startDate || !endDate) return setError("Start and end dates are required.");
    if (endDate <= startDate) return setError("End date must be after the start date.");
    if (!(total >= 0) || price === "") return setError("Enter the price.");
    if (!(paidNum >= 0) || paid === "") return setError("Enter the amount paid (0 if unpaid).");
    if (paidNum > total) return setError("Amount paid cannot be more than the price.");
    setSaving(true);
    try {
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          planType: selected.planType,
          startDate,
          endDate,
          totalAmount: total,
          paidAmount: paidNum,
          paymentMethod: method,
          notes: notes.trim() || `${selected.nameEn}`
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to assign membership.");
        return;
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Network error.");
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson";
  const label = "block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-crimson/15 flex items-center justify-center">
              <CreditCard className="w-4.5 h-4.5 text-brand-crimson" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Assign Membership</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{clientName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className={label}>Plan *</label>
          <select
            className={input}
            value={pkgId}
            onChange={(e) => {
              const p = packages.find((x) => x.id === e.target.value);
              if (p) applyPackage(p, startDate);
            }}
          >
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameEn} - {p.price} {p.currency} ({p.durationDays} days)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Start date *</label>
            <input
              type="date"
              className={input}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (selected && e.target.value) setEndDate(addDays(e.target.value, selected.durationDays));
              }}
            />
          </div>
          <div>
            <label className={label}>End date *</label>
            <input type="date" className={input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Price (EGP) *</label>
            <input
              type="number"
              min="0"
              className={input}
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPaid(e.target.value);
              }}
            />
          </div>
          <div>
            <label className={label}>Amount paid (EGP) *</label>
            <input type="number" min="0" className={input} value={paid} onChange={(e) => setPaid(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={label}>Payment method</label>
          <select className={input} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>Cash</option>
            <option>Card</option>
            <option>Instapay</option>
            <option>Vodafone Cash</option>
            <option>Bank transfer</option>
          </select>
        </div>

        <div>
          <label className={label}>Notes (optional)</label>
          <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {Number(paid) < Number(price) && price !== "" && paid !== "" && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Remaining {Number(price) - Number(paid)} EGP will be recorded as {Number(paid) > 0 ? "partial" : "unpaid"}.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/40 text-xs font-bold text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-crimson text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Assign Membership"}
          </button>
        </div>
      </form>
    </div>
  );
}

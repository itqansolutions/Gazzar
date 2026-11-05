"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ClientAssessment, ClientProfile } from "@/types";
import {
  Activity,
  Award,
  TrendingUp,
  PlusCircle,
  CheckCircle,
  Flame,
  Clock,
  Sparkles,
  User,
  Calendar,
  X,
  Edit2,
  Trash2,
  Scale
} from "lucide-react";

export default function AssessmentsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const isClient = user?.role === "CLIENT";

  const [assessments, setAssessments] = useState<ClientAssessment[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<ClientAssessment | null>(null);
  const [deleteConfirmAssessment, setDeleteConfirmAssessment] = useState<ClientAssessment | null>(null);

  // Form states
  const [targetClientId, setTargetClientId] = useState("");
  const [title, setTitle] = useState("Physical Performance & Strength Assessment");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pushups, setPushups] = useState(30);
  const [pullups, setPullups] = useState(10);
  const [plankSec, setPlankSec] = useState(75);
  const [runningSec, setRunningSec] = useState(270);
  const [flexibility, setFlexibility] = useState(8);
  const [vo2, setVo2] = useState(46.5);
  const [notes, setNotes] = useState("Great performance, noticeable increase in upper body strength and core stability.");

  const loadData = async () => {
    try {
      const [clientsRes, assessRes] = await Promise.all([
        fetch("/api/clients").then((r) => r.json()),
        fetch(isClient && user ? `/api/assessments?clientId=${user.id}` : selectedClientId !== "ALL" ? `/api/assessments?clientId=${selectedClientId}` : "/api/assessments").then((r) => r.json())
      ]);

      if (clientsRes.success && Array.isArray(clientsRes.data)) {
        setClients(clientsRes.data);
        if (clientsRes.data.length > 0 && !targetClientId) {
          setTargetClientId(clientsRes.data[0].id);
        }
      }

      if (assessRes.success && Array.isArray(assessRes.data)) {
        setAssessments(assessRes.data);
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading assessments:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [isClient, user, selectedClientId]);

  const calcImprovement = (initial?: number, current?: number, lowerIsBetter: boolean = false) => {
    if (!initial || !current) return null;
    if (lowerIsBetter) {
      const diff = ((initial - current) / initial) * 100;
      return diff > 0 ? `-${diff.toFixed(0)}% (faster)` : `+${Math.abs(diff).toFixed(0)}%`;
    }
    const diff = ((current - initial) / initial) * 100;
    return diff > 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`;
  };

  const openAddModal = () => {
    if (clients.length > 0) setTargetClientId(selectedClientId !== "ALL" ? selectedClientId : clients[0].id);
    setTitle("Regular Fitness Assessment");
    setDate(new Date().toISOString().slice(0, 10));
    setPushups(30);
    setPullups(10);
    setPlankSec(75);
    setRunningSec(270);
    setFlexibility(8);
    setVo2(46.5);
    setNotes("Excellent performance and stability.");
    setIsAddModalOpen(true);
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClientId || !title) return;

    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: targetClientId,
          coachId: user?.id,
          date,
          title,
          pushupsCount: Number(pushups),
          pullupsCount: Number(pullups),
          plankSeconds: Number(plankSec),
          runningKmTimeSec: Number(runningSec),
          flexibilityScore: Number(flexibility),
          vo2Max: Number(vo2),
          coachNotes: notes
        })
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        await loadData();
      }
    } catch (err) {
      console.error("[PostgreSQL] Error creating assessment:", err);
    }
  };

  const openEditModal = (item: ClientAssessment) => {
    setEditingAssessment(item);
    setTargetClientId(item.clientId);
    setTitle(item.title);
    setDate(item.date);
    setPushups(item.pushupsCount || 0);
    setPullups(item.pullupsCount || 0);
    setPlankSec(item.plankSeconds || 0);
    setRunningSec(item.runningKmTimeSec || 0);
    setFlexibility(item.flexibilityScore || 0);
    setVo2(item.vo2Max || 0);
    setNotes(item.coachNotes || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssessment) return;

    try {
      const res = await fetch(`/api/assessments/${editingAssessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: targetClientId,
          date,
          title,
          pushupsCount: Number(pushups),
          pullupsCount: Number(pullups),
          plankSeconds: Number(plankSec),
          runningKmTimeSec: Number(runningSec),
          flexibilityScore: Number(flexibility),
          vo2Max: Number(vo2),
          coachNotes: notes
        })
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingAssessment(null);
        await loadData();
      }
    } catch (err) {
      console.error("[PostgreSQL] Error updating assessment:", err);
    }
  };

  const handleDeleteAssessment = async () => {
    if (!deleteConfirmAssessment) return;
    try {
      await fetch(`/api/assessments/${deleteConfirmAssessment.id}`, {
        method: "DELETE"
      });
      setDeleteConfirmAssessment(null);
      await loadData();
    } catch (err) {
      console.error("[PostgreSQL] Error deleting assessment:", err);
    }
  };

  // For Client comparison: latest vs baseline
  const aLatest = assessments[0];
  const aBaseline = assessments.length > 1 ? assessments[assessments.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Activity className="w-6 h-6 text-brand-crimson" />
            <span>{isClient ? "My Physical Assessments" : t("navAssessments")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {assessments.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isClient
              ? "Track your strength, endurance benchmarks and compare improvements over baseline"
              : "Conduct physical assessments, track strength & endurance benchmarks and compare improvements"}
          </p>
        </div>

        {!isClient && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all self-start sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Assessment +</span>
          </button>
        )}
      </div>

      {/* Filter by Client for Coach / Admin */}
      {!isClient && (
        <div className="flex items-center space-x-3 rtl:space-x-reverse bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl max-w-md shadow-sm">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Filter by client:</span>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
          >
            <option value="ALL">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.user?.name} ({c.sport?.nameEn || c.sport?.nameAr || "Client"})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Comparison Hero Card: Latest vs Baseline */}
      {aLatest && aBaseline && aLatest.id !== aBaseline.id ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-brand-crimson/40 shadow-sm dark:shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Physical Progress Comparison: Latest vs Baseline
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Between {aBaseline.date} and {aLatest.date}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/40 self-start sm:self-auto">
              🏆 Excellent Progress
            </span>
          </div>

          {/* Benchmark Metrics Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Pushups */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t("pushups")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{aLatest.pushupsCount}</span>
                <span className="text-xs text-slate-400 line-through">{aBaseline.pushupsCount}</span>
              </div>
              <span className="text-[11px] font-bold text-brand-crimson block">
                {calcImprovement(aBaseline.pushupsCount, aLatest.pushupsCount)} Gain
              </span>
            </div>

            {/* Pullups */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t("pullups")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{aLatest.pullupsCount}</span>
                <span className="text-xs text-slate-400 line-through">{aBaseline.pullupsCount}</span>
              </div>
              <span className="text-[11px] font-bold text-brand-crimson block">
                {calcImprovement(aBaseline.pullupsCount, aLatest.pullupsCount)} Improvement
              </span>
            </div>

            {/* Plank */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t("plank")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{aLatest.plankSeconds}s</span>
                <span className="text-xs text-slate-400 line-through">{aBaseline.plankSeconds}s</span>
              </div>
              <span className="text-[11px] font-bold text-brand-crimson block">
                {calcImprovement(aBaseline.plankSeconds, aLatest.plankSeconds)} Core endurance
              </span>
            </div>

            {/* VO2 Max */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t("vo2max")}</span>
              <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{aLatest.vo2Max}</span>
                <span className="text-xs text-slate-400 line-through">{aBaseline.vo2Max}</span>
              </div>
              <span className="text-[11px] font-bold text-brand-crimson block">
                {calcImprovement(aBaseline.vo2Max, aLatest.vo2Max)} Cardio capacity
              </span>
            </div>
          </div>

          {aLatest.coachNotes && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-brand-crimson">Coach Assessment:</span> {aLatest.coachNotes}
            </div>
          )}
        </div>
      ) : null}

      {/* Historical Assessments List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {isClient ? "Completed Assessments Log" : "Physical Assessments Log"}
        </h3>

        {assessments.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs space-y-2 shadow-sm">
            <Activity className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {isClient
                ? "No physical assessments recorded yet."
                : "No assessments found."}
            </p>
            <p className="text-xs">
              {isClient
                ? "Your coach will conduct your initial fitness test soon."
                : "Click Record Assessment to add one."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((item, idx) => {
              const clientObj = item.client || clients.find(c => c.id === item.clientId);

              return (
                <div key={item.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                      <span className="w-7 h-7 rounded-xl bg-brand-crimson/15 text-brand-crimson font-bold text-xs flex items-center justify-center">
                        #{assessments.length - idx}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                        {!isClient && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                            Client: {clientObj?.user?.name || "Client"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">{item.date}</span>

                      {!isClient && (
                        <>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmAssessment(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Pushups</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{item.pushupsCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Pullups</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{item.pullupsCount}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Plank</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{item.plankSeconds} s</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">1km Run</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{item.runningKmTimeSec} s</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Flexibility</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{item.flexibilityScore}/10</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">VO2 Max</span>
                      <span className="font-bold text-brand-crimson text-sm">{item.vo2Max}</span>
                    </div>
                  </div>

                  {item.coachNotes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                      💡 <span className="font-bold">Coach Notes:</span> {item.coachNotes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- ADD / EDIT ASSESSMENT MODAL (COACH / ADMIN ONLY) --- */}
      {(isAddModalOpen || isEditModalOpen) && !isClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Activity className="w-5 h-5 text-brand-crimson" />
                <span>{isAddModalOpen ? "Record New Physical Assessment" : "Edit Physical Assessment"}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isAddModalOpen ? handleCreateAssessment : handleUpdateAssessment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Client *</label>
                <select
                  value={targetClientId}
                  onChange={e => setTargetClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.user?.name} ({c.sport?.nameEn || c.sport?.nameAr || "Client"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assessment Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assessment Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Pushups Count</label>
                  <input
                    type="number"
                    value={pushups}
                    onChange={e => setPushups(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Pullups Count</label>
                  <input
                    type="number"
                    value={pullups}
                    onChange={e => setPullups(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Plank (Seconds)</label>
                  <input
                    type="number"
                    value={plankSec}
                    onChange={e => setPlankSec(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">1km Run (Seconds)</label>
                  <input
                    type="number"
                    value={runningSec}
                    onChange={e => setRunningSec(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Flexibility (out of 10)</label>
                  <input
                    type="number"
                    max={10}
                    value={flexibility}
                    onChange={e => setFlexibility(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">VO2 Max</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vo2}
                    onChange={e => setVo2(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Coach Notes & Guidance</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] cursor-pointer"
                >
                  {isAddModalOpen ? "Save Assessment ✓" : "Update Assessment ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {deleteConfirmAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Assessment Deletion</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete this physical assessment?
              </p>
            </div>
            <div className="flex justify-center space-x-3 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmAssessment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteAssessment}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Yes, Delete Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

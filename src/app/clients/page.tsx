"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ClientProfile, ClientStatus, CoachProfile, Sport } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  CheckCircle,
  X,
  Phone,
  Mail,
  Edit,
  Trash2,
  UserCheck,
  ChevronRight,
  Dumbbell
} from "lucide-react";

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [coachFilter, setCoachFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);

  // New Client Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newGender, setNewGender] = useState<"MALE" | "FEMALE">("MALE");
  const [newHeight, setNewHeight] = useState(178);
  const [newWeight, setNewWeight] = useState(85);
  const [newSportId, setNewSportId] = useState("sport-bodybuilding");
  const [newStatus, setNewStatus] = useState<ClientStatus>("ACTIVE");
  const [newCoachId, setNewCoachId] = useState("");
  const [newCoachRole, setNewCoachRole] = useState("PRIMARY");

  // Edit Client Coach State
  const [editCoachId, setEditCoachId] = useState("");
  const [editCoachRole, setEditCoachRole] = useState("PRIMARY");

  // Quick Assign Coach Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalClient, setAssignModalClient] = useState<ClientProfile | null>(null);
  const [modalCoachId, setModalCoachId] = useState("");
  const [modalCoachRole, setModalCoachRole] = useState("PRIMARY");
  const [modalCoachNotes, setModalCoachNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setClients(json.data);
        }
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading clients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuxiliaryData = async () => {
    try {
      const [coachesRes, sportsRes] = await Promise.all([
        fetch("/api/coaches"),
        fetch("/api/sports")
      ]);

      if (coachesRes.ok) {
        const cJson = await coachesRes.json();
        if (cJson.success && Array.isArray(cJson.data)) {
          setCoaches(cJson.data);
        }
      }

      if (sportsRes.ok) {
        const sJson = await sportsRes.json();
        if (sJson.success && Array.isArray(sJson.data)) {
          setSports(sJson.data);
        }
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading auxiliary data:", err);
    }
  };

  useEffect(() => {
    loadClients();
    loadAuxiliaryData();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          phone: newPhone,
          gender: newGender,
          heightCm: Number(newHeight),
          weightKg: Number(newWeight),
          preferredSportId: newSportId,
          status: newStatus,
          coachId: newCoachId || undefined,
          coachRole: newCoachRole
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to create athlete in PostgreSQL");
        return;
      }

      setIsAddModalOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewCoachId("");
      setNewCoachRole("PRIMARY");
      await loadClients();
      showToast("Athlete profile saved to PostgreSQL database!");
    } catch (err: any) {
      alert(err.message || "Network error");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedClient.user?.name,
          email: selectedClient.user?.email,
          phone: selectedClient.user?.phone,
          status: selectedClient.status,
          weightKg: Number(selectedClient.weightKg),
          heightCm: Number(selectedClient.heightCm),
          preferredSportId: selectedClient.preferredSportId,
          coachId: editCoachId || undefined,
          coachRole: editCoachRole
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to update athlete in PostgreSQL");
        return;
      }

      setIsEditModalOpen(false);
      setSelectedClient(null);
      await loadClients();
      showToast("Athlete profile updated in PostgreSQL!");
    } catch (err: any) {
      alert(err.message || "Network error");
    }
  };

  const openAssignModal = (client: ClientProfile) => {
    setAssignModalClient(client);
    const primary = client.coaches?.find(ca => ca.active && ca.role === "PRIMARY") || client.coaches?.find(ca => ca.active);
    setModalCoachId(primary?.coachId || (coaches[0]?.id || ""));
    setModalCoachRole(primary?.role || "PRIMARY");
    setModalCoachNotes(primary?.notes || "");
    setIsAssignModalOpen(true);
  };

  const handleQuickAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalClient || !modalCoachId) return;

    try {
      const res = await fetch(`/api/clients/${assignModalClient.id}/coaches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId: modalCoachId,
          role: modalCoachRole,
          notes: modalCoachNotes
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to assign coach");
        return;
      }

      setIsAssignModalOpen(false);
      setAssignModalClient(null);
      await loadClients();
      showToast("Supervising coach assigned in PostgreSQL!");
    } catch (err: any) {
      alert(err.message || "Network error");
    }
  };

  const handleUnassignCoach = async (clientId: string, coachId: string) => {
    if (confirm("Unassign this coach from athlete?")) {
      try {
        const res = await fetch(`/api/clients/${clientId}/coaches?coachId=${coachId}`, {
          method: "DELETE"
        });
        if (res.ok) {
          setIsAssignModalOpen(false);
          setAssignModalClient(null);
          await loadClients();
          showToast("Coach unassigned successfully");
        }
      } catch (err: any) {
        alert(err.message || "Network error");
      }
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (confirm(`Delete athlete ${name} permanently?`)) {
      try {
        const res = await fetch(`/api/clients/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          await loadClients();
          showToast("Athlete deleted permanently from PostgreSQL");
        } else {
          const json = await res.json();
          alert(json.error || "Failed to delete client");
        }
      } catch (err: any) {
        alert(err.message || "Network error");
      }
    }
  };

  const filteredClients = clients.filter(c => {
    const name = c.user?.name || "";
    const email = c.user?.email || "";
    const phone = c.user?.phone || "";
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery);

    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesCoach =
      coachFilter === "ALL" ||
      c.coaches?.some(ca => ca.coachId === coachFilter && ca.active);

    return matchesSearch && matchesStatus && matchesCoach;
  });

  const totalCount = clients.length;
  const activeCount = clients.filter(c => c.status === "ACTIVE").length;
  const expiringCount = clients.filter(c => c.status === "EXPIRED" || c.status === "SUSPENDED").length;
  const frozenCount = clients.filter(c => c.status === "FROZEN").length;

  const getStatusBadge = (status: ClientStatus) => {
    switch (status) {
      case "ACTIVE":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">Active</span>;
      case "LEAD":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400">Lead</span>;
      case "FROZEN":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1C1C1F] text-slate-400 border border-[#26262A]">Frozen</span>;
      case "EXPIRED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400">Expiring</span>;
      case "SUSPENDED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400">Suspended</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "GX";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl bg-brand-crimson text-white font-bold text-xs shadow-2xl shadow-red-600/40 animate-in slide-in-from-bottom-5">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Atmospheric accent slash in background */}
      <div
        className="slash-accent hidden lg:block opacity-20 pointer-events-none"
        style={{ left: "14%", top: "-60px", width: "70px", height: "300px" }}
      />

      {/* Header bar matching members-dark_rendered.html */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Members</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {totalCount} athletes in the academy
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-[#141416] border border-[#26262A] text-slate-400 min-w-[240px] focus-within:border-brand-crimson transition-colors">
            <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              type="search"
              placeholder="Search members"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs text-white placeholder-slate-500 w-full"
            />
          </label>

          {user?.role !== "CLIENT" && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-[0_0_24px_rgba(240,20,37,0.38)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add member</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs matching prototype */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 p-1 rounded-xl bg-[#141416] border border-[#26262A] overflow-x-auto max-w-full">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`h-9 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === "ALL"
                ? "bg-brand-crimson text-white shadow-[0_0_15px_rgba(240,20,37,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All · {totalCount}
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`h-9 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === "ACTIVE"
                ? "bg-brand-crimson text-white shadow-[0_0_15px_rgba(240,20,37,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Active · {activeCount}
          </button>
          <button
            onClick={() => setStatusFilter("EXPIRED")}
            className={`h-9 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === "EXPIRED"
                ? "bg-brand-crimson text-white shadow-[0_0_15px_rgba(240,20,37,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Expiring · {expiringCount}
          </button>
          <button
            onClick={() => setStatusFilter("FROZEN")}
            className={`h-9 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === "FROZEN"
                ? "bg-brand-crimson text-white shadow-[0_0_15px_rgba(240,20,37,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Frozen · {frozenCount}
          </button>
        </div>

        {/* Coach filter selector */}
        <div className="flex items-center gap-2">
          <select
            value={coachFilter}
            onChange={e => setCoachFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-[#141416] border border-[#26262A] text-xs text-slate-300 focus:outline-none focus:border-brand-crimson"
          >
            <option value="ALL">All Coaches</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>{c.user?.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Members Data Table Card */}
      <div className="bg-[#141416] border border-[#26262A] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-[#26262A]">
                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3.5">
                  Member
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3.5">
                  Program / Sport
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3.5">
                  Plan
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3.5">
                  Progress
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3.5">
                  Assigned Coach
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3.5">
                  Status
                </th>
                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262A]">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                    No members found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, idx) => {
                  const primaryCoach = client.coaches?.find(ca => ca.role === "PRIMARY" && ca.active)?.coach?.user?.name
                    || client.coaches?.find(ca => ca.active)?.coach?.user?.name;
                  const sportName = client.sport?.nameEn || client.sport?.nameAr || "CrossFit Foundations";
                  const planType = idx % 3 === 0 ? "Annual" : idx % 3 === 1 ? "Quarterly" : "Monthly";
                  const progressPct = 45 + ((idx * 17) % 50);

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-[#1C1C1F] transition-colors group"
                    >
                      {/* Member Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-crimson/15 text-brand-crimson flex items-center justify-center font-bold text-xs flex-shrink-0 border border-brand-crimson/20">
                            {getInitials(client.user?.name)}
                          </div>
                          <div>
                            <Link
                              href={`/clients/${client.id}`}
                              className="font-bold text-xs text-white group-hover:text-brand-crimson transition-colors block"
                            >
                              {client.user?.name || "Athlete"}
                            </Link>
                            <p className="text-[11px] text-slate-400">
                              {client.user?.email || client.user?.phone || "Active Athlete"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Program */}
                      <td className="px-5 py-3.5 text-xs text-slate-300 font-medium">
                        {sportName}
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-3.5 text-xs text-slate-300">
                        {planType}
                      </td>

                      {/* Progress bar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-[#26262A] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-crimson transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {progressPct}%
                          </span>
                        </div>
                      </td>

                      {/* Assigned Coach */}
                      <td className="px-5 py-3.5">
                        {primaryCoach ? (
                          <span className="text-xs text-slate-300 font-medium">
                            {primaryCoach}
                          </span>
                        ) : (
                          <button
                            onClick={() => openAssignModal(client)}
                            className="text-[11px] text-brand-crimson hover:underline font-semibold"
                          >
                            + Assign Coach
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {getStatusBadge(client.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => openAssignModal(client)}
                            className="text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                            title="Assign Coach"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClient(client);
                              const p = client.coaches?.find(ca => ca.role === "PRIMARY" && ca.active);
                              setEditCoachId(p?.coachId || "");
                              setEditCoachRole(p?.role || "PRIMARY");
                              setIsEditModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                            title="Edit Athlete"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-brand-crimson font-bold text-xs hover:text-red-400 transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#26262A] text-xs text-slate-400">
          <span>Showing 1–{filteredClients.length} of {totalCount}</span>
          <div className="flex items-center gap-2">
            <button
              disabled
              className="px-3 py-1.5 rounded-lg bg-[#1C1C1F] border border-[#26262A] text-slate-500 text-xs font-semibold cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled
              className="px-3 py-1.5 rounded-lg bg-brand-crimson text-white text-xs font-semibold cursor-not-allowed opacity-75"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ADD CLIENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-[#26262A] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#26262A] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-crimson" />
                <span>Add New Member</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Omar Hassan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="omar@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+20 100 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Weight (KG)
                  </label>
                  <input
                    type="number"
                    value={newWeight}
                    onChange={e => setNewWeight(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Height (CM)
                  </label>
                  <input
                    type="number"
                    value={newHeight}
                    onChange={e => setNewHeight(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Preferred Sport
                  </label>
                  <select
                    value={newSportId}
                    onChange={e => setNewSportId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  >
                    {sports.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nameEn || s.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as ClientStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="LEAD">Lead</option>
                    <option value="FROZEN">Frozen</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
              </div>

              {/* Coach Assignment */}
              <div className="p-4 rounded-2xl bg-[#1C1C1F] border border-[#26262A] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-brand-crimson" />
                    <span>Assign Supervising Coach</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Coach
                    </label>
                    <select
                      value={newCoachId}
                      onChange={e => setNewCoachId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                    >
                      <option value="">-- Unassigned --</option>
                      {coaches.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.user?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Role
                    </label>
                    <select
                      value={newCoachRole}
                      disabled={!newCoachId}
                      onChange={e => setNewCoachRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                    >
                      <option value="PRIMARY">Primary Coach</option>
                      <option value="ASSISTANT">Assistant Coach</option>
                      <option value="NUTRITIONIST">Nutritionist</option>
                      <option value="PHYSIOTHERAPIST">Physiotherapist</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1C1C1F] hover:bg-[#26262A] text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-[0_0_20px_rgba(240,20,37,0.4)] transition-all"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {isEditModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-[#26262A] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#26262A] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-brand-crimson" />
                <span>Edit Athlete Profile</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={selectedClient.user?.name || ""}
                  onChange={e => setSelectedClient({ ...selectedClient, user: { ...selectedClient.user, name: e.target.value } })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={selectedClient.user?.email || ""}
                    onChange={e => setSelectedClient({ ...selectedClient, user: { ...selectedClient.user, email: e.target.value } })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={selectedClient.user?.phone || ""}
                    onChange={e => setSelectedClient({ ...selectedClient, user: { ...selectedClient.user, phone: e.target.value } })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Weight (KG)
                  </label>
                  <input
                    type="number"
                    value={selectedClient.weightKg || 80}
                    onChange={e => setSelectedClient({ ...selectedClient, weightKg: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Height (CM)
                  </label>
                  <input
                    type="number"
                    value={selectedClient.heightCm || 175}
                    onChange={e => setSelectedClient({ ...selectedClient, heightCm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={selectedClient.status}
                    onChange={e => setSelectedClient({ ...selectedClient, status: e.target.value as ClientStatus })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="LEAD">Lead</option>
                    <option value="FROZEN">Frozen</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Sport
                  </label>
                  <select
                    value={selectedClient.preferredSportId || "sport-bodybuilding"}
                    onChange={e => setSelectedClient({ ...selectedClient, preferredSportId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  >
                    {sports.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nameEn || s.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Edit Coach Assignment */}
              <div className="p-3.5 rounded-2xl bg-[#1C1C1F] border border-[#26262A] space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-brand-crimson" />
                  <span>Assigned Coach</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Coach
                    </label>
                    <select
                      value={editCoachId}
                      onChange={e => setEditCoachId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                    >
                      <option value="">-- No Coach (Unassign) --</option>
                      {coaches.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.user?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Role
                    </label>
                    <select
                      value={editCoachRole}
                      disabled={!editCoachId}
                      onChange={e => setEditCoachRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141416] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson disabled:opacity-40"
                    >
                      <option value="PRIMARY">Primary Coach</option>
                      <option value="ASSISTANT">Assistant Coach</option>
                      <option value="NUTRITIONIST">Nutritionist</option>
                      <option value="PHYSIOTHERAPIST">Physiotherapist</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1C1C1F] hover:bg-[#26262A] text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-[0_0_20px_rgba(240,20,37,0.4)] transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN COACH MODAL */}
      {isAssignModalOpen && assignModalClient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-[#26262A] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#26262A] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Assign Coach to Athlete
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {assignModalClient.user?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssignModalClient(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Assigned Coaches List */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Currently Assigned Coaches:
              </label>

              {assignModalClient.coaches && assignModalClient.coaches.filter(ca => ca.active).length > 0 ? (
                <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
                  {assignModalClient.coaches.filter(ca => ca.active).map(ca => (
                    <div
                      key={ca.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-brand-crimson text-white font-black text-xs flex items-center justify-center">
                          {ca.coach?.user?.name ? ca.coach.user.name.slice(0, 2) : "GX"}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{ca.coach?.user?.name || "Coach"}</span>
                          <span className="text-[10px] text-slate-400">
                            {ca.role === "PRIMARY" ? "Primary Coach" : ca.role}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUnassignCoach(assignModalClient.id, ca.coachId)}
                        className="px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[10px] font-bold border border-red-800/60 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Unassign</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-slate-400 text-xs text-center">
                  No coaches currently assigned to this athlete.
                </div>
              )}
            </div>

            {/* Assignment Form */}
            <form onSubmit={handleQuickAssignSubmit} className="space-y-3 pt-2 border-t border-[#26262A]">
              <span className="block text-xs font-bold text-brand-crimson">
                + Assign New Coach / Switch Primary
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Select Coach *
                  </label>
                  <select
                    required
                    value={modalCoachId}
                    onChange={e => setModalCoachId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  >
                    {coaches.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Coaching Role *
                  </label>
                  <select
                    value={modalCoachRole}
                    onChange={e => setModalCoachRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  >
                    <option value="PRIMARY">Primary Coach</option>
                    <option value="ASSISTANT">Assistant Coach</option>
                    <option value="NUTRITIONIST">Nutritionist</option>
                    <option value="PHYSIOTHERAPIST">Physiotherapist</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Supervision Notes (Optional)
                </label>
                <input
                  type="text"
                  value={modalCoachNotes}
                  onChange={e => setModalCoachNotes(e.target.value)}
                  placeholder="e.g. Focus on mobility and recovery"
                  className="w-full px-3 py-2 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setAssignModalClient(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1C1C1F] text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-[0_0_20px_rgba(240,20,37,0.4)] cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

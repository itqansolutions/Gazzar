"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { CoachProfile, UserRole, Sport, ClientProfile } from "@/types";
import {
  Shield,
  Users,
  Award,
  Star,
  Plus,
  Search,
  Mail,
  Phone,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Check
} from "lucide-react";

export default function CoachesPage() {
  const { user: currentUser } = useAuth();

  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("ALL");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<CoachProfile | null>(null);
  const [deleteConfirmCoach, setDeleteConfirmCoach] = useState<CoachProfile | null>(null);

  // Assign Athlete to Coach Modal State
  const [isAssignAthleteModalOpen, setIsAssignAthleteModalOpen] = useState(false);
  const [targetCoach, setTargetCoach] = useState<CoachProfile | null>(null);
  const [athleteIdToAssign, setAthleteIdToAssign] = useState("");
  const [athleteRoleToAssign, setAthleteRoleToAssign] = useState("PRIMARY");
  const [athleteAssignNotes, setAthleteAssignNotes] = useState("");

  // Form states for Add Coach
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("A@123456");
  const [formPhone, setFormPhone] = useState("+20 100 000 0000");
  const [formRole, setFormRole] = useState<UserRole>("COACH");
  const [formBio, setFormBio] = useState("");
  const [formExperience, setFormExperience] = useState<number>(3);
  const [formSpecialties, setFormSpecialties] = useState<string[]>([]);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState("");

  const refreshData = async () => {
    try {
      const [coachesRes, sportsRes, clientsRes] = await Promise.all([
        fetch("/api/coaches"),
        fetch("/api/sports"),
        fetch("/api/clients")
      ]);

      if (coachesRes.ok) {
        const cJson = await coachesRes.json();
        if (cJson.success && Array.isArray(cJson.data)) setCoaches(cJson.data);
      }
      if (sportsRes.ok) {
        const sJson = await sportsRes.json();
        if (sJson.success && Array.isArray(sJson.data)) setSports(sJson.data);
      }
      if (clientsRes.ok) {
        const clJson = await clientsRes.json();
        if (clJson.success && Array.isArray(clJson.data)) setClients(clJson.data);
      }
    } catch (err) {
      console.error("[PostgreSQL] Error refreshing coaches data:", err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const openAssignAthleteModal = (coach: CoachProfile) => {
    setTargetCoach(coach);
    const unassigned = clients.find(cl => !cl.coaches?.some(ca => ca.coachId === coach.id && ca.active));
    setAthleteIdToAssign(unassigned?.id || (clients[0]?.id || ""));
    setAthleteRoleToAssign("PRIMARY");
    setAthleteAssignNotes("");
    setIsAssignAthleteModalOpen(true);
  };

  const handleAssignAthleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCoach || !athleteIdToAssign) return;

    try {
      const res = await fetch(`/api/clients/${athleteIdToAssign}/coaches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId: targetCoach.id,
          role: athleteRoleToAssign,
          notes: athleteAssignNotes
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification(json.error || "Failed to assign athlete", "error");
        return;
      }

      setIsAssignAthleteModalOpen(false);
      setTargetCoach(null);
      await refreshData();
      showNotification("Athlete assigned to coach in PostgreSQL!");
    } catch (err: any) {
      showNotification(err.message || "Network error", "error");
    }
  };

  const handleUnassignAthlete = async (clientId: string, coachId: string) => {
    if (confirm("Unassign this athlete from the coach?")) {
      try {
        const res = await fetch(`/api/clients/${clientId}/coaches?coachId=${coachId}`, {
          method: "DELETE"
        });
        if (res.ok) {
          await refreshData();
          showNotification("Athlete unassigned successfully");
        }
      } catch (err: any) {
        showNotification(err.message || "Network error", "error");
      }
    }
  };

  const addCustomSpecialty = () => {
    if (!customSpecialtyInput.trim()) return;
    if (!formSpecialties.includes(customSpecialtyInput.trim())) {
      setFormSpecialties(prev => [...prev, customSpecialtyInput.trim()]);
    }
    setCustomSpecialtyInput("");
  };

  const handleAddCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      showNotification("Please fill in coach name and email", "error");
      return;
    }

    try {
      const res = await fetch("/api/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword || "A@123456",
          phone: formPhone.trim(),
          role: formRole,
          bio: formBio.trim() || "Certified Coach at GX Fitness Academy",
          yearsOfExperience: Number(formExperience),
          specialties: formSpecialties.length > 0 ? formSpecialties : ["CrossFit", "Strength & Conditioning"],
          avatar: "/coach_dark_hero.jpg"
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification(json.error || "Failed to create coach in PostgreSQL", "error");
        return;
      }

      await refreshData();
      setIsAddModalOpen(false);
      setFormName("");
      setFormEmail("");
      setFormBio("");
      setFormSpecialties([]);
      setCustomSpecialtyInput("");
      showNotification("Coach profile created in PostgreSQL successfully!");
    } catch (err: any) {
      showNotification(err.message || "Error creating coach profile", "error");
    }
  };

  const handleUpdateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoach) return;

    try {
      const res = await fetch(`/api/coaches/${editingCoach.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          role: formRole,
          bio: formBio.trim(),
          yearsOfExperience: Number(formExperience),
          specialties: formSpecialties
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification(json.error || "Error updating coach", "error");
        return;
      }

      await refreshData();
      setIsEditModalOpen(false);
      setEditingCoach(null);
      setCustomSpecialtyInput("");
      showNotification("Coach updated in PostgreSQL successfully!");
    } catch (err: any) {
      showNotification(err.message || "Error updating coach", "error");
    }
  };

  const handleDeleteCoach = async () => {
    if (!deleteConfirmCoach) return;
    try {
      const res = await fetch(`/api/coaches/${deleteConfirmCoach.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await refreshData();
        setDeleteConfirmCoach(null);
        showNotification("Coach deleted from PostgreSQL successfully");
      } else {
        const json = await res.json();
        showNotification(json.error || "Error deleting coach", "error");
      }
    } catch (err: any) {
      showNotification(err.message || "Error deleting coach", "error");
    }
  };

  const openEditModal = (co: CoachProfile) => {
    setEditingCoach(co);
    setFormName(co.user?.name || "");
    setFormEmail(co.user?.email || "");
    setFormPhone(co.user?.phone || "");
    setFormRole(co.user?.role || "COACH");
    setFormBio(co.bio || "");
    setFormExperience(co.yearsOfExperience || 3);
    setFormSpecialties(co.specialties || []);
    setCustomSpecialtyInput("");
    setIsEditModalOpen(true);
  };

  const filteredCoaches = coaches.filter(co => {
    const matchQuery =
      co.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      co.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      co.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      co.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchSpec =
      selectedSpecialty === "ALL" ||
      co.specialties?.some(s => s.toLowerCase().includes(selectedSpecialty.toLowerCase()));

    return matchQuery && matchSpec;
  });

  const allSpecialties = Array.from(
    new Set([
      ...sports.map(s => s.nameEn || s.nameAr),
      ...coaches.flatMap(c => c.specialties || [])
    ])
  );

  return (
    <div className="relative space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === "success"
              ? "bg-brand-crimson text-white border-red-500 shadow-red-600/40"
              : "bg-red-600 text-white border-red-500 shadow-red-600/30"
          }`}
        >
          {notification.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Atmospheric Accent Slash */}
      <div
        className="slash-accent hidden lg:block opacity-20 pointer-events-none"
        style={{ left: "18%", top: "-60px", width: "70px", height: "300px" }}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Coaching Staff</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#1C1C1F] text-slate-300 border border-[#26262A]">
              {filteredCoaches.length} coaches
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Coaching staff directory, Head Coach oversight, specialties and assigned athletes
          </p>
        </div>

        <button
          onClick={() => {
            setFormName("");
            setFormEmail("");
            setFormBio("");
            setFormSpecialties([]);
            setCustomSpecialtyInput("");
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-[0_0_24px_rgba(240,20,37,0.38)] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Coach</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-500 absolute top-3.5 left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search coach name, specialty, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141416] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson transition-colors"
          />
        </div>

        <div>
          <select
            value={selectedSpecialty}
            onChange={e => setSelectedSpecialty(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#141416] border border-[#26262A] text-xs text-slate-300 focus:outline-none focus:border-brand-crimson"
          >
            <option value="ALL">All Specialties</option>
            {allSpecialties.map((s, idx) => (
              <option key={idx} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Coaches Cards Grid */}
      {filteredCoaches.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#141416] border border-[#26262A] shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              No coaches found
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add your first coach or head coach to start assigning athletes and workouts.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-[0_0_20px_rgba(240,20,37,0.4)] transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Coach</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map(co => {
            const isHeadCoach = co.user?.role === "HEAD_COACH";
            const avatarSrc = co.user?.avatar || (isHeadCoach ? "/coach_dark_hero.jpg" : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200");

            return (
              <div
                key={co.id}
                className="relative bg-[#141416] rounded-3xl border border-[#26262A] hover:border-brand-crimson/50 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Top Athletic Accent Line */}
                <div className={`h-1.5 w-full ${isHeadCoach ? "bg-gradient-to-r from-brand-crimson via-red-500 to-amber-500" : "bg-gradient-to-r from-brand-crimson via-red-600 to-zinc-700"}`} />

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Header: Avatar, Name, Role, Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={avatarSrc}
                          alt={co.user?.name || "Coach"}
                          onError={(e) => { (e.target as HTMLImageElement).src = "/coach_dark_hero.jpg"; }}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-brand-crimson/40 shadow-md"
                        />
                        {isHeadCoach && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-crimson text-white flex items-center justify-center shadow-sm">
                            <Star className="w-3 h-3 fill-white text-white" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-white truncate">
                          {co.user?.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {isHeadCoach ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30">
                              <Star className="w-2.5 h-2.5 fill-brand-crimson text-brand-crimson" />
                              <span>Head Coach</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#1C1C1F] text-slate-300 border border-[#26262A]">
                              <Shield className="w-2.5 h-2.5 text-slate-400" />
                              <span>Coach</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(co)}
                        title="Edit Coach"
                        className="p-2 rounded-xl bg-[#1C1C1F] hover:bg-[#26262A] text-slate-400 hover:text-white border border-[#26262A] transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmCoach(co)}
                        title="Delete Coach"
                        className="p-2 rounded-xl bg-[#1C1C1F] hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-[#26262A] hover:border-red-800/40 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Meta */}
                  <div className="space-y-1.5 pt-1 text-xs text-slate-400">
                    <div className="flex items-center gap-2 font-mono text-[11px] truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{co.user?.email}</span>
                    </div>
                    {co.user?.phone && (
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>{co.user.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Bio Quote */}
                  {co.bio && (
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 bg-[#1C1C1F] px-3.5 py-2.5 rounded-xl border border-[#26262A] italic">
                      "{co.bio}"
                    </p>
                  )}

                  {/* Specialties */}
                  {co.specialties && co.specialties.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Specialties
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {co.specialties.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-lg bg-brand-crimson/10 border border-brand-crimson/25 text-brand-crimson font-semibold text-[11px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Performance Stats Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 rounded-2xl bg-[#1C1C1F] border border-[#26262A] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center flex-shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 font-medium block">
                          Experience
                        </span>
                        <span className="text-xs font-bold text-white block truncate">
                          {co.yearsOfExperience || 3} Years
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1C1C1F] border border-[#26262A] flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Athletes
                          </span>
                          <span className="text-xs font-bold text-white block truncate">
                            {co.assignedClientsCount || 0}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openAssignAthleteModal(co)}
                        title="Assign athlete to this coach"
                        className="px-2 py-1 rounded-lg bg-brand-crimson/15 hover:bg-brand-crimson text-brand-crimson hover:text-white text-[10px] font-bold border border-brand-crimson/30 flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Assign</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 bg-[#1C1C1F]/60 border-t border-[#26262A] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => openAssignAthleteModal(co)}
                    className="inline-flex items-center gap-1.5 font-bold text-slate-300 hover:text-brand-crimson transition-colors cursor-pointer text-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-brand-crimson" />
                    <span>Manage Athletes</span>
                  </button>
                  <button
                    onClick={() => openEditModal(co)}
                    className="text-xs font-bold text-brand-crimson hover:underline cursor-pointer"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- ADD COACH MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#141416] border border-[#26262A] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#26262A] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-brand-crimson" />
                  <span>Create New Coach</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Enter coach credentials and details to set up account
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCoach} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Coach Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coach Abdullah"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="coach@gxfitness.com"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+20 100 000 0000"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Role & Permission
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  >
                    <option value="COACH">Coach</option>
                    <option value="HEAD_COACH">Head Coach</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formExperience}
                    onChange={e => setFormExperience(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Sports & Specialties *
                  </label>
                  <span className="text-[10px] font-bold text-brand-crimson bg-brand-crimson/15 px-2 py-0.5 rounded-full border border-brand-crimson/30">
                    {formSpecialties.length} selected
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#1C1C1F] border border-[#26262A] space-y-2.5">
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-0.5">
                    {sports.map(sport => {
                      const sportName = sport.nameEn || sport.nameAr;
                      const isSelected = formSpecialties.some(
                        s => s === sport.nameAr || s === sport.nameEn || s.toLowerCase() === (sport.nameEn || "").toLowerCase()
                      );

                      return (
                        <button
                          type="button"
                          key={sport.id}
                          onClick={() => {
                            if (isSelected) {
                              setFormSpecialties(prev => prev.filter(s => s !== sport.nameAr && s !== sport.nameEn && s.toLowerCase() !== (sport.nameEn || "").toLowerCase()));
                            } else {
                              setFormSpecialties(prev => [...prev, sportName]);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-brand-crimson text-white border-brand-crimson shadow-[0_0_12px_rgba(240,20,37,0.4)]"
                              : "bg-[#141416] text-slate-300 border-[#26262A] hover:border-brand-crimson/40"
                          }`}
                        >
                          <span>{sport.icon || "🏆"}</span>
                          <span>{sportName}</span>
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add custom specialty input */}
                  <div className="pt-2 border-t border-[#26262A] flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Or add custom specialty..."
                      value={customSpecialtyInput}
                      onChange={e => setCustomSpecialtyInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomSpecialty();
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#141416] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson"
                    />
                    <button
                      type="button"
                      onClick={addCustomSpecialty}
                      className="px-3 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Add +
                    </button>
                  </div>
                </div>

                {/* Selected specialties chips */}
                {formSpecialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formSpecialties.map((spec, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-crimson/15 border border-brand-crimson/30 text-brand-crimson text-[11px] font-bold"
                      >
                        <span>{spec}</span>
                        <button
                          type="button"
                          onClick={() => setFormSpecialties(prev => prev.filter((_, i) => i !== idx))}
                          className="p-0.5 hover:bg-brand-crimson/30 rounded text-brand-crimson"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Bio / Background
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief background, certifications, and achievements..."
                  value={formBio}
                  onChange={e => setFormBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1C1C1F] hover:bg-[#26262A] text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-[0_0_20px_rgba(240,20,37,0.4)] transition-all cursor-pointer"
                >
                  Save Coach
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT COACH MODAL --- */}
      {isEditModalOpen && editingCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#141416] border border-[#26262A] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#26262A] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-brand-crimson" />
                  <span>Edit Coach Profile</span>
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoach} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Coach Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Role & Permission
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  >
                    <option value="COACH">Coach</option>
                    <option value="HEAD_COACH">Head Coach</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={formExperience}
                    onChange={e => setFormExperience(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Bio / Background
                </label>
                <textarea
                  rows={2}
                  value={formBio}
                  onChange={e => setFormBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white focus:outline-none focus:border-brand-crimson"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1C1C1F] hover:bg-[#26262A] text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-[0_0_20px_rgba(240,20,37,0.4)] transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE COACH CONFIRMATION MODAL --- */}
      {deleteConfirmCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#141416] border border-[#26262A] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Confirm Coach Deletion
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete coach "{deleteConfirmCoach.user?.name}"?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCoach(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1C1C1F] hover:bg-[#26262A] text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCoach}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/40 cursor-pointer"
              >
                Yes, Delete Coach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ASSIGN ATHLETE TO COACH MODAL --- */}
      {isAssignAthleteModalOpen && targetCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#141416] border border-[#26262A] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#26262A] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Manage Coach Athletes
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    {targetCoach.user?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAssignAthleteModalOpen(false);
                  setTargetCoach(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Assigned Athletes */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Currently Assigned Athletes:
              </label>

              {(() => {
                const assignedAthletes = clients.filter(c =>
                  c.coaches?.some(ca => ca.coachId === targetCoach.id && ca.active)
                );

                if (assignedAthletes.length === 0) {
                  return (
                    <div className="p-3 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-slate-400 text-xs text-center">
                      No athletes currently assigned to this coach.
                    </div>
                  );
                }

                return (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar p-1">
                    {assignedAthletes.map(cl => {
                      const ca = cl.coaches?.find(a => a.coachId === targetCoach.id && a.active);
                      return (
                        <div
                          key={cl.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={cl.user?.avatar || "/coach_dark_hero.jpg"}
                              alt={cl.user?.name}
                              className="w-7 h-7 rounded-full object-cover border border-[#26262A]"
                              onError={e => { (e.target as HTMLImageElement).src = "/coach_dark_hero.jpg"; }}
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">{cl.user?.name}</span>
                              <span className="text-[10px] text-slate-400 block">
                                {ca?.role === "PRIMARY" ? "Primary Coach" : ca?.role}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUnassignAthlete(cl.id, targetCoach.id)}
                            className="px-2 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[10px] font-bold border border-red-800/60 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Unassign</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Assign New Athlete Form */}
            <form onSubmit={handleAssignAthleteSubmit} className="space-y-3 pt-3 border-t border-[#26262A]">
              <span className="block text-xs font-bold text-brand-crimson">
                + Assign Athlete to Coach
              </span>

              {clients.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Select Athlete *
                      </label>
                      <select
                        required
                        value={athleteIdToAssign}
                        onChange={e => setAthleteIdToAssign(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white font-medium focus:outline-none focus:border-brand-crimson"
                      >
                        {clients.map(c => {
                          const isAlreadyAssigned = c.coaches?.some(ca => ca.coachId === targetCoach.id && ca.active);
                          return (
                            <option key={c.id} value={c.id}>
                              {c.user?.name} {isAlreadyAssigned ? "(Already assigned)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Coaching Role *
                      </label>
                      <select
                        value={athleteRoleToAssign}
                        onChange={e => setAthleteRoleToAssign(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white font-medium focus:outline-none focus:border-brand-crimson"
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
                      value={athleteAssignNotes}
                      onChange={e => setAthleteAssignNotes(e.target.value)}
                      placeholder="e.g. Muscle gain program and check-ins"
                      className="w-full px-3 py-2 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAssignAthleteModalOpen(false);
                        setTargetCoach(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#1C1C1F] text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-[0_0_20px_rgba(240,20,37,0.4)] cursor-pointer"
                    >
                      Confirm Athlete Assignment
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-[#1C1C1F] border border-[#26262A] text-slate-400 text-xs text-center">
                  No athletes registered in academy yet.
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

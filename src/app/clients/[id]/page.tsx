"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { ClientProfile, BodyPart, RestrictionSeverity, CoachProfile } from "@/types";
import {
  Scale,
  AlertTriangle,
  Award,
  Users,
  Dumbbell,
  Camera,
  FileText,
  PlusCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Shield,
  CheckCircle,
  Calendar
} from "lucide-react";

import MeasurementsTab from "@/components/clients/MeasurementsTab";
import MedicalTab from "@/components/clients/MedicalTab";
import GoalsTab from "@/components/clients/GoalsTab";
import CoachesTab from "@/components/clients/CoachesTab";
import WorkoutsTab from "@/components/clients/WorkoutsTab";
import PhotosTab from "@/components/clients/PhotosTab";
import NotesTab from "@/components/clients/NotesTab";

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;
  const { t, language, dir } = useLanguage();
  const { user } = useAuth();

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"measurements" | "medical" | "goals" | "coaches" | "workouts" | "photos" | "notes">("measurements");

  // Modals
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false);
  const [medicalModalOpen, setMedicalModalOpen] = useState(false);
  const [coachAssignModalOpen, setCoachAssignModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);

  // Form states
  const [newWeight, setNewWeight] = useState(90);
  const [newBodyFat, setNewBodyFat] = useState(26);
  const [newMuscleMass, setNewMuscleMass] = useState(33);
  const [newWaist, setNewWaist] = useState(100);
  const [newChest, setNewChest] = useState(108);
  const [newArms, setNewArms] = useState(37.5);
  const [newThigh, setNewThigh] = useState(62);
  const [measurementNotes, setMeasurementNotes] = useState("");

  const [conditionName, setConditionName] = useState("");
  const [bodyPart, setBodyPart] = useState<BodyPart>("KNEE");
  const [severity, setSeverity] = useState<RestrictionSeverity>("HIGH");
  const [conditionDesc, setConditionDesc] = useState("");
  const [restrictedEx, setRestrictedEx] = useState("Squat, Leg Press");

  const [selectedCoachId, setSelectedCoachId] = useState("coach-1");
  const [coachRole, setCoachRole] = useState<any>("PRIMARY");

  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState<"PRIVATE_COACH" | "PUBLIC_CLIENT">("PRIVATE_COACH");

  const isClient = user?.role === "CLIENT";

  const [coachesList, setCoachesList] = useState<CoachProfile[]>([]);

  const loadClientData = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          // Permission check: if client user is trying to view another client profile, redirect to their own
          if (user?.role === "CLIENT" && json.data.userId !== user.id) {
            router.replace("/dashboard");
            return;
          }
          setClient(json.data);
        }
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading client 360:", err);
    }
  };

  useEffect(() => {
    loadClientData();
    fetch("/api/coaches")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setCoachesList(j.data);
      })
      .catch((err) => console.error(err));
  }, [clientId]);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-crimson" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
          Loading client profile...
        </p>
      </div>
    );
  }

  const measurements = client.measurements || [];
  const goals = client.goals || [];
  const restrictions = client.medicalRestrictions || [];

  const heightM = (client.heightCm || 178) / 100;
  const currentBmi = ((client.weightKg || 80) / (heightM * heightM)).toFixed(1);

  // Submit Handlers
  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    db.addMeasurement(client.id, {
      date: new Date().toISOString().slice(0, 10),
      weightKg: Number(newWeight),
      heightCm: client.heightCm,
      bodyFatPercentage: Number(newBodyFat),
      muscleMassKg: Number(newMuscleMass),
      waistCm: Number(newWaist),
      chestCm: Number(newChest),
      armsCm: Number(newArms),
      thighCm: Number(newThigh),
      notes: measurementNotes
    });
    setMeasurementModalOpen(false);
    loadClientData();
  };

  const handleAddMedical = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conditionName) return;
    db.addMedicalRestriction(client.id, {
      conditionName,
      bodyPart,
      severity,
      description: conditionDesc,
      restrictedMuscles: [],
      restrictedExercises: restrictedEx.split(",").map(s => s.trim()),
      isActive: true
    });
    setMedicalModalOpen(false);
    setConditionName("");
    loadClientData();
  };

  const handleAssignCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClient || !selectedCoachId) return; // Disallow client
    try {
      const res = await fetch(`/api/clients/${client.id}/coaches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId: selectedCoachId, role: coachRole })
      });
      if (res.ok) {
        setCoachAssignModalOpen(false);
        await loadClientData();
      }
    } catch (err) {
      console.error("[PostgreSQL] Error assigning coach:", err);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent || isClient) return;
    db.addClientNote(client.id, user?.id || "user-coach-1", noteType, noteContent);
    setNoteModalOpen(false);
    setNoteContent("");
    loadClientData();
  };

  const tabs = [
    { id: "measurements", label: "Measurements & Weight Log", icon: Scale },
    { id: "medical", label: "Medical Restrictions & Cues", icon: AlertTriangle, badge: restrictions.length },
    { id: "goals", label: "Training Goals", icon: Award },
    { id: "coaches", label: "Assigned Coaches", icon: Users },
    { id: "workouts", label: "Assigned Workouts", icon: Dumbbell },
    { id: "photos", label: "Progress Gallery", icon: Camera },
    ...(isClient ? [] : [{ id: "notes", label: "Coach Notes", icon: FileText }])
  ];

  return (
    <div className="space-y-6">
      {/* Back button & Page Title */}
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        {!isClient && (
          <Link
            href="/clients"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-sm"
          >
            {dir === "rtl" ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </Link>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">{client.user?.name}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Client Profile & Physical Stats • {client.sport?.nameEn || client.sport?.nameAr || "Bodybuilding"}
          </p>
        </div>
      </div>

      {/* Hero Profile Card */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <img
              src={client.user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}
              alt={client.user?.name || "Athlete"}
              onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"; }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-brand-crimson shadow-lg shadow-[0_0_15px_rgba(240,20,37,0.3)]"
            />
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{client.user?.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30">
                  {client.status === "ACTIVE" ? "Active" : client.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {client.user?.email} {client.user?.phone ? `• ${client.user.phone}` : ''}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{client.address || "Cairo, Egypt"}</p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="px-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t("weight")}</span>
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">{client.weightKg} <span className="text-[10px] text-slate-400">KG</span></span>
            </div>
            <div className="px-2 border-s border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t("height")}</span>
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">{client.heightCm} <span className="text-[10px] text-slate-400">CM</span></span>
            </div>
            <div className="px-2 border-s border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">BMI</span>
              <span className="text-sm sm:text-base font-black text-brand-crimson">{currentBmi}</span>
            </div>
            <div className="px-2 border-s border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Expiry</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate block">{client.membershipExpiry?.slice(0, 7) || "2026-12"}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row - Protected by Role */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setMeasurementModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)] flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{t("addMeasurement")}</span>
          </button>

          {!isClient && (
            <>
              <button
                onClick={() => setMedicalModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>{t("addRestriction")}</span>
              </button>

              {(user?.role === "ADMIN" || user?.role === "HEAD_COACH") && (
                <button
                  onClick={() => setCoachAssignModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>Assign Coach / Assistant</span>
                </button>
              )}

              <button
                onClick={() => setNoteModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-purple-500" />
                <span>Add Note</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Medical Alert Banner ⚠ */}
      {restrictions.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-sm flex items-start space-x-3 rtl:space-x-reverse">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {t("medicalAlert")} - Active Medical Restrictions ⚠
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                {restrictions[0].severity}
              </span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200/90 mt-1">
              <strong>{restrictions[0].conditionName}:</strong> {restrictions[0].description}
            </p>
            {restrictions[0].restrictedExercises && restrictions[0].restrictedExercises.length > 0 && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-semibold">
                🚫 Contraindicated Exercises: {restrictions[0].restrictedExercises.join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs Navigation Bar */}
      <div className="flex space-x-2 rtl:space-x-reverse overflow-x-auto pb-2 custom-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-brand-crimson text-white shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ms-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  isActive ? "bg-white/20 text-white" : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents View */}
      <div className="animate-in fade-in duration-150">
        {activeTab === "measurements" && (
          <MeasurementsTab
            measurements={measurements}
            onOpenModal={() => setMeasurementModalOpen(true)}
          />
        )}

        {activeTab === "medical" && (
          <MedicalTab
            restrictions={restrictions}
            onOpenModal={() => setMedicalModalOpen(true)}
            isClient={isClient}
          />
        )}

        {activeTab === "goals" && (
          <GoalsTab
            goals={goals}
          />
        )}

        {activeTab === "coaches" && (
          <CoachesTab
            assignments={client.coaches || []}
            onOpenModal={() => setCoachAssignModalOpen(true)}
            onUnassign={async (coachId) => {
              if (confirm("Are you sure you want to unassign this coach?")) {
                try {
                  await fetch(`/api/clients/${client.id}/coaches?coachId=${coachId}`, { method: "DELETE" });
                  await loadClientData();
                } catch (err) {
                  console.error(err);
                }
              }
            }}
            isClient={isClient}
          />
        )}

        {activeTab === "workouts" && (
          <WorkoutsTab
            clientId={client.id}
          />
        )}

        {activeTab === "photos" && (
          <PhotosTab
            photos={client.progressPhotos || []}
            clientId={client.id}
          />
        )}

        {activeTab === "notes" && !isClient && (
          <NotesTab
            notes={client.notes || []}
            onOpenModal={() => setNoteModalOpen(true)}
          />
        )}
      </div>

      {/* --- ADD MEASUREMENT MODAL --- */}
      {measurementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Scale className="w-5 h-5 text-brand-crimson" />
                <span>Log New Measurements</span>
              </h3>
              <button onClick={() => setMeasurementModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMeasurement} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Weight (KG) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newWeight}
                    onChange={e => setNewWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Body Fat %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newBodyFat}
                    onChange={e => setNewBodyFat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Muscle Mass (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMuscleMass}
                    onChange={e => setNewMuscleMass(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Waist (cm)</label>
                  <input
                    type="number"
                    value={newWaist}
                    onChange={e => setNewWaist(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Chest (cm)</label>
                  <input
                    type="number"
                    value={newChest}
                    onChange={e => setNewChest(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Arms (cm)</label>
                  <input
                    type="number"
                    value={newArms}
                    onChange={e => setNewArms(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Thigh (cm)</label>
                  <input
                    type="number"
                    value={newThigh}
                    onChange={e => setNewThigh(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  value={measurementNotes}
                  onChange={e => setMeasurementNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setMeasurementModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                >
                  Save Measurements ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD MEDICAL RESTRICTION MODAL (COACH / ADMIN ONLY) --- */}
      {medicalModalOpen && !isClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Add Medical Restriction & Injury Report</span>
              </h3>
              <button onClick={() => setMedicalModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedical} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Condition / Injury Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Right Knee Meniscus Tear"
                  value={conditionName}
                  onChange={e => setConditionName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Affected Body Part</label>
                  <select
                    value={bodyPart}
                    onChange={e => setBodyPart(e.target.value as BodyPart)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="KNEE">Knee</option>
                    <option value="LOWER_BACK">Lower Back</option>
                    <option value="SHOULDER">Shoulder</option>
                    <option value="NECK">Neck</option>
                    <option value="ANKLE">Ankle</option>
                    <option value="WRIST">Wrist</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Severity Level</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as RestrictionSeverity)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contraindicated & Restricted Exercises</label>
                <input
                  type="text"
                  placeholder="e.g. Barbell Squat, Leg Extension"
                  value={restrictedEx}
                  onChange={e => setRestrictedEx(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description & Coaching Guidelines</label>
                <textarea
                  rows={2}
                  value={conditionDesc}
                  onChange={e => setConditionDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setMedicalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30"
                >
                  Save Medical Report ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ASSIGN COACH MODAL --- */}
      {coachAssignModalOpen && !isClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Users className="w-5 h-5 text-brand-crimson" />
                <span>Assign Coach / Specialist to Athlete</span>
              </h3>
              <button onClick={() => setCoachAssignModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCoach} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Coach *
                </label>
                <select
                  value={selectedCoachId}
                  onChange={e => setSelectedCoachId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                >
                  {coachesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.user?.name} ({c.specialties?.slice(0, 2).join(", ") || "Coach"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Coaching Role *
                </label>
                <select
                  value={coachRole}
                  onChange={e => setCoachRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="PRIMARY">Primary Coach</option>
                  <option value="ASSISTANT">Assistant Coach</option>
                  <option value="NUTRITIONIST">Nutritionist</option>
                  <option value="PHYSIOTHERAPIST">Physiotherapist</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setCoachAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] cursor-pointer"
                >
                  Confirm Assignment ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

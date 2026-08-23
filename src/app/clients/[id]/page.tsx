"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/db";
import { ClientProfile, BodyPart, RestrictionSeverity } from "@/types";
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
  X
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

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = () => {
    const data = db.getClient360(clientId);
    if (data) setClient(data);
  };

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
        <p className="text-xs text-slate-400">جاري تحميل ملف المتدرب...</p>
      </div>
    );
  }

  const measurements = client.measurements || [];
  const goals = client.goals || [];
  const restrictions = client.medicalRestrictions || [];
  const coachesList = db.getCoaches();

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
      restrictedMuscles: [bodyPart],
      restrictedExercises: restrictedEx.split(",").map(s => s.trim()),
      isActive: true,
      notes: ""
    });
    setMedicalModalOpen(false);
    setConditionName("");
    loadClientData();
  };

  const handleAssignCoach = (e: React.FormEvent) => {
    e.preventDefault();
    db.assignCoachToClient(client.id, selectedCoachId, coachRole);
    setCoachAssignModalOpen(false);
    loadClientData();
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent) return;
    db.addClientNote(client.id, user?.id || "user-coach-1", noteType, noteContent);
    setNoteModalOpen(false);
    setNoteContent("");
    loadClientData();
  };

  return (
    <div className="space-y-6">
      {/* Back button & Page Title */}
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <Link
          href="/clients"
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          {dir === "rtl" ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">{client.user.name}</h1>
          <p className="text-xs text-slate-400">{t("clientProfile")} • {client.sport?.nameAr || "كمال أجسام"}</p>
        </div>
      </div>

      {/* Hero Profile Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <img
              src={client.user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}
              alt={client.user?.name || "Athlete"}
              onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"; }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
            />
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                <h2 className="text-lg sm:text-xl font-bold text-white">{client.user.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {client.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">{client.user.email} • {client.user.phone || "01001234567"}</p>
              <p className="text-[11px] text-slate-500 mt-1">{client.address || "القاهرة، مصر"}</p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div className="px-2">
              <span className="text-[10px] text-slate-500 block">{t("weight")}</span>
              <span className="text-sm sm:text-base font-black text-white">{client.weightKg} <span className="text-[10px] text-slate-400">KG</span></span>
            </div>
            <div className="px-2 border-s border-slate-800">
              <span className="text-[10px] text-slate-500 block">{t("height")}</span>
              <span className="text-sm sm:text-base font-black text-white">{client.heightCm} <span className="text-[10px] text-slate-400">CM</span></span>
            </div>
            <div className="px-2 border-s border-slate-800">
              <span className="text-[10px] text-slate-500 block">BMI</span>
              <span className="text-sm sm:text-base font-black text-emerald-400">{currentBmi}</span>
            </div>
            <div className="px-2 border-s border-slate-800">
              <span className="text-[10px] text-slate-500 block">الاشتراك</span>
              <span className="text-xs font-bold text-slate-300 truncate block">{client.membershipExpiry?.slice(0, 7) || "2026-12"}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-slate-800">
          <button
            onClick={() => setMeasurementModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 rtl:space-x-reverse transition-all"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{t("addMeasurement")}</span>
          </button>

          <button
            onClick={() => setMedicalModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{t("addRestriction")}</span>
          </button>

          <button
            onClick={() => setCoachAssignModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse transition-all"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>تعيين كابتن / مساعد</span>
          </button>

          <button
            onClick={() => setNoteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>إضافة ملاحظة</span>
          </button>
        </div>
      </div>

      {/* Active Medical Alert Banner ⚠ */}
      {restrictions.length > 0 && (
        <div className="bg-gradient-to-r from-red-950/50 via-amber-950/40 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-xl flex items-start space-x-3 rtl:space-x-reverse animate-in fade-in">
          <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300">
                {t("medicalAlert")} - {language === "ar" ? "محاذير وإصابات نشطة تتطلب الانتباه ⚠" : "Active Medical Restrictions"}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/30 text-red-300 border border-red-500/40">
                {restrictions[0].severity} SEVERITY
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-1">
              <strong>{restrictions[0].conditionName}:</strong> {restrictions[0].description}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-amber-300 font-bold">التمارين المحظورة:</span>
              {restrictions[0].restrictedExercises.map((ex, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-900/40 text-red-300 border border-red-700/50">
                  ⛔ {ex}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex space-x-1 rtl:space-x-reverse overflow-x-auto pb-1 border-b border-slate-800 custom-scrollbar">
        {[
          { key: "measurements", label: t("clientMeasurements"), icon: Scale },
          { key: "medical", label: t("clientMedical"), icon: AlertTriangle, count: restrictions.length },
          { key: "goals", label: t("clientGoals"), icon: Award, count: goals.length },
          { key: "coaches", label: t("clientCoaches"), icon: Users, count: client.coaches?.length },
          { key: "workouts", label: t("clientWorkouts"), icon: Dumbbell, count: client.workoutAssignments?.length },
          { key: "photos", label: t("clientPhotos"), icon: Camera, count: client.progressPhotos?.length },
          { key: "notes", label: t("clientNotes"), icon: FileText, count: client.notes?.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Views */}
      {activeTab === "measurements" && (
        <MeasurementsTab measurements={measurements} onOpenModal={() => setMeasurementModalOpen(true)} />
      )}
      {activeTab === "medical" && (
        <MedicalTab restrictions={restrictions} onOpenModal={() => setMedicalModalOpen(true)} />
      )}
      {activeTab === "goals" && (
        <GoalsTab goals={goals} />
      )}
      {activeTab === "coaches" && (
        <CoachesTab assignments={client.coaches || []} onOpenModal={() => setCoachAssignModalOpen(true)} />
      )}
      {activeTab === "workouts" && (
        <WorkoutsTab assignments={client.workoutAssignments || []} />
      )}
      {activeTab === "photos" && (
        <PhotosTab photos={client.progressPhotos || []} />
      )}
      {activeTab === "notes" && (
        <NotesTab notes={client.notes || []} onOpenModal={() => setNoteModalOpen(true)} />
      )}

      {/* Modal: Add Measurement */}
      {measurementModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>{t("addMeasurement")}</span>
              </h3>
              <button onClick={() => setMeasurementModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMeasurement} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">الوزن (KG) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newWeight}
                    onChange={e => setNewWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">نسبة الدهون (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newBodyFat}
                    onChange={e => setNewBodyFat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">الخصر (CM)</label>
                  <input
                    type="number"
                    value={newWaist}
                    onChange={e => setNewWaist(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">الصدر (CM)</label>
                  <input
                    type="number"
                    value={newChest}
                    onChange={e => setNewChest(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">الذراع (CM)</label>
                  <input
                    type="number"
                    value={newArms}
                    onChange={e => setNewArms(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">ملاحظات القياس</label>
                <textarea
                  rows={2}
                  value={measurementNotes}
                  onChange={e => setMeasurementNotes(e.target.value)}
                  placeholder="ملاحظات حول نسبة السوائل أو التطور..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setMeasurementModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300">
                  {t("cancel")}
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white">
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Medical Restriction */}
      {medicalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{t("addRestriction")}</span>
              </h3>
              <button onClick={() => setMedicalModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedical} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">اسم الإصابة / الحالة الصحية *</label>
                <input
                  type="text"
                  required
                  value={conditionName}
                  onChange={e => setConditionName(e.target.value)}
                  placeholder="تمزق غضروف الركبة / انزلاق غضروفي..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">العضو المصاب</label>
                  <select
                    value={bodyPart}
                    onChange={e => setBodyPart(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="KNEE">الركبة (Knee)</option>
                    <option value="SHOULDER">الكتف (Shoulder)</option>
                    <option value="LOWER_BACK">أسفل الظهر (Lower Back)</option>
                    <option value="NECK">الرقبة (Neck)</option>
                    <option value="ANKLE">الكاحل (Ankle)</option>
                    <option value="HEART">القلب (Heart)</option>
                    <option value="ASTHMA">الربو والتنفس (Asthma)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">درجة الخطورة</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="HIGH">عالية (High)</option>
                    <option value="CRITICAL">حرجة (Critical)</option>
                    <option value="MEDIUM">متوسطة (Medium)</option>
                    <option value="LOW">خفيفة (Low)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">التمارين المحظورة (مفصولة بفواصل)</label>
                <input
                  type="text"
                  value={restrictedEx}
                  onChange={e => setRestrictedEx(e.target.value)}
                  placeholder="Squat, Leg Press, Deadlift"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">تقرير الطبيب / تفاصيل الحالة</label>
                <textarea
                  rows={2}
                  value={conditionDesc}
                  onChange={e => setConditionDesc(e.target.value)}
                  placeholder="تعليمات الطبيب المعالج..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setMedicalModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300">
                  {t("cancel")}
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white">
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Coach */}
      {coachAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>تعيين كابتن للمتدرب</span>
              </h3>
              <button onClick={() => setCoachAssignModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCoach} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">اختر الكابتن</label>
                <select
                  value={selectedCoachId}
                  onChange={e => setSelectedCoachId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  {coachesList.map(c => (
                    <option key={c.id} value={c.id}>{c.user?.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">نوع الدور التدريبي</label>
                <select
                  value={coachRole}
                  onChange={e => setCoachRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="PRIMARY">كابتن أساسي (Primary Coach)</option>
                  <option value="ASSISTANT">كابتن مساعد (Assistant Coach)</option>
                  <option value="NUTRITIONIST">أخصائي تغذية (Nutritionist)</option>
                  <option value="PHYSIOTHERAPIST">أخصائي علاج طبيعي وتأهيل</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setCoachAssignModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300">
                  {t("cancel")}
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white">
                  حفظ التعيين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Note */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>إضافة ملاحظة على المتدرب</span>
              </h3>
              <button onClick={() => setNoteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNote} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">نوع الملاحظة</label>
                <select
                  value={noteType}
                  onChange={e => setNoteType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="PRIVATE_COACH">🔒 ملاحظة خاصة بالكباتن والإدارة فقط (Private)</option>
                  <option value="PUBLIC_CLIENT">📢 ملاحظة عامة يراها المتدرب (Public)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">نص الملاحظة *</label>
                <textarea
                  required
                  rows={3}
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="اكتب التوجيهات أو الملاحظات هنا..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setNoteModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300">
                  {t("cancel")}
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white">
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
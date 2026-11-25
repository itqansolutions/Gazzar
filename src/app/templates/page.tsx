"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  WorkoutTemplate,
  Exercise,
  WorkoutTemplateExercise,
  WorkoutBlock,
  BlockItem,
  BlockType,
  BlockItemType,
  Difficulty,
  ClientProfile,
  MetricType,
  Sport
} from "@/types";
import {
  Layers,
  PlusCircle,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  AlertTriangle,
  Plus,
  Scale,
  Timer,
  ArrowUp,
  ArrowDown,
  Search,
  Archive,
  RotateCcw,
  Route,
  Repeat,
  Hourglass,
  Coffee,
  FileText
} from "lucide-react";

import { PART_LABELS, isTimedFormat, defaultFormatParams, describeFormat, buildTemplateName } from "@/lib/block-formats";

type StatusFilter = "ALL" | "ACTIVE" | "ARCHIVED";

const BLOCK_TYPE_META: Record<BlockType, { label: string; desc: string; badgeClass: string; defaultRounds: number }> = {
  SINGLE: {
    label: "Single Exercise",
    desc: "Standard straight sets",
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
    defaultRounds: 1
  },
  SUPERSET: {
    label: "Superset",
    desc: "2+ exercises paired back-to-back",
    badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
    defaultRounds: 3
  },
  CIRCUIT: {
    label: "Circuit",
    desc: "3+ exercises performed consecutively in rounds",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    defaultRounds: 3
  },
  AMRAP: {
    label: "AMRAP",
    desc: "As many rounds/reps as possible within a time cap",
    badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
    defaultRounds: 1
  },
  FOR_TIME: {
    label: "For Time",
    desc: "Complete the work as fast as possible; the finish time is recorded",
    badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30",
    defaultRounds: 1
  },
  EMOM: {
    label: "EMOM",
    desc: "Every minute on the minute: start a new round each interval",
    badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
    defaultRounds: 10
  },
  TABATA: {
    label: "Tabata",
    desc: "Work / rest intervals repeated for a set number of rounds",
    badgeClass: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30",
    defaultRounds: 8
  },
  SEQUENCE: {
    label: "Sequence",
    desc: "Timed intervals, EMOM, or movement sequence",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    defaultRounds: 1
  }
};

interface BuilderBlockItem {
  uid: string;
  itemType: BlockItemType;
  exerciseId?: string;
  exerciseNameAr?: string;
  exerciseNameEn?: string;
  metricType?: MetricType;
  sports?: Array<{ id: string; nameEn: string; nameAr: string }>;
  primaryMuscleName?: string;
  instructions?: string | null;
  targetSets?: number | null;
  targetReps?: string | null;
  targetWeightKg?: number | null;
  targetDistanceKm?: number | null;
  targetTimeSeconds?: number | null;
  targetPace?: string | null;
  targetRounds?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;
}

interface BuilderBlock {
  uid: string;
  type: BlockType;
  title: string;
  rounds: number | null;
  durationSeconds: number | null;
  restBetweenRoundsSeconds: number | null;
  workSeconds?: number | null;
  restSeconds?: number | null;
  intervalSeconds?: number | null;
  partLabel?: string | null;
  notes: string;
  items: BuilderBlockItem[];
}

function createUid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getExerciseSports(ex?: Partial<Exercise> | null): Array<{ id: string; nameEn: string; nameAr: string }> {
  if (!ex) return [];
  if (Array.isArray(ex.sports) && ex.sports.length > 0) {
    return ex.sports;
  }
  if (Array.isArray(ex.exerciseSports) && ex.exerciseSports.length > 0) {
    return ex.exerciseSports
      .map((es) => es.sport)
      .filter((s): s is Sport => Boolean(s));
  }
  if (ex.sport) {
    return [ex.sport];
  }
  return [];
}

function getExerciseSportIds(ex?: Partial<Exercise> | null): string[] {
  if (!ex) return [];
  if (Array.isArray(ex.sportIds) && ex.sportIds.length > 0) {
    return ex.sportIds;
  }
  const linked = getExerciseSports(ex).map((s) => s.id);
  if (linked.length > 0) return linked;
  return ex.sportId ? [ex.sportId] : [];
}

function formatSecondsCompact(sec?: number | null): string {
  if (sec === undefined || sec === null || sec <= 0) return "0s";
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  if (mins === 0) return `${rem}s`;
  if (rem === 0) return `${mins}m`;
  return `${mins}m ${rem.toString().padStart(2, "0")}s`;
}

function getMetricBadgeMeta(metric: MetricType): { label: string; className: string } {
  switch (metric) {
    case "DISTANCE_TIME_PACE":
    case "LAPS_TIME":
      return {
        label: "Distance / Time / Pace",
        className: "bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30"
      };
    case "ROUNDS_REPS_TIME":
      return {
        label: "Rounds / Reps",
        className: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30"
      };
    case "TIME_HOLD":
      return {
        label: "Time Hold",
        className: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30"
      };
    default:
      return {
        label: "Sets / Reps / Weight",
        className: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30"
      };
  }
}

function formatTargetSummary(item: {
  metricType?: MetricType | null;
  targetSets?: number | null;
  targetReps?: string | null;
  targetWeightKg?: number | null;
  targetDistanceKm?: number | null;
  targetTimeSeconds?: number | null;
  targetPace?: string | null;
  targetRounds?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;
}): string[] {
  const metric = item.metricType || "SETS_REPS_WEIGHT";
  const parts: string[] = [];

  if (metric === "DISTANCE_TIME_PACE" || metric === "LAPS_TIME") {
    if (item.targetDistanceKm !== undefined && item.targetDistanceKm !== null) {
      parts.push(`${item.targetDistanceKm} km`);
    }
    if (item.targetTimeSeconds !== undefined && item.targetTimeSeconds !== null) {
      parts.push(formatSecondsCompact(item.targetTimeSeconds));
    }
    if (item.targetPace) {
      parts.push(`@ ${item.targetPace}`);
    }
  } else if (metric === "ROUNDS_REPS_TIME") {
    parts.push(`${item.targetRounds ?? 3} rounds`);
    if (item.targetReps) parts.push(`× ${item.targetReps} reps`);
    if (item.targetTimeSeconds) parts.push(`(${formatSecondsCompact(item.targetTimeSeconds)})`);
  } else if (metric === "TIME_HOLD") {
    parts.push(`${item.targetSets ?? 3} sets`);
    parts.push(`× ${formatSecondsCompact(item.targetTimeSeconds ?? 45)} hold`);
    if (item.targetWeightKg && item.targetWeightKg > 0) {
      parts.push(`+ ${item.targetWeightKg} kg`);
    }
  } else {
    parts.push(`${item.targetSets ?? 3} sets × ${item.targetReps || "10-12"} reps`);
    if (item.targetWeightKg && item.targetWeightKg > 0) {
      parts.push(`@ ${item.targetWeightKg} kg`);
    }
  }

  if (item.tempo) parts.push(`Tempo ${item.tempo}`);
  parts.push(`${item.restSeconds ?? 60}s rest`);
  return parts;
}

export default function TemplatesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const canManageTemplates =
    Boolean(user) && ["ADMIN", "HEAD_COACH", "COACH"].includes(user!.role);

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Page filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSport, setFilterSport] = useState("ALL");
  const [filterDifficulty, setFilterDifficulty] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");

  // Notification Toast
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<WorkoutTemplate | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reorderAnnouncement, setReorderAnnouncement] = useState("");

  // Assign modal state
  const [assignTemplate, setAssignTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [coachNotes, setCoachNotes] = useState("");

  // Template Form Metadata
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [nameAthlete, setNameAthlete] = useState("");
  const [nameDay, setNameDay] = useState("");
  const [namePart, setNamePart] = useState("");
  const [descEn, setDescEn] = useState("");
  const [sportId, setSportId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("INTERMEDIATE");
  const [isActiveTemplate, setIsActiveTemplate] = useState(true);

  // Builder routine state
  const [builderBlocks, setBuilderBlocks] = useState<BuilderBlock[]>([]);
  const [activeBlockUid, setActiveBlockUid] = useState<string | null>(null);
  const [editingItemUid, setEditingItemUid] = useState<string | null>(null);

  // Exercise picker state inside builder
  const [pickerSportFilter, setPickerSportFilter] = useState<string>("ALL");
  const [pickerSearch, setPickerSearch] = useState<string>("");
  const [curExerciseId, setCurExerciseId] = useState("");

  // Current new-exercise target inputs
  const [curSets, setCurSets] = useState(3);
  const [curReps, setCurReps] = useState("10-12");
  const [curWeight, setCurWeight] = useState<string>("40");
  const [curDistanceKm, setCurDistanceKm] = useState<string>("2");
  const [curTimeSeconds, setCurTimeSeconds] = useState<string>("600");
  const [curPace, setCurPace] = useState<string>("5:00/km");
  const [curRounds, setCurRounds] = useState<number>(4);
  const [curRest, setCurRest] = useState(60);
  const [curTempo, setCurTempo] = useState("");
  const [curNotes, setCurNotes] = useState("");

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    try {
      const [tRes, eRes, sRes, cRes] = await Promise.all([
        fetch("/api/templates"),
        fetch("/api/exercises"),
        fetch("/api/sports"),
        fetch("/api/clients")
      ]);

      if (tRes.ok) {
        const j = await tRes.json();
        if (j.success && Array.isArray(j.data)) setTemplates(j.data);
      }
      if (eRes.ok) {
        const j = await eRes.json();
        if (j.success && Array.isArray(j.data)) setExercises(j.data);
      }
      if (sRes.ok) {
        const j = await sRes.json();
        if (j.success && Array.isArray(j.data)) {
          setSports(j.data);
          const firstActive = j.data.find((s: Sport) => s.isActive ?? true) || j.data[0];
          if (firstActive && !sportId) setSportId(firstActive.id);
        }
      }
      if (cRes.ok) {
        const j = await cRes.json();
        if (j.success && Array.isArray(j.data)) setClients(j.data);
      }
    } catch (err) {
      console.error("[PostgreSQL] Error loading templates data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTemplates = templates.filter((tpl) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      tpl.titleEn.toLowerCase().includes(q) ||
      tpl.titleAr.toLowerCase().includes(q) ||
      (tpl.descriptionEn && tpl.descriptionEn.toLowerCase().includes(q)) ||
      (tpl.descriptionAr && tpl.descriptionAr.toLowerCase().includes(q)) ||
      (tpl.blocks || []).some(
        (b: any) =>
          (b.partLabel && String(b.partLabel).toLowerCase().includes(q)) ||
          (b.title && String(b.title).toLowerCase().includes(q))
      );

    const matchesSport = filterSport === "ALL" || tpl.sportId === filterSport;
    const matchesDiff = filterDifficulty === "ALL" || tpl.difficulty === filterDifficulty;

    const activeFlag = tpl.isActive ?? true;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && activeFlag) ||
      (statusFilter === "ARCHIVED" && !activeFlag);

    return matchesSearch && matchesSport && matchesDiff && matchesStatus;
  });

  const activeCount = templates.filter((tpl) => tpl.isActive ?? true).length;
  const archivedCount = templates.length - activeCount;

  // Picker exercise list filtered by multi-sport membership and search
  const pickerExercises = exercises.filter((ex) => {
    if (ex.isActive === false) return false;
    const spIds = getExerciseSportIds(ex);
    const matchesSport = pickerSportFilter === "ALL" || spIds.includes(pickerSportFilter);
    const q = pickerSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      ex.nameEn.toLowerCase().includes(q) ||
      ex.nameAr.toLowerCase().includes(q) ||
      (ex.primaryMuscle?.nameEn || "").toLowerCase().includes(q);
    return matchesSport && matchesQuery;
  });

  const selectedLibraryExercise =
    pickerExercises.find((e) => e.id === curExerciseId) ||
    exercises.find((e) => e.id === curExerciseId) ||
    pickerExercises[0] ||
    null;

  const activeMetricType: MetricType = selectedLibraryExercise?.metricType || "SETS_REPS_WEIGHT";

  // Reset per-metric defaults cleanly when selecting another exercise in picker
  const handleSelectPickerExercise = (exId: string) => {
    setCurExerciseId(exId);
    const found = exercises.find((e) => e.id === exId);
    if (!found) return;
    if (found.metricType === "DISTANCE_TIME_PACE" || found.metricType === "LAPS_TIME") {
      setCurDistanceKm("2");
      setCurTimeSeconds("600");
      setCurPace("5:00/km");
      setCurRest(90);
    } else if (found.metricType === "ROUNDS_REPS_TIME") {
      setCurRounds(4);
      setCurReps("15");
      setCurTimeSeconds("60");
      setCurRest(60);
    } else if (found.metricType === "TIME_HOLD") {
      setCurSets(3);
      setCurTimeSeconds("45");
      setCurWeight("");
      setCurRest(45);
    } else {
      setCurSets(3);
      setCurReps("10-12");
      setCurWeight("40");
      setCurRest(60);
    }
  };

  const handleAddBlock = (type: BlockType = "SINGLE") => {
    const meta = BLOCK_TYPE_META[type];
    const newBlock: BuilderBlock = {
      uid: createUid(),
      type,
      title: `${meta.label} Block`,
      rounds: meta.defaultRounds,
      durationSeconds: null,
      restBetweenRoundsSeconds: type === "SUPERSET" ? 90 : type === "CIRCUIT" ? 120 : 60,
      notes: "",
      items: []
    };
    if (isTimedFormat(type)) {
      const d = defaultFormatParams(type);
      newBlock.rounds = d.rounds;
      newBlock.durationSeconds = d.durationSeconds;
      newBlock.workSeconds = d.workSeconds || null;
      newBlock.restSeconds = d.restSeconds || null;
      newBlock.intervalSeconds = d.intervalSeconds || null;
      newBlock.restBetweenRoundsSeconds = null;
    }
    // New blocks inherit the part label of the previous block so a part stays grouped.
    newBlock.partLabel = builderBlocks.length > 0 ? builderBlocks[builderBlocks.length - 1].partLabel ?? null : null;
    setBuilderBlocks((prev) => [...prev, newBlock]);
    setActiveBlockUid(newBlock.uid);
  };

  const handleRemoveBlock = (blockUid: string) => {
    setBuilderBlocks((prev) => {
      const remaining = prev.filter((b) => b.uid !== blockUid);
      if (activeBlockUid === blockUid && remaining.length > 0) {
        setActiveBlockUid(remaining[0].uid);
      }
      return remaining;
    });
  };

  const handleMoveBlock = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= builderBlocks.length) return;
    const updated = [...builderBlocks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setBuilderBlocks(updated);
  };

  const handleUpdateBlock = (blockUid: string, patch: Partial<BuilderBlock>) => {
    setBuilderBlocks((prev) =>
      prev.map((b) => (b.uid === blockUid ? { ...b, ...patch } : b))
    );
  };

  const handleAddExerciseToBlock = (blockUid?: string) => {
    let targetUid = blockUid || activeBlockUid;
    if (!targetUid || !builderBlocks.some((b) => b.uid === targetUid)) {
      if (builderBlocks.length > 0) {
        targetUid = builderBlocks[0].uid;
      } else {
        const newBlock: BuilderBlock = {
          uid: createUid(),
          type: "SINGLE",
          title: "Single Exercise Block",
          rounds: 1,
          durationSeconds: null,
          restBetweenRoundsSeconds: 60,
          notes: "",
          items: []
        };
        setBuilderBlocks([newBlock]);
        setActiveBlockUid(newBlock.uid);
        targetUid = newBlock.uid;
      }
    }

    const foundEx = selectedLibraryExercise;
    if (!foundEx) {
      setFormError("Please select an exercise from the library first.");
      return;
    }
    setFormError(null);

    const metric = foundEx.metricType || "SETS_REPS_WEIGHT";
    const newItem: BuilderBlockItem = {
      uid: createUid(),
      itemType: "EXERCISE",
      exerciseId: foundEx.id,
      exerciseNameAr: foundEx.nameAr || foundEx.nameEn,
      exerciseNameEn: foundEx.nameEn || foundEx.nameAr,
      metricType: metric,
      sports: getExerciseSports(foundEx),
      primaryMuscleName: foundEx.primaryMuscle?.nameEn || foundEx.primaryMuscle?.nameAr,
      targetSets:
        metric === "SETS_REPS_WEIGHT" || metric === "TIME_HOLD" ? Math.max(1, Number(curSets) || 3) : null,
      targetReps:
        metric === "SETS_REPS_WEIGHT" || metric === "ROUNDS_REPS_TIME" ? curReps.trim() || "10" : null,
      targetWeightKg:
        (metric === "SETS_REPS_WEIGHT" || metric === "TIME_HOLD") && curWeight !== ""
          ? Number(curWeight)
          : null,
      targetDistanceKm:
        (metric === "DISTANCE_TIME_PACE" || metric === "LAPS_TIME") && curDistanceKm !== ""
          ? Number(curDistanceKm)
          : null,
      targetTimeSeconds:
        (metric === "DISTANCE_TIME_PACE" ||
          metric === "LAPS_TIME" ||
          metric === "ROUNDS_REPS_TIME" ||
          metric === "TIME_HOLD") &&
        curTimeSeconds !== ""
          ? Number(curTimeSeconds)
          : null,
      targetPace: metric === "DISTANCE_TIME_PACE" ? curPace.trim() || null : null,
      targetRounds: metric === "ROUNDS_REPS_TIME" ? Math.max(1, Number(curRounds) || 4) : null,
      restSeconds: Math.max(0, Number(curRest) || 60),
      tempo: curTempo.trim() || null,
      instructions: curNotes.trim() || null
    };

    setBuilderBlocks((prev) =>
      prev.map((b) => (b.uid === targetUid ? { ...b, items: [...b.items, newItem] } : b))
    );
    setActiveBlockUid(targetUid);
    setCurNotes("");
    setCurTempo("");
  };

  const handleAddRestToBlock = (blockUid: string, restSec: number = 60) => {
    const newItem: BuilderBlockItem = {
      uid: createUid(),
      itemType: "REST",
      restSeconds: restSec,
      instructions: "Rest & recovery between movements"
    };
    setBuilderBlocks((prev) =>
      prev.map((b) => (b.uid === blockUid ? { ...b, items: [...b.items, newItem] } : b))
    );
    setActiveBlockUid(blockUid);
  };

  const handleAddNoteToBlock = (blockUid: string, noteText: string = "Coaching cue") => {
    const newItem: BuilderBlockItem = {
      uid: createUid(),
      itemType: "NOTE",
      instructions: noteText
    };
    setBuilderBlocks((prev) =>
      prev.map((b) => (b.uid === blockUid ? { ...b, items: [...b.items, newItem] } : b))
    );
    setActiveBlockUid(blockUid);
  };

  const handleRemoveItem = (blockUid: string, itemUid: string) => {
    setBuilderBlocks((prev) =>
      prev.map((b) =>
        b.uid === blockUid
          ? { ...b, items: b.items.filter((it) => it.uid !== itemUid) }
          : b
      )
    );
    if (editingItemUid === itemUid) setEditingItemUid(null);
  };

  const handleMoveItem = (blockUid: string, index: number, direction: -1 | 1) => {
    const block = builderBlocks.find((b) => b.uid === blockUid);
    if (!block) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= block.items.length) return;
    const items = [...block.items];
    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);
    setBuilderBlocks((prev) =>
      prev.map((b) => (b.uid === blockUid ? { ...b, items } : b))
    );
  };

  const handleUpdateItem = (blockUid: string, itemUid: string, patch: Partial<BuilderBlockItem>) => {
    setBuilderBlocks((prev) =>
      prev.map((b) =>
        b.uid === blockUid
          ? {
              ...b,
              items: b.items.map((it) => (it.uid === itemUid ? { ...it, ...patch } : it))
            }
          : b
      )
    );
  };

  const totalItemsInBuilder = builderBlocks.reduce((acc, b) => acc + b.items.length, 0);

  const serializeBlocksPayload = () =>
    builderBlocks.map((b, bIdx) => ({
      orderIndex: bIdx + 1,
      type: b.type,
      title: b.title.trim() || null,
      rounds: b.rounds !== null && b.rounds !== undefined && b.rounds !== ("" as any) ? Number(b.rounds) : null,
      durationSeconds: b.durationSeconds !== null && b.durationSeconds !== undefined && b.durationSeconds !== ("" as any) ? Number(b.durationSeconds) : null,
      restBetweenRoundsSeconds: b.restBetweenRoundsSeconds !== null && b.restBetweenRoundsSeconds !== undefined && b.restBetweenRoundsSeconds !== ("" as any) ? Number(b.restBetweenRoundsSeconds) : null,
      workSeconds: b.workSeconds !== null && b.workSeconds !== undefined && b.workSeconds !== ("" as any) ? Number(b.workSeconds) : null,
      restSeconds: b.restSeconds !== null && b.restSeconds !== undefined && b.restSeconds !== ("" as any) ? Number(b.restSeconds) : null,
      intervalSeconds: b.intervalSeconds !== null && b.intervalSeconds !== undefined && b.intervalSeconds !== ("" as any) ? Number(b.intervalSeconds) : null,
      partLabel: b.partLabel && b.partLabel.trim() ? b.partLabel.trim() : null,
      notes: b.notes.trim() || null,
      items: b.items.map((it, iIdx) => ({
        orderIndex: iIdx + 1,
        itemType: it.itemType,
        exerciseId: it.itemType === "EXERCISE" ? it.exerciseId : null,
        targetSets: it.targetSets !== null && it.targetSets !== undefined && it.targetSets !== ("" as any) ? Number(it.targetSets) : null,
        targetReps: it.targetReps ? String(it.targetReps).trim() : null,
        targetWeightKg: it.targetWeightKg !== null && it.targetWeightKg !== undefined && it.targetWeightKg !== ("" as any) ? Number(it.targetWeightKg) : null,
        targetDistanceKm: it.targetDistanceKm !== null && it.targetDistanceKm !== undefined && it.targetDistanceKm !== ("" as any) ? Number(it.targetDistanceKm) : null,
        targetTimeSeconds: it.targetTimeSeconds !== null && it.targetTimeSeconds !== undefined && it.targetTimeSeconds !== ("" as any) ? Number(it.targetTimeSeconds) : null,
        targetPace: it.targetPace ? String(it.targetPace).trim() : null,
        targetRounds: it.targetRounds !== null && it.targetRounds !== undefined && it.targetRounds !== ("" as any) ? Number(it.targetRounds) : null,
        restSeconds: it.restSeconds !== null && it.restSeconds !== undefined && it.restSeconds !== ("" as any) ? Number(it.restSeconds) : null,
        tempo: it.tempo ? String(it.tempo).trim() : null,
        instructions: it.instructions ? String(it.instructions).trim() : null
      }))
    }));

  const openCreateModal = () => {
    setFormError(null);
    setEditingTemplate(null);
    setEditingItemUid(null);
    setTitleAr("");
    setTitleEn("");
    setDescEn("");
    const firstActiveSport = sports.find((s) => s.isActive ?? true) || sports[0];
    setSportId(firstActiveSport?.id || "sport-bodybuilding");
    setPickerSportFilter("ALL");
    setPickerSearch("");
    setDifficulty("INTERMEDIATE");
    setIsActiveTemplate(true);
    const initialBlock: BuilderBlock = {
      uid: createUid(),
      type: "SINGLE",
      title: "Block 1",
      rounds: 1,
      durationSeconds: null,
      restBetweenRoundsSeconds: 60,
      notes: "",
      items: []
    };
    setBuilderBlocks([initialBlock]);
    setActiveBlockUid(initialBlock.uid);
    if (exercises.length > 0) {
      const firstActiveEx = exercises.find((e) => e.isActive !== false) || exercises[0];
      handleSelectPickerExercise(firstActiveEx.id);
    }
    setIsCreateModalOpen(true);
  };

  const openEditModal = (tpl: WorkoutTemplate) => {
    setFormError(null);
    setEditingItemUid(null);
    setEditingTemplate(tpl);
    setTitleAr(tpl.titleAr || "");
    setTitleEn(tpl.titleEn || "");
    setDescEn(tpl.descriptionEn || tpl.descriptionAr || "");
    setSportId(tpl.sportId);
    setPickerSportFilter("ALL");
    setPickerSearch("");
    setDifficulty(tpl.difficulty);
    setIsActiveTemplate(tpl.isActive ?? true);

    if (tpl.blocks && tpl.blocks.length > 0) {
      const blocks: BuilderBlock[] = tpl.blocks.map((b) => ({
        uid: b.id || createUid(),
        type: b.type,
        title: b.title || "",
        rounds: b.rounds ?? (b.type === "SUPERSET" || b.type === "CIRCUIT" ? 3 : 1),
        durationSeconds: b.durationSeconds ?? null,
        restBetweenRoundsSeconds: b.restBetweenRoundsSeconds ?? null,
        workSeconds: (b as any).workSeconds ?? null,
        restSeconds: (b as any).restSeconds ?? null,
        intervalSeconds: (b as any).intervalSeconds ?? null,
        partLabel: (b as any).partLabel ?? null,
        notes: b.notes || "",
        items: (b.items || []).map((it) => ({
          uid: it.id || createUid(),
          itemType: it.itemType,
          exerciseId: it.exerciseId || undefined,
          exerciseNameAr: it.exercise?.nameAr || it.exercise?.nameEn || "Exercise",
          exerciseNameEn: it.exercise?.nameEn || it.exercise?.nameAr || "Exercise",
          metricType: it.exercise?.metricType || "SETS_REPS_WEIGHT",
          sports: getExerciseSports(it.exercise),
          primaryMuscleName: it.exercise?.primaryMuscle?.nameEn || it.exercise?.primaryMuscle?.nameAr,
          targetSets: it.targetSets ?? null,
          targetReps: it.targetReps ? String(it.targetReps) : null,
          targetWeightKg: it.targetWeightKg ?? null,
          targetDistanceKm: it.targetDistanceKm ?? null,
          targetTimeSeconds: it.targetTimeSeconds ?? null,
          targetPace: it.targetPace || null,
          targetRounds: it.targetRounds ?? null,
          restSeconds: it.restSeconds ?? null,
          tempo: it.tempo || null,
          instructions: it.instructions || null
        }))
      }));
      setBuilderBlocks(blocks);
      setActiveBlockUid(blocks[0]?.uid || null);
    } else if (tpl.exercises && tpl.exercises.length > 0) {
      const blocks: BuilderBlock[] = [
        {
          uid: createUid(),
          type: "SINGLE",
          title: "Main Block",
          rounds: 1,
          durationSeconds: null,
          restBetweenRoundsSeconds: 60,
          notes: "",
          items: tpl.exercises.map((te) => ({
            uid: te.id || createUid(),
            itemType: "EXERCISE",
            exerciseId: te.exerciseId,
            exerciseNameAr: te.exercise?.nameAr || te.exercise?.nameEn || "Exercise",
            exerciseNameEn: te.exercise?.nameEn || te.exercise?.nameAr || "Exercise",
            metricType: te.exercise?.metricType || "SETS_REPS_WEIGHT",
            sports: getExerciseSports(te.exercise),
            primaryMuscleName: te.exercise?.primaryMuscle?.nameEn || te.exercise?.primaryMuscle?.nameAr,
            targetSets: te.targetSets ?? null,
            targetReps: te.targetReps ? String(te.targetReps) : null,
            targetWeightKg: te.targetWeightKg ?? null,
            targetDistanceKm: te.targetDistanceKm ?? null,
            targetTimeSeconds: te.targetTimeSeconds ?? null,
            targetPace: te.targetPace || null,
            targetRounds: te.targetRounds ?? null,
            restSeconds: te.restSeconds ?? null,
            tempo: te.tempo || null,
            instructions: te.notes || null
          }))
        }
      ];
      setBuilderBlocks(blocks);
      setActiveBlockUid(blocks[0]?.uid || null);
    } else {
      const initialBlock: BuilderBlock = {
        uid: createUid(),
        type: "SINGLE",
        title: "Block 1",
        rounds: 1,
        durationSeconds: null,
        restBetweenRoundsSeconds: 60,
        notes: "",
        items: []
      };
      setBuilderBlocks([initialBlock]);
      setActiveBlockUid(initialBlock.uid);
    }

    if (exercises.length > 0) {
      const firstActiveEx = exercises.find((e) => e.isActive !== false) || exercises[0];
      handleSelectPickerExercise(firstActiveEx.id);
    }
    setIsEditModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEn = (titleEn || titleAr).trim();
    const cleanAr = (titleAr || cleanEn).trim();
    if (!cleanEn) {
      setFormError("Template title is required.");
      return;
    }
    if (totalItemsInBuilder === 0) {
      setFormError("Add at least one exercise or item to the workout blocks before saving.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const isEdit = Boolean(isEditModalOpen && editingTemplate);
      const endpoint = isEdit ? `/api/templates/${editingTemplate!.id}` : "/api/templates";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleAr: cleanAr,
          titleEn: cleanEn,
          descriptionAr: descEn.trim() || null,
          descriptionEn: descEn.trim() || null,
          sportId: sportId || sports[0]?.id || "sport-bodybuilding",
          difficulty,
          isActive: isActiveTemplate,
          blocks: serializeBlocksPayload()
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Failed to save template");
        return;
      }

      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setEditingTemplate(null);
      await loadData();
      showNotification(isEdit ? "Template updated successfully ✓" : "Template created successfully ✓");
    } catch (err: any) {
      setFormError(err.message || "Network error saving template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (tpl: WorkoutTemplate, nextActive: boolean) => {
    try {
      const res = await fetch(`/api/templates/${tpl.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update template status");

      setDeleteConfirmTemplate(null);
      setDeleteError(null);
      await loadData();
      showNotification(nextActive ? `"${tpl.titleEn}" reactivated` : `"${tpl.titleEn}" archived`);
    } catch (err: any) {
      showNotification(err.message || "Error updating status", "error");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteConfirmTemplate || isSubmitting) return;
    setIsSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/templates/${deleteConfirmTemplate.id}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (res.status === 409) {
          setDeleteError(json.error || "Template is referenced and cannot be hard-deleted.");
          return;
        }
        throw new Error(json.error || "Error deleting template");
      }

      setDeleteConfirmTemplate(null);
      await loadData();
      showNotification("Template deleted successfully");
    } catch (err: any) {
      showNotification(err.message || "Error deleting template", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTemplate || !selectedClientId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          templateId: assignTemplate.id,
          scheduledDate: scheduledDate || new Date().toISOString().split("T")[0],
          coachNotes: coachNotes.trim() || undefined
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showNotification(json.error || "Error assigning workout", "error");
        return;
      }

      setAssignTemplate(null);
      setCoachNotes("");
      await loadData();
      showNotification("Workout assigned with immutable exercise snapshot 🎯");
    } catch (err: any) {
      showNotification(err.message || "Error assigning workout", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 end-5 z-50 flex items-center space-x-2.5 rtl:space-x-reverse px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === "success"
              ? "bg-brand-crimson text-white border-brand-crimson shadow-[0_0_20px_rgba(240,20,37,0.38)]"
              : "bg-red-600 text-white border-red-500 shadow-red-600/30"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 rtl:space-x-reverse">
            <Layers className="w-6 h-6 text-brand-crimson" />
            <span>{t("navTemplates")}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              {filteredTemplates.length} templates
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build ordered workout templates across sets, distance/pace, rounds, and time holds with snapshot-safe client assignment
          </p>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Link
            href="/assignments"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all"
          >
            <Dumbbell className="w-4 h-4 text-brand-crimson" />
            <span>Assigned Workouts</span>
          </Link>
          {canManageTemplates && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Template +</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Status Bar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5">
            {(["ALL", "ACTIVE", "ARCHIVED"] as StatusFilter[]).map((tab) => {
              const count = tab === "ALL" ? templates.length : tab === "ACTIVE" ? activeCount : archivedCount;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === tab
                      ? "bg-brand-crimson text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab === "ALL" ? `All (${count})` : tab === "ACTIVE" ? `Active (${count})` : `Archived (${count})`}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-slate-400">
            Showing {filteredTemplates.length} of {templates.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search templates by title or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
            />
          </div>

          <select
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="ALL">All Sports ({sports.length})</option>
            {sports.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.nameEn || sp.nameAr}
                {sp.isActive === false ? " (Archived)" : ""}
              </option>
            ))}
          </select>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="ALL">All Difficulty Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-3xl bg-slate-200 dark:bg-slate-800/70 animate-pulse" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-crimson/15 text-brand-crimson flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No workout templates match these filters
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Create a template from multi-sport exercises with ordered sets, distance/pace targets, rounds, or holds.
            </p>
          </div>
          {canManageTemplates && templates.length === 0 && (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-5 py-2.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] transition-all inline-flex items-center space-x-2 rtl:space-x-reverse cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Template</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map((tpl) => {
            const isExpanded = expandedId === tpl.id;
            const blockCount = tpl.blocks?.length || 0;
            const totalItemCount =
              tpl.blocks && tpl.blocks.length > 0
                ? tpl.blocks.reduce((acc, b) => acc + (b.items?.length || 0), 0)
                : tpl.exercises?.length || 0;
            const archived = tpl.isActive === false;

            return (
              <div
                key={tpl.id}
                className={`bg-white dark:bg-slate-900/90 border rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-all ${
                  archived
                    ? "border-amber-500/40 opacity-85"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                {/* Template Header Banner */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                  className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center space-x-3.5 rtl:space-x-reverse">
                    <div className="w-12 h-12 rounded-2xl bg-brand-crimson/15 border border-brand-crimson/30 text-brand-crimson flex items-center justify-center font-bold text-lg flex-shrink-0">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {tpl.titleEn || tpl.titleAr}
                        </h3>
                        {blockCount > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30">
                            {blockCount} {blockCount === 1 ? "block" : "blocks"} • {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30">
                            {totalItemCount} {totalItemCount === 1 ? "exercise" : "exercises"}
                          </span>
                        )}
                        {tpl.sport && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {tpl.sport.nameEn || tpl.sport.nameAr}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {tpl.difficulty}
                        </span>
                        {archived && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                            Archived
                          </span>
                        )}
                      </div>
                      {(tpl.descriptionEn || tpl.descriptionAr) && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                          {tpl.descriptionEn || tpl.descriptionAr}
                        </p>
                      )}
                      {tpl._count && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Used in {tpl._count.programWorkouts || 0} program(s) • {tpl._count.assignments || 0} client assignment(s)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {canManageTemplates && (
                      <>
                        <Link
                          href={`/assignments?templateId=${tpl.id}&mode=TEMPLATE`}
                          className="px-3.5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs shadow-md flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Assign to Athlete 🎯</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setAssignTemplate(tpl);
                            setCoachNotes("");
                            if (clients.length > 0) setSelectedClientId(clients[0].id);
                          }}
                          title="Quick inline assign modal"
                          className="px-2 py-1.5 rounded-xl text-slate-400 hover:text-brand-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-[10px] font-bold"
                        >
                          Quick Modal
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(tpl)}
                          title="Edit Template & Blocks"
                          className="p-2 rounded-xl text-slate-400 hover:text-brand-crimson hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(tpl, archived)}
                          title={archived ? "Reactivate Template" : "Archive Template"}
                          className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        >
                          {archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteConfirmTemplate(tpl);
                          }}
                          title="Delete Template"
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                      aria-label={isExpanded ? "Collapse exercises" : "Expand exercises"}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Blocks or Exercises in Template */}
                {isExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="space-y-3 pt-2">
                      {tpl.blocks && tpl.blocks.length > 0 ? (
                        tpl.blocks.map((block, bIdx) => {
                          const bMeta = BLOCK_TYPE_META[block.type] || BLOCK_TYPE_META.SINGLE;
                          return (
                            <div
                              key={block.id || bIdx}
                              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden shadow-xs"
                            >
                              {/* Block Header */}
                              <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${bMeta.badgeClass}`}>
                                    {bMeta.label}
                                  </span>
                                  {(block as any).partLabel && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                                      {(block as any).partLabel}
                                    </span>
                                  )}
                                  {isTimedFormat(block.type) && (
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                      {describeFormat(block as any)}
                                    </span>
                                  )}
                                  {block.title && (
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                      {block.title}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 rtl:space-x-reverse text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  {block.rounds && block.rounds > 1 && (
                                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/20">
                                      🔄 {block.rounds} Rounds
                                    </span>
                                  )}
                                  {block.restBetweenRoundsSeconds && (
                                    <span>
                                      ⏱ {block.restBetweenRoundsSeconds}s Rest between rounds
                                    </span>
                                  )}
                                </div>
                              </div>

                              {block.notes && (
                                <div className="px-4 py-1.5 bg-brand-crimson/5 border-b border-brand-crimson/15 text-[11px] text-brand-crimson font-medium">
                                  💡 {block.notes}
                                </div>
                              )}

                              {/* Block Items */}
                              <div className="p-3 space-y-2">
                                {block.items && block.items.length > 0 ? (
                                  block.items.map((it, iIdx) => {
                                    if (it.itemType === "REST") {
                                      return (
                                        <div
                                          key={it.id || iIdx}
                                          className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center space-x-2.5 rtl:space-x-reverse text-xs"
                                        >
                                          <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                          <span className="font-bold text-amber-700 dark:text-amber-300">
                                            Rest: {it.restSeconds ?? 60}s
                                          </span>
                                          {it.instructions && (
                                            <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                                              — {it.instructions}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    }
                                    if (it.itemType === "NOTE") {
                                      return (
                                        <div
                                          key={it.id || iIdx}
                                          className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center space-x-2.5 rtl:space-x-reverse text-xs"
                                        >
                                          <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                          <span className="font-semibold text-purple-700 dark:text-purple-300">
                                            {it.instructions || "Coaching note"}
                                          </span>
                                        </div>
                                      );
                                    }

                                    const badgeMeta = getMetricBadgeMeta(it.exercise?.metricType || "SETS_REPS_WEIGHT");
                                    const summaryPills = formatTargetSummary({
                                      metricType: it.exercise?.metricType,
                                      targetSets: it.targetSets,
                                      targetReps: it.targetReps,
                                      targetWeightKg: it.targetWeightKg,
                                      targetDistanceKm: it.targetDistanceKm,
                                      targetTimeSeconds: it.targetTimeSeconds,
                                      targetPace: it.targetPace,
                                      targetRounds: it.targetRounds,
                                      restSeconds: it.restSeconds,
                                      tempo: it.tempo
                                    });

                                    return (
                                      <div
                                        key={it.id || iIdx}
                                        className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2"
                                      >
                                        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                                          <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] flex items-center justify-center flex-shrink-0">
                                            {iIdx + 1}
                                          </span>
                                          <div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                {it.exercise?.nameEn || it.exercise?.nameAr || "Exercise"}
                                              </span>
                                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${badgeMeta.className}`}>
                                                {badgeMeta.label}
                                              </span>
                                            </div>
                                            {it.instructions && (
                                              <p className="text-[10px] text-brand-crimson mt-0.5">
                                                💡 {it.instructions}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                                          {summaryPills.map((pill, pIdx) => (
                                            <span
                                              key={pIdx}
                                              className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                                            >
                                              {pill}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-xs text-slate-400 italic">No items in this block</p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        tpl.exercises?.map((te, idx) => {
                          const badgeMeta = getMetricBadgeMeta(te.exercise?.metricType || "SETS_REPS_WEIGHT");
                          const summaryPills = formatTargetSummary({
                            metricType: te.exercise?.metricType,
                            targetSets: te.targetSets,
                            targetReps: te.targetReps,
                            targetWeightKg: te.targetWeightKg,
                            targetDistanceKm: te.targetDistanceKm,
                            targetTimeSeconds: te.targetTimeSeconds,
                            targetPace: te.targetPace,
                            targetRounds: te.targetRounds,
                            restSeconds: te.restSeconds,
                            tempo: te.tempo
                          });

                          return (
                            <div
                              key={te.id || idx}
                              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="flex items-start sm:items-center space-x-3 rtl:space-x-reverse">
                                <span className="w-7 h-7 rounded-xl bg-brand-crimson/15 text-brand-crimson font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                      {te.exercise?.nameEn || te.exercise?.nameAr || "Exercise"}
                                    </h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeMeta.className}`}>
                                      {badgeMeta.label}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                {summaryPills.map((pill, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className="px-2.5 py-1 rounded-xl font-bold border text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700"
                                  >
                                    {pill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- CREATE / EDIT TEMPLATE MODAL WITH WORKOUT BUILDER --- */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 max-w-3xl w-full shadow-2xl space-y-5 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <Layers className="w-5 h-5 text-brand-crimson" />
                  <span>
                    {isCreateModalOpen ? "Create Workout Template & Routine Builder" : "Edit Template & Exercises"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Filter exercises across multiple sports, configure metric-specific targets, and reorder or refine routine blocks
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              {formError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <datalist id="gx-part-labels">
                {PART_LABELS.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>

              {/* Quick name builder: Athlete - Day - Part */}
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-3 flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Athlete</label>
                  <input type="text" value={nameAthlete} onChange={(e) => setNameAthlete(e.target.value)} placeholder="e.g. Ahmed"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs w-32" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Day</label>
                  <input type="text" value={nameDay} onChange={(e) => setNameDay(e.target.value)} placeholder="e.g. W1 D2"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs w-24" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Part</label>
                  <select value={namePart} onChange={(e) => setNamePart(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <option value="">-</option>
                    {PART_LABELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={() => setTitleEn(buildTemplateName(nameAthlete, nameDay, namePart))}
                  disabled={!nameAthlete.trim() && !nameDay.trim() && !namePart}
                  className="px-3 py-1.5 rounded-lg bg-brand-crimson text-white text-xs font-bold disabled:opacity-40">
                  Use as template title
                </button>
                <span className="text-[10px] text-slate-400">Name format: Athlete - Day - Part (searchable from the templates list)</span>
              </div>

              {/* Template Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template Title (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Upper Body Strength"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-brand-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template Title (Alt / Internal)
                  </label>
                  <input
                    type="text"
                    placeholder="Optional alternate title"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-crimson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Sport / Discipline
                  </label>
                  <select
                    value={sportId}
                    onChange={(e) => setSportId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameEn || s.nameAr}
                        {s.isActive === false ? " (Archived)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Instructions &amp; Coach Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Warmup protocol, pacing instructions, progression cues..."
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {isEditModalOpen && (
                <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActiveTemplate}
                    onChange={(e) => setIsActiveTemplate(e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-crimson"
                  />
                  <span>Active template (editing leaves previously assigned workout snapshots unchanged)</span>
                </label>
              )}

              {/* --- WORKOUT ROUTINE BUILDER SECTION --- */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Sparkles className="w-4 h-4 text-brand-crimson" />
                    <span>Add Exercise from Multi-Sport Library</span>
                  </h4>
                  <span className="text-[11px] font-bold text-brand-crimson">
                    {totalItemsInBuilder} item(s) in {builderBlocks.length} block(s)
                  </span>
                </div>

                {exercises.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center justify-between">
                    <span>No exercises registered in library yet!</span>
                    <Link href="/exercises" className="underline font-bold">
                      Go to exercises library 🏋️
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Exercise Library Picker Filter Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        aria-label="Filter exercise picker by sport"
                        value={pickerSportFilter}
                        onChange={(e) => setPickerSportFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-semibold"
                      >
                        <option value="ALL">Filter picker: All Sports</option>
                        {sports.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            Sport: {sp.nameEn || sp.nameAr}
                          </option>
                        ))}
                      </select>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search exercise name or muscle..."
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          className="w-full ps-8 pe-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Exercise Select */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Select Exercise * ({pickerExercises.length} available)
                        </label>
                        {selectedLibraryExercise && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              getMetricBadgeMeta(activeMetricType).className
                            }`}
                          >
                            {getMetricBadgeMeta(activeMetricType).label}
                          </span>
                        )}
                      </div>
                      <select
                        value={selectedLibraryExercise?.id || ""}
                        onChange={(e) => handleSelectPickerExercise(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                      >
                        {pickerExercises.length === 0 ? (
                          <option value="">No active exercises match filter</option>
                        ) : (
                          pickerExercises.map((ex) => {
                            const sportNames = getExerciseSports(ex)
                              .map((s) => s.nameEn || s.nameAr)
                              .join(", ");
                            return (
                              <option key={ex.id} value={ex.id}>
                                {ex.nameEn || ex.nameAr}
                                {ex.primaryMuscle?.nameEn ? ` • ${ex.primaryMuscle.nameEn}` : ""}
                                {sportNames ? ` [${sportNames}]` : ""}
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>

                    {/* Dynamic Tracking Type Inputs */}
                    {activeMetricType === "DISTANCE_TIME_PACE" || activeMetricType === "LAPS_TIME" ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Distance (km)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={curDistanceKm}
                            onChange={(e) => setCurDistanceKm(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Target Time (sec)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={curTimeSeconds}
                            onChange={(e) => setCurTimeSeconds(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Target Pace
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 5:00/km"
                            value={curPace}
                            onChange={(e) => setCurPace(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Rest (sec)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={curRest}
                            onChange={(e) => setCurRest(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                      </div>
                    ) : activeMetricType === "ROUNDS_REPS_TIME" ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Rounds
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={curRounds}
                            onChange={(e) => setCurRounds(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Reps / Round
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 15"
                            value={curReps}
                            onChange={(e) => setCurReps(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Time Cap (sec)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={curTimeSeconds}
                            onChange={(e) => setCurTimeSeconds(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Rest (sec)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={curRest}
                            onChange={(e) => setCurRest(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                      </div>
                    ) : activeMetricType === "TIME_HOLD" ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Sets
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={curSets}
                            onChange={(e) => setCurSets(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Hold Time (sec)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={curTimeSeconds}
                            onChange={(e) => setCurTimeSeconds(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Added Load (kg)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={curWeight}
                            onChange={(e) => setCurWeight(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Rest (sec)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={curRest}
                            onChange={(e) => setCurRest(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Sets
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={curSets}
                            onChange={(e) => setCurSets(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Reps
                          </label>
                          <input
                            type="text"
                            placeholder="10-12"
                            value={curReps}
                            onChange={(e) => setCurReps(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Load (kg)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={curWeight}
                            onChange={(e) => setCurWeight(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Tempo
                          </label>
                          <input
                            type="text"
                            placeholder="3-1-1"
                            value={curTempo}
                            onChange={(e) => setCurTempo(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Rest (sec)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="600"
                            step="5"
                            value={curRest}
                            onChange={(e) => setCurRest(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white text-center font-bold"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Exercise coaching cue / notes (optional)..."
                        value={curNotes}
                        onChange={(e) => setCurNotes(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        disabled={!selectedLibraryExercise}
                        onClick={() => handleAddExerciseToBlock(activeBlockUid || undefined)}
                        className="px-4 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-1 rtl:space-x-reverse cursor-pointer flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          Add to {builderBlocks.find((b) => b.uid === activeBlockUid)?.title || "Active Block"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Screen-reader live status for single reorder announcements */}
                <p role="status" className="sr-only">
                  {reorderAnnouncement}
                </p>

                {/* --- WORKOUT BLOCKS HIERARCHY BUILDER --- */}
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-brand-crimson" />
                        <span>Workout Blocks ({builderBlocks.length})</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Group movements into Single Exercises, Supersets, Multi-Round Circuits, or Sequences
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleAddBlock("SINGLE")}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold text-[11px] border border-blue-500/30 cursor-pointer"
                      >
                        + Single
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock("SUPERSET")}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold text-[11px] border border-purple-500/30 cursor-pointer"
                      >
                        + Superset
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock("CIRCUIT")}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold text-[11px] border border-amber-500/30 cursor-pointer"
                      >
                        + Circuit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock("SEQUENCE")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold text-[11px] border border-emerald-500/30 cursor-pointer"
                      >
                        + Sequence
                      </button>
                    </div>
                  </div>

                  {/* Block Cards List */}
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pe-1">
                    {builderBlocks.map((block, bIdx) => {
                      const isActiveBlock = activeBlockUid === block.uid;

                      return (
                        <div
                          key={block.uid}
                          onClick={() => setActiveBlockUid(block.uid)}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isActiveBlock
                              ? "bg-white dark:bg-slate-900 border-brand-crimson shadow-md"
                              : "bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          {/* Block Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-brand-crimson text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                                {bIdx + 1}
                              </span>

                              <select
                                value={block.type}
                                onChange={(e) =>
                                  handleUpdateBlock(block.uid, { type: e.target.value as BlockType })
                                }
                                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                              >
                                <option value="SINGLE">Single Exercise</option>
                                <option value="SUPERSET">Superset (2+ Movements)</option>
                                <option value="CIRCUIT">Circuit (Rounds Loop)</option>
                                <option value="SEQUENCE">Sequence / Interval</option>
                                <option value="AMRAP">AMRAP (time cap)</option>
                                <option value="FOR_TIME">For Time</option>
                                <option value="EMOM">EMOM (every minute)</option>
                                <option value="TABATA">Tabata (work / rest)</option>
                              </select>

                              <input
                                type="text"
                                placeholder="Block Title (optional)..."
                                value={block.title}
                                onChange={(e) => handleUpdateBlock(block.uid, { title: e.target.value })}
                                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-semibold flex-1 min-w-[130px]"
                              />

                              {isActiveBlock && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30">
                                  Active Target
                                </span>
                              )}
                            </div>

                            <div
                              className="flex items-center gap-1.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1 text-[11px]">
                                <label className="text-slate-400 font-semibold">Rounds:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={block.rounds ?? ""}
                                  onChange={(e) =>
                                    handleUpdateBlock(block.uid, {
                                      rounds: e.target.value === "" ? null : Number(e.target.value)
                                    })
                                  }
                                  className="w-12 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold"
                                />
                              </div>

                              <div className="flex items-center gap-1 text-[11px]">
                                <label className="text-slate-400 font-semibold">Rest:</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="5"
                                  placeholder="sec"
                                  value={block.restBetweenRoundsSeconds ?? ""}
                                  onChange={(e) =>
                                    handleUpdateBlock(block.uid, {
                                      restBetweenRoundsSeconds:
                                        e.target.value === "" ? null : Number(e.target.value)
                                    })
                                  }
                                  className="w-14 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold"
                                />
                                <span className="text-slate-400 text-[10px]">s</span>
                              </div>

                              <button
                                type="button"
                                disabled={bIdx === 0}
                                onClick={() => handleMoveBlock(bIdx, -1)}
                                title="Move Block Up"
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={bIdx === builderBlocks.length - 1}
                                onClick={() => handleMoveBlock(bIdx, 1)}
                                title="Move Block Down"
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={builderBlocks.length <= 1}
                                onClick={() => handleRemoveBlock(block.uid)}
                                title="Delete Block"
                                className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Part label + CrossFit format parameters */}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]" onClick={(e) => e.stopPropagation()}>
                            <label className="text-slate-400 font-semibold">Part:</label>
                            <input
                              type="text"
                              list="gx-part-labels"
                              placeholder="Warm-up / Strength / Core / Endurance"
                              value={block.partLabel ?? ""}
                              onChange={(e) => handleUpdateBlock(block.uid, { partLabel: e.target.value })}
                              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold w-52"
                            />
                            {isTimedFormat(block.type) && (
                              <>
                                {block.type === "AMRAP" && (
                                  <label className="flex items-center gap-1 text-slate-500">
                                    Time cap (min)
                                    <input type="number" min="1" value={block.durationSeconds ? Math.round(block.durationSeconds / 60) : ""}
                                      onChange={(e) => handleUpdateBlock(block.uid, { durationSeconds: e.target.value === "" ? null : Number(e.target.value) * 60 })}
                                      className="w-16 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold" />
                                  </label>
                                )}
                                {block.type === "FOR_TIME" && (
                                  <label className="flex items-center gap-1 text-slate-500">
                                    Time cap (min, optional)
                                    <input type="number" min="1" value={block.durationSeconds ? Math.round(block.durationSeconds / 60) : ""}
                                      onChange={(e) => handleUpdateBlock(block.uid, { durationSeconds: e.target.value === "" ? null : Number(e.target.value) * 60 })}
                                      className="w-16 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold" />
                                  </label>
                                )}
                                {block.type === "EMOM" && (
                                  <>
                                    <label className="flex items-center gap-1 text-slate-500">
                                      Interval (sec)
                                      <input type="number" min="10" value={block.intervalSeconds ?? 60}
                                        onChange={(e) => handleUpdateBlock(block.uid, { intervalSeconds: e.target.value === "" ? null : Number(e.target.value) })}
                                        className="w-16 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold" />
                                    </label>
                                    <label className="flex items-center gap-1 text-slate-500">
                                      Rounds
                                      <input type="number" min="1" value={block.rounds ?? ""}
                                        onChange={(e) => handleUpdateBlock(block.uid, { rounds: e.target.value === "" ? null : Number(e.target.value) })}
                                        className="w-16 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold" />
                                    </label>
                                  </>
                                )}
                                {block.type === "TABATA" && (
                                  <>
                                    <label className="flex items-center gap-1 text-slate-500">
                                      Work (sec)
                                      <input type="number" min="1" value={block.workSeconds ?? 20}
                                        onChange={(e) => handleUpdateBlock(block.uid, { workSeconds: e.target.value === "" ? null : Number(e.target.value) })}
                                        className="w-16 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold" />
                                    </label>
                                    <label className="flex items-center gap-1 text-slate-500">
                                      Rest (sec)
                                      <input type="number" min="0" value={block.restSeconds ?? 10}
                                        onChange={(e) => handleUpdateBlock(block.uid, { restSeconds: e.target.value === "" ? null : Number(e.target.value) })}
                                        className="w-16 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold" />
                                    </label>
                                    <label className="flex items-center gap-1 text-slate-500">
                                      Rounds
                                      <input type="number" min="1" value={block.rounds ?? ""}
                                        onChange={(e) => handleUpdateBlock(block.uid, { rounds: e.target.value === "" ? null : Number(e.target.value) })}
                                        className="w-16 px-1.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold" />
                                    </label>
                                  </>
                                )}
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                                  {describeFormat(block)}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Block Notes Input */}
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Block coaching cue / notes (optional)..."
                              value={block.notes}
                              onChange={(e) => handleUpdateBlock(block.uid, { notes: e.target.value })}
                              className="w-full px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                            />
                          </div>

                          {/* Items List Inside Block */}
                          <div className="mt-2.5 space-y-2">
                            {block.items.length === 0 ? (
                              <div className="p-3 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs">
                                Empty block. Click &quot;Add Selected Exercise&quot; or add a Rest/Note below.
                              </div>
                            ) : (
                              block.items.map((item, iIdx) => {
                                const isInlineEditing = editingItemUid === item.uid;

                                return (
                                  <div
                                    key={item.uid}
                                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-extrabold text-brand-crimson shrink-0">
                                          #{iIdx + 1}
                                        </span>
                                        {item.itemType === "REST" ? (
                                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                            <Coffee className="w-4 h-4 shrink-0" />
                                            <span>Rest: {item.restSeconds ?? 60}s</span>
                                            {item.instructions && (
                                              <span className="text-[11px] font-normal text-slate-400">
                                                — {item.instructions}
                                              </span>
                                            )}
                                          </div>
                                        ) : item.itemType === "NOTE" ? (
                                          <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
                                            <FileText className="w-4 h-4 shrink-0" />
                                            <span>{item.instructions || "Coaching note"}</span>
                                          </div>
                                        ) : (
                                          <div className="min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">
                                              {item.exerciseNameEn || item.exerciseNameAr || "Exercise"}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate">
                                              {formatTargetSummary(item).join(" • ")}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      <div
                                        className="flex items-center gap-1 shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          disabled={iIdx === 0}
                                          onClick={() => handleMoveItem(block.uid, iIdx, -1)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={iIdx === block.items.length - 1}
                                          onClick={() => handleMoveItem(block.uid, iIdx, 1)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditingItemUid(isInlineEditing ? null : item.uid)
                                          }
                                          className={`p-1 rounded-lg cursor-pointer ${
                                            isInlineEditing
                                              ? "bg-brand-crimson text-white"
                                              : "text-slate-400 hover:text-brand-crimson"
                                          }`}
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveItem(block.uid, item.uid)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Inline Item Editor */}
                                    {isInlineEditing && (
                                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 space-y-2">
                                        {item.itemType === "REST" ? (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                              <label className="block text-[10px] text-slate-400 mb-0.5">
                                                Rest Duration (sec)
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                step="5"
                                                value={item.restSeconds ?? ""}
                                                onChange={(e) =>
                                                  handleUpdateItem(block.uid, item.uid, {
                                                    restSeconds:
                                                      e.target.value === "" ? null : Number(e.target.value)
                                                  })
                                                }
                                                className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[10px] text-slate-400 mb-0.5">
                                                Rest Instructions / Cue
                                              </label>
                                              <input
                                                type="text"
                                                value={item.instructions ?? ""}
                                                onChange={(e) =>
                                                  handleUpdateItem(block.uid, item.uid, {
                                                    instructions: e.target.value
                                                  })
                                                }
                                                className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                                              />
                                            </div>
                                          </div>
                                        ) : item.itemType === "NOTE" ? (
                                          <div>
                                            <label className="block text-[10px] text-slate-400 mb-0.5">
                                              Note Instructions
                                            </label>
                                            <input
                                              type="text"
                                              value={item.instructions ?? ""}
                                              onChange={(e) =>
                                                handleUpdateItem(block.uid, item.uid, {
                                                  instructions: e.target.value
                                                })
                                              }
                                              className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                                            />
                                          </div>
                                        ) : (
                                          <>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                              <div>
                                                <label className="block text-[10px] text-slate-400 mb-0.5">
                                                  Sets
                                                </label>
                                                <input
                                                  type="number"
                                                  min="1"
                                                  value={item.targetSets ?? ""}
                                                  onChange={(e) =>
                                                    handleUpdateItem(block.uid, item.uid, {
                                                      targetSets:
                                                        e.target.value === "" ? null : Number(e.target.value)
                                                    })
                                                  }
                                                  className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[10px] text-slate-400 mb-0.5">
                                                  Reps
                                                </label>
                                                <input
                                                  type="text"
                                                  value={item.targetReps ?? ""}
                                                  onChange={(e) =>
                                                    handleUpdateItem(block.uid, item.uid, {
                                                      targetReps: e.target.value
                                                    })
                                                  }
                                                  className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-center font-mono"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[10px] text-slate-400 mb-0.5">
                                                  Load (kg)
                                                </label>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={item.targetWeightKg ?? ""}
                                                  onChange={(e) =>
                                                    handleUpdateItem(block.uid, item.uid, {
                                                      targetWeightKg:
                                                        e.target.value === "" ? null : Number(e.target.value)
                                                    })
                                                  }
                                                  className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[10px] text-slate-400 mb-0.5">
                                                  Rest (sec)
                                                </label>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="5"
                                                  value={item.restSeconds ?? ""}
                                                  onChange={(e) =>
                                                    handleUpdateItem(block.uid, item.uid, {
                                                      restSeconds:
                                                        e.target.value === "" ? null : Number(e.target.value)
                                                    })
                                                  }
                                                  className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[10px] text-slate-400 mb-0.5">
                                                  Tempo
                                                </label>
                                                <input
                                                  type="text"
                                                  placeholder="e.g. 3-1-1"
                                                  value={item.tempo ?? ""}
                                                  onChange={(e) =>
                                                    handleUpdateItem(block.uid, item.uid, {
                                                      tempo: e.target.value
                                                    })
                                                  }
                                                  className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-center font-mono"
                                                />
                                              </div>
                                            </div>
                                            <div>
                                              <input
                                                type="text"
                                                placeholder="Instructions / coaching cues..."
                                                value={item.instructions ?? ""}
                                                onChange={(e) =>
                                                  handleUpdateItem(block.uid, item.uid, {
                                                    instructions: e.target.value
                                                  })
                                                }
                                                className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                                              />
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Block Footer Quick Actions */}
                          <div
                            className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                disabled={!selectedLibraryExercise}
                                onClick={() => handleAddExerciseToBlock(block.uid)}
                                className="px-2.5 py-1 rounded-lg bg-brand-crimson hover:bg-[#FF2D3B] disabled:opacity-50 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Selected Exercise</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddRestToBlock(block.uid, 60)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-[11px] inline-flex items-center gap-1 border border-amber-500/30 cursor-pointer"
                              >
                                <Coffee className="w-3 h-3" />
                                <span>+ Rest (60s)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddNoteToBlock(block.uid, "Coaching cue")}
                                className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 font-bold text-[11px] inline-flex items-center gap-1 border border-purple-500/30 cursor-pointer"
                              >
                                <FileText className="w-3 h-3" />
                                <span>+ Note</span>
                              </button>
                            </div>

                            <span className="text-[10px] text-slate-400">
                              {block.items.length} item(s) in block
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)]"
                >
                  {isSubmitting
                    ? "Saving..."
                    : isCreateModalOpen
                    ? "Save Template & Exercises ✓"
                    : "Update Template ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ASSIGN TEMPLATE MODAL --- */}
      {assignTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Send className="w-5 h-5 text-brand-crimson" />
                <span>Assign Workout to Client</span>
              </h3>
              <button
                type="button"
                onClick={() => setAssignTemplate(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-[#141416] border border-[#26262A] dark:border-brand-crimson/30 text-xs space-y-1">
                <p className="font-bold text-brand-crimson">Selected Template:</p>
                <p className="font-bold text-white">{assignTemplate.titleEn || assignTemplate.titleAr}</p>
                <p className="text-slate-400">
                  {assignTemplate.exercises?.length || 0} exercise(s) — saved as immutable snapshot at assignment time
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Client *
                </label>
                {clients.length === 0 ? (
                  <p className="text-xs text-red-500 font-bold">
                    No clients registered yet. Please add clients first from the Clients tab.
                  </p>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-bold"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.user?.name} ({c.sport?.nameEn || c.sport?.nameAr || "Sport"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scheduled Workout Date *
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Session Notes for Athlete (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Focus on controlled eccentric tempo"
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setAssignTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={clients.length === 0 || isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white text-xs font-bold shadow-lg shadow-[0_0_20px_rgba(240,20,37,0.38)] disabled:opacity-50"
                >
                  {isSubmitting ? "Assigning..." : "Confirm Assignment 🎯"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE / ARCHIVE CONFIRM MODAL --- */}
      {deleteConfirmTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-500">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Template Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmTemplate(null);
                  setDeleteError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Delete template{" "}
              <strong className="text-slate-900 dark:text-white">
                {deleteConfirmTemplate.titleEn || deleteConfirmTemplate.titleAr}
              </strong>
              ? Templates linked to training programs or client assignments cannot be deleted to preserve history.
            </p>

            {deleteError && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-medium space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
                {(deleteConfirmTemplate.isActive ?? true) && (
                  <button
                    type="button"
                    onClick={() => handleToggleActive(deleteConfirmTemplate, false)}
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Template Instead</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmTemplate(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteTemplate}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/30"
              >
                {isSubmitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

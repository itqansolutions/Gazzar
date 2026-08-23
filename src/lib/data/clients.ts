import {
  ClientProfile,
  ClientCoachAssignment,
  ClientMedicalRestriction,
  ClientMeasurementHistory,
  ClientGoal,
  ClientProgressPhoto,
  ClientNote
} from "@/types";
import { initialUsers } from "./users";

export const initialClients: ClientProfile[] = [
  {
    id: "client-1",
    userId: "user-client-1",
    user: initialUsers[5],
    dob: "1994-06-15",
    gender: "MALE",
    heightCm: 178,
    weightKg: 91,
    address: "القاهرة الجديدة - التجمع الخامس",
    emergencyContact: "والده: 01009988776",
    status: "ACTIVE",
    preferredSportId: "sport-1",
    membershipExpiry: "2026-11-30",
    createdAt: "2026-02-01T10:00:00.000Z"
  },
  {
    id: "client-2",
    userId: "user-client-2",
    user: initialUsers[6],
    dob: "1998-03-22",
    gender: "MALE",
    heightCm: 184,
    weightKg: 76,
    address: "مدينة نصر - المنطقة الأولى",
    emergencyContact: "أخوه: 01011122334",
    status: "ACTIVE",
    preferredSportId: "sport-1",
    membershipExpiry: "2026-10-15",
    createdAt: "2026-02-05T12:00:00.000Z"
  },
  {
    id: "client-3",
    userId: "user-client-3",
    user: initialUsers[7],
    dob: "1999-11-08",
    gender: "FEMALE",
    heightCm: 165,
    weightKg: 64,
    address: "الشيخ زايد - بيفرلي هيلز",
    emergencyContact: "والدتها: 01022233445",
    status: "ACTIVE",
    preferredSportId: "sport-3",
    membershipExpiry: "2026-09-30",
    createdAt: "2026-02-10T14:00:00.000Z"
  },
  {
    id: "client-4",
    userId: "user-client-4",
    user: initialUsers[8],
    dob: "1996-08-30",
    gender: "MALE",
    heightCm: 175,
    weightKg: 82,
    address: "المعادي - دجلة",
    emergencyContact: "صديقه: 01033344556",
    status: "FROZEN",
    preferredSportId: "sport-2",
    membershipExpiry: "2026-08-30",
    createdAt: "2026-02-15T16:00:00.000Z"
  }
];

export const initialCoachAssignments: ClientCoachAssignment[] = [
  {
    id: "assign-1",
    clientId: "client-1",
    coachId: "coach-1",
    role: "PRIMARY",
    assignedAt: "2026-02-01T10:00:00.000Z",
    active: true,
    notes: "الكابتن المسؤول الأساسي عن خطة التمارين والأوزان"
  },
  {
    id: "assign-2",
    clientId: "client-1",
    coachId: "coach-3",
    role: "NUTRITIONIST",
    assignedAt: "2026-02-01T10:00:00.000Z",
    active: true,
    notes: "متابعة السعرات والماكروز وبرنامج التخسيس"
  },
  {
    id: "assign-3",
    clientId: "client-1",
    coachId: "coach-2",
    role: "ASSISTANT",
    assignedAt: "2026-02-15T10:00:00.000Z",
    active: true,
    notes: "مساعد لحصص الكارديو واللياقة"
  },
  {
    id: "assign-4",
    clientId: "client-2",
    coachId: "coach-1",
    role: "PRIMARY",
    assignedAt: "2026-02-05T12:00:00.000Z",
    active: true
  },
  {
    id: "assign-5",
    clientId: "client-3",
    coachId: "coach-3",
    role: "PRIMARY",
    assignedAt: "2026-02-10T14:00:00.000Z",
    active: true
  },
  {
    id: "assign-6",
    clientId: "client-4",
    coachId: "coach-2",
    role: "PRIMARY",
    assignedAt: "2026-02-15T16:00:00.000Z",
    active: true
  }
];

export const initialMedicalRestrictions: ClientMedicalRestriction[] = [
  {
    id: "med-1",
    clientId: "client-1",
    conditionName: "إصابة غضروف الركبة اليمنى (Meniscus Tear)",
    bodyPart: "KNEE",
    severity: "HIGH",
    description: "إصابة قديمة متجددة تسبب ألماً عند ثني الركبة بزاوية حادة أكثر من 90 درجة مع أوزان ثقيلة",
    restrictedMuscles: ["LEGS"],
    restrictedExercises: ["Barbell Back Squat", "Leg Press", "Jump Squats"],
    isActive: true,
    notes: "يُمنع أداء السكوات العميق بالأوزان الثقيلة، واستبداله بتمرين Leg Extension خفيف و Romanian Deadlift"
  },
  {
    id: "med-2",
    clientId: "client-2",
    conditionName: "إجهاد عضلي حاد بأسفل الظهر (Lumbar Strain)",
    bodyPart: "LOWER_BACK",
    severity: "MEDIUM",
    description: "ألم خفيف أسفل الظهر عند ثني الجذع تحت حمل محوري",
    restrictedMuscles: ["LOWER_BACK"],
    restrictedExercises: ["Conventional Deadlift", "Bent Over Barbell Row"],
    isActive: true,
    notes: "الحرص على دعم الظهر وتمارين الثبات الكور (Plank & Bird Dog)"
  }
];

export const initialMeasurements: ClientMeasurementHistory[] = [
  {
    id: "m-1",
    clientId: "client-1",
    date: "2026-08-01",
    weightKg: 95.0,
    heightCm: 178,
    bmi: 30.0,
    bodyFatPercentage: 28.0,
    muscleMassKg: 32.0,
    waistCm: 105.0,
    chestCm: 110.0,
    armsCm: 37.0,
    thighCm: 64.0,
    notes: "قياس البداية - الهدف خسارة 13 كجم دهون"
  },
  {
    id: "m-2",
    clientId: "client-1",
    date: "2026-08-15",
    weightKg: 93.0,
    heightCm: 178,
    bmi: 29.4,
    bodyFatPercentage: 27.0,
    muscleMassKg: 32.5,
    waistCm: 102.0,
    chestCm: 109.0,
    armsCm: 37.2,
    thighCm: 63.0,
    notes: "تحسن ملحوظ في قياس الخصر ونسبة الدهون"
  },
  {
    id: "m-3",
    clientId: "client-1",
    date: "2026-09-01",
    weightKg: 91.0,
    heightCm: 178,
    bmi: 28.7,
    bodyFatPercentage: 25.0,
    muscleMassKg: 33.0,
    waistCm: 99.0,
    chestCm: 108.5,
    armsCm: 37.5,
    thighCm: 61.5,
    notes: "زيادة نصف كجم عضلات ونزول 2 كجم دهون إضافية!"
  }
];

export const initialGoals: ClientGoal[] = [
  {
    id: "goal-1",
    clientId: "client-1",
    goalType: "WEIGHT_LOSS",
    title: "خسارة الوزن والوصول للوزن المثالي 82 كجم",
    startingValue: 95.0,
    targetValue: 82.0,
    currentValue: 91.0,
    unit: "KG",
    deadline: "2026-12-31",
    status: "IN_PROGRESS"
  },
  {
    id: "goal-2",
    clientId: "client-1",
    goalType: "GENERAL_FITNESS",
    title: "خفض نسبة الدهون في الجسم إلى 18%",
    startingValue: 28.0,
    targetValue: 18.0,
    currentValue: 25.0,
    unit: "%",
    deadline: "2026-12-31",
    status: "IN_PROGRESS"
  },
  {
    id: "goal-3",
    clientId: "client-2",
    goalType: "MUSCLE_GAIN",
    title: "زيادة الوزن العضلي من 76 كجم إلى 82 كجم",
    startingValue: 76.0,
    targetValue: 82.0,
    currentValue: 78.0,
    unit: "KG",
    deadline: "2026-11-30",
    status: "IN_PROGRESS"
  }
];

export const initialProgressPhotos: ClientProgressPhoto[] = [
  {
    id: "photo-1",
    clientId: "client-1",
    date: "2026-08-01",
    frontImageUrl: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=500",
    sideImageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500",
    backImageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500",
    weightAtTime: 95.0,
    notes: "صور اليوم الأول قبل بدء البرنامج"
  },
  {
    id: "photo-2",
    clientId: "client-1",
    date: "2026-08-22",
    frontImageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500",
    sideImageUrl: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500",
    backImageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500",
    weightAtTime: 91.0,
    notes: "صور بعد 3 أسابيع - تغير واضح في محيط الخصر وبروز عضلات الصدر والأكتاف"
  }
];

export const initialClientNotes: ClientNote[] = [
  {
    id: "note-1",
    clientId: "client-1",
    authorId: "user-coach-1",
    noteType: "PRIVATE_COACH",
    content: "اللاعب ملتزم جداً ولديه استجابة سريعة لتمارين الجزء العلوي، نحتاج التركيز على استقرار الركبة اليمنى في تمارين الأرجل.",
    createdAt: "2026-08-18T14:30:00.000Z"
  },
  {
    id: "note-2",
    clientId: "client-1",
    authorId: "user-coach-3",
    noteType: "PUBLIC_CLIENT",
    content: "عاش يا محمد! نزول 4 كجم في الشهر الأول مؤشر رائع، استمر في شرب الماء والالتزام بوجبة ما بعد التمرين.",
    createdAt: "2026-08-20T10:00:00.000Z"
  }
];
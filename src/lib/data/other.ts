import {
  ClientAssessment,
  SessionCalendar,
  MealPlan,
  Membership,
  AuditLog,
  Notification
} from "@/types";

export const initialAssessments: ClientAssessment[] = [
  {
    id: "assess-1",
    clientId: "client-1",
    coachId: "coach-1",
    date: "2026-08-01",
    title: "التقييم البدني الدوري الأول (Baseline)",
    pushupsCount: 22,
    pullupsCount: 4,
    plankSeconds: 45,
    runningKmTimeSec: 360,
    flexibilityScore: 6,
    vo2Max: 38.5,
    coachNotes: "اللياقة الأساسية جيدة لكن تحتاج رفع قوة الجزء العلوي وثبات الكور"
  },
  {
    id: "assess-2",
    clientId: "client-1",
    coachId: "coach-1",
    date: "2026-08-22",
    title: "التقييم البدني الدوري الثاني (شهر بعد التدريب)",
    pushupsCount: 34,
    pullupsCount: 8,
    plankSeconds: 85,
    runningKmTimeSec: 300,
    flexibilityScore: 8,
    vo2Max: 43.2,
    coachNotes: "تطور هائل! زيادة 54% في الضغط، تضاعف العقلة، وزيادة دقيقة كاملة في البلانك 🏆"
  }
];

export const initialCalendars: SessionCalendar[] = [
  {
    id: "sess-1",
    coachId: "coach-1",
    sportId: "sport-1",
    title: "جلسة تدريب فردي (PT) - محمد إبراهيم",
    sessionType: "INDIVIDUAL",
    startTime: "2026-08-23T18:00:00.000Z",
    endTime: "2026-08-23T19:00:00.000Z",
    location: "صالة الأوزان الحرة - المنطقة A",
    maxParticipants: 1,
    attendances: [
      {
        id: "att-1",
        sessionId: "sess-1",
        clientId: "client-1",
        status: "PRESENT"
      }
    ]
  },
  {
    id: "sess-2",
    coachId: "coach-2",
    sportId: "sport-2",
    title: "حصة كروس فيت جماعية (CrossFit Group A)",
    sessionType: "GROUP",
    startTime: "2026-08-23T19:30:00.000Z",
    endTime: "2026-08-23T20:30:00.000Z",
    location: "صالة التدريب الوظيفي (CrossFit Box)",
    maxParticipants: 10,
    attendances: [
      {
        id: "att-2",
        sessionId: "sess-2",
        clientId: "client-2",
        status: "PRESENT"
      },
      {
        id: "att-3",
        sessionId: "sess-2",
        clientId: "client-4",
        status: "EXCUSED",
        notes: "إجازة سفر"
      }
    ]
  }
];

export const initialMealPlans: MealPlan[] = [
  {
    id: "meal-1",
    clientId: "client-1",
    coachId: "coach-3",
    title: "نظام التنشيف وخسارة الدهون عالي البروتين (High-Protein Cut)",
    dailyCalories: 2100,
    proteinGrams: 180,
    carbsGrams: 190,
    fatsGrams: 55,
    waterLiters: 3.5,
    breakfast: "4 بياض بيض + 1 بيضة كاملة + 60 جم شوفان مع حليب لوز وقرفة + قهوة بدون سكر",
    lunch: "200 جم صدور دجاج مشوية + 150 جم أرز بسمتي مسلوق + طبق سلطة خضراء مع زيت زيتون ملعقة صغيرة",
    dinner: "180 جم تونة مصفاة أو سلمون + بطاطا حلوة مشوية 120 جم + خضار سوتيه بروكلي وفاصوليا",
    snacks: "سكوب واي بروتين مع ماء + 20 جم لوز نيء + تفاحة خضراء قبل التمرين",
    notes: "شرب نصف لتر ماء عند الاستيقاظ وقبل كل وجبة",
    isActive: true
  }
];

export const initialMemberships: Membership[] = [
  {
    id: "mem-1",
    clientId: "client-1",
    planType: "THREE_MONTHS",
    startDate: "2026-08-01",
    endDate: "2026-11-01",
    totalAmount: 4500,
    paidAmount: 4500,
    remainingAmount: 0,
    paymentStatus: "PAID",
    paymentMethod: "InstaPay / Visa",
    notes: "باقة التدريب الشخصي VIP والمتابعة الغذائية"
  },
  {
    id: "mem-2",
    clientId: "client-2",
    planType: "MONTHLY",
    startDate: "2026-08-15",
    endDate: "2026-09-15",
    totalAmount: 1800,
    paidAmount: 1000,
    remainingAmount: 800,
    paymentStatus: "PARTIAL",
    paymentMethod: "Vodafone Cash",
    notes: "متبقي 800 جنيه تدفع خلال 7 أيام"
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: "audit-1",
    userId: "user-coach-1",
    userName: "كابتن علي منصور",
    userRole: "COACH",
    action: "UPDATE_MEASUREMENT",
    entityType: "ClientMeasurementHistory",
    entityId: "m-3",
    oldValues: "Weight: 93.0 KG, Fat: 27%",
    newValues: "Weight: 91.0 KG, Fat: 25%",
    ipAddress: "197.35.120.45",
    createdAt: "2026-08-22T20:31:00.000Z"
  },
  {
    id: "audit-2",
    userId: "user-admin",
    userName: "أحمد الجزار",
    userRole: "ADMIN",
    action: "ASSIGN_COACH",
    entityType: "ClientCoachAssignment",
    entityId: "assign-3",
    oldValues: "None",
    newValues: "Coach: Mahmoud Samir (Assistant) assigned to Client: Mohamed Ibrahim",
    ipAddress: "197.35.120.10",
    createdAt: "2026-08-22T19:15:00.000Z"
  },
  {
    id: "audit-3",
    userId: "user-coach-1",
    userName: "كابتن علي منصور",
    userRole: "COACH",
    action: "ADD_MEDICAL_RESTRICTION",
    entityType: "ClientMedicalRestriction",
    entityId: "med-1",
    oldValues: "None",
    newValues: "Condition: Knee Meniscus Tear, Severity: HIGH, Restricted: Squat, Leg Press",
    ipAddress: "197.35.120.45",
    createdAt: "2026-08-22T18:00:00.000Z"
  }
];

export const initialNotifications: Notification[] = [
  {
    id: "notif-1",
    userId: "user-client-1",
    title: "تمرين اليوم جاهز!",
    message: "تم تعيين تمرين 'الجزء العلوي - قوة وتضخيم' لك اليوم من كابتن علي.",
    type: "WORKOUT",
    read: false,
    link: "/workout/assign-wo-1/execute",
    createdAt: "2026-08-23T08:00:00.000Z"
  },
  {
    id: "notif-2",
    userId: "user-coach-1",
    title: "تنبيه إصابة نشطة ⚠",
    message: "المتدرب محمد إبراهيم لديه محذور نشط في الركبة اليمنى.",
    type: "ALERT",
    read: false,
    link: "/clients/client-1",
    createdAt: "2026-08-22T18:00:00.000Z"
  }
];
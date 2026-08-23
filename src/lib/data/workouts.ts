import {
  WorkoutTemplate,
  TrainingProgram,
  ClientWorkoutAssignment,
  WorkoutLog
} from "@/types";
import { initialExercises } from "./exercises";

export const initialTemplates: WorkoutTemplate[] = [
  {
    id: "tpl-upper-body",
    titleAr: "تمرين الجزء العلوي - قوة وتضخيم (Upper Body Blast)",
    titleEn: "Upper Body Power & Hypertrophy",
    descriptionAr: "تمرين متكامل لعضلات الصدر والظهر والأكتاف والذراعين",
    descriptionEn: "Complete upper body routine targeting chest, back, shoulders and arms",
    sportId: "sport-1",
    difficulty: "INTERMEDIATE",
    creatorId: "coach-1",
    createdAt: "2026-02-01T10:00:00.000Z",
    exercises: [
      {
        id: "tple-1",
        templateId: "tpl-upper-body",
        exerciseId: "ex-bench",
        exercise: initialExercises[1],
        orderIndex: 1,
        targetSets: 4,
        targetReps: "8-10",
        targetWeightKg: 60.0,
        restSeconds: 90,
        notes: "الإحماء أولاً ثم زيادة الوزن تدريجياً"
      },
      {
        id: "tple-2",
        templateId: "tpl-upper-body",
        exerciseId: "ex-lat-pulldown",
        exercise: initialExercises[3],
        orderIndex: 2,
        targetSets: 4,
        targetReps: "10-12",
        targetWeightKg: 50.0,
        restSeconds: 60,
        notes: "التركيز على السحب بالكوعين"
      },
      {
        id: "tple-3",
        templateId: "tpl-upper-body",
        exerciseId: "ex-shoulder-press",
        exercise: initialExercises[4],
        orderIndex: 3,
        targetSets: 3,
        targetReps: "10-12",
        targetWeightKg: 18.0,
        restSeconds: 60,
        notes: "دمبلز 18 كجم لكل يد"
      },
      {
        id: "tple-4",
        templateId: "tpl-upper-body",
        exerciseId: "ex-plank",
        exercise: initialExercises[7],
        orderIndex: 4,
        targetSets: 3,
        targetTimeSeconds: 60,
        restSeconds: 45,
        notes: "ثبات 60 ثانية لكل جولة"
      }
    ]
  },
  {
    id: "tpl-cardio-run",
    titleAr: "تمرين التحمل القلبي - جري 5 كم فترات",
    titleEn: "5K Interval Running Session",
    descriptionAr: "جلسة جري لتحسين السرعة والتحمل وحرق الدهون",
    descriptionEn: "Cardio interval running session for pace optimization and fat burn",
    sportId: "sport-3",
    difficulty: "INTERMEDIATE",
    creatorId: "coach-2",
    createdAt: "2026-02-05T10:00:00.000Z",
    exercises: [
      {
        id: "tple-5",
        templateId: "tpl-cardio-run",
        exerciseId: "ex-running-5k",
        exercise: initialExercises[5],
        orderIndex: 1,
        targetDistanceKm: 5.0,
        targetTimeSeconds: 1500,
        targetPace: "5:00 min/km",
        notes: "وتيرة 5 دقائق لكل كيلومتر"
      }
    ]
  }
];

export const initialPrograms: TrainingProgram[] = [
  {
    id: "prog-12w-fatloss",
    titleAr: "برنامج حرق الدهون وشد القوام - 12 أسبوع (12-Week Fat Loss)",
    titleEn: "12-Week Complete Fat Loss & Shred Program",
    descriptionAr: "برنامج تدريبي مدروس يدمج تمارين المقاومة والكارديو والتغذية لنزول الدهون والحفاظ على الكتلة العضلية",
    descriptionEn: "Structured 12-week regimen combining hypertrophy, HIIT cardio, and nutritional deficit",
    durationWeeks: 12,
    sportId: "sport-1",
    goalType: "WEIGHT_LOSS",
    difficulty: "INTERMEDIATE",
    creatorId: "coach-1",
    isTemplate: true,
    createdAt: "2026-02-01T00:00:00.000Z",
    weeks: [
      {
        id: "w-1",
        programId: "prog-12w-fatloss",
        weekNumber: 1,
        focusAr: "الأسبوع الأول: التكيف العضلي ورفع معدل الحرق",
        focusEn: "Week 1: Neuromuscular adaptation & metabolic kickstart",
        days: [
          {
            id: "d-1",
            weekId: "w-1",
            dayNumber: 1,
            titleAr: "اليوم الأول: الجزء العلوي قوة",
            titleEn: "Day 1: Upper Body Power",
            isRestDay: false,
            workouts: [
              {
                id: "pw-1",
                dayId: "d-1",
                templateId: "tpl-upper-body",
                template: initialTemplates[0],
                orderIndex: 1
              }
            ]
          },
          {
            id: "d-2",
            weekId: "w-1",
            dayNumber: 2,
            titleAr: "اليوم الثاني: كارديو وجري 5 كم",
            titleEn: "Day 2: Cardio & 5K Run",
            isRestDay: false,
            workouts: [
              {
                id: "pw-2",
                dayId: "d-2",
                templateId: "tpl-cardio-run",
                template: initialTemplates[1],
                orderIndex: 1
              }
            ]
          }
        ]
      }
    ]
  }
];

export const initialAssignments: ClientWorkoutAssignment[] = [
  {
    id: "assign-wo-1",
    clientId: "client-1",
    coachId: "coach-1",
    templateId: "tpl-upper-body",
    template: initialTemplates[0],
    scheduledDate: "2026-08-23",
    status: "SCHEDULED",
    coachNotes: "ركز على التحكم في النزول (Tempo 3-1-1) ولا تنسَ تنبيه الركبة ⚠"
  },
  {
    id: "assign-wo-2",
    clientId: "client-1",
    coachId: "coach-2",
    templateId: "tpl-cardio-run",
    template: initialTemplates[1],
    scheduledDate: "2026-08-21",
    status: "COMPLETED",
    completedAt: "2026-08-21T18:45:00.000Z",
    coachNotes: "أداء ممتاز للجري وحرق 420 سعرة حرارية"
  }
];

export const initialWorkoutLogs: WorkoutLog[] = [
  {
    id: "wlog-1",
    assignmentId: "assign-wo-2",
    clientId: "client-1",
    coachId: "coach-2",
    startedAt: "2026-08-21T18:00:00.000Z",
    completedAt: "2026-08-21T18:35:00.000Z",
    durationMinutes: 35,
    overallRpe: 8,
    clientFeedback: "شعرت بنشاط عالي وحققت أفضل زمن للجري 5 كم في 25 دقيقة!",
    coachFeedback: "ممتاز جداً يا محمد، التزامك بالسرعة والنبض كان نموذجياً.",
    isCompleted: true,
    exercises: [
      {
        id: "wex-1",
        workoutLogId: "wlog-1",
        exerciseId: "ex-running-5k",
        exercise: initialExercises[5],
        sets: [
          {
            id: "set-1",
            setNumber: 1,
            actualDistanceKm: 5.0,
            actualTimeSeconds: 1510,
            actualRpe: 8,
            isCompleted: true
          }
        ]
      }
    ]
  }
];
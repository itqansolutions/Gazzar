import { Sport, MuscleGroup, Equipment } from "@/types";

export const initialSports: Sport[] = [
  {
    id: "sport-1",
    nameAr: "كمال الأجسام واللياقة البدنية",
    nameEn: "Bodybuilding & Fitness",
    icon: "Dumbbell",
    descriptionAr: "بناء العضلات، زيادة القوة، وخفض نسبة الدهون",
    descriptionEn: "Muscle hypertrophy, strength building, and fat loss",
    categories: ["Hypertrophy", "Strength", "Fat Loss"]
  },
  {
    id: "sport-2",
    nameAr: "كروس فيت والتدريب الوظيفي",
    nameEn: "CrossFit & Functional Training",
    icon: "Flame",
    descriptionAr: "تمارين عالية الكثافة وتدريبات القوة الوظيفية",
    descriptionEn: "High-intensity functional conditioning and WODs",
    categories: ["WOD", "Endurance", "Gymnastics"]
  },
  {
    id: "sport-3",
    nameAr: "الجري واللياقة القلبية",
    nameEn: "Running & Athletics",
    icon: "Activity",
    descriptionAr: "تمارين الجري للمسافات وتحسين التحمل والسرعة",
    descriptionEn: "Distance running, pace workouts, and endurance",
    categories: ["Sprint", "5K/10K", "Marathon"]
  },
  {
    id: "sport-4",
    nameAr: "السباحة",
    nameEn: "Swimming",
    icon: "Waves",
    descriptionAr: "تدريبات السباحة بأنواعها والتحمل المائي",
    descriptionEn: "Freestyle, breaststroke, butterfly and aquatic conditioning",
    categories: ["Freestyle", "Backstroke", "Endurance Laps"]
  },
  {
    id: "sport-5",
    nameAr: "الملاكمة والفنون القتالية",
    nameEn: "Boxing & Combat Sports",
    icon: "Shield",
    descriptionAr: "تدريبات اللياقة القتالية، السرعة، وردود الأفعال",
    descriptionEn: "Boxing drills, footwork, shadowboxing and bag work",
    categories: ["Boxing", "Kickboxing", "Conditioning"]
  },
  {
    id: "sport-6",
    nameAr: "كرة القدم",
    nameEn: "Football / Soccer",
    icon: "Trophy",
    descriptionAr: "اللياقة البدنية للاعبي كرة القدم والرشاقة",
    descriptionEn: "Agility, match endurance, speed and sprint drills",
    categories: ["Agility", "Match Conditioning", "Sprint Speed"]
  }
];

export const initialMuscleGroups: MuscleGroup[] = [
  { id: "mg-chest", nameAr: "الصدر", nameEn: "Chest", code: "CHEST" },
  { id: "mg-back", nameAr: "الظهر", nameEn: "Back", code: "BACK" },
  { id: "mg-legs", nameAr: "الأرجل والفخذين", nameEn: "Legs & Quads", code: "LEGS" },
  { id: "mg-shoulders", nameAr: "الأكتاف", nameEn: "Shoulders", code: "SHOULDERS" },
  { id: "mg-arms", nameAr: "الذراعين (بايسبس وترايسبس)", nameEn: "Arms (Biceps & Triceps)", code: "ARMS" },
  { id: "mg-core", nameAr: "عضلات البطن والكور", nameEn: "Abs & Core", code: "CORE" },
  { id: "mg-cardio", nameAr: "اللياقة القلبية والتنفسية", nameEn: "Cardiovascular", code: "CARDIO" }
];

export const initialEquipment: Equipment[] = [
  { id: "eq-barbell", nameAr: "البار الأولمبي والأوزان", nameEn: "Barbell & Plates" },
  { id: "eq-dumbbell", nameAr: "الدمبلز", nameEn: "Dumbbells" },
  { id: "eq-machine", nameAr: "الأجهزة والكيبل", nameEn: "Gym Machines & Cables" },
  { id: "eq-bodyweight", nameAr: "وزن الجسم", nameEn: "Bodyweight" },
  { id: "eq-bands", nameAr: "أحبال المقاومة", nameEn: "Resistance Bands" },
  { id: "eq-kettlebell", nameAr: "الكاتل بل (Kettlebell)", nameEn: "Kettlebell" },
  { id: "eq-treadmill", nameAr: "جهاز المشي / المضمار", nameEn: "Treadmill / Track" },
  { id: "eq-pool", nameAr: "حمام السباحة", nameEn: "Swimming Pool" }
];
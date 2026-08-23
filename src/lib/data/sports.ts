import { Sport, MuscleGroup, Equipment } from "@/types";

export const initialSports: Sport[] = [];

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
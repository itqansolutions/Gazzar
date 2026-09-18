import { Sport, MuscleGroup, Equipment } from "@/types";

export const initialSports: Sport[] = [
  {
    id: "sport-bodybuilding",
    nameAr: "كمال أجسام وبناء عضلات",
    nameEn: "Bodybuilding",
    icon: "🏋️‍♂️",
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500",
    descriptionAr: "برامج تضخيم وتنشيف وتشكيل العضلات ورفع الأوزان",
    descriptionEn: "Hypertrophy, definition, and strength training",
    categories: ["قوة بدنية", "أوزان"]
  },
  {
    id: "sport-fitness",
    nameAr: "لياقة بدنية وتخسيس",
    nameEn: "Fitness & Conditioning",
    icon: "💪",
    imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500",
    descriptionAr: "تمارين شاملة لرفع اللياقة والرشاقة وحرق الدهون",
    descriptionEn: "Full-body functional training and fat loss",
    categories: ["لياقة", "حرق دهون"]
  },
  {
    id: "sport-crossfit",
    nameAr: "كروس فيت",
    nameEn: "CrossFit",
    icon: "⚡",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500",
    descriptionAr: "تمارين عالية الكثافة وسرعة واستجابة بدنية",
    descriptionEn: "High-intensity functional movements and conditioning",
    categories: ["تحمل", "سرعة"]
  },
  {
    id: "sport-nutrition",
    nameAr: "تغذية رياضية",
    nameEn: "Sports Nutrition",
    icon: "🥗",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500",
    descriptionAr: "أنظمة غذائية مخصصة واستشفاء عضلي وقياسات",
    descriptionEn: "Custom meal planning and athlete nutrition",
    categories: ["تغذية", "صحة"]
  },
  {
    id: "sport-boxing",
    nameAr: "ملاكمة وفنون قتالية",
    nameEn: "Boxing & Combat",
    icon: "🥊",
    imageUrl: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=500",
    descriptionAr: "تدريب الملاكمة والدفاع عن النفس واللياقة القتالية",
    descriptionEn: "Boxing drills, self-defense, and combat agility",
    categories: ["قتال", "رشاقة"]
  },
  {
    id: "sport-swimming",
    nameAr: "سباحة",
    nameEn: "Swimming",
    icon: "🏊‍♂️",
    imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=500",
    descriptionAr: "تدريبات السباحة وتحسين النفس والمرونة",
    descriptionEn: "Cardio endurance, technique, and low-impact conditioning",
    categories: ["ماء", "تحمل"]
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
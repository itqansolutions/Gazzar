import { Sport, MuscleGroup, Equipment } from "@/types";

export const initialSports: Sport[] = [
  {
    id: "sport-bodybuilding",
    nameAr: "Bodybuilding",
    nameEn: "Bodybuilding",
    icon: "🏋️‍♂️",
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500",
    descriptionAr: "Hypertrophy, muscle definition, and strength training",
    descriptionEn: "Hypertrophy, definition, and strength training",
    categories: ["Strength", "Weights"]
  },
  {
    id: "sport-fitness",
    nameAr: "Fitness & Conditioning",
    nameEn: "Fitness & Conditioning",
    icon: "💪",
    imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500",
    descriptionAr: "Full-body functional training, fitness, and fat loss",
    descriptionEn: "Full-body functional training and fat loss",
    categories: ["Fitness", "Fat Loss"]
  },
  {
    id: "sport-crossfit",
    nameAr: "CrossFit",
    nameEn: "CrossFit",
    icon: "⚡",
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500",
    descriptionAr: "High-intensity functional movements and conditioning",
    descriptionEn: "High-intensity functional movements and conditioning",
    categories: ["Endurance", "Speed"]
  },
  {
    id: "sport-nutrition",
    nameAr: "Sports Nutrition",
    nameEn: "Sports Nutrition",
    icon: "🥗",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500",
    descriptionAr: "Custom meal planning and athlete nutrition",
    descriptionEn: "Custom meal planning and athlete nutrition",
    categories: ["Nutrition", "Health"]
  },
  {
    id: "sport-boxing",
    nameAr: "Boxing & Combat",
    nameEn: "Boxing & Combat",
    icon: "🥊",
    imageUrl: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=500",
    descriptionAr: "Boxing drills, self-defense, and combat agility",
    descriptionEn: "Boxing drills, self-defense, and combat agility",
    categories: ["Combat", "Agility"]
  },
  {
    id: "sport-swimming",
    nameAr: "Swimming",
    nameEn: "Swimming",
    icon: "🏊‍♂️",
    imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=500",
    descriptionAr: "Cardio endurance, swimming technique, and conditioning",
    descriptionEn: "Cardio endurance, technique, and low-impact conditioning",
    categories: ["Water", "Endurance"]
  }
];

export const initialMuscleGroups: MuscleGroup[] = [
  { id: "mg-chest", nameAr: "Chest", nameEn: "Chest", code: "CHEST" },
  { id: "mg-back", nameAr: "Back", nameEn: "Back", code: "BACK" },
  { id: "mg-legs", nameAr: "Legs & Quads", nameEn: "Legs & Quads", code: "LEGS" },
  { id: "mg-shoulders", nameAr: "Shoulders", nameEn: "Shoulders", code: "SHOULDERS" },
  { id: "mg-arms", nameAr: "Arms (Biceps & Triceps)", nameEn: "Arms (Biceps & Triceps)", code: "ARMS" },
  { id: "mg-core", nameAr: "Abs & Core", nameEn: "Abs & Core", code: "CORE" },
  { id: "mg-cardio", nameAr: "Cardiovascular", nameEn: "Cardiovascular", code: "CARDIO" }
];

export const initialEquipment: Equipment[] = [
  { id: "eq-barbell", nameAr: "Barbell & Plates", nameEn: "Barbell & Plates" },
  { id: "eq-dumbbell", nameAr: "Dumbbells", nameEn: "Dumbbells" },
  { id: "eq-machine", nameAr: "Gym Machines & Cables", nameEn: "Gym Machines & Cables" },
  { id: "eq-bodyweight", nameAr: "Bodyweight", nameEn: "Bodyweight" },
  { id: "eq-bands", nameAr: "Resistance Bands", nameEn: "Resistance Bands" },
  { id: "eq-kettlebell", nameAr: "Kettlebell", nameEn: "Kettlebell" },
  { id: "eq-treadmill", nameAr: "Treadmill / Track", nameEn: "Treadmill / Track" },
  { id: "eq-pool", nameAr: "Swimming Pool", nameEn: "Swimming Pool" }
];
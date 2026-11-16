const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * GX Fitness Academy — System Seed
 * Production/Clean Seed: Contains ONLY canonical lookup dictionaries (Muscle Groups & Equipment)
 * and an initial Admin bootstrap for completely fresh/empty environments.
 * All demo sports and demo exercises have been removed.
 */

const initialMuscleGroups = [
  { id: "mg-chest", nameAr: "Chest", nameEn: "Chest", code: "CHEST" },
  { id: "mg-back", nameAr: "Back", nameEn: "Back", code: "BACK" },
  { id: "mg-legs", nameAr: "Legs & Quads", nameEn: "Legs & Quads", code: "LEGS" },
  { id: "mg-shoulders", nameAr: "Shoulders", nameEn: "Shoulders", code: "SHOULDERS" },
  { id: "mg-arms", nameAr: "Arms (Biceps & Triceps)", nameEn: "Arms (Biceps & Triceps)", code: "ARMS" },
  { id: "mg-core", nameAr: "Abs & Core", nameEn: "Abs & Core", code: "CORE" },
  { id: "mg-cardio", nameAr: "Cardiovascular", nameEn: "Cardiovascular", code: "CARDIO" }
];

const initialEquipment = [
  { id: "eq-barbell", nameAr: "Barbell & Plates", nameEn: "Barbell & Plates" },
  { id: "eq-dumbbell", nameAr: "Dumbbells", nameEn: "Dumbbells" },
  { id: "eq-machine", nameAr: "Gym Machines & Cables", nameEn: "Gym Machines & Cables" },
  { id: "eq-bodyweight", nameAr: "Bodyweight", nameEn: "Bodyweight" },
  { id: "eq-bands", nameAr: "Resistance Bands", nameEn: "Resistance Bands" },
  { id: "eq-kettlebell", nameAr: "Kettlebell", nameEn: "Kettlebell" },
  { id: "eq-treadmill", nameAr: "Treadmill / Track", nameEn: "Treadmill / Track" },
  { id: "eq-pool", nameAr: "Swimming Pool", nameEn: "Swimming Pool" }
];

async function main() {
  console.log("[SEED] Initializing GX Canonical Lookup Dictionaries...");

  try {
    // 1. Reference lookup tables: Muscle Groups (safe idempotent catalog dictionaries)
    console.log("[SEED] Upserting canonical muscle groups...");
    for (const mg of initialMuscleGroups) {
      await prisma.muscleGroup.upsert({
        where: { code: mg.code },
        update: { nameAr: mg.nameAr, nameEn: mg.nameEn },
        create: mg
      });
    }

    // 2. Reference lookup tables: Equipment
    console.log("[SEED] Upserting canonical equipment...");
    for (const eq of initialEquipment) {
      await prisma.equipment.upsert({
        where: { id: eq.id },
        update: { nameAr: eq.nameAr, nameEn: eq.nameEn },
        create: eq
      });
    }

    // 3. Admin Account Bootstrap
    // Rationale: Required ONLY when spinning up a completely empty database instance (e.g., fresh CI, fresh staging)
    // so administrators can log in to initialize sports, coaches, and academy settings.
    // If ANY user already exists in the database, this step is strictly skipped to never overwrite existing credentials.
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("[SEED] Fresh database detected. Bootstrapping default initial ADMIN account (admin@gx.com)...");
      const passwordHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";
      await prisma.user.create({
        data: {
          email: "admin@gx.com",
          name: "Abdullah Elgazzar",
          passwordHash,
          role: "ADMIN"
        }
      });
      console.log("[SEED] Default admin created successfully.");
    } else {
      console.log(`[SEED] Existing database detected (${userCount} user(s) present). Skipping admin bootstrap.`);
    }

    console.log("[SEED] Canonical lookup dictionaries synchronized successfully. No demo data seeded.");
  } catch (err) {
    console.error("[SEED] Error during database initialization:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
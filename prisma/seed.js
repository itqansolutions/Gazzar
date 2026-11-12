const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const initialSports = [
  {
    id: "sport-bodybuilding",
    nameAr: "Bodybuilding",
    nameEn: "Bodybuilding",
    icon: "🏋️‍♂️",
    descriptionAr: "Hypertrophy, muscle definition, and strength training",
    descriptionEn: "Hypertrophy, definition, and strength training",
    categories: ["Strength", "Weights"]
  },
  {
    id: "sport-fitness",
    nameAr: "Fitness & Conditioning",
    nameEn: "Fitness & Conditioning",
    icon: "💪",
    descriptionAr: "Full-body functional training, fitness, and fat loss",
    descriptionEn: "Full-body functional training and fat loss",
    categories: ["Fitness", "Fat Loss"]
  },
  {
    id: "sport-crossfit",
    nameAr: "CrossFit",
    nameEn: "CrossFit",
    icon: "⚡",
    descriptionAr: "High-intensity functional movements and conditioning",
    descriptionEn: "High-intensity functional movements and conditioning",
    categories: ["Endurance", "Speed"]
  },
  {
    id: "sport-nutrition",
    nameAr: "Sports Nutrition",
    nameEn: "Sports Nutrition",
    icon: "🥗",
    descriptionAr: "Custom meal planning and athlete nutrition",
    descriptionEn: "Custom meal planning and athlete nutrition",
    categories: ["Nutrition", "Health"]
  },
  {
    id: "sport-boxing",
    nameAr: "Boxing & Combat",
    nameEn: "Boxing & Combat",
    icon: "🥊",
    descriptionAr: "Boxing drills, self-defense, and combat agility",
    descriptionEn: "Boxing drills, self-defense, and combat agility",
    categories: ["Combat", "Agility"]
  },
  {
    id: "sport-swimming",
    nameAr: "Swimming",
    nameEn: "Swimming",
    icon: "🏊‍♂️",
    descriptionAr: "Cardio endurance, swimming technique, and conditioning",
    descriptionEn: "Cardio endurance, technique, and low-impact conditioning",
    categories: ["Water", "Endurance"]
  }
];

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
  const allowDemoSeed =
    process.argv.includes("--demo") ||
    process.env.SEED_DEMO_DATA === "true";

  console.log("[SEED] Initializing GX Database Seed...");

  try {
    // Reference lookup tables (safe idempotent catalog dictionaries)
    console.log("[SEED] Verifying reference muscle groups and equipment...");
    for (const mg of initialMuscleGroups) {
      await prisma.muscleGroup.upsert({
        where: { code: mg.code },
        update: { nameAr: mg.nameAr, nameEn: mg.nameEn },
        create: mg
      });
    }

    for (const eq of initialEquipment) {
      await prisma.equipment.upsert({
        where: { id: eq.id },
        update: { nameAr: eq.nameAr, nameEn: eq.nameEn },
        create: eq
      });
    }

    const [userCount, sportCount, exerciseCount] = await Promise.all([
      prisma.user.count(),
      prisma.sport.count(),
      prisma.exercise.count()
    ]);

    const isFreshEmptyDatabase = userCount === 0 && sportCount === 0 && exerciseCount === 0;

    if (!allowDemoSeed && !isFreshEmptyDatabase) {
      console.log(
        `[SEED] Skipping demo sports/exercises/admin on initialized database (users=${userCount}, sports=${sportCount}, exercises=${exerciseCount}). Pass --demo or SEED_DEMO_DATA=true to opt in.`
      );
      return;
    }

    // 1. Seed Demo Sports
    console.log("[SEED] Seeding demo sports...");
    for (const s of initialSports) {
      await prisma.sport.upsert({
        where: { id: s.id },
        update: {
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          icon: s.icon,
          descriptionAr: s.descriptionAr,
          descriptionEn: s.descriptionEn,
          categories: s.categories
        },
        create: s
      });
    }

    // 2. Seed/Verify Default Admin only if no ADMIN user exists (never overwrite existing admin password/profile)
    const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!existingAdmin) {
      console.log("[SEED] Creating initial ADMIN account (admin@gx.com)...");
      const passwordHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";
      await prisma.user.create({
        data: {
          email: "admin@gx.com",
          name: "Abdullah Elgazzar",
          passwordHash,
          role: "ADMIN"
        }
      });
    } else {
      console.log("[SEED] Existing ADMIN account detected; skipping default admin creation.");
    }

    // 3. Seed Demo Exercise Bank (+ ExerciseSport join rows)
    console.log("[SEED] Seeding demo exercise bank...");
    const initialExercises = [
      {
        id: "ex-bench-press",
        nameAr: "تمرين ضغط الصدر بالبار (Bench Press)",
        nameEn: "Barbell Bench Press",
        sportId: "sport-bodybuilding",
        primaryMuscleId: "mg-chest",
        equipmentId: "eq-barbell",
        difficulty: "INTERMEDIATE",
        metricType: "SETS_REPS_WEIGHT",
        descriptionAr: "التمرين الأساسي لبناء وتضخيم عضلات الصدر والقوة العلوية",
        descriptionEn: "The primary compound exercise for chest hypertrophy and upper-body strength",
        instructionsAr: "استلقِ على المقعد المسطح، امسك البار بقبضة أوسع قليلاً من عرض الكتفين، اخفض البار بتحكم حتى يلامس منتصف الصدر ثم ادفعه بقوة للأعلى",
        instructionsEn: "Lie flat on the bench, grip barbell slightly wider than shoulder width, lower controlled to mid-chest, and drive up explosively",
        coachTipsAr: "حافظ على ثبات الأقدام على الأرض وضم لوحي الكتف للخلف طوال الحركة",
        commonMistakesAr: "ارتداد البار عن القفص الصدري أو فتح الكوعين بشكل مبالغ فيه",
        contraindicatedBodyParts: ["SHOULDER", "WRIST"]
      },
      {
        id: "ex-incline-db-press",
        nameAr: "ضغط صدر مائل بالدمبل (Incline DB Press)",
        nameEn: "Incline Dumbbell Press",
        sportId: "sport-bodybuilding",
        primaryMuscleId: "mg-chest",
        equipmentId: "eq-dumbbell",
        difficulty: "INTERMEDIATE",
        metricType: "SETS_REPS_WEIGHT",
        descriptionAr: "استهداف الألياف العلوية لعضلة الصدر (Clavicular Head)",
        descriptionEn: "Targets upper chest fibers with natural rotational wrist freedom",
        instructionsAr: "اضبط المقعد بزاوية 30-45 درجة، ارفع الدمبلز للأعلى بتحكم واهبط حتى تشعر بتمدد كامل في الصدر العلوي",
        instructionsEn: "Set bench to 30-45 degrees, press dumbbells overhead, lower under control feeling full upper chest stretch",
        coachTipsAr: "لا تجعل زاوية المقعد أعلى من 45 درجة لتجنب تحويل الجهد للكتف الأمامي",
        commonMistakesAr: "تقويس الظهر بشكل زائد عن الحد",
        contraindicatedBodyParts: ["SHOULDER"]
      },
      {
        id: "ex-deadlift",
        nameAr: "الرفعة الميتة بالبار (Barbell Deadlift)",
        nameEn: "Barbell Deadlift",
        sportId: "sport-bodybuilding",
        primaryMuscleId: "mg-back",
        equipmentId: "eq-barbell",
        difficulty: "ADVANCED",
        metricType: "SETS_REPS_WEIGHT",
        descriptionAr: "أقوى تمرين لبناء السلسلة الخلفية وعضلات الظهر والأرجل",
        descriptionEn: "Ultimate compound movement for posterior chain, erectors, and grip strength",
        instructionsAr: "قف وقدميك بعرض الحوض، امسك البار، حافظ على استقامة العمود الفقري، ادفع الأرض بقدميك لرفع الوزن حتى وضع الوقوف التام",
        instructionsEn: "Stand hip-width, grip bar outside shins, lock lats and drive floor away keeping neutral spine",
        coachTipsAr: "تخيل أنك تدفع الأرض بعيداً بقدميك بدلاً من مجرد سحب البار بيديك",
        commonMistakesAr: "انحناء الظهر السفلي أثناء الرفع (Cat Back)",
        contraindicatedBodyParts: ["LOWER_BACK"]
      },
      {
        id: "ex-pullups",
        nameAr: "عقلة بوزن الجسم (Pull-Ups)",
        nameEn: "Bodyweight Pull-Ups",
        sportId: "sport-fitness",
        primaryMuscleId: "mg-back",
        equipmentId: "eq-bodyweight",
        difficulty: "INTERMEDIATE",
        metricType: "SETS_REPS_WEIGHT",
        descriptionAr: "بناء عرض الظهر (Lats) والقوة النسبية للجسم",
        descriptionEn: "Vertical pull compound movement building back width and relative bodyweight strength",
        instructionsAr: "امسك عارضة العقلة بقبضة أوسع من الكتفين، اسحب نفسك للأعلى حتى تتجاوز ذقنك العارضة، ثم انزل بتحكم كامل",
        instructionsEn: "Grip pull-up bar, initiate pull with scapular retraction, drive elbows down until chin clears bar",
        coachTipsAr: "ابدأ الحركة من لوحي الكتف وليس من الذراعين فقط",
        commonMistakesAr: "التأرجح واستخدام عزم الجسم بدلاً من قوة الظهر",
        contraindicatedBodyParts: ["SHOULDER", "ELBOW"]
      },
      {
        id: "ex-squat",
        nameAr: "سكوات خلفي بالبار (Barbell Back Squat)",
        nameEn: "Barbell Back Squat",
        sportId: "sport-bodybuilding",
        primaryMuscleId: "mg-legs",
        equipmentId: "eq-barbell",
        difficulty: "INTERMEDIATE",
        metricType: "SETS_REPS_WEIGHT",
        descriptionAr: "ملك تمارين الجزء السفلي لبناء الفخذين والأرداف والقوة البدنية",
        descriptionEn: "King of lower body exercises developing quadriceps, glutes, and core stability",
        instructionsAr: "ضع البار على عضلة الترابيس، خذ نفساً عميقاً واحبس الهواء في البطن، انزل بالورك للخلف والأسفل حتى يتوازى الفخذان مع الأرض ثم اصعد بقوة",
        instructionsEn: "Rest bar on upper traps, brace core, break at hips and knees, descend to parallel or deeper, drive through midfoot",
        coachTipsAr: "حافظ على توجيه الركبتين باتجاه أصابع القدمين أثناء الهبوط والصعود",
        commonMistakesAr: "انهيار الركبتين للداخل (Knee Valgus)",
        contraindicatedBodyParts: ["KNEE", "LOWER_BACK"]
      },
      {
        id: "ex-overhead-press",
        nameAr: "ضغط كتف عسكري بالبار (Overhead Press)",
        nameEn: "Overhead Barbell Press",
        sportId: "sport-bodybuilding",
        primaryMuscleId: "mg-shoulders",
        equipmentId: "eq-barbell",
        difficulty: "INTERMEDIATE",
        metricType: "SETS_REPS_WEIGHT",
        descriptionAr: "بناء كتل وقوة عضلات الكتف الأمامية والجانبية والثبات الأساسي",
        descriptionEn: "Standing vertical press developing shoulder caps, triceps, and standing core stiffness",
        instructionsAr: "قف بثبات، امسك البار عند عظام الترقوة، اضغط البار رأسياً للأعلى حتى فرد الذراعين بالكامل وثبات الرأس تحته",
        instructionsEn: "Grip at collarbones, press straight up moving head slightly back then push head forward at lockout",
        coachTipsAr: "شد عضلات البطن والمؤخرة بقوة لمنع تقوس أسفل الظهر",
        commonMistakesAr: "الميل الزائد للخلف وتحويل الحركة لتمرين صدر مائل",
        contraindicatedBodyParts: ["SHOULDER", "LOWER_BACK"]
      },
      {
        id: "ex-snatch",
        nameAr: "خطف أولمبي كروس فيت (CrossFit Snatch)",
        nameEn: "Olympic Snatch",
        sportId: "sport-crossfit",
        primaryMuscleId: "mg-legs",
        equipmentId: "eq-barbell",
        difficulty: "ADVANCED",
        metricType: "SETS_REPS_WEIGHT",
        descriptionAr: "رفع البار من الأرض مباشرة فوق الرأس في حركة واحدة متفجرة",
        descriptionEn: "Olympic weightlifting lift moving barbell from floor to overhead in one fluid explosive motion",
        instructionsAr: "قبضة عريضة (Snatch Grip)، سحب أول وثانٍ متفجر من الورك، ثم النزول السريع أسفل البار في وضع السكوات الكامل وتثبيته فوق الرأس",
        instructionsEn: "Wide hook grip, explosive triple extension at hips, drop underneath into full overhead squat",
        coachTipsAr: "السرعة والتوقيت والمرونة أهم بكثير من الوزن المرفوع",
        commonMistakesAr: "ثني الذراعين مبكراً قبل الامتداد الكامل للورك",
        contraindicatedBodyParts: ["SHOULDER", "WRIST", "LOWER_BACK"]
      },
      {
        id: "ex-kettlebell-swing",
        nameAr: "مرجحة الكيتل بيل (Kettlebell Swing)",
        nameEn: "Russian Kettlebell Swing",
        sportId: "sport-crossfit",
        primaryMuscleId: "mg-back",
        equipmentId: "eq-kettlebell",
        difficulty: "BEGINNER",
        metricType: "SETS_REPS_WEIGHT",
        descriptionAr: "تمرين مفصلي تفجيري للورك (Hip Hinge) لزيادة اللياقة والقدرة الانفجارية",
        descriptionEn: "Explosive hip-hinge conditioning builder targeting glutes, hamstrings, and cardiovascular capacity",
        instructionsAr: "اثنِ الورك للخلف، مرجح الكيتل بيل بين الفخذين، ثم ادفع بالورك للأمام بقوة لرفع الكيتل بيل لمستوى الصدر",
        instructionsEn: "Hinge at hips, swing bell between legs, snap hips violently forward driving bell to chest height",
        coachTipsAr: "الحركة تأتي 100% من دفع الورك والمؤخرة، وليست رفعاً بالذراعين",
        commonMistakesAr: "النزول في سكوات بدلاً من ثني الورك (Squatting instead of Hinging)",
        contraindicatedBodyParts: ["LOWER_BACK"]
      }
    ];

    for (const ex of initialExercises) {
      await prisma.exercise.upsert({
        where: { id: ex.id },
        update: {
          nameAr: ex.nameAr,
          nameEn: ex.nameEn,
          sportId: ex.sportId,
          primaryMuscleId: ex.primaryMuscleId,
          equipmentId: ex.equipmentId,
          difficulty: ex.difficulty,
          metricType: ex.metricType,
          descriptionAr: ex.descriptionAr,
          descriptionEn: ex.descriptionEn,
          instructionsAr: ex.instructionsAr,
          instructionsEn: ex.instructionsEn,
          coachTipsAr: ex.coachTipsAr,
          commonMistakesAr: ex.commonMistakesAr,
          contraindicatedBodyParts: ex.contraindicatedBodyParts
        },
        create: ex
      });

      await prisma.exerciseSport.upsert({
        where: {
          exerciseId_sportId: {
            exerciseId: ex.id,
            sportId: ex.sportId
          }
        },
        update: {},
        create: {
          exerciseId: ex.id,
          sportId: ex.sportId
        }
      });
    }

    console.log("[SEED] Database demo seed completed successfully!");
  } catch (err) {
    console.error("[SEED] Error during database initialization:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  console.log("=== DEMO SPORTS & EXERCISES REFERENCE AUDIT ===");

  const demoSportIds = [
    "sport-nutrition",
    "sport-swimming",
    "sport-fitness",
    "sport-bodybuilding",
    "sport-crossfit"
  ];

  console.log("\n--- DEMO SPORTS REFERENCE COUNTS ---");
  for (const sId of demoSportIds) {
    const s = await prisma.sport.findUnique({ where: { id: sId } });
    if (!s) {
      console.log(`Sport ${sId}: NOT FOUND in database`);
      continue;
    }
    const [exCount, exSportsCount, tmplCount, progCount, clientCount, sessionCount] = await Promise.all([
      prisma.exercise.count({ where: { sportId: sId } }),
      prisma.exerciseSport.count({ where: { sportId: sId } }),
      prisma.workoutTemplate.count({ where: { sportId: sId } }),
      prisma.trainingProgram.count({ where: { sportId: sId } }),
      prisma.clientProfile.count({ where: { preferredSportId: sId } }),
      prisma.sessionCalendar.count({ where: { sportId: sId } })
    ]);
    console.log(`Sport [${sId}] (${s.nameEn}) isActive=${s.isActive}:`, {
      directExercises: exCount,
      exerciseSportsJoin: exSportsCount,
      templates: tmplCount,
      programs: progCount,
      clients: clientCount,
      sessions: sessionCount,
      totalReferences: exCount + tmplCount + progCount + clientCount + sessionCount
    });
  }

  const demoExerciseIds = [
    "ex-pullups",
    "ex-overhead-press",
    "ex-incline-db-press",
    "ex-snatch",
    "ex-deadlift",
    "ex-bench-press",
    "ex-squat",
    "ex-kettlebell-swing"
  ];

  console.log("\n--- DEMO EXERCISES REFERENCE COUNTS ---");
  for (const exId of demoExerciseIds) {
    const ex = await prisma.exercise.findUnique({ where: { id: exId } });
    if (!ex) {
      console.log(`Exercise ${exId}: NOT FOUND in database`);
      continue;
    }
    const [
      templateExercises,
      blockItems,
      assignmentExercises,
      assignmentBlockItems,
      exerciseLogs
    ] = await Promise.all([
      prisma.workoutTemplateExercise.count({ where: { exerciseId: exId } }),
      prisma.blockItem.count({ where: { exerciseId: exId } }),
      prisma.clientWorkoutAssignmentExercise.count({ where: { exerciseId: exId } }),
      prisma.assignmentBlockItem.count({ where: { exerciseId: exId } }),
      prisma.workoutExerciseLog.count({ where: { exerciseId: exId } })
    ]);
    const totalRefs = templateExercises + blockItems + assignmentExercises + assignmentBlockItems + exerciseLogs;
    console.log(`Exercise [${exId}] (${ex.nameEn}):`, {
      templateExercises,
      blockItems,
      assignmentExercises,
      assignmentBlockItems,
      exerciseLogs,
      totalReferences: totalRefs
    });
  }

  await prisma.$disconnect();
}

run().catch(console.error);

/**
 * DB Inspection Script — Pre-Flight
 * Checks demo data dependencies in production DB.
 * READ-ONLY: no mutations.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("\n=== DB ENVIRONMENT ===");
  const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
  console.log(result);

  console.log("\n=== RECORD COUNTS ===");
  const counts = await Promise.all([
    prisma.sport.count(),
    prisma.exercise.count(),
    prisma.muscleGroup.count(),
    prisma.equipment.count(),
    prisma.workoutTemplate.count(),
    prisma.trainingProgram.count(),
    prisma.clientWorkoutAssignment.count(),
    prisma.workoutLog.count(),
    prisma.mealPlan.count(),
    prisma.clientProfile.count(),
    prisma.user.count(),
    prisma.setLog.count(),
    prisma.clientMeasurementHistory.count(),
    prisma.clientProgressPhoto.count(),
  ]);
  const labels = [
    "Sports","Exercises","MuscleGroups","Equipment","WorkoutTemplates",
    "TrainingPrograms","WorkoutAssignments","WorkoutLogs","MealPlans",
    "Clients","Users","SetLogs","Measurements","ProgressPhotos"
  ];
  counts.forEach((c, i) => console.log(`  ${labels[i]}: ${c}`));

  console.log("\n=== ALL SPORTS (with dependency counts) ===");
  const sports = await prisma.sport.findMany({
    include: {
      _count: {
        select: {
          exercises: true,
          templates: true,
          programs: true,
          clients: true,
        }
      }
    },
    orderBy: { nameEn: "asc" }
  });
  for (const s of sports) {
    console.log(`\n  Sport: "${s.nameEn}" [id: ${s.id}]`);
    console.log(`    Exercises: ${s._count.exercises}`);
    console.log(`    Templates: ${s._count.templates}`);
    console.log(`    Programs:  ${s._count.programs}`);
    console.log(`    Clients:   ${s._count.clients}`);
    console.log(`    Is seeded ID: ${s.id.startsWith("sport-") ? "YES (demo)" : "NO (real)"}`);
  }

  console.log("\n=== SEEDED EXERCISES (demo) with dependency counts ===");
  const demoExerciseIds = [
    "ex-bench-press","ex-incline-db-press","ex-deadlift","ex-pullups",
    "ex-squat","ex-overhead-press","ex-snatch","ex-kettlebell-swing"
  ];
  const demoExercises = await prisma.exercise.findMany({
    where: { id: { in: demoExerciseIds } },
    include: {
      _count: {
        select: {
          templateExercises: true,
          loggedExercises: true,
        }
      }
    }
  });
  for (const ex of demoExercises) {
    console.log(`\n  Exercise: "${ex.nameEn}" [id: ${ex.id}]`);
    console.log(`    In Templates:    ${ex._count.templateExercises}`);
    console.log(`    In WorkoutLogs:  ${ex._count.loggedExercises}`);
    console.log(`    Safe to delete:  ${ex._count.templateExercises === 0 && ex._count.loggedExercises === 0 ? "YES" : "NO — has references"}`);
  }

  console.log("\n=== EXERCISES NOT IN DEMO LIST (real academy exercises) ===");
  const realExercises = await prisma.exercise.findMany({
    where: { id: { notIn: demoExerciseIds } }
  });
  console.log(`  Count: ${realExercises.length}`);
  for (const ex of realExercises) {
    console.log(`  - "${ex.nameEn}" [${ex.id}]`);
  }

  console.log("\n=== TEMPLATES referencing DEMO sports ===");
  const demoSportIds = ["sport-bodybuilding","sport-fitness","sport-crossfit",
    "sport-nutrition","sport-boxing","sport-swimming"];
  const templatesOnDemoSports = await prisma.workoutTemplate.findMany({
    where: { sportId: { in: demoSportIds } },
    include: { _count: { select: { assignments: true } } }
  });
  for (const t of templatesOnDemoSports) {
    console.log(`  Template: "${t.titleEn}" [sportId: ${t.sportId}] — assignments: ${t._count.assignments}`);
  }

  console.log("\n=== PROGRAMS referencing DEMO sports ===");
  const programsOnDemoSports = await prisma.trainingProgram.findMany({
    where: { sportId: { in: demoSportIds } },
    include: { _count: { select: { assignments: true } } }
  });
  for (const p of programsOnDemoSports) {
    console.log(`  Program: "${p.titleEn}" [sportId: ${p.sportId}] — assignments: ${p._count.assignments}`);
  }

  console.log("\n=== CLIENT ASSIGNMENTS (all) ===");
  const assignments = await prisma.clientWorkoutAssignment.findMany({
    select: { id: true, status: true, scheduledDate: true, templateId: true, programId: true }
  });
  console.log(`  Total: ${assignments.length}`);
  const completed = assignments.filter(a => a.status === "COMPLETED").length;
  const scheduled = assignments.filter(a => a.status === "SCHEDULED").length;
  console.log(`  COMPLETED: ${completed}, SCHEDULED: ${scheduled}`);

  console.log("\n=== WORKOUT LOGS (actual execution records) ===");
  const logs = await prisma.workoutLog.findMany({ select: { id: true, isCompleted: true } });
  console.log(`  Total: ${logs.length}, Completed: ${logs.filter(l => l.isCompleted).length}`);

  console.log("\n=== USERS & CLIENTS ===");
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, name: true } });
  for (const u of users) {
    console.log(`  [${u.role}] ${u.name} <${u.email}> [${u.id}]`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

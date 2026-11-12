/**
 * Detailed dependency inspection of the 3 live assignments and the 1 template
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("\n=== LIVE ASSIGNMENTS (all 3) ===");
  const assignments = await prisma.clientWorkoutAssignment.findMany({
    include: {
      client: { include: { user: true } },
      coach: { include: { user: true } },
      template: true,
      program: true,
      workoutLog: true,
    }
  });
  for (const a of assignments) {
    console.log(`\n  Assignment [${a.id}]`);
    console.log(`    Client:   ${a.client?.user?.name} <${a.client?.user?.email}>`);
    console.log(`    Coach:    ${a.coach?.user?.name ?? "(none)"}`);
    console.log(`    Template: ${a.template?.titleEn ?? "(none)"} [${a.templateId ?? "null"}]`);
    console.log(`    Program:  ${a.program?.titleEn ?? "(none)"} [${a.programId ?? "null"}]`);
    console.log(`    Date:     ${a.scheduledDate}`);
    console.log(`    Status:   ${a.status}`);
    console.log(`    Log:      ${a.workoutLog ? "EXISTS" : "none"}`);
  }

  console.log("\n=== TEMPLATE DETAIL (the 1 template) ===");
  const templates = await prisma.workoutTemplate.findMany({
    include: {
      exercises: {
        include: { exercise: true }
      },
      sport: true,
      creator: { include: { user: true } },
    }
  });
  for (const t of templates) {
    console.log(`\n  Template: "${t.titleEn}" [${t.id}]`);
    console.log(`    Sport:   ${t.sport?.nameEn} [${t.sportId}]`);
    console.log(`    Creator: ${t.creator?.user?.name ?? "(none)"}`);
    console.log(`    Exercises:`);
    for (const te of t.exercises) {
      console.log(`      - ${te.exercise?.nameEn} | sets:${te.targetSets} reps:${te.targetReps} wt:${te.targetWeightKg}kg`);
    }
  }

  console.log("\n=== PROGRAM DETAIL (the 1 program) ===");
  const programs = await prisma.trainingProgram.findMany({
    include: {
      sport: true,
      weeks: {
        include: {
          days: {
            include: {
              workouts: {
                include: { template: true }
              }
            }
          }
        }
      }
    }
  });
  for (const p of programs) {
    console.log(`\n  Program: "${p.titleEn}" [${p.id}]`);
    console.log(`    Sport:    ${p.sport?.nameEn} [${p.sportId}]`);
    console.log(`    Weeks:    ${p.weeks.length}`);
    for (const w of p.weeks) {
      console.log(`    Week ${w.weekNumber}: ${w.days.length} days`);
      for (const d of w.days) {
        const tplNames = d.workouts.map(pw => pw.template?.titleEn ?? "?").join(", ");
        console.log(`      Day ${d.dayNumber}: ${d.isRestDay ? "REST" : tplNames || "empty"}`);
      }
    }
  }

  console.log("\n=== REAL ACADEMY EXERCISE ===");
  const realEx = await prisma.exercise.findMany({
    where: {
      id: { notIn: [
        "ex-bench-press","ex-incline-db-press","ex-deadlift","ex-pullups",
        "ex-squat","ex-overhead-press","ex-snatch","ex-kettlebell-swing"
      ]}
    },
    include: {
      sport: true,
      primaryMuscle: true,
      _count: { select: { templateExercises: true, loggedExercises: true } }
    }
  });
  for (const ex of realEx) {
    console.log(`  "${ex.nameEn}" [${ex.id}]`);
    console.log(`    Sport:   ${ex.sport?.nameEn}`);
    console.log(`    Muscle:  ${ex.primaryMuscle?.nameEn ?? "(none)"}`);
    console.log(`    In templates: ${ex._count.templateExercises}, In logs: ${ex._count.loggedExercises}`);
  }

  console.log("\n=== CLIENT DETAILS ===");
  const clients = await prisma.clientProfile.findMany({
    include: {
      user: true,
      sport: true,
      coachAssignments: { include: { coach: { include: { user: true } } } }
    }
  });
  for (const c of clients) {
    console.log(`\n  Client: ${c.user?.name} [${c.id}]`);
    console.log(`    Sport:  ${c.sport?.nameEn ?? "(none)"} [${c.preferredSportId ?? "null"}]`);
    console.log(`    Status: ${c.status}`);
    console.log(`    Coaches: ${c.coachAssignments.map(ca => `${ca.coach?.user?.name} (${ca.role})`).join(", ") || "none"}`);
  }

  console.log("\n=== MEASUREMENT RECORD ===");
  const measurements = await prisma.clientMeasurementHistory.findMany({
    include: { client: { include: { user: true } } }
  });
  for (const m of measurements) {
    console.log(`  Measurement [${m.id}]`);
    console.log(`    Client: ${m.client?.user?.name}`);
    console.log(`    Date: ${m.date}`);
    console.log(`    Weight: ${m.weightKg}kg, BF: ${m.bodyFatPercentage}%`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function deleteZeroReferenceRecords() {
  console.log("=== EXECUTING SAFE ZERO-REFERENCE DEMO DATA CLEANUP ===");

  // 1. Check ex-snatch
  const snatchRefs = await prisma.blockItem.count({ where: { exerciseId: "ex-snatch" } }) +
    await prisma.assignmentBlockItem.count({ where: { exerciseId: "ex-snatch" } }) +
    await prisma.workoutTemplateExercise.count({ where: { exerciseId: "ex-snatch" } }) +
    await prisma.clientWorkoutAssignmentExercise.count({ where: { exerciseId: "ex-snatch" } }) +
    await prisma.workoutExerciseLog.count({ where: { exerciseId: "ex-snatch" } });

  console.log(`[CHECK] ex-snatch total reference count: ${snatchRefs}`);
  if (snatchRefs === 0) {
    // delete exercise_sports joins first
    const joins = await prisma.exerciseSport.deleteMany({ where: { exerciseId: "ex-snatch" } });
    console.log(`[DELETE] Deleted ${joins.count} exerciseSport join row(s) for ex-snatch`);
    await prisma.exercise.delete({ where: { id: "ex-snatch" } });
    console.log(`[DELETE SUCCESS] Hard-deleted exercise ex-snatch (0 references).`);
  } else {
    console.log(`[SKIP] ex-snatch has ${snatchRefs} reference(s); skipping deletion.`);
  }

  // 2. Check sport-nutrition
  const nutritionRefs = await prisma.exercise.count({ where: { sportId: "sport-nutrition" } }) +
    await prisma.workoutTemplate.count({ where: { sportId: "sport-nutrition" } }) +
    await prisma.trainingProgram.count({ where: { sportId: "sport-nutrition" } }) +
    await prisma.clientProfile.count({ where: { preferredSportId: "sport-nutrition" } });

  console.log(`[CHECK] sport-nutrition total reference count: ${nutritionRefs}`);
  if (nutritionRefs === 0) {
    await prisma.exerciseSport.deleteMany({ where: { sportId: "sport-nutrition" } });
    await prisma.sport.delete({ where: { id: "sport-nutrition" } });
    console.log(`[DELETE SUCCESS] Hard-deleted sport-nutrition (0 references).`);
  } else {
    console.log(`[SKIP] sport-nutrition has ${nutritionRefs} reference(s); skipping deletion.`);
  }

  // 3. Check sport-swimming
  const swimmingRefs = await prisma.exercise.count({ where: { sportId: "sport-swimming" } }) +
    await prisma.workoutTemplate.count({ where: { sportId: "sport-swimming" } }) +
    await prisma.trainingProgram.count({ where: { sportId: "sport-swimming" } }) +
    await prisma.clientProfile.count({ where: { preferredSportId: "sport-swimming" } });

  console.log(`[CHECK] sport-swimming total reference count: ${swimmingRefs}`);
  if (swimmingRefs === 0) {
    await prisma.exerciseSport.deleteMany({ where: { sportId: "sport-swimming" } });
    await prisma.sport.delete({ where: { id: "sport-swimming" } });
    console.log(`[DELETE SUCCESS] Hard-deleted sport-swimming (0 references).`);
  } else {
    console.log(`[SKIP] sport-swimming has ${swimmingRefs} reference(s); skipping deletion.`);
  }

  console.log("\nSummary of other approved list items with references > 0 (NOT deleted per safety rule):");
  for (const exId of ["ex-pullups", "ex-overhead-press", "ex-incline-db-press", "ex-deadlift"]) {
    const ex = await prisma.exercise.findUnique({ where: { id: exId } });
    const count = await prisma.blockItem.count({ where: { exerciseId: exId } }) +
      await prisma.workoutTemplateExercise.count({ where: { exerciseId: exId } }) +
      await prisma.assignmentBlockItem.count({ where: { exerciseId: exId } });
    console.log(`- ${exId} (${ex?.nameEn}): ${count} active reference(s). Preserved.`);
  }
  const fitCount = await prisma.exercise.count({ where: { sportId: "sport-fitness" } });
  console.log(`- sport-fitness: ${fitCount} exercise(s) linked (ex-pullups). Preserved.`);

  await prisma.$disconnect();
}

deleteZeroReferenceRecords().catch(console.error);

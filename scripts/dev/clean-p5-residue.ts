import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("Cleaning P5 throwaway residues...");

  const throwawaySports = await prisma.sport.findMany({
    where: { nameEn: { startsWith: "P5 Test Sport" } },
    select: { id: true }
  });
  const sportIds = throwawaySports.map(s => s.id);

  const throwawayExercises = await prisma.exercise.findMany({
    where: { nameEn: { startsWith: "P5 Test Exercise" } },
    select: { id: true }
  });
  const exIds = throwawayExercises.map(e => e.id);

  const throwawayUsers = await prisma.user.findMany({
    where: { email: { startsWith: "throwaway.p5." } },
    select: { id: true, coachProfile: { select: { id: true } }, clientProfile: { select: { id: true } } }
  });
  const userIds = throwawayUsers.map(u => u.id);
  const coachIds = throwawayUsers.map(u => u.coachProfile?.id).filter(Boolean) as string[];
  const clientIds = throwawayUsers.map(u => u.clientProfile?.id).filter(Boolean) as string[];

  // Also any programs with P5
  const p5Programs = await prisma.trainingProgram.findMany({
    where: { titleEn: { startsWith: "P5" } },
    select: { id: true }
  });
  const progIds = p5Programs.map(p => p.id);

  if (progIds.length > 0) {
    await prisma.programWeek.deleteMany({ where: { programId: { in: progIds } } });
    await prisma.trainingProgram.deleteMany({ where: { id: { in: progIds } } });
    console.log(`Cleaned ${progIds.length} P5 programs`);
  }

  // Templates and exercises
  const throwawayTemplates = await prisma.workoutTemplate.findMany({
    where: { titleEn: { startsWith: "P5" } },
    select: { id: true }
  });
  const tIds = throwawayTemplates.map(t => t.id);
  if (tIds.length > 0) {
    await prisma.workoutTemplateExercise.deleteMany({ where: { templateId: { in: tIds } } });
    await prisma.blockItem.deleteMany({ where: { block: { templateId: { in: tIds } } } });
    await prisma.workoutBlock.deleteMany({ where: { templateId: { in: tIds } } });
    await prisma.workoutTemplate.deleteMany({ where: { id: { in: tIds } } });
    console.log(`Cleaned ${tIds.length} P5 templates`);
  }

  if (exIds.length > 0) {
    await prisma.workoutTemplateExercise.deleteMany({ where: { exerciseId: { in: exIds } } });
    await prisma.blockItem.deleteMany({ where: { exerciseId: { in: exIds } } });
    await prisma.exerciseSport.deleteMany({ where: { exerciseId: { in: exIds } } });
    await prisma.exercise.deleteMany({ where: { id: { in: exIds } } });
    console.log(`Cleaned ${exIds.length} P5 exercises`);
  }

  if (sportIds.length > 0) {
    await prisma.sport.deleteMany({ where: { id: { in: sportIds } } });
    console.log(`Cleaned ${sportIds.length} P5 sports`);
  }

  if (clientIds.length > 0) {
    await prisma.clientProfile.deleteMany({ where: { id: { in: clientIds } } });
  }

  if (coachIds.length > 0) {
    await prisma.coachProfile.deleteMany({ where: { id: { in: coachIds } } });
  }

  if (userIds.length > 0) {
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.log(`Cleaned ${userIds.length} P5 users`);
  }

  const p5Audits = await prisma.auditLog.findMany({
    where: {
      OR: [
        { userName: { contains: "P5" } },
        { newValues: { contains: "P5" } }
      ]
    },
    select: { id: true }
  });
  if (p5Audits.length > 0) {
    await prisma.auditLog.deleteMany({ where: { id: { in: p5Audits.map(a => a.id) } } });
    console.log(`Cleaned ${p5Audits.length} P5 audit logs`);
  }

  console.log("Cleanup complete!");
  await prisma.$disconnect();
}

run();

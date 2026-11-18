import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const pCount = await prisma.trainingProgram.count();
  const wCount = await prisma.programWeek.count();
  const dCount = await prisma.programDay.count();
  const woCount = await prisma.programWorkout.count();
  const bCount = await prisma.workoutBlock.count();
  const iCount = await prisma.blockItem.count();
  const uCount = await prisma.user.count();

  console.log({
    programs: pCount,
    weeks: wCount,
    days: dCount,
    workouts: woCount,
    blocks: bCount,
    items: iCount,
    users: uCount
  });

  await prisma.$disconnect();
}

run();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const programs = await prisma.trainingProgram.findMany({
    select: {
      id: true,
      titleEn: true,
      masterVersion: true,
      createdAt: true,
      _count: {
        select: {
          weeks: true,
          assignments: true,
          programAssignments: true
        }
      }
    }
  });

  console.log("Current TrainingPrograms in DB:", JSON.stringify(programs, null, 2));
  await prisma.$disconnect();
}

run();

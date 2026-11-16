import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== RECONCILING MASTER PROGRAM VERSION ===");
  const progId = "0c508dde-7f7c-4a00-a54f-5d32f366f21e";

  const before = await prisma.trainingProgram.findUnique({
    where: { id: progId },
    select: { id: true, titleEn: true, masterVersion: true }
  });
  console.log("Before update:", before);

  const updated = await prisma.trainingProgram.update({
    where: { id: progId },
    data: { masterVersion: 2 },
    select: { id: true, titleEn: true, masterVersion: true }
  });
  console.log("After update:", updated);

  const assignment = await prisma.programAssignment.findFirst({
    where: { programId: progId },
    select: { id: true, sourceMasterVersion: true, client: { select: { user: { select: { name: true } } } } }
  });
  console.log("Athlete assignment:", assignment);
  if (assignment && assignment.sourceMasterVersion !== null) {
    const drift = updated.masterVersion - assignment.sourceMasterVersion;
    console.log(`Drift computed: ${updated.masterVersion} - ${assignment.sourceMasterVersion} = ${drift} (Correct: Athlete on v1, Master on v2)`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);

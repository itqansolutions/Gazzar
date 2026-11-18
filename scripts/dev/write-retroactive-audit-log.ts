import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== WRITING RETROACTIVE AUDIT LOG FOR MASTER VERSION CHANGE ===");
  const progId = "0c508dde-7f7c-4a00-a54f-5d32f366f21e";

  const program = await prisma.trainingProgram.findUnique({
    where: { id: progId },
    select: { id: true, titleEn: true, masterVersion: true }
  });

  if (!program) {
    console.error("Program not found:", progId);
    return;
  }

  const log = await prisma.auditLog.create({
    data: {
      userId: null,
      userName: "System / Agent",
      userRole: "ADMIN",
      action: "UPDATE_PROGRAM_VERSION",
      entityType: "TrainingProgram",
      entityId: progId,
      oldValues: JSON.stringify({ masterVersion: 1 }),
      newValues: JSON.stringify({
        masterVersion: 2,
        titleEn: program.titleEn,
        note: "retroactive, applied without prior approval"
      }),
      ipAddress: "127.0.0.1"
    }
  });

  console.log("Created AuditLog row:", log);
  await prisma.$disconnect();
}

main().catch(console.error);

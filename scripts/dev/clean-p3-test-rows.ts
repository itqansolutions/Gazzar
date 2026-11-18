import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runCleanup() {
  console.log("=== EXECUTING TRANSACTIONAL CLEANUP OF TEST LEFTOVER ROWS ===");

  // 1. Identify all test templates (both from closure test and playwright test)
  const testTemplates = await prisma.workoutTemplate.findMany({
    where: {
      OR: [
        { titleEn: { contains: "Duplicate Block Order Template" } },
        { titleEn: { contains: "Duplicate Item Order Template" } },
        { titleEn: { startsWith: "P3 E2E Template" } }
      ]
    },
    select: { id: true, titleEn: true }
  });

  const targetTemplateIds = testTemplates.map((t) => t.id);
  console.log("Target test templates to remove:", testTemplates);

  // Find blocks for these templates
  const testBlocks = await prisma.workoutBlock.findMany({
    where: { templateId: { in: targetTemplateIds } },
    select: { id: true, title: true }
  });
  const targetBlockIds = testBlocks.map((b) => b.id);
  console.log(`Target test blocks (${testBlocks.length}):`, testBlocks);

  // Find test sport
  const testSports = await prisma.sport.findMany({
    where: {
      OR: [
        { id: "5dfdcff2-0e88-4f89-a545-fd2c4def9705" },
        { nameEn: { startsWith: "P3 Throwaway Sport" } }
      ]
    },
    select: { id: true, nameEn: true }
  });
  const targetSportIds = testSports.map((s) => s.id);
  console.log("Target test sports:", testSports);

  // Find test exercises
  const testExercises = await prisma.exercise.findMany({
    where: {
      OR: [
        { id: { in: ["b0b60ec4-bbad-4526-9315-ed48ac3d0d86", "9b5d9a55-33f1-40c9-9d11-975d52a808fb"] } },
        { nameEn: { startsWith: "P3 Throwaway Exercise" } }
      ]
    },
    select: { id: true, nameEn: true }
  });
  const targetExerciseIds = testExercises.map((e) => e.id);
  console.log("Target test exercises:", testExercises);

  // Find test coach user
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { id: "c9742012-fb2b-4e41-9907-65fed5d54983" },
        { email: { contains: "throwaway.p3c.coach" } }
      ]
    },
    select: { id: true, email: true }
  });
  const targetUserIds = testUsers.map((u) => u.id);
  console.log("Target test users:", testUsers);

  // Find test audit logs
  const testAuditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityId: { in: targetTemplateIds } },
        { id: { in: ["a9b8afe6-a20d-4c1a-ba2d-b0146eaf9455", "a3659003-3605-41c5-af5c-e73d942bd75a"] } }
      ]
    },
    select: { id: true, action: true, entityType: true, entityId: true }
  });
  const targetAuditLogIds = testAuditLogs.map((a) => a.id);
  console.log(`Target test audit logs (${testAuditLogs.length}):`, testAuditLogs);

  console.log("\n[EXECUTE TRANSACTION]");
  await prisma.$transaction(async (tx) => {
    // 1. Delete BlockItems
    if (targetBlockIds.length > 0) {
      const delItems = await tx.blockItem.deleteMany({
        where: { blockId: { in: targetBlockIds } }
      });
      console.log(`   - Deleted BlockItems: ${delItems.count}`);
    }

    // 2. Delete legacy template exercises
    if (targetTemplateIds.length > 0) {
      const delLegacy = await tx.workoutTemplateExercise.deleteMany({
        where: { templateId: { in: targetTemplateIds } }
      });
      console.log(`   - Deleted Legacy Template Exercises: ${delLegacy.count}`);
    }

    // 3. Delete WorkoutBlocks
    if (targetBlockIds.length > 0) {
      const delBlocks = await tx.workoutBlock.deleteMany({
        where: { id: { in: targetBlockIds } }
      });
      console.log(`   - Deleted WorkoutBlocks: ${delBlocks.count}`);
    }

    // 4. Delete AuditLogs for throwaway templates
    if (targetAuditLogIds.length > 0) {
      const delAudit = await tx.auditLog.deleteMany({
        where: { id: { in: targetAuditLogIds } }
      });
      console.log(`   - Deleted AuditLogs: ${delAudit.count}`);
    }

    // 5. Delete WorkoutTemplates
    if (targetTemplateIds.length > 0) {
      const delTemplates = await tx.workoutTemplate.deleteMany({
        where: { id: { in: targetTemplateIds } }
      });
      console.log(`   - Deleted WorkoutTemplates: ${delTemplates.count}`);
    }

    // 6. Delete Exercises
    if (targetExerciseIds.length > 0) {
      const delEx = await tx.exercise.deleteMany({
        where: { id: { in: targetExerciseIds } }
      });
      console.log(`   - Deleted Exercises: ${delEx.count}`);
    }

    // 7. Delete Sports
    if (targetSportIds.length > 0) {
      const delSports = await tx.sport.deleteMany({
        where: { id: { in: targetSportIds } }
      });
      console.log(`   - Deleted Sports: ${delSports.count}`);
    }

    // 8. Delete User Sessions
    if (targetUserIds.length > 0) {
      const delSessions = await tx.session.deleteMany({
        where: { userId: { in: targetUserIds } }
      });
      console.log(`   - Deleted Sessions: ${delSessions.count}`);

      // 9. Delete Users
      const delUsers = await tx.user.deleteMany({
        where: { id: { in: targetUserIds } }
      });
      console.log(`   - Deleted Users: ${delUsers.count}`);
    }
  });

  console.log("\n=== POST-CLEANUP ROW COUNTS ===");
  const postTemplates = await prisma.workoutTemplate.count();
  const postBlocks = await prisma.workoutBlock.count();
  const postItems = await prisma.blockItem.count();
  const postUsers = await prisma.user.count();
  const postSports = await prisma.sport.count();
  const postExercises = await prisma.exercise.count();

  console.log(`workout_templates: ${postTemplates} (Original Backup: 7)`);
  console.log(`workout_blocks:    ${postBlocks} (Original Backup: 30)`);
  console.log(`block_items:       ${postItems} (Original Backup: 30)`);
  console.log(`users:             ${postUsers} (Original Backup: 5)`);
  console.log(`sports:            ${postSports} (Original Backup: 7 minus 2 admin deletions = 5)`);
  console.log(`exercises:         ${postExercises} (Original Backup: 29 minus 1 admin deletion = 28)`);

  await prisma.$disconnect();
}

runCleanup().catch(async (e) => {
  console.error("Cleanup failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});

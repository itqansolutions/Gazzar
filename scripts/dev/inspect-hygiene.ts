import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function run() {
  console.log("=== DATA HYGIENE AUDIT ===");

  // 1. Read backup from 2026-11-16T14-37
  const backupPath = path.join(process.cwd(), "backups", "preflight-2026-11-16T14-37-50-654Z", "full-backup.json");
  const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

  // Backup table keys might be model names (e.g. workoutTemplate, workoutBlock, blockItem, user, sport, exercise)
  console.log("Backup tables present:", Object.keys(backupData));

  const tables = backupData.tables || {};
  const backupWorkoutTemplates = tables.workout_templates || [];
  const backupWorkoutBlocks = tables.workout_blocks || [];
  const backupBlockItems = tables.block_items || [];
  const backupUsers = tables.users || [];
  const backupSports = tables.sports || [];
  const backupExercises = tables.exercises || [];

  console.log("\n--- BACKUP ROW COUNTS (2026-11-16T14-37) ---");
  console.log("workout_templates:", backupWorkoutTemplates.length);
  console.log("workout_blocks:   ", backupWorkoutBlocks.length);
  console.log("block_items:      ", backupBlockItems.length);
  console.log("users:            ", backupUsers.length);
  console.log("sports:           ", backupSports.length);
  console.log("exercises:        ", backupExercises.length);

  // 2. Query live database counts
  const liveWorkoutTemplates = await prisma.workoutTemplate.findMany();
  const liveWorkoutBlocks = await prisma.workoutBlock.findMany();
  const liveBlockItems = await prisma.blockItem.findMany();
  const liveUsers = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
  const liveSports = await prisma.sport.findMany();
  const liveExercises = await prisma.exercise.findMany({ select: { id: true, nameEn: true, nameAr: true, isActive: true } });

  console.log("\n--- LIVE DB ROW COUNTS (NOW) ---");
  console.log("workout_templates:", liveWorkoutTemplates.length);
  console.log("workout_blocks:   ", liveWorkoutBlocks.length);
  console.log("block_items:      ", liveBlockItems.length);
  console.log("users:            ", liveUsers.length);
  console.log("sports:           ", liveSports.length);
  console.log("exercises:        ", liveExercises.length);

  // Compare IDs to see rows that exist now but not in the backup
  function findNewRows(live: any[], backup: any[], idField = "id") {
    const backupIds = new Set(backup.map((r: any) => r[idField]));
    return live.filter((r: any) => !backupIds.has(r[idField]));
  }

  function findMissingRows(live: any[], backup: any[], idField = "id") {
    const liveIds = new Set(live.map((r: any) => r[idField]));
    return backup.filter((r: any) => !liveIds.has(r[idField]));
  }

  const newTemplates = findNewRows(liveWorkoutTemplates, backupWorkoutTemplates);
  const newBlocks = findNewRows(liveWorkoutBlocks, backupWorkoutBlocks);
  const newItems = findNewRows(liveBlockItems, backupBlockItems);
  const newUsers = findNewRows(liveUsers, backupUsers);
  const newSports = findNewRows(liveSports, backupSports);
  const newExercises = findNewRows(liveExercises, backupExercises);

  const missingSports = findMissingRows(liveSports, backupSports);
  const missingExercises = findMissingRows(liveExercises, backupExercises);
  const missingTemplates = findMissingRows(liveWorkoutTemplates, backupWorkoutTemplates);

  console.log("\n--- NEW ROWS IN LIVE DB NOT IN BACKUP ---");
  console.log("New workout_templates count:", newTemplates.length);
  if (newTemplates.length > 0) console.log("New templates:", newTemplates.map(t => ({ id: t.id, titleEn: t.titleEn })));

  console.log("New workout_blocks count:", newBlocks.length);
  if (newBlocks.length > 0) console.log("New blocks:", newBlocks.map(b => ({ id: b.id, type: b.type, title: b.title, templateId: b.templateId, programWorkoutId: b.programWorkoutId })));

  console.log("New block_items count:", newItems.length);
  if (newItems.length > 0) console.log("New items count:", newItems.length);

  console.log("New users count:", newUsers.length);
  if (newUsers.length > 0) console.log("New users:", newUsers);

  console.log("New sports count:", newSports.length);
  if (newSports.length > 0) console.log("New sports:", newSports);

  console.log("New exercises count:", newExercises.length);
  if (newExercises.length > 0) console.log("New exercises:", newExercises);

  console.log("\n--- ROWS IN BACKUP NOT IN LIVE DB (MISSING/DELETED) ---");
  console.log("Missing sports count:", missingSports.length);
  if (missingSports.length > 0) console.log("Missing sports:", missingSports.map(s => ({ id: s.id, nameEn: s.nameEn, nameAr: s.nameAr })));

  console.log("Missing exercises count:", missingExercises.length);
  if (missingExercises.length > 0) console.log("Missing exercises:", missingExercises.map(e => ({ id: e.id, nameEn: e.nameEn, nameAr: e.nameAr })));

  console.log("Missing templates count:", missingTemplates.length);
  if (missingTemplates.length > 0) console.log("Missing templates:", missingTemplates.map(t => ({ id: t.id, titleEn: t.titleEn })));

  // Check ex-deadlift
  const deadlift = await prisma.exercise.findUnique({ where: { id: "ex-deadlift" } });
  console.log("\n--- EX-DEADLIFT STATUS ---");
  console.log("ex-deadlift exists:", Boolean(deadlift));
  console.log("ex-deadlift isActive:", deadlift?.isActive);

  // Check Menna's assignment & drift
  console.log("\n--- MENNA & TRAINING PROGRAM VERSION DRIFT ---");
  const mennaUser = await prisma.user.findFirst({
    where: { email: { contains: "menna" } },
    include: {
      clientProfile: {
        include: {
          programAssignments: {
            include: {
              program: true
            }
          }
        }
      }
    }
  });

  if (mennaUser && mennaUser.clientProfile?.programAssignments) {
    for (const pa of mennaUser.clientProfile.programAssignments) {
      console.log(`Assignment ID: ${pa.id}`);
      console.log(`Program: ${pa.program.titleEn}`);
      console.log(`Program masterVersion: ${pa.program.masterVersion}`);
      console.log(`Assignment sourceMasterVersion: ${pa.sourceMasterVersion}`);
      const drift = (pa.program.masterVersion ?? 1) - (pa.sourceMasterVersion ?? 1);
      console.log(`Calculated Drift: ${drift}`);
    }
  } else {
    console.log("Menna user or assignment not found");
  }

  // Check AuditLogs
  const recentAuditLogs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" }
  });
  console.log("\n--- RECENT AUDIT LOGS ---");
  console.log(recentAuditLogs.map(l => ({ id: l.id, action: l.action, entityType: l.entityType, entityId: l.entityId, createdAt: l.createdAt })));

  await prisma.$disconnect();
}

run();

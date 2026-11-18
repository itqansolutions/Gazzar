import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function inspectDetails() {
  console.log("=== INSPECTING PROGRAM ASSIGNMENT DETAILS ===");
  const assignments = await prisma.clientWorkoutAssignment.findMany({
    where: { programAssignmentId: "ca0135f9-3819-4389-addb-0d90632f14e7" },
    include: {
      template: { select: { id: true, titleEn: true, titleAr: true } },
      exercises: { select: { id: true, exerciseNameEn: true, orderIndex: true } },
      assignmentBlocks: {
        include: {
          items: { select: { id: true, exerciseNameSnapshot: true, orderIndex: true } }
        }
      }
    }
  });

  for (const a of assignments) {
    console.log(`\nAssignment ID: ${a.id}`);
    console.log(`  Title: "${a.title}" | scheduledDate: ${a.scheduledDate?.toISOString()}`);
    console.log(`  W${a.programWeekNumber} D${a.programDayNumber} Order: ${a.programWorkoutOrder}`);
    console.log(`  templateId: ${a.templateId} ("${a.template?.titleEn}")`);
    console.log(`  Historical Exercises (${a.exercises.length}):`, a.exercises.map(e => `${e.orderIndex}:${e.exerciseNameEn}`).join(", "));
    console.log(`  Assignment Blocks (${a.assignmentBlocks.length}):`);
    for (const b of a.assignmentBlocks) {
      console.log(`    Block ${b.orderIndex} (${b.type}):`, b.items.map(i => `${i.orderIndex}:${i.exerciseNameSnapshot}`).join(", "));
    }
  }

  console.log("\n=== MASTER PROGRAM WORKOUTS ===");
  const masterWorkouts: any[] = await prisma.$queryRawUnsafe(`
    SELECT pw.id, pw.title, pw."orderIndex", pw."templateId", wt."titleEn" as template_name,
           pd."dayNumber", pwk."weekNumber"
    FROM program_workouts pw
    JOIN program_days pd ON pd.id = pw."dayId"
    JOIN program_weeks pwk ON pwk.id = pd."weekId"
    LEFT JOIN workout_templates wt ON wt.id = pw."templateId"
    WHERE pwk."programId" = '0c508dde-7f7c-4a00-a54f-5d32f366f21e'
    ORDER BY pwk."weekNumber", pd."dayNumber", pw."orderIndex";
  `);
  for (const mw of masterWorkouts) {
    console.log(`Master W${mw.weekNumber} D${mw.dayNumber} Order:${mw.orderIndex} -> pw_id: ${mw.id}, title: "${mw.title}", templateId: ${mw.templateId} ("${mw.template_name}")`);
  }

  console.log("\n=== BACKUP FILE TABLE CONTENTS ===");
  const backupFile = path.join(process.cwd(), "backups", "preflight-2026-11-16T14-37-50-654Z", "full-backup.json");
  const backup = JSON.parse(fs.readFileSync(backupFile, "utf8"));
  console.log("Backup metadata:", backup.meta);
  console.log("Table row counts in backup:");
  for (const [table, rows] of Object.entries(backup.tables || {})) {
    console.log(`  ${table}: ${Array.isArray(rows) ? rows.length : "not array"}`);
  }

  // Compare backup tables with live PostgreSQL public tables
  const liveTables: any[] = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;`
  );
  const liveTableNames = liveTables.map(t => t.table_name);
  const backupTableNames = Object.keys(backup.tables || {});
  const missingInBackup = liveTableNames.filter(t => !backupTableNames.includes(t));
  console.log(`\nLive tables count: ${liveTableNames.length}`);
  console.log(`Tables in backup count: ${backupTableNames.length}`);
  console.log(`Tables present in live DB but MISSING from backup:`, missingInBackup);

  await prisma.$disconnect();
}

inspectDetails().catch(console.error);

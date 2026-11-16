import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function runVerification() {
  console.log("==================================================");
  console.log("STARTING COMPREHENSIVE READ-ONLY DATA INSPECTION");
  console.log("==================================================\n");

  // 1. Logs of failed migrations
  console.log("--- 1. FAILED MIGRATION LOG DETAILS ---");
  const failedMigrations: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, migration_name, started_at, finished_at, rolled_back_at, checksum, logs 
     FROM _prisma_migrations 
     ORDER BY started_at ASC;`
  );
  for (const m of failedMigrations) {
    console.log(`[${m.migration_name}] id=${m.id}`);
    console.log(`  started=${m.started_at?.toISOString()} finished=${m.finished_at?.toISOString()} rolled_back=${m.rolled_back_at?.toISOString()}`);
    console.log(`  logs:\n${m.logs ? m.logs.trim() : "NONE"}\n`);
  }

  // 2. Exact live schema check from PostgreSQL information_schema
  console.log("--- 2. LIVE POSTGRESQL TABLES & COLUMNS INSPECTION ---");
  const tables: any[] = await prisma.$queryRawUnsafe(
    `SELECT table_name 
     FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name ASC;`
  );
  console.log(`Total public base tables in Postgres: ${tables.length}`);
  console.log(`Table names: ${tables.map((t) => t.table_name).join(", ")}\n`);

  // Specific check on new Phase 1 & 2 models/tables
  const targetTables = [
    "workout_blocks",
    "block_items",
    "assignment_blocks",
    "assignment_block_items",
    "set_logs",
    "program_assignments",
    "client_workout_assignments",
    "training_programs",
    "exercises",
    "sports"
  ];

  for (const tbl of targetTables) {
    const cols: any[] = await prisma.$queryRawUnsafe(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = '${tbl}'
       ORDER BY ordinal_position ASC;`
    );
    console.log(`Table '${tbl}' columns (${cols.length}):`);
    for (const c of cols) {
      console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default})`);
    }

    // Constraints & indexes
    const constraints: any[] = await prisma.$queryRawUnsafe(
      `SELECT conname, contype, pg_get_constraintdef(c.oid) as def
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       JOIN pg_class cl ON cl.oid = c.conrelid
       WHERE n.nspname = 'public' AND cl.relname = '${tbl}';`
    );
    console.log(`  Constraints (${constraints.length}):`);
    for (const con of constraints) {
      console.log(`    * [${con.contype}] ${con.conname}: ${con.def}`);
    }

    const indexes: any[] = await prisma.$queryRawUnsafe(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = '${tbl}';`
    );
    console.log(`  Indexes (${indexes.length}):`);
    for (const idx of indexes) {
      console.log(`    * ${idx.indexname}: ${idx.indexdef}`);
    }
    console.log();
  }

  // 3. Program Assignment & Workout Order Data Integrity
  console.log("--- 3. PROGRAM ASSIGNMENT & WORKOUT ORDER DATA ---");
  const programAssignments: any[] = await prisma.$queryRawUnsafe(
    `SELECT pa.id, pa."programId", pa."clientId", pa."sourceMasterVersion", pa."isActive", pa."createdAt",
            tp."titleEn" as program_title, tp."masterVersion" as current_program_master_version,
            u.name as client_name
     FROM program_assignments pa
     JOIN training_programs tp ON tp.id = pa."programId"
     JOIN client_profiles cp ON cp.id = pa."clientId"
     JOIN users u ON u.id = cp."userId";`
  );
  console.log(`Program Assignments count: ${programAssignments.length}`);
  for (const pa of programAssignments) {
    console.log(`ProgramAssignment ${pa.id}:`);
    console.log(`  Program: "${pa.program_title}" (ID: ${pa.programId})`);
    console.log(`  Client: "${pa.client_name}" (ID: ${pa.clientId})`);
    console.log(`  sourceMasterVersion: ${pa.sourceMasterVersion} | Program masterVersion: ${pa.current_program_master_version}`);
    console.log(`  isActive: ${pa.isActive} | CreatedAt: ${pa.createdAt}`);

    // Check workouts linked to this program assignment
    const workouts: any[] = await prisma.$queryRawUnsafe(
      `SELECT cwa.id, cwa.title, cwa."programWeekNumber", cwa."programDayNumber", cwa."programWorkoutOrder",
              cwa.status, cwa."scheduledDate", cwa."createdAt"
       FROM client_workout_assignments cwa
       WHERE cwa."programAssignmentId" = '${pa.id}'
       ORDER BY cwa."programWeekNumber" ASC, cwa."programDayNumber" ASC, cwa."programWorkoutOrder" ASC;`
    );
    console.log(`  Linked ClientWorkoutAssignments (${workouts.length}):`);
    for (const w of workouts) {
      console.log(`    - ID: ${w.id} | Week ${w.programWeekNumber}, Day ${w.programDayNumber} | programWorkoutOrder: ${w.programWorkoutOrder} | Title: "${w.title}" | Status: ${w.status} | CreatedAt: ${w.createdAt}`);
    }

    // Check underlying ProgramDays & ProgramWorkouts in the master program
    const masterDays: any[] = await prisma.$queryRawUnsafe(
      `SELECT pwk."weekNumber", pd."dayNumber", pd."titleEn" as day_title, pd."isRestDay",
              pw.id as workout_id, pw."orderIndex" as pw_order_index, pw.title as pw_title, pw."templateId"
       FROM program_weeks pwk
       JOIN program_days pd ON pd."weekId" = pwk.id
       LEFT JOIN program_workouts pw ON pw."dayId" = pd.id
       WHERE pwk."programId" = '${pa.programId}'
       ORDER BY pwk."weekNumber" ASC, pd."dayNumber" ASC, pw."orderIndex" ASC;`
    );
    console.log(`  Master Program Days & Workouts (${masterDays.length}):`);
    for (const md of masterDays) {
      console.log(`    * Week ${md.weekNumber}, Day ${md.dayNumber} ("${md.day_title}"): workout_id=${md.workout_id}, orderIndex=${md.pw_order_index}, pw_title="${md.pw_title}", isRestDay=${md.isRestDay}`);
    }
  }

  // 4. Check all workout assignments in database and their programWorkoutOrder distribution
  console.log("\n--- 4. ALL CLIENT WORKOUT ASSIGNMENTS ORDER ANALYSIS ---");
  const allAssignments: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, "clientId", "programAssignmentId", "programWeekNumber", "programDayNumber", "programWorkoutOrder", title, status, "createdAt"
     FROM client_workout_assignments
     ORDER BY "programAssignmentId", "programWeekNumber", "programDayNumber", "programWorkoutOrder";`
  );
  console.log(`Total ClientWorkoutAssignments: ${allAssignments.length}`);
  for (const a of allAssignments) {
    console.log(`  CWA ${a.id}: client=${a.clientId} progAssign=${a.programAssignmentId} W${a.programWeekNumber}D${a.programDayNumber} order=${a.programWorkoutOrder} "${a.title}" status=${a.status}`);
  }

  // 5. Check real workout execution logs and immutability state
  console.log("\n--- 5. WORKOUT LOGS AND SET LOGS IN DB ---");
  const workoutLogs: any[] = await prisma.$queryRawUnsafe(
    `SELECT wl.id, wl."clientId", wl."coachId", wl."isCompleted", wl."startedAt", wl."completedAt",
            wl."assignmentId", cwa.status as cwa_status, cwa.title as cwa_title,
            u.name as client_name
     FROM workout_logs wl
     JOIN client_profiles cp ON cp.id = wl."clientId"
     JOIN users u ON u.id = cp."userId"
     LEFT JOIN client_workout_assignments cwa ON cwa.id = wl."assignmentId";`
  );
  console.log(`Total WorkoutLogs: ${workoutLogs.length}`);
  for (const wl of workoutLogs) {
    console.log(`  WorkoutLog ${wl.id}: client="${wl.client_name}" assignment="${wl.cwa_title}" (status: ${wl.cwa_status}) | logStatus=${wl.status} started=${wl.startedAt} completed=${wl.completedAt}`);
    const setLogsCount: any[] = await prisma.$queryRawUnsafe(
      `SELECT count(*) as count FROM set_logs WHERE "workoutLogId" = '${wl.id}';`
    );
    console.log(`    SetLogs count for this workout: ${setLogsCount[0]?.count}`);
  }

  // 6. Check Backup file content structure and metadata
  console.log("\n--- 6. BACKUP FILE INSPECTION ---");
  const backupPath = path.join(process.cwd(), "backups", "preflight-2026-11-16T14-37-50-654Z", "full-backup.json");
  if (fs.existsSync(backupPath)) {
    const backupStat = fs.statSync(backupPath);
    console.log(`Backup file exists at: ${backupPath}`);
    console.log(`File size: ${backupStat.size} bytes (${(backupStat.size / 1024).toFixed(2)} KB)`);
    const backupJson = JSON.parse(fs.readFileSync(backupPath, "utf8"));
    const keys = Object.keys(backupJson);
    console.log(`Top-level keys in backup JSON: ${keys.join(", ")}`);
    if (backupJson.data) {
      console.log("Tables inside backup data:");
      for (const t of Object.keys(backupJson.data)) {
        console.log(`  - ${t}: ${Array.isArray(backupJson.data[t]) ? backupJson.data[t].length : "not-an-array"} rows`);
      }
    }
    console.log(`Backup metadata:`, backupJson.metadata || backupJson.preflight || "None");
  } else {
    console.log(`Backup file NOT FOUND at: ${backupPath}`);
  }

  // Check if any other backup files or pg_dump files exist in backups/
  const backupsDir = path.join(process.cwd(), "backups");
  if (fs.existsSync(backupsDir)) {
    const listFiles = (dir: string) => {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
          listFiles(full);
        } else {
          console.log(`  ${full.replace(process.cwd(), "")} (${fs.statSync(full).size} bytes)`);
        }
      }
    };
    listFiles(backupsDir);
  }

  await prisma.$disconnect();
  console.log("\n==================================================");
  console.log("INSPECTION COMPLETE");
  console.log("==================================================");
}

runVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});

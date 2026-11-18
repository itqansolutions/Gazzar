import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function runRestoreValidation() {
  console.log("=== RUNNING ISOLATED SQL RESTORE VALIDATION TEST ===");

  // 1. Locate the latest SQL backup
  const backupsDir = path.join(process.cwd(), "backups");
  const sqlBackupDirs = fs
    .readdirSync(backupsDir)
    .filter((d) => d.startsWith("sql-"))
    .sort()
    .reverse();

  if (sqlBackupDirs.length === 0) {
    throw new Error("No SQL backups found in backups/ directory");
  }

  const latestDir = sqlBackupDirs[0];
  const sqlFile = path.join(backupsDir, latestDir, "backup.sql");
  console.log(`Using backup file: ${sqlFile}`);

  if (!fs.existsSync(sqlFile)) {
    throw new Error(`backup.sql not found in ${latestDir}`);
  }

  // 2. Discover all tables in public schema
  const tables: Array<{ tablename: string }> = await prisma.$queryRawUnsafe(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename ASC;
  `);
  console.log(`Discovered ${tables.length} tables in public schema.`);

  // 3. Setup temporary schema
  console.log("\n[1/5] Creating schema 'temp_restore_validation'...");
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS temp_restore_validation;`);

  console.log("[2/5] Creating cloned table structures in temp_restore_validation...");
  for (const { tablename } of tables) {
    // Clone structure with defaults and nullability
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "temp_restore_validation"."${tablename}" (
        LIKE "public"."${tablename}" INCLUDING DEFAULTS
      );
    `);
  }

  // 4. Parse SQL statements and redirect them to temp_restore_validation
  console.log("[3/5] Restoring backup SQL statements into temp_restore_validation...");
  const rawSql = fs.readFileSync(sqlFile, "utf8");

  // Replace "public". with "temp_restore_validation".
  const redirectedSql = rawSql.replace(/"public"\./g, '"temp_restore_validation".');

  const statements = redirectedSql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const upper = s.toUpperCase();
      if (upper === "BEGIN" || upper === "COMMIT" || upper === "ROLLBACK") return false;
      if (s.startsWith("--") && !s.includes("\n")) return false;
      return true;
    });

  console.log(`Executing ${statements.length} redirected SQL statements...`);
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

  let executedCount = 0;
  for (const stmt of statements) {
    const cleanStmt = stmt.replace(/^--[^\n]*\n/gm, "").trim();
    if (!cleanStmt) continue;
    try {
      await prisma.$executeRawUnsafe(cleanStmt);
      executedCount++;
    } catch (err: any) {
      console.error(`Error on statement ${executedCount + 1}:`, err.message);
      throw err;
    }
  }
  console.log(`Successfully executed ${executedCount} statements into temp_restore_validation.`);

  // Reset replication role
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

  // 5. Compare row counts
  console.log("\n[4/5] Comparing row counts between public and temp_restore_validation...");
  const comparisonResults: Array<{
    table: string;
    publicRows: number;
    tempRestoreRows: number;
    match: boolean;
  }> = [];

  let allMatched = true;

  for (const { tablename } of tables) {
    const pubRes: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as cnt FROM "public"."${tablename}";`
    );
    const tempRes: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as cnt FROM "temp_restore_validation"."${tablename}";`
    );

    const publicRows = pubRes[0]?.cnt ?? 0;
    const tempRestoreRows = tempRes[0]?.cnt ?? 0;
    // Note: backup was taken right before deleting the 11 test rows.
    // So tempRestoreRows will have the exact rows from the backup file.
    const isMatch = publicRows === tempRestoreRows;

    comparisonResults.push({
      table: tablename,
      publicRows,
      tempRestoreRows,
      match: isMatch
    });
  }

  console.table(comparisonResults.filter((r) => r.publicRows > 0 || r.tempRestoreRows > 0));

  // 6. Teardown
  console.log("\n[5/5] Dropping schema 'temp_restore_validation' CASCADE...");
  await prisma.$executeRawUnsafe(`DROP SCHEMA temp_restore_validation CASCADE;`);

  const schemaCheck: any[] = await prisma.$queryRawUnsafe(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name = 'temp_restore_validation';
  `);

  const isDropped = schemaCheck.length === 0;
  console.log(`Schema temp_restore_validation confirmed dropped: ${isDropped}`);

  await prisma.$disconnect();
}

runRestoreValidation().catch(async (e) => {
  console.error("Restore validation failed:", e);
  try {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS temp_restore_validation CASCADE;`);
  } catch {}
  await prisma.$disconnect();
  process.exit(1);
});

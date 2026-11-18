import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const prisma = new PrismaClient();

async function inspectMigrations() {
  console.log("=== 2. MIGRATION HISTORY DEEP INSPECTION ===");

  const dbMigrations: any[] = await prisma.$queryRawUnsafe(
    "SELECT id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count FROM _prisma_migrations ORDER BY started_at ASC;"
  );

  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const localDirs = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((d) => fs.statSync(path.join(migrationsDir, d)).isDirectory())
    : [];

  console.log(`Local migration directories count: ${localDirs.length}`);
  console.log(`Database _prisma_migrations records count: ${dbMigrations.length}\n`);

  for (const m of dbMigrations) {
    console.log(`--- Migration Record in DB: ${m.migration_name} (ID: ${m.id}) ---`);
    console.log(`  Started: ${m.started_at?.toISOString()}`);
    console.log(`  Finished: ${m.finished_at ? m.finished_at.toISOString() : "NULL (FAILED)"}`);
    console.log(`  Rolled Back: ${m.rolled_back_at ? m.rolled_back_at.toISOString() : "NO"}`);
    console.log(`  Applied Steps: ${m.applied_steps_count}`);
    console.log(`  DB Checksum: ${m.checksum}`);

    const localPath = path.join(migrationsDir, m.migration_name, "migration.sql");
    const existsLocally = fs.existsSync(localPath);
    console.log(`  Local file exists: ${existsLocally}`);

    if (existsLocally) {
      const sqlContent = fs.readFileSync(localPath);
      // Prisma migration checksum calculation: sha256 of file content
      const localChecksum = crypto.createHash("sha256").update(sqlContent).digest("hex");
      console.log(`  Local Checksum: ${localChecksum}`);
      console.log(`  Checksum Match: ${localChecksum === m.checksum ? "YES" : "NO (MISMATCH)"}`);
      console.log(`  File Size: ${sqlContent.length} bytes`);
    }

    if (m.logs) {
      console.log(`  Logs / Failure Reason:\n    ${m.logs.split("\n")[0]}`);
    }
    console.log();
  }

  // Check if any local migration is NOT in DB
  console.log("--- Checking Local Migrations against DB ---");
  for (const dir of localDirs) {
    const inDb = dbMigrations.find((m) => m.migration_name === dir && m.finished_at && !m.rolled_back_at);
    console.log(`- Folder "${dir}": Active in DB: ${Boolean(inDb)}`);
  }

  await prisma.$disconnect();
}

inspectMigrations().catch(console.error);

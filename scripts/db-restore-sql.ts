/**
 * GX Fitness Academy — Complete PostgreSQL SQL Logical Restore Script
 * 
 * Usage:
 *   npx tsx scripts/db-restore-sql.ts <path-to-backup.sql> --dry-run
 *   npx tsx scripts/db-restore-sql.ts <path-to-backup.sql> --confirm
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function restoreBackup(sqlFilePath: string, isConfirm: boolean) {
  console.log("=== GX FITNESS ACADEMY: POSTGRESQL RESTORE UTILITY ===");
  console.log(`Backup File: ${sqlFilePath}`);
  console.log(`Mode: ${isConfirm ? "LIVE RESTORE (COMMITTING CHANGES)" : "DRY-RUN VERIFICATION (ROLLBACK)"}`);

  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`File not found: ${sqlFilePath}`);
  }

  const rawSql = fs.readFileSync(sqlFilePath, "utf8");
  const statements = rawSql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const upper = s.toUpperCase();
      if (upper === "BEGIN" || upper === "COMMIT" || upper === "ROLLBACK") return false;
      if (s.startsWith("--") && !s.includes("\n")) return false;
      return true;
    });

  console.log(`Statements to execute: ${statements.length}`);
  const startTime = Date.now();
  let count = 0;

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const stmt of statements) {
          const cleanStmt = stmt.replace(/^--[^\n]*\n/gm, "").trim();
          if (!cleanStmt) continue;
          await tx.$executeRawUnsafe(cleanStmt);
          count++;
        }

        if (!isConfirm) {
          console.log(`\n🛡️ Dry-run completed: All ${count} statements executed cleanly with 0 errors.`);
          throw new Error("__DRY_RUN_ROLLBACK__");
        }
      },
      { timeout: 90000, maxWait: 20000 }
    );

    if (isConfirm) {
      console.log(`\n✅ RESTORE COMPLETE! All ${count} statements committed successfully.`);
      console.log(`⏱️ Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    }
  } catch (err: any) {
    if (err.message === "__DRY_RUN_ROLLBACK__") {
      console.log(`🎉 Dry-run validation successful. Database remains unchanged.`);
    } else {
      console.error(`\n❌ RESTORE FAILED at statement #${count}:`, err.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

const args = process.argv.slice(2);
const sqlFile = args.find((a) => a.endsWith(".sql"));
const isConfirm = args.includes("--confirm");

if (!sqlFile) {
  console.error("Usage: npx tsx scripts/db-restore-sql.ts <path/to/backup.sql> [--confirm]");
  process.exit(1);
}

restoreBackup(sqlFile, isConfirm).catch((e) => {
  console.error(e);
  process.exit(1);
});

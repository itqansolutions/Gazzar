import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function testRestore(sqlFilePath: string) {
  console.log("=== EXECUTING SAFE TRANSACTIONAL RESTORE TEST (WITH ROLLBACK) ===");
  console.log(`Target SQL Backup: ${sqlFilePath}`);

  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`File not found: ${sqlFilePath}`);
  }

  const rawSql = fs.readFileSync(sqlFilePath, "utf8");
  console.log(`File size: ${(rawSql.length / 1024).toFixed(2)} KB`);

  // Split into individual SQL statements
  // Filter out comments and transaction control (BEGIN, COMMIT) because we control transaction
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

  console.log(`Total statements to test: ${statements.length}`);

  let executedCount = 0;
  const startTime = Date.now();

  try {
    // Run all statements inside an ACID transaction with ROLLBACK
    await prisma.$transaction(
      async (tx) => {
        for (const stmt of statements) {
          // Clean leading comments
          const cleanStmt = stmt.replace(/^--[^\n]*\n/gm, "").trim();
          if (!cleanStmt) continue;

          await tx.$executeRawUnsafe(cleanStmt);
          executedCount++;
        }

        console.log(`✅ Successfully executed all ${executedCount} DML & replica commands in transaction.`);
        console.log(`⏱️ Execution Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
        console.log(`🛡️ Issuing deliberate ROLLBACK to guarantee live database is untouched...`);
        throw new Error("__DELIBERATE_TEST_ROLLBACK__");
      },
      { timeout: 60000, maxWait: 15000 }
    );
  } catch (err: any) {
    if (err.message === "__DELIBERATE_TEST_ROLLBACK__") {
      console.log(`\n🎉 RESTORE VERIFICATION TEST: 100% PASSED!`);
      console.log(`Every table truncate and insert was executed and validated by PostgreSQL engine with 0 syntax or constraint errors.`);
      console.log(`Live database state was preserved intact via transaction rollback.`);
    } else {
      console.error(`\n❌ RESTORE FAILED at statement #${executedCount}:`, err);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

const backupDir = fs
  .readdirSync("backups")
  .filter((d) => d.startsWith("sql-"))
  .sort()
  .pop();

if (!backupDir) {
  console.error("No SQL backup found in backups/");
  process.exit(1);
}

const targetFile = path.join("backups", backupDir, "backup.sql");
testRestore(targetFile).catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Pre-Flight Full Logical Database Backup & Verification Script
 * Exports all tables from PostgreSQL via Prisma (using raw SQL for complete table coverage including schema metadata)
 * and verifies row counts + JSON integrity.
 * READ-ONLY: does not modify any database records or schema.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups", `preflight-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  // Discover all user tables in public schema
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `);

  const dbMeta = await prisma.$queryRawUnsafe(`
    SELECT current_database() AS db, current_user AS usr, version() AS ver
  `);

  const dump = {
    meta: {
      createdAt: new Date().toISOString(),
      database: dbMeta[0]?.db,
      user: dbMeta[0]?.usr,
      version: dbMeta[0]?.ver,
      tableCount: tables.length,
    },
    tables: {},
  };

  const verification = [];

  for (const { tablename } of tables) {
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "public"."${tablename}"`);
    // Handle BigInt serialization safely if any
    const normalized = JSON.parse(
      JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? v.toString() : v))
    );
    dump.tables[tablename] = normalized;
    verification.push({ table: tablename, liveRows: normalized.length });
  }

  const backupPath = path.join(backupDir, "full-backup.json");
  const jsonContent = JSON.stringify(dump, null, 2);
  fs.writeFileSync(backupPath, jsonContent, "utf8");

  // Compute SHA-256 checksum
  const sha256 = crypto.createHash("sha256").update(jsonContent).digest("hex");
  fs.writeFileSync(path.join(backupDir, "backup.sha256"), `${sha256}  full-backup.json\n`, "utf8");

  // Verify by re-reading and parsing the file
  const reread = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  const rereadHash = crypto.createHash("sha256").update(fs.readFileSync(backupPath, "utf8")).digest("hex");
  let allMatch = rereadHash === sha256;

  for (const v of verification) {
    const savedCount = Array.isArray(reread.tables[v.table]) ? reread.tables[v.table].length : -1;
    v.backupRows = savedCount;
    v.verified = savedCount === v.liveRows;
    if (!v.verified) allMatch = false;
  }

  const stats = fs.statSync(backupPath);

  console.log(JSON.stringify({
    backupDir,
    backupPath,
    sizeBytes: stats.size,
    sha256,
    verified: allMatch,
    timestamp: dump.meta.createdAt,
    tablesVerified: verification.length,
    nonEmptyTables: verification.filter(v => v.liveRows > 0),
  }, null, 2));

  if (!allMatch) {
    throw new Error("Backup verification failed!");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

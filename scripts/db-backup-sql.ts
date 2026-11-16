import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const prisma = new PrismaClient();

function escapeSqlValue(value: any, dataType: string, udtName: string): string {
  if (value === null || value === undefined) return "NULL";

  // 1. JSON / JSONB
  if (dataType === "jsonb" || dataType === "json") {
    const jsonStr = typeof value === "string" ? value : JSON.stringify(value);
    return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
  }

  // 2. PostgreSQL Array (e.g. _text, _BodyPart)
  if (dataType === "ARRAY" || udtName.startsWith("_")) {
    if (Array.isArray(value)) {
      const rawElemType = udtName.startsWith("_") ? udtName.slice(1) : "text";
      const quotedElem = ["text", "varchar", "int", "integer", "boolean", "float8", "numeric"].includes(rawElemType.toLowerCase())
        ? rawElemType
        : `"${rawElemType}"`;
      if (value.length === 0) {
        return `ARRAY[]::${quotedElem}[]`;
      }
      return `ARRAY[${value.map((el) => `'${String(el).replace(/'/g, "''")}'::${quotedElem}`).join(", ")}]`;
    }
  }

  // 3. User-defined Enums
  if (dataType === "USER-DEFINED") {
    return `'${String(value).replace(/'/g, "''")}'::"${udtName}"`;
  }

  // 4. Primitives
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? value.toString() : "NULL";
  if (value instanceof Date) return `'${value.toISOString()}'::timestamp`;

  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }

  // 5. Strings
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function exportSqlBackup() {
  console.log("=== CREATING ACID-COMPLIANT POSTGRESQL SQL LOGICAL BACKUP ===");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups", `sql-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const metaRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT current_database() as db, current_user as usr, version() as ver;`
  );
  const dbMeta = metaRows[0];

  // Discover all base tables in public schema
  const tables: any[] = await prisma.$queryRawUnsafe(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename ASC;
  `);

  const sqlLines: string[] = [];
  sqlLines.push(`-- ============================================================================`);
  sqlLines.push(`-- GX Fitness Academy — Complete Logical PostgreSQL Backup`);
  sqlLines.push(`-- Created At: ${new Date().toISOString()}`);
  sqlLines.push(`-- Database: ${dbMeta?.db} | User: ${dbMeta?.usr}`);
  sqlLines.push(`-- Engine: ${dbMeta?.ver}`);
  sqlLines.push(`-- ============================================================================`);
  sqlLines.push(``);
  sqlLines.push(`BEGIN;`);
  sqlLines.push(``);
  sqlLines.push(`-- Disable triggers and foreign key checks during import`);
  sqlLines.push(`SET session_replication_role = 'replica';`);
  sqlLines.push(``);

  let totalRows = 0;
  const tableSummary: Array<{ table: string; rows: number }> = [];

  for (const { tablename } of tables) {
    // Get column names and types in ordinal order
    const cols: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = '${tablename}'
      ORDER BY ordinal_position ASC;
    `);
    const colNames = cols.map((c) => c.column_name);
    const quotedCols = colNames.map((c) => `"${c}"`).join(", ");

    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "public"."${tablename}"`);
    tableSummary.push({ table: tablename, rows: rows.length });
    totalRows += rows.length;

    sqlLines.push(`-- Table: public."${tablename}" (${rows.length} rows)`);
    sqlLines.push(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);

    if (rows.length > 0) {
      // Chunk inserts in batches of 100 rows
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const valueTuples = chunk.map((row) => {
          const vals = cols.map((col) => escapeSqlValue(row[col.column_name], col.data_type, col.udt_name));
          return `(${vals.join(", ")})`;
        });

        sqlLines.push(
          `INSERT INTO "public"."${tablename}" (${quotedCols}) VALUES\n  ` +
            valueTuples.join(",\n  ") +
            `;`
        );
      }
    }
    sqlLines.push(``);
  }

  sqlLines.push(`-- Re-enable normal foreign key and trigger enforcement`);
  sqlLines.push(`SET session_replication_role = 'origin';`);
  sqlLines.push(``);
  sqlLines.push(`COMMIT;`);
  sqlLines.push(``);

  const sqlContent = sqlLines.join("\n");
  const sqlFile = path.join(backupDir, "backup.sql");
  fs.writeFileSync(sqlFile, sqlContent, "utf8");

  const sha256 = crypto.createHash("sha256").update(sqlContent).digest("hex");
  fs.writeFileSync(path.join(backupDir, "backup.sha256"), `${sha256}  backup.sql\n`, "utf8");

  console.log(`\nBackup generated successfully:`);
  console.log(`  Directory: ${backupDir}`);
  console.log(`  File: backup.sql (${(fs.statSync(sqlFile).size / 1024).toFixed(2)} KB)`);
  console.log(`  SHA-256: ${sha256}`);
  console.log(`  Total Tables: ${tables.length}`);
  console.log(`  Total Rows Dumped: ${totalRows}`);

  await prisma.$disconnect();
  return { backupDir, sqlFile, sha256, totalRows, tablesCount: tables.length };
}

exportSqlBackup().catch((err) => {
  console.error("Backup export error:", err);
  process.exit(1);
});

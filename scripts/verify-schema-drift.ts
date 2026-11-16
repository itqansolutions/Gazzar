import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function checkCatalogParity() {
  console.log("=== INDEPENDENT DIRECT POSTGRESQL CATALOG VS PRISMA SCHEMA AUDIT ===\n");

  // Read schema.prisma to extract model-to-table mappings
  const schemaText = fs.readFileSync("prisma/schema.prisma", "utf8");
  
  // Get all tables in public schema
  const dbTables: any[] = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC;
  `);
  const dbTableSet = new Set(dbTables.map(t => t.table_name));

  // Get all columns in public schema
  const dbColumns: any[] = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  // Get all constraints
  const dbConstraints: any[] = await prisma.$queryRawUnsafe(`
    SELECT cl.relname AS table_name, c.conname, c.contype, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class cl ON cl.oid = c.conrelid
    WHERE n.nspname = 'public';
  `);

  // Get all indexes
  const dbIndexes: any[] = await prisma.$queryRawUnsafe(`
    SELECT tablename AS table_name, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public';
  `);

  console.log(`Live DB Tables count: ${dbTableSet.size}`);
  console.log(`Live DB Columns count: ${dbColumns.length}`);
  console.log(`Live DB Constraints count: ${dbConstraints.length}`);
  console.log(`Live DB Indexes count: ${dbIndexes.length}\n`);

  // Parse models from prisma/schema.prisma
  const modelRegex = /model\s+(\w+)\s+{([\s\S]*?)\n}/g;
  let match;
  const prismaModels: Record<string, { tableName: string; fields: Record<string, any> }> = {};

  while ((match = modelRegex.exec(schemaText)) !== null) {
    const modelName = match[1];
    const body = match[2];

    // Find @@map
    const mapMatch = body.match(/@@map\("([^"]+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : modelName;

    const fields: Record<string, any> = {};
    const lines = body.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
      const parts = line.split(/\s+/);
      const fieldName = parts[0];
      const fieldType = parts[1];
      // Check if it's a scalar/enum field (not a relation)
      // A relation is another model or array of models
      fields[fieldName] = { fieldType, raw: line };
    }

    prismaModels[modelName] = { tableName, fields };
  }

  console.log(`Prisma schema models count: ${Object.keys(prismaModels).length}\n`);

  // Check table existence
  console.log("--- TABLE EXISTENCE RECONCILIATION ---");
  for (const [mName, mData] of Object.entries(prismaModels)) {
    if (!dbTableSet.has(mData.tableName)) {
      console.log(`❌ DRIFT: Prisma model ${mName} maps to table "${mData.tableName}" which DOES NOT EXIST in live DB!`);
    }
  }

  // Check if live DB has tables not in Prisma (e.g. _prisma_migrations)
  for (const t of Array.from(dbTableSet)) {
    const found = Object.values(prismaModels).some(m => m.tableName === t);
    if (!found) {
      console.log(`ℹ️ Live DB extra table: "${t}" (Expected: _prisma_migrations etc.)`);
    }
  }

  // Specifically verify the new consolidation models & columns
  console.log("\n--- PHASE 1 & 2 SCHEMA PARITY CHECK ---");
  const consolidationTables = [
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

  for (const tbl of consolidationTables) {
    const cols = dbColumns.filter(c => c.table_name === tbl);
    const cons = dbConstraints.filter(c => c.table_name === tbl);
    const idxs = dbIndexes.filter(i => i.table_name === tbl);
    console.log(`Table "${tbl}": ${cols.length} cols, ${cons.length} constraints, ${idxs.length} indexes`);
  }

  // Check specific unique index on set_logs: workout_item_round_set_unique
  const uniqueConstraint = dbIndexes.find(i => i.indexname === "workout_item_round_set_unique");
  console.log(`\nUnique constraint "workout_item_round_set_unique" on set_logs:`);
  console.log(`  Found: ${Boolean(uniqueConstraint)}`);
  if (uniqueConstraint) console.log(`  Definition: ${uniqueConstraint.indexdef}`);

  // Check foreign key RESTRICT on set_logs -> assignment_block_items
  const fkSetLogs = dbConstraints.find(c => c.conname === "set_logs_assignmentBlockItemId_fkey");
  console.log(`\nForeign key "set_logs_assignmentBlockItemId_fkey":`);
  console.log(`  Found: ${Boolean(fkSetLogs)}`);
  if (fkSetLogs) console.log(`  Definition: ${fkSetLogs.def}`);

  // Check foreign key RESTRICT on block_items -> exercises
  const fkBlockItemEx = dbConstraints.find(c => c.conname === "block_items_exerciseId_fkey");
  console.log(`\nForeign key "block_items_exerciseId_fkey":`);
  console.log(`  Found: ${Boolean(fkBlockItemEx)}`);
  if (fkBlockItemEx) console.log(`  Definition: ${fkBlockItemEx.def}`);

  // Check foreign key RESTRICT on assignment_block_items -> exercises
  const fkAssignmentBlockItemEx = dbConstraints.find(c => c.conname === "assignment_block_items_exerciseId_fkey");
  console.log(`\nForeign key "assignment_block_items_exerciseId_fkey":`);
  console.log(`  Found: ${Boolean(fkAssignmentBlockItemEx)}`);
  if (fkAssignmentBlockItemEx) console.log(`  Definition: ${fkAssignmentBlockItemEx.def}`);

  // Check updatedAt on set_logs (should have NO default)
  const setLogsUpdatedAt = dbColumns.find(c => c.table_name === "set_logs" && c.column_name === "updatedAt");
  console.log(`\nset_logs.updatedAt column:`);
  console.log(`  Type: ${setLogsUpdatedAt?.data_type}`);
  console.log(`  Nullable: ${setLogsUpdatedAt?.is_nullable}`);
  console.log(`  Default: ${setLogsUpdatedAt?.column_default} (Expected: null / no default)`);

  await prisma.$disconnect();
}

checkCatalogParity().catch(console.error);

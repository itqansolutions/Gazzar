import { execSync } from "child_process";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const dbLine = env.split("\n").find((l) => l.trim().startsWith("DATABASE_URL="));
if (!dbLine) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

const dbUrl = dbLine.slice(dbLine.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");

try {
  // Pass the live database URL via --from-url and the schema via --to-schema-datamodel
  const out = execSync(`npx prisma migrate diff --from-url "${dbUrl}" --to-schema-datamodel prisma/schema.prisma --script`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });

  console.log("=== PRISMA MIGRATE DIFF: LIVE POSTGRESQL URL -> PRISMA SCHEMA ===");
  console.log(out.trim());
} catch (err) {
  console.error("Error executing diff:", err.message);
  if (err.stderr) console.error(err.stderr.toString());
}

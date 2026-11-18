import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function inspectEnvironment() {
  console.log("=== 1. DATABASE ENVIRONMENT IDENTIFICATION ===");
  if (fs.existsSync(".env")) {
    const lines = fs.readFileSync(".env", "utf8").split("\n");
    for (const l of lines) {
      const line = l.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key.includes("DATABASE_URL") || key.includes("POSTGRES")) {
        try {
          const u = new URL(val);
          console.log(`ENV: ${key} -> Host: ${u.hostname}, Port: ${u.port}, Database: ${u.pathname.replace("/", "")}`);
        } catch {
          console.log(`ENV: ${key} -> [Redacted URL]`);
        }
      } else if (key.includes("NODE_ENV") || key.includes("RAILWAY") || key.includes("ENV") || key.includes("PORT")) {
        console.log(`ENV: ${key} -> ${val}`);
      }
    }
  }

  // Database provider and version
  const [version]: any = await prisma.$queryRawUnsafe("SELECT version();");
  const [currentDb]: any = await prisma.$queryRawUnsafe("SELECT current_database(), current_schema(), current_user;");
  console.log("PostgreSQL Version:", version?.version);
  console.log("Current DB Context:", currentDb);

  // Users in DB to check whether this is development or production
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true }
  });
  console.log("User accounts count in DB:", users.length);
  for (const u of users) {
    const domain = u.email.split("@")[1];
    console.log(`- User [${u.role}] name: "${u.name}", email domain: "@${domain}", created: ${u.createdAt.toISOString()}`);
  }

  // Real client profiles
  const clientProfiles = await prisma.clientProfile.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: {
        select: {
          workoutAssignments: true,
          programAssignments: true,
          workoutLogs: true,
          measurements: true
        }
      }
    }
  });
  console.log("\nClient profiles count:", clientProfiles.length);
  for (const cp of clientProfiles) {
    console.log(`- Client "${cp.user?.name}" (ID: ${cp.id}): status=${cp.status}, workouts=${cp._count.workoutAssignments}, programs=${cp._count.programAssignments}, logs=${cp._count.workoutLogs}`);
  }

  await prisma.$disconnect();
}

inspectEnvironment().catch(console.error);

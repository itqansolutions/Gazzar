import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

function resolveDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;

  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        url = match[1];
      }
    }
  } catch {
    // ignore file read error
  }

  // Automatic fallback: If running on local machine and URL still contains internal Railway domain, reroute to public proxy
  if (url && url.includes("postgres.railway.internal")) {
    url = url.replace("postgres.railway.internal:5432", "thomas.proxy.rlwy.net:28890");
  }

  return url;
}

const activeDbUrl = resolveDatabaseUrl();
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; lastUrl?: string };

if (globalForPrisma.prisma && globalForPrisma.lastUrl !== activeDbUrl) {
  globalForPrisma.prisma.$disconnect().catch(() => {});
  delete (globalForPrisma as any).prisma;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: activeDbUrl ? { db: { url: activeDbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

globalForPrisma.lastUrl = activeDbUrl;
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
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

  // Local-only fallback: reroute the internal Railway host to the public proxy ONLY when not running on Railway.
  // On Railway the private network must be used (the public TCP proxy resets idle connections).
  const onRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
  if (!onRailway && url && url.includes("postgres.railway.internal")) {
    url = url.replace("postgres.railway.internal:5432", "thomas.proxy.rlwy.net:28890");
  }

  // Pool tuning (string append so credentials are never re-encoded): bounded pool, fail fast on checkout/connect.
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const extra: string[] = [];
    if (!/[?&]connection_limit=/.test(url)) extra.push("connection_limit=10");
    if (!/[?&]pool_timeout=/.test(url)) extra.push("pool_timeout=20");
    if (!/[?&]connect_timeout=/.test(url)) extra.push("connect_timeout=15");
    if (extra.length) url += (url.includes("?") ? "&" : "?") + extra.join("&");
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
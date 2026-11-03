const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("[SEED] Checking database initialization...");

  try {
    // 1. Check if an ADMIN already exists
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" }
    });

    if (adminCount > 0) {
      console.log(`[SEED] Database already has ${adminCount} ADMIN user(s). Skipping initialization.`);
      return;
    }

    // 2. Safe idempotent one-time provisioning of initial Admin account
    console.log("[SEED] Provisioning initial ADMIN account for GX Fitness Academy...");

    // Pre-computed bcrypt cost-10 hash for G@zzar311311
    const passwordHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";

    const admin = await prisma.user.create({
      data: {
        email: "admin@gx.com",
        name: "Abdullah Elgazzar",
        passwordHash: passwordHash,
        role: "ADMIN"
      }
    });

    console.log(`[SEED] First Admin created successfully: ${admin.email} (ID: ${admin.id})`);
  } catch (err) {
    console.error("[SEED] Error during database initialization:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
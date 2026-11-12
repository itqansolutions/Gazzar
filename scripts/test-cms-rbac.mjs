import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

const ADMIN_ROUTES = [
  "/api/admin-public/packages",
  "/api/admin-public/championships",
  "/api/admin-public/offers",
  "/api/admin-public/coaches",
  "/api/admin-public/settings",
  "/api/admin-public/gallery"
];

const PUBLIC_ROUTES = [
  "/api/public/packages",
  "/api/public/championships",
  "/api/public/offers",
  "/api/public/coaches",
  "/api/public/sports",
  "/api/public/settings"
];

async function createTempSession(userId) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return { rawToken, sessionId: session.id };
}

async function runTests() {
  console.log("==================================================");
  console.log("   GX FITNESS ACADEMY — CMS SECURITY & RBAC AUDIT ");
  console.log("==================================================\n");

  const results = {
    unauthenticatedAdmin: [],
    clientAdmin: [],
    headCoachAdmin: [],
    adminAdmin: [],
    publicEndpoints: [],
    coachPrivacy: null
  };

  // Find sample users for roles
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const headCoachUser = await prisma.user.findFirst({ where: { role: "HEAD_COACH" } });
  const clientUser = await prisma.user.findFirst({ where: { role: "CLIENT" } });

  console.log(`Found test users:`);
  console.log(`- ADMIN: ${adminUser?.email} (${adminUser?.id})`);
  console.log(`- HEAD_COACH: ${headCoachUser?.email} (${headCoachUser?.id})`);
  console.log(`- CLIENT: ${clientUser?.email} (${clientUser?.id})\n`);

  let clientSession = null;
  let headCoachSession = null;
  let adminSession = null;

  try {
    if (clientUser) clientSession = await createTempSession(clientUser.id);
    if (headCoachUser) headCoachSession = await createTempSession(headCoachUser.id);
    if (adminUser) adminSession = await createTempSession(adminUser.id);

    // 1. Unauthenticated requests to /api/admin-public/* (Expected: 401)
    console.log("--- 1. Testing Unauthenticated Access to Admin CMS Routes (Expect 401) ---");
    for (const route of ADMIN_ROUTES) {
      const res = await fetch(`${BASE_URL}${route}`);
      const passed = res.status === 401;
      results.unauthenticatedAdmin.push({ route, status: res.status, passed });
      console.log(`  ${passed ? "✓ PASS" : "✗ FAIL"}: ${route} returned HTTP ${res.status} (expected 401)`);
    }

    // 2. Authenticated CLIENT requests to /api/admin-public/* (Expected: 403)
    console.log("\n--- 2. Testing CLIENT Role Access to Admin CMS Routes (Expect 403) ---");
    if (clientSession) {
      for (const route of ADMIN_ROUTES) {
        const res = await fetch(`${BASE_URL}${route}`, {
          headers: {
            Cookie: `gx_session=${clientSession.rawToken}`
          }
        });
        const passed = res.status === 403;
        results.clientAdmin.push({ route, status: res.status, passed });
        console.log(`  ${passed ? "✓ PASS" : "✗ FAIL"}: ${route} returned HTTP ${res.status} (expected 403)`);
      }
    }

    // 3. Authenticated HEAD_COACH requests to /api/admin-public/* (Expected: 200)
    console.log("\n--- 3. Testing HEAD_COACH Role Access to Admin CMS Routes (Expect 200) ---");
    if (headCoachSession) {
      for (const route of ADMIN_ROUTES) {
        const res = await fetch(`${BASE_URL}${route}`, {
          headers: {
            Cookie: `gx_session=${headCoachSession.rawToken}`
          }
        });
        const passed = res.status === 200;
        results.headCoachAdmin.push({ route, status: res.status, passed });
        console.log(`  ${passed ? "✓ PASS" : "✗ FAIL"}: ${route} returned HTTP ${res.status} (expected 200)`);
      }
    }

    // 4. Authenticated ADMIN requests to /api/admin-public/* (Expected: 200)
    console.log("\n--- 4. Testing ADMIN Role Access to Admin CMS Routes (Expect 200) ---");
    if (adminSession) {
      for (const route of ADMIN_ROUTES) {
        const res = await fetch(`${BASE_URL}${route}`, {
          headers: {
            Cookie: `gx_session=${adminSession.rawToken}`
          }
        });
        const passed = res.status === 200;
        results.adminAdmin.push({ route, status: res.status, passed });
        console.log(`  ${passed ? "✓ PASS" : "✗ FAIL"}: ${route} returned HTTP ${res.status} (expected 200)`);
      }
    }

    // 5. Public endpoints unauthenticated access (Expected: 200)
    console.log("\n--- 5. Testing Unauthenticated Access to Public Endpoints (Expect 200) ---");
    for (const route of PUBLIC_ROUTES) {
      const res = await fetch(`${BASE_URL}${route}`);
      const passed = res.status === 200;
      results.publicEndpoints.push({ route, status: res.status, passed });
      console.log(`  ${passed ? "✓ PASS" : "✗ FAIL"}: ${route} returned HTTP ${res.status} (expected 200)`);
    }

    // 6. API Privacy Audit: GET /api/public/coaches
    console.log("\n--- 6. Testing Privacy Isolation on GET /api/public/coaches ---");
    const coachesRes = await fetch(`${BASE_URL}/api/public/coaches`);
    const coachesJson = await coachesRes.json();
    let privacyPassed = true;
    const violations = [];

    if (coachesJson.success && Array.isArray(coachesJson.data)) {
      for (const coach of coachesJson.data) {
        if ("userId" in coach) {
          violations.push(`Coach "${coach.name}" exposed internal userId`);
          privacyPassed = false;
        }
        if ("email" in coach) {
          violations.push(`Coach "${coach.name}" exposed email`);
          privacyPassed = false;
        }
        if ("phone" in coach) {
          violations.push(`Coach "${coach.name}" exposed phone`);
          privacyPassed = false;
        }
        if ("passwordHash" in coach) {
          violations.push(`Coach "${coach.name}" exposed passwordHash`);
          privacyPassed = false;
        }
      }
    }

    if (privacyPassed) {
      console.log("  ✓ PASS: GET /api/public/coaches strictly sanitizes all PII (no userId, email, phone, or passwordHash).");
    } else {
      console.log("  ✗ FAIL: Privacy violations found:", violations);
    }
    results.coachPrivacy = { passed: privacyPassed, violations };

    console.log("\n==================================================");
    console.log("   AUDIT SUMMARY RESULT: ALL TESTS COMPLETE");
    console.log("==================================================");
  } finally {
    // Clean up temporary sessions
    const sessionIdsToDelete = [
      clientSession?.sessionId,
      headCoachSession?.sessionId,
      adminSession?.sessionId
    ].filter(Boolean);

    if (sessionIdsToDelete.length > 0) {
      await prisma.session.deleteMany({
        where: { id: { in: sessionIdsToDelete } }
      });
      console.log(`\nCleaned up ${sessionIdsToDelete.length} temporary audit test sessions.`);
    }
  }
}

runTests().catch(console.error).finally(() => prisma.$disconnect());

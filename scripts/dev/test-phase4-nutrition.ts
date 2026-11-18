import { PrismaClient, UserRole, GoalType, NutritionAssignmentMode } from "@prisma/client";
import { sessionService } from "../../src/lib/auth/session-service";
import { GET as getLegacyNutrition, POST as postLegacyNutrition } from "../../src/app/api/nutrition/route";
import { PATCH as patchLegacyNutrition, DELETE as deleteLegacyNutrition } from "../../src/app/api/nutrition/[id]/route";
import { GET as getNutritionPrograms, POST as postNutritionProgram } from "../../src/app/api/nutrition-programs/route";
import { GET as getNutritionProgramById, PATCH as patchNutritionProgram, DELETE as deleteNutritionProgram } from "../../src/app/api/nutrition-programs/[id]/route";
import { GET as getAssignments, POST as postAssignment } from "../../src/app/api/nutrition/assignments/route";
import { GET as getDailyLogs, POST as postDailyLog } from "../../src/app/api/nutrition/daily-logs/route";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

function createMockRequest(url: string, method: string, sessionToken?: string, body?: any): NextRequest {
  const headers = new Headers();
  if (sessionToken) headers.set("cookie", `gx_session=${sessionToken}`);
  if (body) headers.set("content-type", "application/json");

  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function run() {
  console.log("================================================================================");
  console.log("=== PHASE 4: NUTRITION LIBRARY & RBAC VERIFICATION SUITE ===");
  console.log("================================================================================");

  const cleanupUserIds: string[] = [];
  const cleanupClientProfileIds: string[] = [];
  const cleanupCoachProfileIds: string[] = [];
  const cleanupProgramIds: string[] = [];
  const cleanupAssignmentIds: string[] = [];
  const cleanupLogIds: string[] = [];
  const cleanupMealPlanIds: string[] = [];
  const cleanupAuditLogIds: string[] = [];

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string, details?: any) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      if (details) console.error("     Details:", details);
    }
  }

  try {
    // 0. Setup throwaway actors
    console.log("\n[SETUP] Creating throwaway actors (Admin, Coach A, Coach B, Client A, Client B)...");
    const dummyHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";

    // Admin
    const adminUser = await prisma.user.create({
      data: {
        email: `throwaway.p4.admin.${Date.now()}@gx.test`,
        name: "Throwaway P4 Admin",
        role: UserRole.ADMIN,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(adminUser.id);
    const adminSession = await sessionService.createSession({ userId: adminUser.id });

    // Coach A
    const coachAUser = await prisma.user.create({
      data: {
        email: `throwaway.p4.coacha.${Date.now()}@gx.test`,
        name: "Throwaway P4 Coach A",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P4 Coach A" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coachAUser.id);
    cleanupCoachProfileIds.push(coachAUser.coachProfile!.id);
    const coachASession = await sessionService.createSession({ userId: coachAUser.id });

    // Coach B
    const coachBUser = await prisma.user.create({
      data: {
        email: `throwaway.p4.coachb.${Date.now()}@gx.test`,
        name: "Throwaway P4 Coach B",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P4 Coach B" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coachBUser.id);
    cleanupCoachProfileIds.push(coachBUser.coachProfile!.id);
    const coachBSession = await sessionService.createSession({ userId: coachBUser.id });

    // Client A (Assigned to Coach A)
    const clientAUser = await prisma.user.create({
      data: {
        email: `throwaway.p4.clienta.${Date.now()}@gx.test`,
        name: "Throwaway P4 Client A",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: {} }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(clientAUser.id);
    cleanupClientProfileIds.push(clientAUser.clientProfile!.id);
    const clientASession = await sessionService.createSession({ userId: clientAUser.id });

    // Assign Client A to Coach A
    await prisma.clientCoachAssignment.create({
      data: {
        clientId: clientAUser.clientProfile!.id,
        coachId: coachAUser.coachProfile!.id,
        active: true
      }
    });

    // Client B (Assigned to Coach B, Unassigned to Coach A)
    const clientBUser = await prisma.user.create({
      data: {
        email: `throwaway.p4.clientb.${Date.now()}@gx.test`,
        name: "Throwaway P4 Client B",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: {} }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(clientBUser.id);
    cleanupClientProfileIds.push(clientBUser.clientProfile!.id);
    const clientBSession = await sessionService.createSession({ userId: clientBUser.id });

    await prisma.clientCoachAssignment.create({
      data: {
        clientId: clientBUser.clientProfile!.id,
        coachId: coachBUser.coachProfile!.id,
        active: true
      }
    });

    // -------------------------------------------------------------------------
    // TEST SUITE 1: Legacy MealPlan API Deprecation Headers
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Verifying /api/nutrition Deprecation Headers (Warning: 299)...");
    {
      const reqGet = createMockRequest("/api/nutrition", "GET", adminSession.sessionToken);
      const resGet = await getLegacyNutrition(reqGet);
      const warnHeader = resGet.headers.get("Warning");
      const deprHeader = resGet.headers.get("X-API-Deprecated");

      assert(resGet.status === 200, "GET /api/nutrition returns 200 OK");
      assert(Boolean(warnHeader && warnHeader.includes("299")), `GET /api/nutrition emits Warning: 299 header (${warnHeader})`);
      assert(deprHeader === "true", "GET /api/nutrition emits X-API-Deprecated: true");

      // Test POST deprecation header
      const reqPost = createMockRequest("/api/nutrition", "POST", adminSession.sessionToken, {
        clientId: clientAUser.clientProfile!.id,
        title: "Legacy Meal Plan Deprecation Test"
      });
      const resPost = await postLegacyNutrition(reqPost);
      const postJson = await resPost.json();
      if (postJson?.data?.id) cleanupMealPlanIds.push(postJson.data.id);

      assert(resPost.status === 201, "POST /api/nutrition returns 201 Created");
      assert(Boolean(resPost.headers.get("Warning")?.includes("299")), "POST /api/nutrition emits Warning: 299 header");
      assert(resPost.headers.get("X-API-Deprecated") === "true", "POST /api/nutrition emits X-API-Deprecated: true");

      // Test PATCH deprecation header
      if (postJson?.data?.id) {
        const reqPatch = createMockRequest(`/api/nutrition/${postJson.data.id}`, "PATCH", adminSession.sessionToken, {
          title: "Updated Legacy Plan"
        });
        const resPatch = await patchLegacyNutrition(reqPatch, { params: Promise.resolve({ id: postJson.data.id }) });
        assert(resPatch.headers.get("Warning")?.includes("299"), "PATCH /api/nutrition/[id] emits Warning: 299 header");

        // Test DELETE deprecation header
        const reqDelete = createMockRequest(`/api/nutrition/${postJson.data.id}`, "DELETE", adminSession.sessionToken);
        const resDelete = await deleteLegacyNutrition(reqDelete, { params: Promise.resolve({ id: postJson.data.id }) });
        assert(resDelete.headers.get("Warning")?.includes("299"), "DELETE /api/nutrition/[id] emits Warning: 299 header");
      }
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 2: NutritionProgram Nullable Targets (No Fake Defaults)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Verifying NutritionProgram Nullable Targets & No Fake Defaults...");
    let program1Id = "";
    {
      const reqCreate = createMockRequest("/api/nutrition-programs", "POST", coachASession.sessionToken, {
        title: "P4 Pure Nullable Macro Program",
        description: "Testing nullable targets",
        goalType: GoalType.HYPERTROPHY,
        dailyCalories: null,
        proteinGrams: null,
        carbsGrams: null,
        fatsGrams: null,
        waterLiters: null
      });

      const resCreate = await postNutritionProgram(reqCreate);
      const jsonCreate = await resCreate.json();
      assert(resCreate.status === 201, "POST /api/nutrition-programs with null targets returns 201 Created");

      program1Id = jsonCreate?.data?.id;
      if (program1Id) cleanupProgramIds.push(program1Id);

      // Verify in Database that fields are genuinely NULL and NOT 2000 / 150
      const dbRow = await prisma.nutritionProgram.findUnique({ where: { id: program1Id } });
      assert(dbRow?.dailyCalories === null, `dailyCalories is strictly NULL (Actual: ${dbRow?.dailyCalories})`);
      assert(dbRow?.proteinGrams === null, `proteinGrams is strictly NULL (Actual: ${dbRow?.proteinGrams})`);
      assert(dbRow?.carbsGrams === null, `carbsGrams is strictly NULL (Actual: ${dbRow?.carbsGrams})`);
      assert(dbRow?.fatsGrams === null, `fatsGrams is strictly NULL (Actual: ${dbRow?.fatsGrams})`);
      assert(dbRow?.waterLiters === null, `waterLiters is strictly NULL (Actual: ${dbRow?.waterLiters})`);
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 3: AuditLog Row Generation for NutritionProgram
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Verifying AuditLog Rows (CREATE, UPDATE, ARCHIVE, DELETE)...");
    {
      // 1. Verify CREATE audit row
      const createAudit = await prisma.auditLog.findFirst({
        where: { entityType: "NutritionProgram", entityId: program1Id, action: "CREATE_NUTRITION_PROGRAM" }
      });
      assert(Boolean(createAudit), "AuditLog row written for CREATE_NUTRITION_PROGRAM");
      if (createAudit) cleanupAuditLogIds.push(createAudit.id);

      // 2. Perform UPDATE
      const reqUpdate = createMockRequest(`/api/nutrition-programs/${program1Id}`, "PATCH", coachASession.sessionToken, {
        title: "P4 Updated Macro Program",
        dailyCalories: 2500,
        proteinGrams: 180
      });
      const resUpdate = await patchNutritionProgram(reqUpdate, { params: Promise.resolve({ id: program1Id }) });
      assert(resUpdate.status === 200, "PATCH /api/nutrition-programs/[id] returns 200 OK");

      const updateAudit = await prisma.auditLog.findFirst({
        where: { entityType: "NutritionProgram", entityId: program1Id, action: "UPDATE_NUTRITION_PROGRAM" }
      });
      assert(Boolean(updateAudit), "AuditLog row written for UPDATE_NUTRITION_PROGRAM");
      if (updateAudit) cleanupAuditLogIds.push(updateAudit.id);

      // 3. Perform ARCHIVE
      const reqArchive = createMockRequest(`/api/nutrition-programs/${program1Id}`, "PATCH", coachASession.sessionToken, {
        isActive: false
      });
      const resArchive = await patchNutritionProgram(reqArchive, { params: Promise.resolve({ id: program1Id }) });
      assert(resArchive.status === 200, "ARCHIVE /api/nutrition-programs/[id] returns 200 OK");

      const archiveAudit = await prisma.auditLog.findFirst({
        where: { entityType: "NutritionProgram", entityId: program1Id, action: "ARCHIVE_NUTRITION_PROGRAM" }
      });
      assert(Boolean(archiveAudit), "AuditLog row written for ARCHIVE_NUTRITION_PROGRAM");
      if (archiveAudit) cleanupAuditLogIds.push(archiveAudit.id);
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Referential Integrity & 409 Conflict on Referenced Delete
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Verifying 409 Conflict on Deleting Referenced NutritionProgram...");
    {
      // Assign program1 to Client A
      const assignment = await prisma.clientNutritionAssignment.create({
        data: {
          clientId: clientAUser.clientProfile!.id,
          nutritionProgramId: program1Id,
          title: "Assigned Reference Test",
          mode: NutritionAssignmentMode.INHERITED,
          dailyCalories: 2500
        }
      });
      cleanupAssignmentIds.push(assignment.id);

      // Attempt to DELETE program1 -> must return 409 Conflict
      const reqDeleteRef = createMockRequest(`/api/nutrition-programs/${program1Id}`, "DELETE", coachASession.sessionToken);
      const resDeleteRef = await deleteNutritionProgram(reqDeleteRef, { params: Promise.resolve({ id: program1Id }) });
      const jsonDeleteRef = await resDeleteRef.json();

      assert(resDeleteRef.status === 409, `DELETE referenced nutrition program returns 409 Conflict (Actual: ${resDeleteRef.status})`);
      assert(jsonDeleteRef.error.includes("linked to"), `Conflict error contains reference details (${jsonDeleteRef.error})`);

      // Remove assignment so we can test clean deletion later
      await prisma.clientNutritionAssignment.delete({ where: { id: assignment.id } });
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 5: RBAC & Cross-Athlete Access Controls
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Verifying RBAC & Cross-Athlete Access Controls...");
    {
      // Create fresh assignment for Client A
      const assignA = await prisma.clientNutritionAssignment.create({
        data: {
          clientId: clientAUser.clientProfile!.id,
          title: "Client A Private Diet",
          mode: NutritionAssignmentMode.MANUAL,
          dailyCalories: 2200
        }
      });
      cleanupAssignmentIds.push(assignA.id);

      // Create fresh assignment for Client B
      const assignB = await prisma.clientNutritionAssignment.create({
        data: {
          clientId: clientBUser.clientProfile!.id,
          title: "Client B Private Diet",
          mode: NutritionAssignmentMode.MANUAL,
          dailyCalories: 1800
        }
      });
      cleanupAssignmentIds.push(assignB.id);

      // 1. Client A queries own assignments -> 200 OK
      const reqClientAOwn = createMockRequest(`/api/nutrition/assignments?clientId=${clientAUser.clientProfile!.id}`, "GET", clientASession.sessionToken);
      const resClientAOwn = await getAssignments(reqClientAOwn);
      assert(resClientAOwn.status === 200, "CLIENT accessing own nutrition assignments returns 200 OK");

      // 2. Client A queries Client B's assignments -> 403 Forbidden
      const reqClientACross = createMockRequest(`/api/nutrition/assignments?clientId=${clientBUser.clientProfile!.id}`, "GET", clientASession.sessionToken);
      const resClientACross = await getAssignments(reqClientACross);
      assert(resClientACross.status === 403, "CLIENT accessing another athlete's assignments returns 403 Forbidden");

      // 3. Coach A queries Client A (assigned) -> 200 OK
      const reqCoachAAssigned = createMockRequest(`/api/nutrition/assignments?clientId=${clientAUser.clientProfile!.id}`, "GET", coachASession.sessionToken);
      const resCoachAAssigned = await getAssignments(reqCoachAAssigned);
      assert(resCoachAAssigned.status === 200, "COACH accessing assigned athlete returns 200 OK");

      // 4. Coach A queries Client B (unassigned) -> 403 Forbidden
      const reqCoachAUnassigned = createMockRequest(`/api/nutrition/assignments?clientId=${clientBUser.clientProfile!.id}`, "GET", coachASession.sessionToken);
      const resCoachAUnassigned = await getAssignments(reqCoachAUnassigned);
      assert(resCoachAUnassigned.status === 403, "COACH accessing unassigned athlete returns 403 Forbidden");

      // 5. DailyNutritionLogs: Client A accessing Client B's daily log -> 403 Forbidden
      const reqLogCross = createMockRequest(`/api/nutrition/daily-logs?clientId=${clientBUser.clientProfile!.id}&date=2026-11-17`, "GET", clientASession.sessionToken);
      const resLogCross = await getDailyLogs(reqLogCross);
      assert(resLogCross.status === 403, "CLIENT accessing another athlete's DailyNutritionLog returns 403 Forbidden");
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 6: Immutable Snapshot Decoupling
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Verifying Immutable Snapshot Decoupling...");
    {
      // 1. Create a parent nutrition template with 2800 kcal
      const parent = await prisma.nutritionProgram.create({
        data: {
          title: "Hypertrophy Master 2800",
          dailyCalories: 2800,
          proteinGrams: 200
        }
      });
      cleanupProgramIds.push(parent.id);

      // 2. Assign to Client A
      const clientAssign = await prisma.clientNutritionAssignment.create({
        data: {
          clientId: clientAUser.clientProfile!.id,
          nutritionProgramId: parent.id,
          title: parent.title,
          dailyCalories: parent.dailyCalories,
          proteinGrams: parent.proteinGrams,
          mode: NutritionAssignmentMode.INHERITED
        }
      });
      cleanupAssignmentIds.push(clientAssign.id);

      // 3. Mutate the parent template to 3500 kcal
      await prisma.nutritionProgram.update({
        where: { id: parent.id },
        data: { dailyCalories: 3500, proteinGrams: 250 }
      });

      // 4. Verify athlete assignment retains original 2800 kcal snapshot
      const refreshedAssign = await prisma.clientNutritionAssignment.findUnique({
        where: { id: clientAssign.id }
      });
      assert(refreshedAssign?.dailyCalories === 2800, `Athlete assignment snapshot retained 2800 kcal (Actual: ${refreshedAssign?.dailyCalories})`);
      assert(refreshedAssign?.proteinGrams === 200, `Athlete assignment snapshot retained 200g protein (Actual: ${refreshedAssign?.proteinGrams})`);
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 7: Daily Nutrition Log Unique Constraint & Upsert
    // -------------------------------------------------------------------------
    console.log("\n[TEST 7] Verifying Daily Nutrition Log Unique Constraint (No Duplicate Rows)...");
    {
      const dateKey = "2026-11-17";
      const parsedDate = new Date(`${dateKey}T00:00:00.000Z`);

      // 1. First entry
      const log1 = await prisma.dailyNutritionLog.upsert({
        where: { clientId_date: { clientId: clientAUser.clientProfile!.id, date: parsedDate } },
        create: {
          clientId: clientAUser.clientProfile!.id,
          date: parsedDate,
          calories: 2100,
          proteinGrams: 160
        },
        update: {}
      });
      cleanupLogIds.push(log1.id);

      // 2. Second entry on same date -> updates log1 instead of inserting new row
      const log2 = await prisma.dailyNutritionLog.upsert({
        where: { clientId_date: { clientId: clientAUser.clientProfile!.id, date: parsedDate } },
        create: {
          clientId: clientAUser.clientProfile!.id,
          date: parsedDate,
          calories: 2350,
          proteinGrams: 175
        },
        update: {
          calories: 2350,
          proteinGrams: 175
        }
      });

      assert(log1.id === log2.id, `Upsert on same date updated existing row without creating duplicate (ID: ${log1.id})`);
      assert(log2.calories === 2350, `Updated calories persisted correctly (${log2.calories})`);

      const totalLogsForDate = await prisma.dailyNutritionLog.count({
        where: { clientId: clientAUser.clientProfile!.id, date: parsedDate }
      });
      assert(totalLogsForDate === 1, `Exactly 1 log row exists for (clientId, date) (Actual: ${totalLogsForDate})`);
    }

    // Clean deletion of program1 to verify DELETE audit log
    {
      const reqDeleteClean = createMockRequest(`/api/nutrition-programs/${program1Id}`, "DELETE", coachASession.sessionToken);
      const resDeleteClean = await deleteNutritionProgram(reqDeleteClean, { params: Promise.resolve({ id: program1Id }) });
      assert(resDeleteClean.status === 200, "Clean DELETE /api/nutrition-programs/[id] returns 200 OK");

      const deleteAudit = await prisma.auditLog.findFirst({
        where: { entityType: "NutritionProgram", entityId: program1Id, action: "DELETE_NUTRITION_PROGRAM" }
      });
      assert(Boolean(deleteAudit), "AuditLog row written for DELETE_NUTRITION_PROGRAM");
      if (deleteAudit) cleanupAuditLogIds.push(deleteAudit.id);
    }

  } catch (err: any) {
    console.error("Test execution failed:", err);
    assert(false, "Phase 4 test suite crashed", err.message);
  } finally {
    console.log("\n[TEARDOWN] Cleaning up all throwaway test entities...");

    // Delete in FK-safe order
    if (cleanupLogIds.length > 0) {
      await prisma.dailyNutritionLog.deleteMany({ where: { id: { in: cleanupLogIds } } });
      console.log(`   - Deleted DailyNutritionLogs: ${cleanupLogIds.length}`);
    }
    if (cleanupAssignmentIds.length > 0) {
      await prisma.clientNutritionAssignment.deleteMany({ where: { id: { in: cleanupAssignmentIds } } });
      console.log(`   - Deleted ClientNutritionAssignments: ${cleanupAssignmentIds.length}`);
    }
    if (cleanupMealPlanIds.length > 0) {
      await prisma.mealPlan.deleteMany({ where: { id: { in: cleanupMealPlanIds } } });
      console.log(`   - Deleted MealPlans: ${cleanupMealPlanIds.length}`);
    }
    if (cleanupProgramIds.length > 0) {
      await prisma.nutritionProgram.deleteMany({ where: { id: { in: cleanupProgramIds } } });
      console.log(`   - Deleted NutritionPrograms: ${cleanupProgramIds.length}`);
    }
    if (cleanupAuditLogIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { id: { in: cleanupAuditLogIds } } });
      console.log(`   - Deleted AuditLogs: ${cleanupAuditLogIds.length}`);
    }
    if (cleanupClientProfileIds.length > 0) {
      await prisma.clientCoachAssignment.deleteMany({ where: { clientId: { in: cleanupClientProfileIds } } });
      await prisma.clientProfile.deleteMany({ where: { id: { in: cleanupClientProfileIds } } });
      console.log(`   - Deleted ClientProfiles: ${cleanupClientProfileIds.length}`);
    }
    if (cleanupCoachProfileIds.length > 0) {
      await prisma.coachProfile.deleteMany({ where: { id: { in: cleanupCoachProfileIds } } });
      console.log(`   - Deleted CoachProfiles: ${cleanupCoachProfileIds.length}`);
    }
    if (cleanupUserIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: cleanupUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
      console.log(`   - Deleted Users: ${cleanupUserIds.length}`);
    }

    await prisma.$disconnect();

    console.log("================================================================================");
    console.log(`=== PHASE 4 SUMMARY: ${passed}/${total} Assertions Passed ===`);
    console.log("================================================================================");
  }
}

run();

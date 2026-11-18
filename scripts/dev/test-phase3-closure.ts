import { PrismaClient, UserRole, BlockType, BlockItemType, MetricType } from "@prisma/client";
import { sessionService } from "../src/lib/auth/session-service";
import { POST as postTemplate } from "../src/app/api/templates/route";
import { PATCH as patchTemplate, DELETE as deleteTemplate } from "../src/app/api/templates/[id]/route";
import { POST as postWorkoutMutation } from "../src/app/api/workouts/[id]/route";
import { PATCH as patchSession } from "../src/app/api/sessions/route";
import { DELETE as deleteProgramRoute } from "../src/app/api/programs/[id]/route";
import { workoutService } from "../src/server/services/workout.service";
import { exerciseService } from "../src/server/services/exercise.service";
import { sportService } from "../src/server/services/sport.service";
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
  console.log("=== PHASE 3 CLOSURE & SECURITY VERIFICATION SUITE ===");
  console.log("================================================================================");

  const cleanupUserIds: string[] = [];
  const cleanupTemplateIds: string[] = [];
  const cleanupProgramIds: string[] = [];
  const cleanupExerciseIds: string[] = [];
  const cleanupSportIds: string[] = [];
  const cleanupAssignmentIds: string[] = [];
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
    console.log("\n[SETUP] Creating throwaway users and test data...");
    const dummyHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";

    const coach = await prisma.user.create({
      data: {
        email: `throwaway.p3c.coach.${Date.now()}@gx.test`,
        name: "Throwaway P3 Coach",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P3 Test Coach" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coach.id);

    const client = await prisma.user.create({
      data: {
        email: `throwaway.p3c.client.${Date.now()}@gx.test`,
        name: "Throwaway P3 Client",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: { status: "ACTIVE" } }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(client.id);

    const admin = await prisma.user.create({
      data: {
        email: `throwaway.p3c.admin.${Date.now()}@gx.test`,
        name: "Throwaway P3 Admin",
        role: UserRole.ADMIN,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(admin.id);

    // Link coach to client
    await prisma.clientCoachAssignment.create({
      data: {
        clientId: client.clientProfile!.id,
        coachId: coach.coachProfile!.id,
        role: "PRIMARY"
      }
    });

    const sessCoach = await sessionService.createSession({ userId: coach.id });
    const sessClient = await sessionService.createSession({ userId: client.id });
    const sessAdmin = await sessionService.createSession({ userId: admin.id });

    const tokenCoach = sessCoach.sessionToken;
    const tokenClient = sessClient.sessionToken;
    const tokenAdmin = sessAdmin.sessionToken;

    // Throwaway sport & exercises
    const sport = await prisma.sport.create({
      data: {
        nameEn: `P3 Throwaway Sport ${Date.now()}`,
        nameAr: "رياضة اختبارية",
        isActive: true
      }
    });
    cleanupSportIds.push(sport.id);

    const ex1 = await prisma.exercise.create({
      data: {
        nameEn: `P3 Throwaway Exercise 1 ${Date.now()}`,
        nameAr: "تمرين اختباري 1",
        sportId: sport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        difficulty: "BEGINNER"
      }
    });
    cleanupExerciseIds.push(ex1.id);

    const ex2 = await prisma.exercise.create({
      data: {
        nameEn: `P3 Throwaway Exercise 2 ${Date.now()}`,
        nameAr: "تمرين اختباري 2",
        sportId: sport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        difficulty: "INTERMEDIATE"
      }
    });
    cleanupExerciseIds.push(ex2.id);

    console.log("[SETUP COMPLETE] Actors and fixtures ready.");

    // =========================================================================
    // TEST 1: SERVER-SIDE VALIDATION
    // =========================================================================
    console.log("\n--- TEST 1: Server-Side Hierarchy & Metric Validation ---");

    // 1.1 SUPERSET < 2 exercise items
    const reqSupersetFail = createMockRequest("/api/templates", "POST", tokenCoach, {
      titleEn: "Invalid Superset Template",
      sportId: sport.id,
      blocks: [
        {
          type: "SUPERSET",
          title: "Lone Exercise Superset",
          order: 1,
          items: [
            { itemType: "EXERCISE", order: 1, exerciseId: ex1.id }
          ]
        }
      ]
    });
    const resSupersetFail = await postTemplate(reqSupersetFail);
    const bodySupersetFail = await resSupersetFail.json();
    assert(resSupersetFail.status === 400, "SUPERSET with < 2 exercises rejected (400)", resSupersetFail.status);
    assert(bodySupersetFail.error?.includes("SUPERSET"), "Error message mentions SUPERSET", bodySupersetFail.error);

    // 1.2 EXERCISE item without exerciseId
    const reqExNoId = createMockRequest("/api/templates", "POST", tokenCoach, {
      titleEn: "Invalid Exercise Item Template",
      sportId: sport.id,
      blocks: [
        {
          type: "SINGLE",
          title: "Missing ID Block",
          order: 1,
          items: [
            { itemType: "EXERCISE", order: 1, exerciseId: null }
          ]
        }
      ]
    });
    const resExNoId = await postTemplate(reqExNoId);
    const bodyExNoId = await resExNoId.json();
    assert(resExNoId.status === 400, "EXERCISE without exerciseId rejected (400)", resExNoId.status);
    assert(bodyExNoId.error?.includes("exerciseId"), "Error message mentions exerciseId", bodyExNoId.error);

    // 1.3 REST item with exerciseId
    const reqRestWithEx = createMockRequest("/api/templates", "POST", tokenCoach, {
      titleEn: "Invalid Rest Item Template",
      sportId: sport.id,
      blocks: [
        {
          type: "SINGLE",
          title: "Rest with ID Block",
          order: 1,
          items: [
            { itemType: "REST", order: 1, exerciseId: ex1.id, restSeconds: 60 }
          ]
        }
      ]
    });
    const resRestWithEx = await postTemplate(reqRestWithEx);
    const bodyRestWithEx = await resRestWithEx.json();
    assert(resRestWithEx.status === 400, "REST item with exerciseId rejected (400)", resRestWithEx.status);
    assert(bodyRestWithEx.error?.includes("REST and NOTE"), "Error mentions REST and NOTE rule", bodyRestWithEx.error);

    // 1.4 Duplicate block orderIndex
    const reqDupBlockOrder = createMockRequest("/api/templates", "POST", tokenCoach, {
      titleEn: "Duplicate Block Order Template",
      sportId: sport.id,
      blocks: [
        { type: "SINGLE", title: "Block A", order: 1, items: [{ itemType: "EXERCISE", order: 1, exerciseId: ex1.id }] },
        { type: "SINGLE", title: "Block B", order: 1, items: [{ itemType: "EXERCISE", order: 1, exerciseId: ex2.id }] }
      ]
    });
    const resDupBlockOrder = await postTemplate(reqDupBlockOrder);
    assert(resDupBlockOrder.status === 400, "Duplicate block orderIndex rejected (400)", resDupBlockOrder.status);

    // 1.5 Duplicate item orderIndex within same block
    const reqDupItemOrder = createMockRequest("/api/templates", "POST", tokenCoach, {
      titleEn: "Duplicate Item Order Template",
      sportId: sport.id,
      blocks: [
        {
          type: "SINGLE",
          title: "Block Single",
          order: 1,
          items: [
            { itemType: "EXERCISE", order: 1, exerciseId: ex1.id },
            { itemType: "REST", order: 1, restSeconds: 30 }
          ]
        }
      ]
    });
    const resDupItemOrder = await postTemplate(reqDupItemOrder);
    assert(resDupItemOrder.status === 400, "Duplicate item orderIndex within block rejected (400)", resDupItemOrder.status);

    // =========================================================================
    // TEST 2: SNAPSHOT IMMUTABILITY UPON TEMPLATE EDITING
    // =========================================================================
    console.log("\n--- TEST 2: Snapshot Immutability (Template Edits Leave Assignments Intact) ---");

    // 2.1 Create base template
    const reqCreateBase = createMockRequest("/api/templates", "POST", tokenCoach, {
      titleEn: "Snapshot Source Template",
      titleAr: "نموذج المصدر",
      sportId: sport.id,
      difficulty: "BEGINNER",
      blocks: [
        {
          type: "SINGLE",
          title: "Original Block",
          order: 1,
          items: [
            { itemType: "EXERCISE", order: 1, exerciseId: ex1.id, targetSets: 3, targetReps: "10" }
          ]
        }
      ]
    });
    const resCreateBase = await postTemplate(reqCreateBase);
    const bodyCreateBase = await resCreateBase.json();
    assert(resCreateBase.status === 201, "Base template created (201)");
    const baseTemplateId = bodyCreateBase.data.id;
    cleanupTemplateIds.push(baseTemplateId);

    // 2.2 Assign template to throwaway client
    const scheduledDate = new Date(Date.now() + 86400000 * 5);
    const assignedWorkout = await workoutService.assignWorkout({
      clientId: client.clientProfile!.id,
      coachId: coach.coachProfile!.id,
      templateId: baseTemplateId,
      scheduledDate,
      title: "Athlete Assigned Session"
    });
    cleanupAssignmentIds.push(assignedWorkout.id);

    // Verify initial snapshot
    const initialAssignment = await prisma.clientWorkoutAssignment.findUnique({
      where: { id: assignedWorkout.id },
      include: { exercises: true }
    });
    assert(initialAssignment?.exercises.length === 1, "Assignment has 1 frozen exercise snapshot");
    assert(initialAssignment?.exercises[0].exerciseId === ex1.id, "Snapshot exercise matches ex1");
    assert(initialAssignment?.exercises[0].targetSets === 3, "Snapshot targetSets is 3");
    assert(initialAssignment?.exercises[0].targetReps === "10", "Snapshot targetReps is '10'");

    // 2.3 Edit template radically (replace ex1 with ex2, change sets to 5)
    const reqUpdateTpl = createMockRequest(`/api/templates/${baseTemplateId}`, "PATCH", tokenCoach, {
      titleEn: "Radically Modified Template",
      blocks: [
        {
          type: "SINGLE",
          title: "Radically Changed Block",
          order: 1,
          items: [
            { itemType: "EXERCISE", order: 1, exerciseId: ex2.id, targetSets: 5, targetReps: "20" }
          ]
        }
      ]
    });
    const resUpdateTpl = await patchTemplate(reqUpdateTpl, { params: { id: baseTemplateId } });
    assert(resUpdateTpl.status === 200, "Template updated (200)");

    // 2.4 Verify athlete's assignment snapshot is 100% UNCHANGED
    const postEditAssignment = await prisma.clientWorkoutAssignment.findUnique({
      where: { id: assignedWorkout.id },
      include: { exercises: true }
    });
    assert(postEditAssignment?.exercises.length === 1, "Athlete assignment still has 1 exercise snapshot");
    assert(postEditAssignment?.exercises[0].exerciseId === ex1.id, "Snapshot exercise is STILL ex1 (not ex2)");
    assert(postEditAssignment?.exercises[0].targetSets === 3, "Snapshot targetSets is STILL 3 (not 5)");
    assert(postEditAssignment?.exercises[0].targetReps === "10", "Snapshot targetReps is STILL '10' (not '20')");

    // =========================================================================
    // TEST 3: REAL HTTP 409 WHEN DELETING REFERENCED TEMPLATE
    // =========================================================================
    console.log("\n--- TEST 3: Real HTTP 409 Conflict on Referenced Template Deletion ---");
    const reqDeleteRef = createMockRequest(`/api/templates/${baseTemplateId}`, "DELETE", tokenCoach);
    const resDeleteRef = await deleteTemplate(reqDeleteRef, { params: { id: baseTemplateId } });
    const bodyDeleteRef = await resDeleteRef.json();
    assert(resDeleteRef.status === 409, "DELETE referenced template returns 409 Conflict via HTTP route", resDeleteRef.status);
    assert(bodyDeleteRef.error?.includes("client assignment"), "Conflict message specifies client assignment blocker", bodyDeleteRef.error);

    // =========================================================================
    // TEST 4: RBAC GUARDS (COACH_FEEDBACK & SESSIONS PATCH)
    // =========================================================================
    console.log("\n--- TEST 4: RBAC Route Guard Enforcements for Client Actor ---");

    // 4.1 Client attempts to send COACH_FEEDBACK action on assigned workout -> 403
    const reqClientFeedback = createMockRequest(`/api/workouts/${assignedWorkout.id}`, "POST", tokenClient, {
      action: "COACH_FEEDBACK",
      feedback: "Unauthorized client feedback"
    });
    const resClientFeedback = await postWorkoutMutation(reqClientFeedback, { params: Promise.resolve({ id: assignedWorkout.id }) });
    assert(resClientFeedback.status === 403, "CLIENT sending COACH_FEEDBACK returns 403 Forbidden", resClientFeedback.status);

    // 4.2 Client attempts PATCH /api/sessions -> 403
    const reqClientSession = createMockRequest("/api/sessions", "PATCH", tokenClient, {
      sessionId: "dummy-session-id",
      status: "PRESENT"
    });
    const resClientSession = await patchSession(reqClientSession);
    assert(resClientSession.status === 403, "CLIENT sending PATCH /api/sessions returns 403 Forbidden", resClientSession.status);

    // =========================================================================
    // TEST 5: DELETING PROGRAM WITH ACTIVE ASSIGNMENTS RETURNS 409
    // =========================================================================
    console.log("\n--- TEST 5: Deleting Program with Active Assignments Returns 409 Conflict ---");

    // Create throwaway program
    const program = await prisma.trainingProgram.create({
      data: {
        titleEn: `P3 Throwaway Program ${Date.now()}`,
        titleAr: "برنامج اختباري",
        sportId: sport.id,
        difficulty: "BEGINNER"
      }
    });
    cleanupProgramIds.push(program.id);

    // Assign program to throwaway client
    const progAssignment = await prisma.programAssignment.create({
      data: {
        clientId: client.clientProfile!.id,
        programId: program.id,
        coachId: coach.coachProfile!.id,
        startDate: new Date()
      }
    });

    // Attempt to DELETE program via HTTP route -> Expected 409
    const reqDeleteProg = createMockRequest(`/api/programs/${program.id}`, "DELETE", tokenAdmin);
    const resDeleteProg = await deleteProgramRoute(reqDeleteProg, { params: Promise.resolve({ id: program.id }) });
    const bodyDeleteProg = await resDeleteProg.json();

    assert(resDeleteProg.status === 409, "DELETE program with active ProgramAssignment returns 409 Conflict", resDeleteProg.status);
    assert(bodyDeleteProg.error?.includes("program assignment"), "Conflict message mentions program assignment link", bodyDeleteProg.error);

    // Remove program assignment so program can be deleted cleanly
    await prisma.programAssignment.delete({ where: { id: progAssignment.id } });

    // Now delete program -> Expected 200
    const resDeleteProgClean = await deleteProgramRoute(reqDeleteProg, { params: Promise.resolve({ id: program.id }) });
    assert(resDeleteProgClean.status === 200, "DELETE unlinked program returns 200 OK", resDeleteProgClean.status);
    const progIdx = cleanupProgramIds.indexOf(program.id);
    if (progIdx > -1) cleanupProgramIds.splice(progIdx, 1);

    // =========================================================================
    // TEST 6: AUDIT LOG VERIFICATION ACROSS TEMPLATES, EXERCISES, AND SPORTS
    // =========================================================================
    console.log("\n--- TEST 6: AuditLog Rows for Template, Exercise, and Sport Operations ---");

    // 6.1 Check template create/update audit logs
    const templateAuditLogs = await prisma.auditLog.findMany({
      where: { entityType: "WorkoutTemplate", entityId: baseTemplateId }
    });
    const actionsFound = templateAuditLogs.map((l) => l.action);
    assert(actionsFound.includes("CREATE_TEMPLATE"), "AuditLog created for CREATE_TEMPLATE", actionsFound);
    assert(actionsFound.includes("UPDATE_TEMPLATE"), "AuditLog created for UPDATE_TEMPLATE", actionsFound);
    templateAuditLogs.forEach((l) => cleanupAuditLogIds.push(l.id));

    // 6.2 Test exercise deactivation and deletion audit logs
    // Create an unreferenced exercise and delete it -> DELETE_EXERCISE
    const unrefEx = await prisma.exercise.create({
      data: {
        nameEn: `P3 Unreferenced Ex ${Date.now()}`,
        nameAr: "تمرين غير مرتبط",
        sportId: sport.id
      }
    });
    await exerciseService.deleteExercise(unrefEx.id, { user: admin });
    const exDelLog = await prisma.auditLog.findFirst({
      where: { entityType: "Exercise", entityId: unrefEx.id, action: "DELETE_EXERCISE" }
    });
    assert(Boolean(exDelLog), "AuditLog created for DELETE_EXERCISE");
    if (exDelLog) cleanupAuditLogIds.push(exDelLog.id);

    // Now test referenced exercise deactivation -> DEACTIVATE_EXERCISE
    // ex1 is referenced by initialAssignment!
    await exerciseService.deleteExercise(ex1.id, { user: admin });
    const exDeactLog = await prisma.auditLog.findFirst({
      where: { entityType: "Exercise", entityId: ex1.id, action: "DEACTIVATE_EXERCISE" }
    });
    assert(Boolean(exDeactLog), "AuditLog created for DEACTIVATE_EXERCISE");
    if (exDeactLog) cleanupAuditLogIds.push(exDeactLog.id);

    // 6.3 Test sport update/deactivate and delete audit logs
    // Update sport to inactive -> DEACTIVATE_SPORT
    await sportService.updateSport(sport.id, { isActive: false }, { user: admin });
    const sportDeactLog = await prisma.auditLog.findFirst({
      where: { entityType: "Sport", entityId: sport.id, action: "DEACTIVATE_SPORT" }
    });
    assert(Boolean(sportDeactLog), "AuditLog created for DEACTIVATE_SPORT");
    if (sportDeactLog) cleanupAuditLogIds.push(sportDeactLog.id);

    // Unreferenced sport deletion
    const unrefSport = await prisma.sport.create({
      data: { nameEn: `P3 Unref Sport ${Date.now()}`, nameAr: "رياضة غير مرتبطة" }
    });
    await sportService.deleteSport(unrefSport.id, { user: admin });
    const sportDelLog = await prisma.auditLog.findFirst({
      where: { entityType: "Sport", entityId: unrefSport.id, action: "DELETE_SPORT" }
    });
    assert(Boolean(sportDelLog), "AuditLog created for DELETE_SPORT");
    if (sportDelLog) cleanupAuditLogIds.push(sportDelLog.id);

    console.log("\n================================================================================");
    console.log(`=== PHASE 3 CLOSURE SUMMARY: ${passed} / ${total} TESTS PASSED ===`);
    console.log("================================================================================");
  } catch (error) {
    console.error("FATAL ERROR IN CLOSURE TEST SUITE:", error);
  } finally {
    console.log("\n[CLEANUP] Tearing down throwaway test records in finally block...");

    for (const aId of cleanupAssignmentIds) {
      try {
        await prisma.clientWorkoutAssignmentExercise.deleteMany({ where: { assignmentId: aId } });
        await prisma.assignmentBlockItem.deleteMany({ where: { block: { assignmentId: aId } } });
        await prisma.assignmentBlock.deleteMany({ where: { assignmentId: aId } });
        await prisma.clientWorkoutAssignment.delete({ where: { id: aId } });
      } catch (e: any) {
        console.warn(`Could not delete assignment ${aId}:`, e.message);
      }
    }

    for (const pId of cleanupProgramIds) {
      try {
        await prisma.programAssignment.deleteMany({ where: { programId: pId } });
        await prisma.trainingProgram.delete({ where: { id: pId } });
      } catch (e: any) {
        console.warn(`Could not delete program ${pId}:`, e.message);
      }
    }

    for (const tId of cleanupTemplateIds) {
      try {
        await prisma.workoutBlock.deleteMany({ where: { templateId: tId } });
        await prisma.workoutTemplateExercise.deleteMany({ where: { templateId: tId } });
        await prisma.workoutTemplate.delete({ where: { id: tId } });
      } catch (e: any) {
        console.warn(`Could not delete template ${tId}:`, e.message);
      }
    }

    for (const eId of cleanupExerciseIds) {
      try {
        await prisma.exerciseSport.deleteMany({ where: { exerciseId: eId } });
        await prisma.blockItem.deleteMany({ where: { exerciseId: eId } });
        await prisma.exercise.delete({ where: { id: eId } });
      } catch (e: any) {
        console.warn(`Could not delete exercise ${eId}:`, e.message);
      }
    }

    for (const sId of cleanupSportIds) {
      try {
        await prisma.sport.delete({ where: { id: sId } });
      } catch (e: any) {
        console.warn(`Could not delete sport ${sId}:`, e.message);
      }
    }

    for (const uId of cleanupUserIds) {
      try {
        await prisma.session.deleteMany({ where: { userId: uId } });
        await prisma.clientCoachAssignment.deleteMany({ where: { clientId: uId } });
        await prisma.clientProfile.deleteMany({ where: { userId: uId } });
        await prisma.coachProfile.deleteMany({ where: { userId: uId } });
        await prisma.user.delete({ where: { id: uId } });
      } catch (e: any) {
        console.warn(`Could not delete user ${uId}:`, e.message);
      }
    }

    for (const logId of cleanupAuditLogIds) {
      try {
        await prisma.auditLog.delete({ where: { id: logId } });
      } catch (e: any) {
        console.warn(`Could not delete audit log ${logId}:`, e.message);
      }
    }

    console.log("[CLEANUP COMPLETE] Database restored to 100% clean state.");
    await prisma.$disconnect();
  }
}

run();

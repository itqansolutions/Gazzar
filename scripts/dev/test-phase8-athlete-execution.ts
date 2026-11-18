import {
  PrismaClient,
  UserRole,
  BlockType,
  BlockItemType,
  MetricType,
  AssignmentStatus,
  AssignmentSourceType
} from "@prisma/client";
import { sessionService } from "../../src/lib/auth/session-service";
import { workoutService, WorkoutServiceError } from "../../src/server/services/workout.service";
import {
  GET as getWorkoutById,
  POST as mutateWorkoutHttp,
  DELETE as deleteWorkoutHttp
} from "../../src/app/api/workouts/[id]/route";
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
  console.log("=== PHASE 8: ATHLETE EXPERIENCE & EXECUTION TEST SUITE ===");
  console.log("================================================================================");

  const cleanupUserIds: string[] = [];
  const cleanupClientProfileIds: string[] = [];
  const cleanupCoachProfileIds: string[] = [];
  const cleanupClientCoachAssignmentIds: string[] = [];
  const cleanupSportIds: string[] = [];
  const cleanupExerciseIds: string[] = [];
  const cleanupTemplateIds: string[] = [];
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

  // Baseline row counts
  console.log("\n[BASELINE] Recording pre-test live row counts...");
  const baseClients = await prisma.clientProfile.count();
  const baseCoaches = await prisma.coachProfile.count();
  const baseUsers = await prisma.user.count();
  const baseAssignments = await prisma.clientWorkoutAssignment.count();
  const baseAssignmentBlocks = await prisma.assignmentBlock.count();
  const baseAssignmentBlockItems = await prisma.assignmentBlockItem.count();
  const baseWorkoutLogs = await prisma.workoutLog.count();
  const baseSetLogs = await prisma.setLog.count();
  const baseAudits = await prisma.auditLog.count();

  console.log(
    `  Baseline: users=${baseUsers}, clients=${baseClients}, coaches=${baseCoaches}, assignments=${baseAssignments}, blocks=${baseAssignmentBlocks}, items=${baseAssignmentBlockItems}, logs=${baseWorkoutLogs}, setLogs=${baseSetLogs}, audits=${baseAudits}`
  );

  try {
    const dummyHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";
    const ts = Date.now();

    // 0. Setup Throwaway Actors & Fixtures
    console.log("\n[SETUP] Creating throwaway fixtures (Admin, Coach A, Coach B, Client A, Client B, Sport, Exercises)...");

    const adminUser = await prisma.user.create({
      data: {
        email: `throwaway.p8.admin.${ts}@gx.test`,
        name: "P8 Admin",
        role: UserRole.ADMIN,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(adminUser.id);
    const adminSession = await sessionService.createSession({ userId: adminUser.id });
    const adminActor = {
      user: { id: adminUser.id, name: adminUser.name, role: adminUser.role },
      coachProfileId: null,
      clientProfileId: null
    };

    const coachAUser = await prisma.user.create({
      data: {
        email: `throwaway.p8.coacha.${ts}@gx.test`,
        name: "P8 Coach A",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P8 Coach A Bio" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coachAUser.id);
    cleanupCoachProfileIds.push(coachAUser.coachProfile!.id);
    const coachASession = await sessionService.createSession({ userId: coachAUser.id });
    const coachAActor = {
      user: { id: coachAUser.id, name: coachAUser.name, role: coachAUser.role },
      coachProfileId: coachAUser.coachProfile!.id,
      clientProfileId: null
    };

    const coachBUser = await prisma.user.create({
      data: {
        email: `throwaway.p8.coachb.${ts}@gx.test`,
        name: "P8 Coach B",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P8 Coach B Bio" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coachBUser.id);
    cleanupCoachProfileIds.push(coachBUser.coachProfile!.id);
    const coachBSession = await sessionService.createSession({ userId: coachBUser.id });

    const clientAUser = await prisma.user.create({
      data: {
        email: `throwaway.p8.clienta.${ts}@gx.test`,
        name: "P8 Client A",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: {
          create: {
            status: "ACTIVE",
            weightKg: 80,
            heightCm: 180
          }
        }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(clientAUser.id);
    cleanupClientProfileIds.push(clientAUser.clientProfile!.id);
    const clientASession = await sessionService.createSession({ userId: clientAUser.id });
    const clientAActor = {
      user: { id: clientAUser.id, name: clientAUser.name, role: clientAUser.role },
      coachProfileId: null,
      clientProfileId: clientAUser.clientProfile!.id
    };

    const clientBUser = await prisma.user.create({
      data: {
        email: `throwaway.p8.clientb.${ts}@gx.test`,
        name: "P8 Client B",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: {
          create: {
            status: "ACTIVE",
            weightKg: 60,
            heightCm: 165
          }
        }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(clientBUser.id);
    cleanupClientProfileIds.push(clientBUser.clientProfile!.id);
    const clientBSession = await sessionService.createSession({ userId: clientBUser.id });

    // Coach A assigned to Client A
    const coachAssignment = await prisma.clientCoachAssignment.create({
      data: {
        clientId: clientAUser.clientProfile!.id,
        coachId: coachAUser.coachProfile!.id
      }
    });
    cleanupClientCoachAssignmentIds.push(coachAssignment.id);

    // Create Throwaway Sport & Exercises
    const sport = await prisma.sport.create({
      data: {
        nameEn: `P8 Strength Sport ${ts}`,
        nameAr: `رياضة قوة ${ts}`
      }
    });
    cleanupSportIds.push(sport.id);

    const exerciseA = await prisma.exercise.create({
      data: {
        nameEn: `P8 Bench Press ${ts}`,
        nameAr: `بنش برس ${ts}`,
        sportId: sport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        instructionsEn: "Press bar explosively"
      }
    });
    cleanupExerciseIds.push(exerciseA.id);

    const exerciseB = await prisma.exercise.create({
      data: {
        nameEn: `P8 Dumbbell Flyes ${ts}`,
        nameAr: `تفتيح دمبل ${ts}`,
        sportId: sport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        instructionsEn: "Squeeze pecs at top"
      }
    });
    cleanupExerciseIds.push(exerciseB.id);

    // =========================================================================
    // TEST 1: MULTI-ROUND CIRCUIT ASSIGNMENT & EXECUTION PROGRESS
    // =========================================================================
    console.log("\n--- TEST 1: Multi-Round Circuit Assignment & Execution Progress ---");

    const circuitAssignment = await workoutService.assignWorkout({
      clientId: clientAUser.clientProfile!.id,
      coachId: coachAUser.coachProfile!.id,
      title: "P8 Upper Body Circuit Workout",
      scheduledDate: new Date(),
      coachNotes: "Focus on tempo and short rest intervals",
      blocks: [
        {
          orderIndex: 0,
          type: BlockType.CIRCUIT,
          title: "3-Round Chest Circuit",
          rounds: 3,
          restBetweenRoundsSeconds: 90,
          notes: "Move between stations without resting",
          items: [
            {
              orderIndex: 0,
              itemType: BlockItemType.EXERCISE,
              exerciseId: exerciseA.id,
              targetReps: "10",
              targetWeightKg: 80,
              restSeconds: 30
            },
            {
              orderIndex: 1,
              itemType: BlockItemType.EXERCISE,
              exerciseId: exerciseB.id,
              targetReps: "12",
              targetWeightKg: 20,
              restSeconds: 30
            }
          ]
        }
      ]
    });
    cleanupAssignmentIds.push(circuitAssignment.id);

    assert(circuitAssignment.id !== undefined, "1.1 Workout assignment created successfully");
    assert(circuitAssignment.status === AssignmentStatus.SCHEDULED, "1.2 Status is SCHEDULED");
    assert(circuitAssignment.effectiveStatus === "SCHEDULED", "1.3 Derived effectiveStatus is SCHEDULED");
    assert(circuitAssignment.assignmentBlocks?.length === 1, "1.4 1 assignment block created");
    assert(circuitAssignment.assignmentBlocks![0].type === BlockType.CIRCUIT, "1.5 Block type is CIRCUIT");
    assert(circuitAssignment.assignmentBlocks![0].rounds === 3, "1.6 Block rounds is 3");
    assert(circuitAssignment.assignmentBlocks![0].items.length === 2, "1.7 2 block items created");

    const blockItem1 = circuitAssignment.assignmentBlocks![0].items[0];
    const blockItem2 = circuitAssignment.assignmentBlocks![0].items[1];

    // 1.8 Save partial progress (Round 1)
    const saveProgressRes = await workoutService.saveWorkoutExecution(
      circuitAssignment.id,
      {
        mode: "SAVE_PROGRESS",
        durationMinutes: 12,
        overallRpe: 7,
        clientFeedback: "Completed round 1 feeling good",
        blockItemLogs: [
          {
            assignmentBlockItemId: blockItem1.id,
            roundNumber: 1,
            setNumber: 1,
            targetReps: "10",
            targetWeightKg: 80,
            actualReps: 10,
            actualWeightKg: 80,
            isCompleted: true
          },
          {
            assignmentBlockItemId: blockItem2.id,
            roundNumber: 1,
            setNumber: 1,
            targetReps: "12",
            targetWeightKg: 20,
            actualReps: 12,
            actualWeightKg: 20,
            isCompleted: true
          }
        ]
      },
      clientAActor
    );

    assert(saveProgressRes.isCompleted === false, "1.8 Save progress returns isCompleted = false");
    assert(saveProgressRes.effectiveStatus === "IN_PROGRESS", "1.9 Derived status transitions to IN_PROGRESS");

    const progressAudit = await prisma.auditLog.findFirst({
      where: { action: "SAVE_WORKOUT_PROGRESS", entityId: circuitAssignment.id }
    });
    assert(progressAudit !== null, "1.10 SAVE_WORKOUT_PROGRESS AuditLog emitted");
    if (progressAudit) cleanupAuditLogIds.push(progressAudit.id);

    const savedSetsR1 = await prisma.setLog.findMany({
      where: { assignmentBlockItemId: { in: [blockItem1.id, blockItem2.id] } }
    });
    assert(savedSetsR1.length === 2, "1.11 Exactly 2 SetLog rows saved for Round 1");
    assert(savedSetsR1[0].actualWeightKg === 80, "1.12 SetLog actual weight recorded correctly");
    assert(savedSetsR1[0].roundNumber === 1, "1.13 SetLog roundNumber recorded correctly");

    // =========================================================================
    // TEST 2: ATOMIC SETLOG UPSERT (NO WIPE / NO DUPLICATES)
    // =========================================================================
    console.log("\n--- TEST 2: Atomic SetLog Upsert (No Wipe / No Duplicates) ---");

    // Re-saving with updated actual weight on Round 1 and adding Round 2
    const set1IdBefore = savedSetsR1[0].id;

    await workoutService.saveWorkoutExecution(
      circuitAssignment.id,
      {
        mode: "SAVE_PROGRESS",
        durationMinutes: 22,
        overallRpe: 8,
        blockItemLogs: [
          // Update Round 1 weight from 80kg to 85kg
          {
            assignmentBlockItemId: blockItem1.id,
            roundNumber: 1,
            setNumber: 1,
            actualReps: 10,
            actualWeightKg: 85,
            isCompleted: true
          },
          // Add Round 2
          {
            assignmentBlockItemId: blockItem1.id,
            roundNumber: 2,
            setNumber: 1,
            actualReps: 10,
            actualWeightKg: 85,
            isCompleted: true
          }
        ]
      },
      clientAActor
    );

    const savedSetsAfter = await prisma.setLog.findMany({
      where: { assignmentBlockItemId: blockItem1.id },
      orderBy: { roundNumber: "asc" }
    });

    assert(savedSetsAfter.length === 2, "2.1 Re-saving creates exactly 2 total sets for item 1 (no duplicates)");
    assert(savedSetsAfter[0].id === set1IdBefore, "2.2 SetLog row preserved its ID (atomic in-place upsert, not delete/recreate)");
    assert(savedSetsAfter[0].actualWeightKg === 85, "2.3 SetLog weight successfully updated to 85kg");
    assert(savedSetsAfter[1].roundNumber === 2, "2.4 Round 2 SetLog created cleanly");

    // =========================================================================
    // TEST 3: ITEM-LEVEL SKIP WITH REASON
    // =========================================================================
    console.log("\n--- TEST 3: Item-Level Skip with Reason ---");

    // Log Round 3 with item 2 skipped due to shoulder fatigue
    await workoutService.saveWorkoutExecution(
      circuitAssignment.id,
      {
        mode: "SAVE_PROGRESS",
        durationMinutes: 30,
        blockItemLogs: [
          {
            assignmentBlockItemId: blockItem2.id,
            roundNumber: 3,
            setNumber: 1,
            isCompleted: false,
            isSkipped: true,
            skipReason: "Shoulder impingement flare-up"
          }
        ]
      },
      clientAActor
    );

    const skippedSet = await prisma.setLog.findFirst({
      where: {
        assignmentBlockItemId: blockItem2.id,
        roundNumber: 3,
        setNumber: 1
      }
    });

    assert(skippedSet !== null, "3.1 Skipped SetLog row exists");
    assert(skippedSet?.isSkipped === true, "3.2 isSkipped recorded as true");
    assert(skippedSet?.isCompleted === false, "3.3 isCompleted recorded as false for skipped item");
    assert(
      skippedSet?.skipReason === "Shoulder impingement flare-up",
      "3.4 skipReason recorded correctly on SetLog"
    );

    // =========================================================================
    // TEST 4: WORKOUT COMPLETION & IMMUTABILITY ENFORCEMENT
    // =========================================================================
    console.log("\n--- TEST 4: Workout Completion & Immutability Enforcement ---");

    const completeRes = await workoutService.saveWorkoutExecution(
      circuitAssignment.id,
      {
        mode: "COMPLETE",
        durationMinutes: 42,
        overallRpe: 8,
        clientFeedback: "Great workout, hit all circuit rounds"
      },
      clientAActor
    );

    assert(completeRes.isCompleted === true, "4.1 saveWorkoutExecution returns isCompleted = true");
    assert(completeRes.effectiveStatus === "COMPLETED", "4.2 effectiveStatus transitions to COMPLETED");

    const completeAudit = await prisma.auditLog.findFirst({
      where: { action: "COMPLETE_WORKOUT", entityId: circuitAssignment.id }
    });
    assert(completeAudit !== null, "4.3 COMPLETE_WORKOUT AuditLog emitted");
    if (completeAudit) cleanupAuditLogIds.push(completeAudit.id);

    // IMMUTABILITY TEST 1: Modifying completed workout blocked with 409 Conflict
    let modifyErr: any = null;
    try {
      await workoutService.saveWorkoutExecution(circuitAssignment.id, {
        mode: "SAVE_PROGRESS",
        durationMinutes: 50
      });
    } catch (e: any) {
      modifyErr = e;
    }
    assert(
      modifyErr instanceof WorkoutServiceError && modifyErr.statusCode === 409,
      "4.4 Attempting to modify completed workout blocked with 409 Conflict"
    );

    // IMMUTABILITY TEST 2: Skipping completed workout blocked with 409 Conflict
    let skipCompletedErr: any = null;
    try {
      await workoutService.skipWorkout(circuitAssignment.id, "Try skipping after completion");
    } catch (e: any) {
      skipCompletedErr = e;
    }
    assert(
      skipCompletedErr instanceof WorkoutServiceError && skipCompletedErr.statusCode === 409,
      "4.5 Attempting to skip completed workout blocked with 409 Conflict"
    );

    // IMMUTABILITY TEST 3: Deleting completed workout blocked with 409 Conflict
    let delCompletedErr: any = null;
    try {
      await workoutService.deleteAssignment(circuitAssignment.id, coachAActor);
    } catch (e: any) {
      delCompletedErr = e;
    }
    assert(
      delCompletedErr instanceof WorkoutServiceError && delCompletedErr.statusCode === 409,
      "4.6 Attempting to delete completed workout blocked with 409 Conflict"
    );

    // =========================================================================
    // TEST 5: SKIP ENTIRE WORKOUT LIFECYCLE
    // =========================================================================
    console.log("\n--- TEST 5: Skip Entire Workout Lifecycle ---");

    const workout2 = await workoutService.assignWorkout({
      clientId: clientAUser.clientProfile!.id,
      coachId: coachAUser.coachProfile!.id,
      title: "P8 Tomorrow Recovery Session",
      scheduledDate: new Date(Date.now() + 86400000),
      coachNotes: "Light stretching",
      exercises: [
        {
          exerciseId: exerciseA.id,
          targetSets: 1,
          targetReps: "10"
        }
      ]
    });
    cleanupAssignmentIds.push(workout2.id);

    const skipRes = await workoutService.skipWorkout(
      workout2.id,
      "Traveling out of town for competition",
      clientAActor
    );

    assert(skipRes?.status === AssignmentStatus.SKIPPED, "5.1 Workout status updated to SKIPPED");
    assert(skipRes?.effectiveStatus === "SKIPPED", "5.2 Derived effectiveStatus is SKIPPED");
    assert(
      skipRes?.workoutLog?.clientFeedback === "Traveling out of town for competition",
      "5.3 Skip reason stored in workoutLog.clientFeedback"
    );

    const skipAudit = await prisma.auditLog.findFirst({
      where: { action: "SKIP_WORKOUT", entityId: workout2.id }
    });
    assert(skipAudit !== null, "5.4 SKIP_WORKOUT AuditLog emitted");
    if (skipAudit) cleanupAuditLogIds.push(skipAudit.id);

    // Executing on a skipped workout blocked with 409 Conflict
    let execOnSkippedErr: any = null;
    try {
      await workoutService.saveWorkoutExecution(workout2.id, { mode: "COMPLETE" });
    } catch (e: any) {
      execOnSkippedErr = e;
    }
    assert(
      execOnSkippedErr instanceof WorkoutServiceError && execOnSkippedErr.statusCode === 409,
      "5.5 Attempting to execute a skipped workout blocked with 409 Conflict"
    );

    // =========================================================================
    // TEST 6: RBAC & CROSS-ATHLETE ACCESS VIA HTTP ENDPOINTS
    // =========================================================================
    console.log("\n--- TEST 6: RBAC & Cross-Athlete Access Controls ---");

    // 6.1 Client A can view own workout execution
    const clientAGetReq = createMockRequest(`/api/workouts/${circuitAssignment.id}`, "GET", clientASession.sessionToken);
    const clientAGetRes = await getWorkoutById(clientAGetReq, { params: Promise.resolve({ id: circuitAssignment.id }) });
    assert(clientAGetRes.status === 200, "6.1 Client A successfully fetches own workout via HTTP GET (200 OK)");

    // 6.2 Client B blocked from viewing Client A's workout
    const clientBCrossReq = createMockRequest(`/api/workouts/${circuitAssignment.id}`, "GET", clientBSession.sessionToken);
    const clientBCrossRes = await getWorkoutById(clientBCrossReq, { params: Promise.resolve({ id: circuitAssignment.id }) });
    assert(clientBCrossRes.status === 403, "6.2 Cross-athlete: Client B blocked from accessing Client A's workout (403 Forbidden)");

    // 6.3 Unassigned Coach B blocked from Client A's workout
    const coachBCrossReq = createMockRequest(`/api/workouts/${circuitAssignment.id}`, "GET", coachBSession.sessionToken);
    const coachBCrossRes = await getWorkoutById(coachBCrossReq, { params: Promise.resolve({ id: circuitAssignment.id }) });
    assert(coachBCrossRes.status === 403, "6.3 Unassigned Coach B blocked from Client A's workout (403 Forbidden)");

    // 6.4 Client forbidden from adding COACH_FEEDBACK
    const clientFeedbackReq = createMockRequest(
      `/api/workouts/${circuitAssignment.id}`,
      "POST",
      clientASession.sessionToken,
      { action: "COACH_FEEDBACK", coachFeedback: "Athlete trying to grade themselves" }
    );
    const clientFeedbackRes = await mutateWorkoutHttp(clientFeedbackReq, {
      params: Promise.resolve({ id: circuitAssignment.id })
    });
    assert(clientFeedbackRes.status === 403, "6.4 Athlete blocked from adding COACH_FEEDBACK (403 Forbidden)");

    // 6.5 Coach A successfully submits coach feedback on completed workout
    const coachFeedbackReq = createMockRequest(
      `/api/workouts/${circuitAssignment.id}`,
      "POST",
      coachASession.sessionToken,
      { action: "COACH_FEEDBACK", coachFeedback: "Excellent pacing and form throughout the circuit!" }
    );
    const coachFeedbackRes = await mutateWorkoutHttp(coachFeedbackReq, {
      params: Promise.resolve({ id: circuitAssignment.id })
    });
    assert(coachFeedbackRes.status === 200, "6.5 Assigned Coach A successfully adds COACH_FEEDBACK (200 OK)");

    const updatedLogWithFeedback = await prisma.workoutLog.findFirst({
      where: { assignmentId: circuitAssignment.id }
    });
    assert(
      updatedLogWithFeedback?.coachFeedback === "Excellent pacing and form throughout the circuit!",
      "6.6 Coach feedback correctly saved in workoutLog"
    );
  } catch (err: any) {
    console.error("\n❌ Unhandled exception during Phase 8 test execution:", err);
  } finally {
    console.log("\n================================================================================");
    console.log("[TEARDOWN] Cleaning up all test entities in FK-safe leaf-to-root order...");
    console.log("================================================================================");

    // 1. Audit logs
    if (cleanupAuditLogIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { id: { in: cleanupAuditLogIds } } });
      console.log(`  Cleaned ${cleanupAuditLogIds.length} audit logs`);
    }
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: cleanupUserIds } },
          { entityId: { in: cleanupAssignmentIds } }
        ]
      }
    });

    // 2. Set logs, exercise logs, workout logs
    await prisma.setLog.deleteMany({
      where: {
        OR: [
          { workoutLog: { assignmentId: { in: cleanupAssignmentIds } } },
          { assignmentBlockItem: { assignmentBlock: { assignmentId: { in: cleanupAssignmentIds } } } }
        ]
      }
    });
    console.log("  Cleaned SetLogs");

    await prisma.workoutExerciseLog.deleteMany({
      where: { workoutLog: { assignmentId: { in: cleanupAssignmentIds } } }
    });
    await prisma.workoutLog.deleteMany({
      where: { assignmentId: { in: cleanupAssignmentIds } }
    });
    console.log("  Cleaned WorkoutLogs");

    // 3. Assignment blocks and items
    await prisma.assignmentBlockItem.deleteMany({
      where: { assignmentBlock: { assignmentId: { in: cleanupAssignmentIds } } }
    });
    await prisma.assignmentBlock.deleteMany({
      where: { assignmentId: { in: cleanupAssignmentIds } }
    });
    await prisma.clientWorkoutAssignmentExercise.deleteMany({
      where: { assignmentId: { in: cleanupAssignmentIds } }
    });
    await prisma.clientWorkoutAssignment.deleteMany({
      where: { id: { in: cleanupAssignmentIds } }
    });
    console.log("  Cleaned Assignments & AssignmentBlocks");

    // 4. Exercises & Sports
    if (cleanupExerciseIds.length > 0) {
      await prisma.exercise.deleteMany({ where: { id: { in: cleanupExerciseIds } } });
      console.log(`  Cleaned ${cleanupExerciseIds.length} exercises`);
    }
    if (cleanupSportIds.length > 0) {
      await prisma.sport.deleteMany({ where: { id: { in: cleanupSportIds } } });
      console.log(`  Cleaned ${cleanupSportIds.length} sports`);
    }

    // 5. Coach assignments, client & coach profiles, users
    if (cleanupClientCoachAssignmentIds.length > 0) {
      await prisma.clientCoachAssignment.deleteMany({
        where: { id: { in: cleanupClientCoachAssignmentIds } }
      });
      console.log(`  Cleaned ${cleanupClientCoachAssignmentIds.length} coach assignments`);
    }
    await prisma.clientCoachAssignment.deleteMany({
      where: {
        OR: [
          { clientId: { in: cleanupClientProfileIds } },
          { coachId: { in: cleanupCoachProfileIds } }
        ]
      }
    });

    if (cleanupClientProfileIds.length > 0) {
      await prisma.clientProfile.deleteMany({ where: { id: { in: cleanupClientProfileIds } } });
      console.log(`  Cleaned ${cleanupClientProfileIds.length} client profiles`);
    }
    if (cleanupCoachProfileIds.length > 0) {
      await prisma.coachProfile.deleteMany({ where: { id: { in: cleanupCoachProfileIds } } });
      console.log(`  Cleaned ${cleanupCoachProfileIds.length} coach profiles`);
    }
    if (cleanupUserIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: cleanupUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
      console.log(`  Cleaned ${cleanupUserIds.length} throwaway users & sessions`);
    }

    // 6. Reconciliation verification
    console.log("\n[RECONCILIATION] Verifying post-test live database state against baseline...");
    const postClients = await prisma.clientProfile.count();
    const postCoaches = await prisma.coachProfile.count();
    const postUsers = await prisma.user.count();
    const postAssignments = await prisma.clientWorkoutAssignment.count();
    const postAssignmentBlocks = await prisma.assignmentBlock.count();
    const postAssignmentBlockItems = await prisma.assignmentBlockItem.count();
    const postWorkoutLogs = await prisma.workoutLog.count();
    const postSetLogs = await prisma.setLog.count();
    const postAudits = await prisma.auditLog.count();

    console.log(`  Reconciliation Counts:`);
    console.log(`    users:                   ${postUsers} (base: ${baseUsers})`);
    console.log(`    client_profiles:         ${postClients} (base: ${baseClients})`);
    console.log(`    coach_profiles:          ${postCoaches} (base: ${baseCoaches})`);
    console.log(`    assignments:             ${postAssignments} (base: ${baseAssignments})`);
    console.log(`    assignment_blocks:       ${postAssignmentBlocks} (base: ${baseAssignmentBlocks})`);
    console.log(`    assignment_block_items:  ${postAssignmentBlockItems} (base: ${baseAssignmentBlockItems})`);
    console.log(`    workout_logs:            ${postWorkoutLogs} (base: ${baseWorkoutLogs})`);
    console.log(`    set_logs:                ${postSetLogs} (base: ${baseSetLogs})`);
    console.log(`    audit_logs:              ${postAudits} (base: ${baseAudits})`);

    const matchesBaseline =
      postUsers === baseUsers &&
      postClients === baseClients &&
      postCoaches === baseCoaches &&
      postAssignments === baseAssignments &&
      postAssignmentBlocks === baseAssignmentBlocks &&
      postAssignmentBlockItems === baseAssignmentBlockItems &&
      postWorkoutLogs === baseWorkoutLogs &&
      postSetLogs === baseSetLogs &&
      postAudits === baseAudits;

    assert(matchesBaseline, "7.0 Post-test reconciliation matches baseline EXACTLY (0 database residue)");

    console.log("\n================================================================================");
    console.log(`=== TEST SUMMARY: ${passed}/${total} assertions passed (${Math.round((passed / total) * 100)}%) ===`);
    console.log("================================================================================");

    await prisma.$disconnect();
    if (passed < total) {
      process.exit(1);
    }
  }
}

run().catch((e) => {
  console.error("FATAL ERROR:", e);
  process.exit(1);
});

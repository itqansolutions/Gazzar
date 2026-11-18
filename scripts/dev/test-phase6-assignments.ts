import {
  PrismaClient,
  UserRole,
  GoalType,
  Difficulty,
  BlockType,
  BlockItemType,
  AssignmentStatus,
  MetricType
} from "@prisma/client";
import { sessionService } from "../../src/lib/auth/session-service";
import { programService, ProgramServiceError } from "../../src/server/services/program.service";
import { workoutService, WorkoutServiceError } from "../../src/server/services/workout.service";
import {
  GET as getWorkoutById,
  PATCH as patchWorkout,
  POST as postWorkout,
  DELETE as deleteWorkout
} from "../../src/app/api/workouts/[id]/route";
import {
  GET as getRestDaySyncPreview,
  POST as postRestDaySyncApply
} from "../../src/app/api/programs/[id]/sync-rest-days/route";
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
  console.log("=== PHASE 6: ASSIGNMENTS & ATHLETE CUSTOMIZATION TEST SUITE ===");
  console.log("================================================================================");

  const cleanupUserIds: string[] = [];
  const cleanupClientProfileIds: string[] = [];
  const cleanupCoachProfileIds: string[] = [];
  const cleanupClientCoachAssignmentIds: string[] = [];
  const cleanupSportIds: string[] = [];
  const cleanupExerciseIds: string[] = [];
  const cleanupTemplateIds: string[] = [];
  const cleanupProgramIds: string[] = [];
  const cleanupAssignmentIds: string[] = [];
  const cleanupProgramAssignmentIds: string[] = [];
  const cleanupWorkoutLogIds: string[] = [];
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
  const basePrograms = await prisma.trainingProgram.count();
  const baseWeeks = await prisma.programWeek.count();
  const baseDays = await prisma.programDay.count();
  const baseWorkouts = await prisma.programWorkout.count();
  const baseTemplates = await prisma.workoutTemplate.count();
  const baseWorkoutBlocks = await prisma.workoutBlock.count();
  const baseBlockItems = await prisma.blockItem.count();
  const baseAssignments = await prisma.clientWorkoutAssignment.count();
  const baseLegacyEx = await prisma.clientWorkoutAssignmentExercise.count();
  const baseAssignmentBlocks = await prisma.assignmentBlock.count();
  const baseAssignmentBlockItems = await prisma.assignmentBlockItem.count();
  const baseProgramAssignments = await prisma.programAssignment.count();
  const baseUsers = await prisma.user.count();
  const baseSports = await prisma.sport.count();
  const baseExercises = await prisma.exercise.count();
  const baseAudits = await prisma.auditLog.count();

  console.log(
    `  Baseline counts: programs=${basePrograms}, templates=${baseTemplates}, workout_blocks=${baseWorkoutBlocks}, block_items=${baseBlockItems}, assignments=${baseAssignments}, assignment_blocks=${baseAssignmentBlocks}, assignment_items=${baseAssignmentBlockItems}, users=${baseUsers}, sports=${baseSports}, exercises=${baseExercises}, audits=${baseAudits}`
  );

  try {
    const dummyHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";
    const ts = Date.now();

    // 0. Setup Throwaway Actors & Fixtures
    console.log("\n[SETUP] Creating throwaway fixtures (Admin, Coach A, Coach B, Client A, Sport, Exercises)...");

    const adminUser = await prisma.user.create({
      data: {
        email: `throwaway.p6.admin.${ts}@gx.test`,
        name: "P6 Throwaway Admin",
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
        email: `throwaway.p6.coacha.${ts}@gx.test`,
        name: "P6 Throwaway Coach A",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P6 Coach A Bio" } }
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
        email: `throwaway.p6.coachb.${ts}@gx.test`,
        name: "P6 Throwaway Coach B",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P6 Coach B Bio" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coachBUser.id);
    cleanupCoachProfileIds.push(coachBUser.coachProfile!.id);
    const coachBSession = await sessionService.createSession({ userId: coachBUser.id });
    const coachBActor = {
      user: { id: coachBUser.id, name: coachBUser.name, role: coachBUser.role },
      coachProfileId: coachBUser.coachProfile!.id,
      clientProfileId: null
    };

    const clientAUser = await prisma.user.create({
      data: {
        email: `throwaway.p6.clienta.${ts}@gx.test`,
        name: "P6 Throwaway Client A",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: { status: "ACTIVE" } }
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

    // Assign Coach A to Client A
    const coachAssignment = await prisma.clientCoachAssignment.create({
      data: {
        clientId: clientAUser.clientProfile!.id,
        coachId: coachAUser.coachProfile!.id,
        active: true
      }
    });
    cleanupClientCoachAssignmentIds.push(coachAssignment.id);

    const sport = await prisma.sport.create({
      data: {
        nameEn: `P6 Sport ${ts}`,
        nameAr: `رياضة اختبار ${ts}`
      }
    });
    cleanupSportIds.push(sport.id);

    const ex1 = await prisma.exercise.create({
      data: {
        nameEn: `P6 Deadlift ${ts}`,
        nameAr: `ديدلفت اختبار ${ts}`,
        sportId: sport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        difficulty: Difficulty.INTERMEDIATE
      }
    });
    cleanupExerciseIds.push(ex1.id);

    const ex2 = await prisma.exercise.create({
      data: {
        nameEn: `P6 Overhead Press ${ts}`,
        nameAr: `ضغط علوي اختبار ${ts}`,
        sportId: sport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        difficulty: Difficulty.INTERMEDIATE
      }
    });
    cleanupExerciseIds.push(ex2.id);

    const ex3 = await prisma.exercise.create({
      data: {
        nameEn: `P6 Lateral Raise ${ts}`,
        nameAr: `رفرفة جانبي ${ts}`,
        sportId: sport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        difficulty: Difficulty.BEGINNER
      }
    });
    cleanupExerciseIds.push(ex3.id);

    // =========================================================================
    // TEST 1: ASSIGNMENT CREATION ACROSS ALL 3 MODES
    // =========================================================================
    console.log("\n--- TEST 1: Assignment creation across all 3 modes (PROGRAM, TEMPLATE, INDIVIDUAL) ---");

    // Mode 1: PROGRAM Mode
    const program1 = await programService.createProgram(
      {
        titleEn: `P6 Master Program ${ts}`,
        titleAr: `برنامج اختبار ${ts}`,
        durationWeeks: 1,
        sportId: sport.id,
        goalType: GoalType.HYPERTROPHY,
        difficulty: Difficulty.INTERMEDIATE,
        creatorId: coachAUser.coachProfile!.id,
        weeks: [
          {
            weekNumber: 1,
            days: [
              {
                dayNumber: 1,
                titleEn: "Lower Strength",
                titleAr: "قوة سفلية",
                isRestDay: false,
                workouts: [
                  {
                    title: "Lower Heavy",
                    orderIndex: 0,
                    blocks: [
                      {
                        orderIndex: 1,
                        type: BlockType.SINGLE,
                        title: "Main Compound",
                        rounds: 3,
                        items: [
                          {
                            orderIndex: 1,
                            itemType: BlockItemType.EXERCISE,
                            exerciseId: ex1.id,
                            targetSets: 4,
                            targetReps: "5",
                            targetWeightKg: 100,
                            restSeconds: 120,
                            instructions: "Keep back flat"
                          },
                          {
                            orderIndex: 2,
                            itemType: BlockItemType.EXERCISE,
                            exerciseId: ex2.id,
                            targetSets: 3,
                            targetReps: "8",
                            targetWeightKg: 50,
                            restSeconds: 90,
                            instructions: "Strict press"
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      coachAActor
    );
    cleanupProgramIds.push(program1.id);

    const appliedProgram = await programService.applyProgramToClient(
      program1.id,
      clientAUser.clientProfile!.id,
      coachAUser.coachProfile!.id,
      "2026-11-20",
      undefined,
      coachAActor
    );
    cleanupProgramAssignmentIds.push(appliedProgram.programAssignment.id);
    for (const w of appliedProgram.workoutAssignments) {
      cleanupAssignmentIds.push(w.id);
    }

    assert(appliedProgram.workoutAssignments.length === 1, "1.1 Program application created 1 workout assignment");
    const programAssignmentWorkout = await workoutService.getAssignmentById(appliedProgram.workoutAssignments[0].id);

    assert(
      programAssignmentWorkout?.sourceType === "PROGRAM",
      "1.2 Program workout has sourceType === 'PROGRAM'"
    );
    assert(
      programAssignmentWorkout?.programWorkoutOrder === 0,
      "1.3 Program workout tracks programWorkoutOrder === 0"
    );
    assert(
      programAssignmentWorkout?.programId === program1.id,
      "1.4 Program workout tracks programId"
    );
    assert(
      (programAssignmentWorkout?.assignmentBlocks?.length ?? 0) === 1,
      "1.5 Program workout created 1 AssignmentBlock"
    );
    const pBlock = programAssignmentWorkout?.assignmentBlocks?.[0];
    assert(
      pBlock?.rounds === 3 && pBlock?.type === BlockType.SINGLE,
      "1.6 AssignmentBlock correctly captures rounds (3) and type (SINGLE)"
    );
    assert(
      (pBlock?.items?.length ?? 0) === 2,
      "1.7 AssignmentBlock contains 2 AssignmentBlockItems"
    );
    assert(
      pBlock?.items?.[0]?.exerciseNameSnapshot === ex1.nameEn &&
        pBlock?.items?.[0]?.targetWeightKg === 100,
      "1.8 AssignmentBlockItem captures exercise snapshot and targetWeightKg (100kg)"
    );
    const legacyCount1 = await prisma.clientWorkoutAssignmentExercise.count({
      where: { assignmentId: programAssignmentWorkout!.id }
    });
    assert(
      legacyCount1 === 2,
      "1.9 Backwards compatible ClientWorkoutAssignmentExercise records created (count: 2)"
    );

    // Mode 2: TEMPLATE Mode
    const template1 = await workoutService.createTemplate(
      {
        titleEn: `P6 Template ${ts}`,
        titleAr: `قالب اختبار ${ts}`,
        sportId: sport.id,
        difficulty: Difficulty.INTERMEDIATE,
        creatorId: coachAUser.coachProfile!.id,
        blocks: [
          {
            orderIndex: 1,
            type: BlockType.SUPERSET,
            title: "Superset Block",
            rounds: 4,
            items: [
              {
                orderIndex: 1,
                itemType: BlockItemType.EXERCISE,
                exerciseId: ex2.id,
                targetSets: 4,
                targetReps: "10"
              },
              {
                orderIndex: 2,
                itemType: BlockItemType.EXERCISE,
                exerciseId: ex3.id,
                targetSets: 4,
                targetReps: "15"
              }
            ]
          }
        ]
      },
      coachAActor
    );
    cleanupTemplateIds.push(template1.id);

    const templateAssigned = await workoutService.assignWorkout(
      {
        clientId: clientAUser.clientProfile!.id,
        templateId: template1.id,
        scheduledDate: "2026-11-21",
        coachNotes: "Push hard on lateral raises"
      },
      coachAActor
    );
    cleanupAssignmentIds.push(templateAssigned.id);

    assert(
      templateAssigned.sourceType === "TEMPLATE",
      "1.10 Template assignment has sourceType === 'TEMPLATE'"
    );
    assert(
      templateAssigned.templateId === template1.id,
      "1.11 Template assignment links templateId"
    );
    assert(
      (templateAssigned.assignmentBlocks?.length ?? 0) === 1,
      "1.12 Template assignment created 1 AssignmentBlock"
    );
    assert(
      templateAssigned.assignmentBlocks?.[0]?.type === BlockType.SUPERSET &&
        templateAssigned.assignmentBlocks?.[0]?.rounds === 4,
      "1.13 Template AssignmentBlock preserves SUPERSET type and 4 rounds"
    );
    assert(
      (templateAssigned.assignmentBlocks?.[0]?.items?.length ?? 0) === 2,
      "1.14 Template AssignmentBlock preserves 2 items"
    );

    // Mode 3: INDIVIDUAL Mode
    const individualAssigned = await workoutService.assignWorkout(
      {
        clientId: clientAUser.clientProfile!.id,
        title: "Individual Deload Session",
        scheduledDate: "2026-11-22",
        coachNotes: "Light recovery session",
        blocks: [
          {
            orderIndex: 1,
            type: BlockType.SINGLE,
            title: "Accessory Block",
            rounds: 2,
            items: [
              {
                orderIndex: 1,
                itemType: BlockItemType.EXERCISE,
                exerciseId: ex3.id,
                targetSets: 2,
                targetReps: "12"
              }
            ]
          }
        ]
      },
      coachAActor
    );
    cleanupAssignmentIds.push(individualAssigned.id);

    assert(
      individualAssigned.sourceType === "INDIVIDUAL",
      "1.15 Individual assignment has sourceType === 'INDIVIDUAL'"
    );
    assert(
      (individualAssigned.assignmentBlocks?.length ?? 0) === 1,
      "1.16 Individual assignment created 1 AssignmentBlock"
    );
    assert(
      individualAssigned.assignmentBlocks?.[0]?.items?.[0]?.exerciseId === ex3.id,
      "1.17 Individual AssignmentBlockItem contains target exercise"
    );

    // =========================================================================
    // TEST 2: ATHLETE CUSTOMIZATION (workoutService.customizeAssignment & HTTP)
    // =========================================================================
    console.log("\n--- TEST 2: Athlete Customization (modify assignment without mutating master) ---");

    const targetAssignmentId = programAssignmentWorkout!.id;

    const customized = await workoutService.customizeAssignment(
      targetAssignmentId,
      {
        title: "Lower Heavy - Athlete Custom Edition",
        coachNotes: "Lowered deadlift weight due to minor lower back soreness",
        blocks: [
          {
            orderIndex: 1,
            type: BlockType.SINGLE,
            title: "Modified Compound",
            rounds: 2,
            items: [
              {
                orderIndex: 1,
                itemType: BlockItemType.EXERCISE,
                exerciseId: ex1.id,
                targetSets: 3,
                targetReps: "5",
                targetWeightKg: 80, // Lowered from 100kg
                restSeconds: 150,
                instructions: "Easy tempo"
              },
              {
                orderIndex: 2,
                itemType: BlockItemType.EXERCISE,
                exerciseId: ex2.id,
                targetSets: 3,
                targetReps: "8",
                targetWeightKg: 45
              },
              {
                orderIndex: 3,
                itemType: BlockItemType.EXERCISE,
                exerciseId: ex3.id,
                targetSets: 3,
                targetReps: "12",
                instructions: "Shoulder prehab"
              }
            ]
          }
        ]
      },
      coachAActor
    );

    assert(
      customized.title === "Lower Heavy - Athlete Custom Edition",
      "2.1 Assignment title customized successfully"
    );
    assert(
      customized.coachNotes?.includes("minor lower back soreness"),
      "2.2 Assignment coachNotes updated with customization reason"
    );
    assert(
      customized.assignmentBlocks?.[0]?.items?.length === 3,
      "2.3 Assignment now contains 3 customized items (added ex3)"
    );
    assert(
      customized.assignmentBlocks?.[0]?.items?.[0]?.targetWeightKg === 80,
      "2.4 Custom targetWeightKg updated to 80kg"
    );

    // Verify master blueprint remains COMPLETELY untouched!
    const masterWorkoutAfter = await prisma.programWorkout.findFirst({
      where: { day: { week: { programId: program1.id } } },
      include: {
        blocks: {
          include: { items: true }
        }
      }
    });
    assert(
      masterWorkoutAfter?.blocks?.[0]?.items?.length === 2,
      "2.5 Master program workout items count untouched (still 2 items)"
    );
    assert(
      masterWorkoutAfter?.blocks?.[0]?.items?.[0]?.targetWeightKg === 100,
      "2.6 Master program workout targetWeightKg untouched (still 100kg)"
    );

    // Verify CUSTOMIZE_ASSIGNMENT AuditLog was emitted
    const customizeAudit = await prisma.auditLog.findFirst({
      where: {
        action: "CUSTOMIZE_ASSIGNMENT",
        entityId: targetAssignmentId
      }
    });
    assert(customizeAudit !== null, "2.7 CUSTOMIZE_ASSIGNMENT AuditLog emitted");
    if (customizeAudit) cleanupAuditLogIds.push(customizeAudit.id);

    // Test customization via HTTP PATCH
    const patchReq = createMockRequest(`/api/workouts/${targetAssignmentId}`, "PATCH", coachASession.sessionToken, {
      action: "CUSTOMIZE",
      coachNotes: "Updated via PATCH endpoint"
    });
    const patchRes = await patchWorkout(patchReq, { params: Promise.resolve({ id: targetAssignmentId }) });
    const patchJson = await patchRes.json();
    assert(patchRes.status === 200 && patchJson.success, "2.8 HTTP PATCH /api/workouts/[id] customization returns 200 OK");
    assert(patchJson.data.coachNotes === "Updated via PATCH endpoint", "2.9 HTTP PATCH customized coachNotes verified");

    // =========================================================================
    // TEST 3: RESET TO MASTER (workoutService.resetAssignmentToMaster & HTTP)
    // =========================================================================
    console.log("\n--- TEST 3: Reset to Master ---");

    const resetWorkout = await workoutService.resetAssignmentToMaster(targetAssignmentId, coachAActor);

    assert(
      resetWorkout.assignmentBlocks?.[0]?.items?.length === 2,
      "3.1 Assignment items count restored to 2 items matching master"
    );
    assert(
      resetWorkout.assignmentBlocks?.[0]?.items?.[0]?.targetWeightKg === 100,
      "3.2 Assignment targetWeightKg restored to master value (100kg)"
    );
    assert(
      resetWorkout.coachNotes === "Updated via PATCH endpoint",
      "3.3 Athlete/Coach notes PRESERVED across reset to master"
    );

    const resetAudit = await prisma.auditLog.findFirst({
      where: {
        action: "RESET_TO_MASTER",
        entityId: targetAssignmentId
      }
    });
    assert(resetAudit !== null, "3.4 RESET_TO_MASTER AuditLog emitted");
    if (resetAudit) cleanupAuditLogIds.push(resetAudit.id);

    // Test reset via HTTP POST
    // First customize slightly
    await workoutService.customizeAssignment(
      targetAssignmentId,
      { title: "Temp Custom Title" },
      coachAActor
    );
    const postResetReq = createMockRequest(`/api/workouts/${targetAssignmentId}`, "POST", coachASession.sessionToken, {
      action: "RESET_TO_MASTER"
    });
    const postResetRes = await postWorkout(postResetReq, { params: Promise.resolve({ id: targetAssignmentId }) });
    const postResetJson = await postResetRes.json();
    assert(postResetRes.status === 200 && postResetJson.success, "3.5 HTTP POST /api/workouts/[id] action=RESET_TO_MASTER returns 200 OK");
    assert(postResetJson.data.title === "Lower Heavy", "3.6 HTTP POST reset restored title to master title");

    // =========================================================================
    // TEST 4: IMMUTABILITY 409 CONFLICT GUARDS
    // =========================================================================
    console.log("\n--- TEST 4: Immutability 409 Conflict Guards ---");

    // Create a throwaway assignment to test COMPLETED guard
    const completedAssignment = await workoutService.assignWorkout(
      {
        clientId: clientAUser.clientProfile!.id,
        templateId: template1.id,
        scheduledDate: "2026-11-23"
      },
      coachAActor
    );
    cleanupAssignmentIds.push(completedAssignment.id);

    await prisma.clientWorkoutAssignment.update({
      where: { id: completedAssignment.id },
      data: { status: AssignmentStatus.COMPLETED }
    });

    let completedCustomError: any = null;
    try {
      await workoutService.customizeAssignment(completedAssignment.id, { title: "Cannot Edit" }, coachAActor);
    } catch (e: any) {
      completedCustomError = e;
    }
    assert(
      completedCustomError instanceof WorkoutServiceError && completedCustomError.statusCode === 409,
      "4.1 customizeAssignment blocks COMPLETED assignment with 409 Conflict"
    );

    let completedResetError: any = null;
    try {
      await workoutService.resetAssignmentToMaster(completedAssignment.id, coachAActor);
    } catch (e: any) {
      completedResetError = e;
    }
    assert(
      completedResetError instanceof WorkoutServiceError && completedResetError.statusCode === 409,
      "4.2 resetAssignmentToMaster blocks COMPLETED assignment with 409 Conflict"
    );

    let completedDeleteError: any = null;
    try {
      await workoutService.deleteAssignment(completedAssignment.id, coachAActor);
    } catch (e: any) {
      completedDeleteError = e;
    }
    assert(
      completedDeleteError instanceof WorkoutServiceError && completedDeleteError.statusCode === 409,
      "4.3 deleteAssignment blocks COMPLETED assignment with 409 Conflict"
    );

    // Test STARTED guard (has WorkoutLog)
    const startedAssignment = await workoutService.assignWorkout(
      {
        clientId: clientAUser.clientProfile!.id,
        templateId: template1.id,
        scheduledDate: "2026-11-24"
      },
      coachAActor
    );
    cleanupAssignmentIds.push(startedAssignment.id);

    const workoutLog = await prisma.workoutLog.create({
      data: {
        assignmentId: startedAssignment.id,
        clientId: clientAUser.clientProfile!.id,
        startedAt: new Date()
      }
    });
    cleanupWorkoutLogIds.push(workoutLog.id);

    let startedCustomError: any = null;
    try {
      await workoutService.customizeAssignment(startedAssignment.id, { title: "Started" }, coachAActor);
    } catch (e: any) {
      startedCustomError = e;
    }
    assert(
      startedCustomError instanceof WorkoutServiceError && startedCustomError.statusCode === 409,
      "4.4 customizeAssignment blocks STARTED (workoutLog exists) assignment with 409 Conflict"
    );

    let startedDeleteError: any = null;
    try {
      await workoutService.deleteAssignment(startedAssignment.id, coachAActor);
    } catch (e: any) {
      startedDeleteError = e;
    }
    assert(
      startedDeleteError instanceof WorkoutServiceError && startedDeleteError.statusCode === 409,
      "4.5 deleteAssignment blocks STARTED assignment with 409 Conflict"
    );

    // =========================================================================
    // TEST 5: REST-DAY SYNC (service & HTTP)
    // =========================================================================
    console.log("\n--- TEST 5: Rest-Day Sync ---");

    // Create a 1-week program with Day 1 as workout day
    const program2 = await programService.createProgram(
      {
        titleEn: `P6 Rest Day Program ${ts}`,
        titleAr: `برنامج راحة ${ts}`,
        durationWeeks: 1,
        sportId: sport.id,
        goalType: GoalType.STRENGTH,
        difficulty: Difficulty.INTERMEDIATE,
        creatorId: coachAUser.coachProfile!.id,
        weeks: [
          {
            weekNumber: 1,
            days: [
              {
                dayNumber: 1,
                titleEn: "Leg Day",
                titleAr: "أرجل",
                isRestDay: false,
                workouts: [
                  {
                    title: "Squat Session",
                    orderIndex: 0,
                    blocks: [
                      {
                        orderIndex: 1,
                        type: BlockType.SINGLE,
                        rounds: 3,
                        items: [{ orderIndex: 1, exerciseId: ex1.id, targetSets: 3, targetReps: "5" }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      coachAActor
    );
    cleanupProgramIds.push(program2.id);

    const applied2 = await programService.applyProgramToClient(
      program2.id,
      clientAUser.clientProfile!.id,
      coachAUser.coachProfile!.id,
      "2026-11-28",
      undefined,
      coachAActor
    );
    cleanupProgramAssignmentIds.push(applied2.programAssignment.id);
    for (const w of applied2.workoutAssignments) {
      cleanupAssignmentIds.push(w.id);
    }

    // Toggle master program Day 1 to rest day
    const day1 = await prisma.programDay.findFirst({
      where: { week: { programId: program2.id }, dayNumber: 1 }
    });
    await prisma.programDay.update({
      where: { id: day1!.id },
      data: { isRestDay: true }
    });

    // 5.1 Preview rest day sync via service
    const preview = await programService.previewRestDaySync(program2.id, applied2.programAssignment.id);
    assert(
      preview.totalAffected === 1 && preview.unstartedWorkouts.length === 1 && preview.canSync === true,
      "5.1 previewRestDaySync detects 1 unstarted workout to remove"
    );

    // 5.2 Preview via HTTP GET /api/programs/[id]/sync-rest-days
    const httpPreviewReq = createMockRequest(
      `/api/programs/${program2.id}/sync-rest-days?programAssignmentId=${applied2.programAssignment.id}`,
      "GET",
      coachASession.sessionToken
    );
    const httpPreviewRes = await getRestDaySyncPreview(httpPreviewReq, {
      params: Promise.resolve({ id: program2.id })
    });
    const httpPreviewJson = await httpPreviewRes.json();
    assert(
      httpPreviewRes.status === 200 && httpPreviewJson.data.canSync === true,
      "5.2 HTTP GET /api/programs/[id]/sync-rest-days preview returns 200 OK and canSync: true"
    );

    // 5.3 Apply rest-day sync via HTTP POST /api/programs/[id]/sync-rest-days
    const httpApplyReq = createMockRequest(
      `/api/programs/${program2.id}/sync-rest-days`,
      "POST",
      coachASession.sessionToken,
      { programAssignmentId: applied2.programAssignment.id }
    );
    const httpApplyRes = await postRestDaySyncApply(httpApplyReq, {
      params: Promise.resolve({ id: program2.id })
    });
    const httpApplyJson = await httpApplyRes.json();
    assert(
      httpApplyRes.status === 200 && httpApplyJson.data.removedCount === 1,
      "5.3 HTTP POST /api/programs/[id]/sync-rest-days applied sync removing 1 unstarted workout"
    );

    const workoutAfterSync = await prisma.clientWorkoutAssignment.findUnique({
      where: { id: applied2.workoutAssignments[0].id }
    });
    assert(
      workoutAfterSync === null,
      "5.4 Unstarted scheduled workout removed from database after rest-day sync"
    );

    const syncAudit = await prisma.auditLog.findFirst({
      where: {
        action: "REST_DAY_SYNC",
        entityId: applied2.programAssignment.id
      }
    });
    assert(syncAudit !== null, "5.5 REST_DAY_SYNC AuditLog emitted");
    if (syncAudit) cleanupAuditLogIds.push(syncAudit.id);

    // =========================================================================
    // TEST 6: DELETE ASSIGNMENT (service & HTTP)
    // =========================================================================
    console.log("\n--- TEST 6: Delete Assignment ---");

    const toDeleteAssignment = await workoutService.assignWorkout(
      {
        clientId: clientAUser.clientProfile!.id,
        templateId: template1.id,
        scheduledDate: "2026-11-29"
      },
      coachAActor
    );
    // Don't add to cleanupAssignmentIds since we expect it to be deleted

    const deleteResult = await workoutService.deleteAssignment(toDeleteAssignment.id, coachAActor);
    assert(deleteResult === true, "6.1 workoutService.deleteAssignment returns true");

    const checkDeleted = await prisma.clientWorkoutAssignment.findUnique({
      where: { id: toDeleteAssignment.id }
    });
    assert(checkDeleted === null, "6.2 Workout assignment verified deleted from database");

    const deleteAudit = await prisma.auditLog.findFirst({
      where: {
        action: "DELETE_ASSIGNMENT",
        entityId: toDeleteAssignment.id
      }
    });
    assert(deleteAudit !== null, "6.3 DELETE_ASSIGNMENT AuditLog emitted");
    if (deleteAudit) cleanupAuditLogIds.push(deleteAudit.id);

    // Test delete via HTTP DELETE
    const toDeleteHttp = await workoutService.assignWorkout(
      {
        clientId: clientAUser.clientProfile!.id,
        templateId: template1.id,
        scheduledDate: "2026-11-30"
      },
      coachAActor
    );

    const deleteHttpReq = createMockRequest(`/api/workouts/${toDeleteHttp.id}`, "DELETE", coachASession.sessionToken);
    const deleteHttpRes = await deleteWorkout(deleteHttpReq, { params: Promise.resolve({ id: toDeleteHttp.id }) });
    const deleteHttpJson = await deleteHttpRes.json();
    assert(
      deleteHttpRes.status === 200 && deleteHttpJson.success,
      "6.4 HTTP DELETE /api/workouts/[id] returns 200 OK"
    );

    // =========================================================================
    // TEST 7: RBAC & CROSS-ATHLETE ACCESS GUARDS
    // =========================================================================
    console.log("\n--- TEST 7: RBAC & Cross-Athlete Access Guards ---");

    // 7.1 Client forbidden from customizing
    let clientCustomError: any = null;
    try {
      await workoutService.customizeAssignment(targetAssignmentId, { title: "Hacked" }, clientAActor);
    } catch (e: any) {
      clientCustomError = e;
    }
    assert(
      clientCustomError instanceof WorkoutServiceError && clientCustomError.statusCode === 403,
      "7.1 CLIENT actor blocked with 403 on workoutService.customizeAssignment"
    );

    // 7.2 Client forbidden from resetAssignmentToMaster
    let clientResetError: any = null;
    try {
      await workoutService.resetAssignmentToMaster(targetAssignmentId, clientAActor);
    } catch (e: any) {
      clientResetError = e;
    }
    assert(
      clientResetError instanceof WorkoutServiceError && clientResetError.statusCode === 403,
      "7.2 CLIENT actor blocked with 403 on workoutService.resetAssignmentToMaster"
    );

    // 7.3 Client forbidden from deleteAssignment
    let clientDeleteError: any = null;
    try {
      await workoutService.deleteAssignment(targetAssignmentId, clientAActor);
    } catch (e: any) {
      clientDeleteError = e;
    }
    assert(
      clientDeleteError instanceof WorkoutServiceError && clientDeleteError.statusCode === 403,
      "7.3 CLIENT actor blocked with 403 on workoutService.deleteAssignment"
    );

    // 7.4 Client forbidden from DELETE HTTP
    const clientHttpDeleteReq = createMockRequest(`/api/workouts/${targetAssignmentId}`, "DELETE", clientASession.sessionToken);
    const clientHttpDeleteRes = await deleteWorkout(clientHttpDeleteReq, {
      params: Promise.resolve({ id: targetAssignmentId })
    });
    assert(
      clientHttpDeleteRes.status === 403,
      "7.4 HTTP DELETE /api/workouts/[id] blocked with 403 for CLIENT actor"
    );

    // 7.5 Cross-Athlete: Coach B (not assigned to Client A) blocked by requireClientAccess
    const coachBHttpPatchReq = createMockRequest(
      `/api/workouts/${targetAssignmentId}`,
      "PATCH",
      coachBSession.sessionToken,
      { action: "CUSTOMIZE", title: "Coach B Tampering" }
    );
    const coachBHttpPatchRes = await patchWorkout(coachBHttpPatchReq, {
      params: Promise.resolve({ id: targetAssignmentId })
    });
    assert(
      coachBHttpPatchRes.status === 403,
      "7.5 Coach B (not assigned to Client A) blocked with 403 Forbidden via requireClientAccess"
    );

    // 7.6 Client forbidden from rest-day sync endpoint
    const clientSyncReq = createMockRequest(
      `/api/programs/${program2.id}/sync-rest-days`,
      "POST",
      clientASession.sessionToken,
      { programAssignmentId: applied2.programAssignment.id }
    );
    const clientSyncRes = await postRestDaySyncApply(clientSyncReq, {
      params: Promise.resolve({ id: program2.id })
    });
    assert(
      clientSyncRes.status === 403,
      "7.6 CLIENT actor blocked with 403 on /api/programs/[id]/sync-rest-days"
    );
  } catch (err: any) {
    console.error("\n❌ Unhandled exception during Phase 6 test execution:", err);
  } finally {
    console.log("\n================================================================================");
    console.log("[TEARDOWN] Cleaning up all test entities in FK-safe leaf-to-root order...");
    console.log("================================================================================");

    // 1. Delete audit logs created during test
    if (cleanupAuditLogIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { id: { in: cleanupAuditLogIds } } });
      console.log(`  Cleaned ${cleanupAuditLogIds.length} audit logs`);
    }

    // Also delete any other audit logs created by our throwaway users
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: cleanupUserIds } },
          { entityId: { in: [...cleanupAssignmentIds, ...cleanupProgramIds, ...cleanupTemplateIds] } }
        ]
      }
    });

    // 2. Delete workout logs & set logs
    if (cleanupWorkoutLogIds.length > 0) {
      await prisma.setLog.deleteMany({ where: { workoutLogId: { in: cleanupWorkoutLogIds } } });
      await prisma.workoutLog.deleteMany({ where: { id: { in: cleanupWorkoutLogIds } } });
      console.log(`  Cleaned ${cleanupWorkoutLogIds.length} workout logs`);
    }

    // 3. Delete assignment blocks, assignment items, legacy snapshots, and workout assignments
    if (cleanupAssignmentIds.length > 0) {
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
      console.log(`  Cleaned workout assignments and all nested blocks/items/snapshots`);
    }

    // 4. Delete program assignments and nutrition assignments
    if (cleanupProgramAssignmentIds.length > 0) {
      await prisma.clientNutritionAssignment.deleteMany({
        where: { programAssignmentId: { in: cleanupProgramAssignmentIds } }
      });
      await prisma.programAssignment.deleteMany({
        where: { id: { in: cleanupProgramAssignmentIds } }
      });
      console.log(`  Cleaned ${cleanupProgramAssignmentIds.length} program assignments`);
    }

    // 5. Delete program workouts, days, weeks, programs
    if (cleanupProgramIds.length > 0) {
      const pWorkouts = await prisma.programWorkout.findMany({
        where: { day: { week: { programId: { in: cleanupProgramIds } } } },
        select: { id: true }
      });
      const pWorkoutIds = pWorkouts.map((w) => w.id);
      if (pWorkoutIds.length > 0) {
        await prisma.blockItem.deleteMany({
          where: { block: { programWorkoutId: { in: pWorkoutIds } } }
        });
        await prisma.workoutBlock.deleteMany({
          where: { programWorkoutId: { in: pWorkoutIds } }
        });
        await prisma.programWorkout.deleteMany({
          where: { id: { in: pWorkoutIds } }
        });
      }
      await prisma.programDay.deleteMany({
        where: { week: { programId: { in: cleanupProgramIds } } }
      });
      await prisma.programWeek.deleteMany({
        where: { programId: { in: cleanupProgramIds } }
      });
      await prisma.trainingProgram.deleteMany({
        where: { id: { in: cleanupProgramIds } }
      });
      console.log(`  Cleaned ${cleanupProgramIds.length} programs and sub-trees`);
    }

    // 6. Delete templates & template blocks/items
    if (cleanupTemplateIds.length > 0) {
      await prisma.blockItem.deleteMany({
        where: { block: { templateId: { in: cleanupTemplateIds } } }
      });
      await prisma.workoutBlock.deleteMany({
        where: { templateId: { in: cleanupTemplateIds } }
      });
      await prisma.workoutTemplateExercise.deleteMany({
        where: { templateId: { in: cleanupTemplateIds } }
      });
      await prisma.workoutTemplate.deleteMany({
        where: { id: { in: cleanupTemplateIds } }
      });
      console.log(`  Cleaned ${cleanupTemplateIds.length} templates and blocks`);
    }

    // 7. Delete exercises & sports
    if (cleanupExerciseIds.length > 0) {
      await prisma.exercise.deleteMany({ where: { id: { in: cleanupExerciseIds } } });
      console.log(`  Cleaned ${cleanupExerciseIds.length} exercises`);
    }
    if (cleanupSportIds.length > 0) {
      await prisma.sport.deleteMany({ where: { id: { in: cleanupSportIds } } });
      console.log(`  Cleaned ${cleanupSportIds.length} sports`);
    }

    // 8. Delete coach-client assignments & profiles & users & sessions
    if (cleanupClientCoachAssignmentIds.length > 0) {
      await prisma.clientCoachAssignment.deleteMany({
        where: { id: { in: cleanupClientCoachAssignmentIds } }
      });
    }
    if (cleanupClientProfileIds.length > 0) {
      await prisma.clientProfile.deleteMany({ where: { id: { in: cleanupClientProfileIds } } });
    }
    if (cleanupCoachProfileIds.length > 0) {
      await prisma.coachProfile.deleteMany({ where: { id: { in: cleanupCoachProfileIds } } });
    }
    if (cleanupUserIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: cleanupUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
      console.log(`  Cleaned ${cleanupUserIds.length} throwaway users, profiles, and sessions`);
    }

    // Final reconciliation check against baseline
    console.log("\n[RECONCILIATION] Verifying post-test live database state against baseline...");
    const postPrograms = await prisma.trainingProgram.count();
    const postWeeks = await prisma.programWeek.count();
    const postDays = await prisma.programDay.count();
    const postWorkouts = await prisma.programWorkout.count();
    const postTemplates = await prisma.workoutTemplate.count();
    const postWorkoutBlocks = await prisma.workoutBlock.count();
    const postBlockItems = await prisma.blockItem.count();
    const postAssignments = await prisma.clientWorkoutAssignment.count();
    const postLegacyEx = await prisma.clientWorkoutAssignmentExercise.count();
    const postAssignmentBlocks = await prisma.assignmentBlock.count();
    const postAssignmentBlockItems = await prisma.assignmentBlockItem.count();
    const postProgramAssignments = await prisma.programAssignment.count();
    const postUsers = await prisma.user.count();
    const postSports = await prisma.sport.count();
    const postExercises = await prisma.exercise.count();
    const postAudits = await prisma.auditLog.count();

    console.log(`  Reconciliation Counts:`);
    console.log(`    programs:                ${postPrograms} (base: ${basePrograms})`);
    console.log(`    program_weeks:           ${postWeeks} (base: ${baseWeeks})`);
    console.log(`    program_days:            ${postDays} (base: ${baseDays})`);
    console.log(`    program_workouts:        ${postWorkouts} (base: ${baseWorkouts})`);
    console.log(`    workout_templates:       ${postTemplates} (base: ${baseTemplates})`);
    console.log(`    workout_blocks:          ${postWorkoutBlocks} (base: ${baseWorkoutBlocks})`);
    console.log(`    block_items:             ${postBlockItems} (base: ${baseBlockItems})`);
    console.log(`    workout_assignments:     ${postAssignments} (base: ${baseAssignments})`);
    console.log(`    assignment_blocks:       ${postAssignmentBlocks} (base: ${baseAssignmentBlocks})`);
    console.log(`    assignment_block_items:  ${postAssignmentBlockItems} (base: ${baseAssignmentBlockItems})`);
    console.log(`    program_assignments:     ${postProgramAssignments} (base: ${baseProgramAssignments})`);
    console.log(`    users:                   ${postUsers} (base: ${baseUsers})`);
    console.log(`    sports:                  ${postSports} (base: ${baseSports})`);
    console.log(`    exercises:               ${postExercises} (base: ${baseExercises})`);
    console.log(`    audit_logs:              ${postAudits} (base: ${baseAudits})`);

    const matchesBaseline =
      postPrograms === basePrograms &&
      postWeeks === baseWeeks &&
      postDays === baseDays &&
      postWorkouts === baseWorkouts &&
      postTemplates === baseTemplates &&
      postWorkoutBlocks === baseWorkoutBlocks &&
      postBlockItems === baseBlockItems &&
      postAssignments === baseAssignments &&
      postAssignmentBlocks === baseAssignmentBlocks &&
      postAssignmentBlockItems === baseAssignmentBlockItems &&
      postProgramAssignments === baseProgramAssignments &&
      postUsers === baseUsers &&
      postSports === baseSports &&
      postExercises === baseExercises &&
      postAudits === baseAudits;

    assert(matchesBaseline, "8.0 Post-test reconciliation matches baseline EXACTLY (0 database residue)");

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

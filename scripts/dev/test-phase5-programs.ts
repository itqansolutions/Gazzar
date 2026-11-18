import { PrismaClient, UserRole, GoalType, Difficulty, BlockType, BlockItemType } from "@prisma/client";
import { sessionService } from "../../src/lib/auth/session-service";
import { programService, ProgramServiceError } from "../../src/server/services/program.service";
import { workoutService } from "../../src/server/services/workout.service";
import { GET as getPrograms, POST as postProgram } from "../../src/app/api/programs/route";
import { GET as getProgramById, PATCH as patchProgram, DELETE as deleteProgram } from "../../src/app/api/programs/[id]/route";
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
  console.log("=== PHASE 5: MASTER BLUEPRINT BUILDER & VERSIONING TEST SUITE ===");
  console.log("================================================================================");

  const cleanupUserIds: string[] = [];
  const cleanupClientProfileIds: string[] = [];
  const cleanupCoachProfileIds: string[] = [];
  const cleanupSportIds: string[] = [];
  const cleanupExerciseIds: string[] = [];
  const cleanupTemplateIds: string[] = [];
  const cleanupProgramIds: string[] = [];
  const cleanupAssignmentIds: string[] = [];
  const cleanupProgramAssignmentIds: string[] = [];
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
  const baseBlocks = await prisma.workoutBlock.count();
  const baseItems = await prisma.blockItem.count();
  const baseUsers = await prisma.user.count();
  const baseSports = await prisma.sport.count();
  const baseExercises = await prisma.exercise.count();
  const baseAudits = await prisma.auditLog.count();
  console.log(`  Initial counts: programs=${basePrograms}, weeks=${baseWeeks}, days=${baseDays}, workouts=${baseWorkouts}, blocks=${baseBlocks}, items=${baseItems}, users=${baseUsers}, sports=${baseSports}, exercises=${baseExercises}, audits=${baseAudits}`);

  try {
    const dummyHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";
    const ts = Date.now();

    // 0. Setup Throwaway Actors
    console.log("\n[SETUP] Creating throwaway fixtures (Admin, Coach A, Coach B, Client A)...");
    const adminUser = await prisma.user.create({
      data: {
        email: `throwaway.p5.admin.${ts}@gx.test`,
        name: "P5 Throwaway Admin",
        role: UserRole.ADMIN,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(adminUser.id);
    const adminSession = await sessionService.createSession({ userId: adminUser.id });

    const coachAUser = await prisma.user.create({
      data: {
        email: `throwaway.p5.coacha.${ts}@gx.test`,
        name: "P5 Throwaway Coach A",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P5 Coach A Bio" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coachAUser.id);
    cleanupCoachProfileIds.push(coachAUser.coachProfile!.id);
    const coachASession = await sessionService.createSession({ userId: coachAUser.id });
    const coachAActor = {
      user: { id: coachAUser.id, name: coachAUser.name, role: coachAUser.role },
      coachProfileId: coachAUser.coachProfile!.id
    };

    const coachBUser = await prisma.user.create({
      data: {
        email: `throwaway.p5.coachb.${ts}@gx.test`,
        name: "P5 Throwaway Coach B",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P5 Coach B Bio" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coachBUser.id);
    cleanupCoachProfileIds.push(coachBUser.coachProfile!.id);
    const coachBSession = await sessionService.createSession({ userId: coachBUser.id });

    const clientUser = await prisma.user.create({
      data: {
        email: `throwaway.p5.client.${ts}@gx.test`,
        name: "P5 Throwaway Client",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: { status: "ACTIVE" } }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(clientUser.id);
    cleanupClientProfileIds.push(clientUser.clientProfile!.id);
    const clientSession = await sessionService.createSession({ userId: clientUser.id });

    // Throwaway Sport
    const testSport = await prisma.sport.create({
      data: {
        nameEn: `P5 Test Sport ${ts}`,
        nameAr: `رياضة اختبار ${ts}`,
        isActive: true
      }
    });
    cleanupSportIds.push(testSport.id);

    // Throwaway Exercise
    const testExercise = await prisma.exercise.create({
      data: {
        nameEn: `P5 Test Exercise ${ts}`,
        nameAr: `تمرين اختبار ${ts}`,
        sportId: testSport.id,
        difficulty: Difficulty.BEGINNER,
        isActive: true
      }
    });
    cleanupExerciseIds.push(testExercise.id);

    // Throwaway Template with blocks
    const testTemplate = await workoutService.createTemplate(
      {
        titleEn: `P5 Test Template ${ts}`,
        titleAr: `قالب اختبار ${ts}`,
        sportId: testSport.id,
        difficulty: Difficulty.INTERMEDIATE,
        creatorId: coachAUser.coachProfile!.id,
        blocks: [
          {
            orderIndex: 1,
            type: BlockType.SINGLE,
            title: "Template Block 1",
            rounds: 3,
            items: [
              {
                orderIndex: 1,
                itemType: BlockItemType.EXERCISE,
                exerciseId: testExercise.id,
                targetSets: 3,
                targetReps: "10-12",
                restSeconds: 60
              }
            ]
          }
        ]
      },
      coachAActor
    );
    cleanupTemplateIds.push(testTemplate.id);

    // =========================================================================
    // TEST 1: CREATE PROGRAM WITH DIRECT BLOCKS AND MASTERVERSION = 1
    // =========================================================================
    console.log("\n[TEST 1] Creating Program with Direct Blocks & Items...");
    const createdProg = await programService.createProgram(
      {
        titleEn: `P5 Blueprint ${ts}`,
        titleAr: `مخطط تدريبي ${ts}`,
        descriptionEn: "Master Periodized Blueprint",
        sportId: testSport.id,
        goalType: GoalType.STRENGTH,
        difficulty: Difficulty.ADVANCED,
        creatorId: coachAUser.coachProfile!.id,
        status: "ACTIVE",
        weeks: [
          {
            weekNumber: 1,
            focusEn: "Week 1 - Accumulation",
            days: [
              {
                dayNumber: 1,
                titleEn: "Upper Body Hypertrophy",
                isRestDay: false,
                workouts: [
                  {
                    title: "Direct Block Workout",
                    orderIndex: 0,
                    blocks: [
                      {
                        orderIndex: 1,
                        type: BlockType.SINGLE,
                        title: "Primary Press Block",
                        rounds: 4,
                        durationSeconds: 120,
                        restBetweenRoundsSeconds: 90,
                        items: [
                          {
                            orderIndex: 1,
                            itemType: BlockItemType.EXERCISE,
                            exerciseId: testExercise.id,
                            targetSets: 4,
                            targetReps: "8-10",
                            targetWeightKg: 80,
                            restSeconds: 90,
                            instructions: "Controlled eccentric"
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                dayNumber: 2,
                titleEn: "Active Recovery",
                isRestDay: true,
                workouts: []
              },
              {
                dayNumber: 3,
                titleEn: "Template Based Session",
                isRestDay: false,
                workouts: [
                  {
                    templateId: testTemplate.id,
                    orderIndex: 0
                  }
                ]
              }
            ]
          },
          {
            weekNumber: 2,
            focusEn: "Week 2 - Intensification",
            days: [
              {
                dayNumber: 1,
                titleEn: "Heavy Push",
                isRestDay: false,
                workouts: [
                  {
                    templateId: testTemplate.id,
                    orderIndex: 0
                  }
                ]
              }
            ]
          }
        ]
      },
      coachAActor
    );
    cleanupProgramIds.push(createdProg.id);

    assert(createdProg.masterVersion === 1, "Program created with masterVersion = 1");
    assert(createdProg.weeks.length === 2, "Program has 2 structured weeks");
    assert(createdProg.weeks[0].days.length === 3, "Week 1 has 3 days (1 direct block, 1 rest, 1 template)");
    assert(createdProg.weeks[0].days[1].isRestDay === true, "Week 1 Day 2 is correctly marked as Rest Day");
    assert(createdProg.weeks[0].days[0].workouts[0].blocks.length === 1, "Week 1 Day 1 workout has 1 direct WorkoutBlock");
    assert(createdProg.weeks[0].days[0].workouts[0].blocks[0].items.length === 1, "Block has 1 BlockItem with exercise target");
    assert(createdProg.weeks[0].days[2].workouts[0].blocks.length === 1, "Week 1 Day 3 automatically cloned template blocks");

    // Verify AuditLog for create
    const createAudit = await prisma.auditLog.findFirst({
      where: { entityId: createdProg.id, action: "CREATE_PROGRAM" },
      orderBy: { createdAt: "desc" }
    });
    assert(Boolean(createAudit), "AuditLog row written for CREATE_PROGRAM");
    if (createAudit) cleanupAuditLogIds.push(createAudit.id);

    // =========================================================================
    // TEST 2: NON-STRUCTURAL UPDATE (PRESERVES IDS & KEEPS VERSION AT 1)
    // =========================================================================
    console.log("\n[TEST 2] Non-Structural Update (Title, Description, Focus, Day Title)...");
    const week1Id = createdProg.weeks[0].id;
    const day1Id = createdProg.weeks[0].days[0].id;
    const workout1Id = createdProg.weeks[0].days[0].workouts[0].id;
    const block1Id = createdProg.weeks[0].days[0].workouts[0].blocks[0].id;
    const item1Id = createdProg.weeks[0].days[0].workouts[0].blocks[0].items[0].id;

    // Call updateProgram with same structure but changed text
    const updatedProgNonStructural = await programService.updateProgram(
      createdProg.id,
      {
        titleEn: `P5 Blueprint ${ts} - Updated Name`,
        descriptionEn: "Updated description only",
        difficulty: Difficulty.INTERMEDIATE,
        weeks: [
          {
            id: week1Id,
            weekNumber: 1,
            focusEn: "Week 1 - Renamed Focus Note",
            days: [
              {
                id: day1Id,
                dayNumber: 1,
                titleEn: "Renamed Day Title",
                isRestDay: false,
                workouts: [
                  {
                    id: workout1Id,
                    title: "Renamed Workout Title",
                    orderIndex: 0,
                    blocks: [
                      {
                        id: block1Id,
                        orderIndex: 1,
                        type: BlockType.SINGLE,
                        title: "Renamed Block Title",
                        rounds: 4,
                        durationSeconds: 120,
                        restBetweenRoundsSeconds: 90,
                        items: [
                          {
                            id: item1Id,
                            orderIndex: 1,
                            itemType: BlockItemType.EXERCISE,
                            exerciseId: testExercise.id,
                            targetSets: 4,
                            targetReps: "8-10",
                            targetWeightKg: 80,
                            restSeconds: 90,
                            instructions: "Renamed instruction note"
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                dayNumber: 2,
                titleEn: "Active Recovery",
                isRestDay: true,
                workouts: []
              },
              {
                dayNumber: 3,
                titleEn: "Template Based Session",
                isRestDay: false,
                workouts: [
                  {
                    templateId: testTemplate.id,
                    orderIndex: 0
                  }
                ]
              }
            ]
          },
          {
            weekNumber: 2,
            focusEn: "Week 2 - Intensification",
            days: [
              {
                dayNumber: 1,
                titleEn: "Heavy Push",
                isRestDay: false,
                workouts: [
                  {
                    templateId: testTemplate.id,
                    orderIndex: 0
                  }
                ]
              }
            ]
          }
        ]
      },
      coachAActor
    );

    assert(updatedProgNonStructural.masterVersion === 1, "masterVersion remains 1 after non-structural update");
    assert(updatedProgNonStructural.weeks[0].id === week1Id, "Week 1 ID preserved (no cascading wipe)");
    assert(updatedProgNonStructural.weeks[0].days[0].id === day1Id, "Day 1 ID preserved (no cascading wipe)");
    assert(updatedProgNonStructural.weeks[0].days[0].workouts[0].id === workout1Id, "Workout 1 ID preserved (no cascading wipe)");
    assert(updatedProgNonStructural.weeks[0].days[0].workouts[0].blocks[0].id === block1Id, "Block 1 ID preserved (no cascading wipe)");
    assert(updatedProgNonStructural.weeks[0].days[0].workouts[0].blocks[0].items[0].id === item1Id, "Item 1 ID preserved (no cascading wipe)");

    const nonStructuralAudit = await prisma.auditLog.findFirst({
      where: { entityId: createdProg.id, action: "UPDATE_PROGRAM" },
      orderBy: { createdAt: "desc" }
    });
    assert(Boolean(nonStructuralAudit), "AuditLog row written for UPDATE_PROGRAM");
    if (nonStructuralAudit) cleanupAuditLogIds.push(nonStructuralAudit.id);

    // =========================================================================
    // TEST 3: STRUCTURAL UPDATE (INCREMENTS MASTERVERSION BY EXACTLY 1)
    // =========================================================================
    console.log("\n[TEST 3] Structural Update (Target Reps & Rounds Altered)...");
    const updatedProgStructural = await programService.updateProgram(
      createdProg.id,
      {
        weeks: [
          {
            id: week1Id,
            weekNumber: 1,
            days: [
              {
                id: day1Id,
                dayNumber: 1,
                titleEn: "Renamed Day Title",
                isRestDay: false,
                workouts: [
                  {
                    id: workout1Id,
                    orderIndex: 0,
                    blocks: [
                      {
                        id: block1Id,
                        orderIndex: 1,
                        type: BlockType.SINGLE,
                        rounds: 5, // Structural change: rounds changed from 4 to 5
                        items: [
                          {
                            id: item1Id,
                            orderIndex: 1,
                            itemType: BlockItemType.EXERCISE,
                            exerciseId: testExercise.id,
                            targetSets: 5, // Structural change: sets changed from 4 to 5
                            targetReps: "5-5-5", // Structural change: reps changed
                            restSeconds: 120
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                dayNumber: 2,
                titleEn: "Active Recovery",
                isRestDay: true,
                workouts: []
              },
              {
                dayNumber: 3,
                titleEn: "Template Based Session",
                isRestDay: false,
                workouts: [
                  {
                    templateId: testTemplate.id,
                    orderIndex: 0
                  }
                ]
              }
            ]
          },
          {
            weekNumber: 2,
            days: [
              {
                dayNumber: 1,
                titleEn: "Heavy Push",
                isRestDay: false,
                workouts: [
                  {
                    templateId: testTemplate.id,
                    orderIndex: 0
                  }
                ]
              }
            ]
          }
        ]
      },
      coachAActor
    );

    assert(updatedProgStructural.masterVersion === 2, "masterVersion incremented from 1 to 2 after structural change");
    assert(updatedProgStructural.weeks[0].id === week1Id, "Week 1 ID still preserved after structural update");
    assert(updatedProgStructural.weeks[0].days[0].id === day1Id, "Day 1 ID still preserved after structural update");
    assert(updatedProgStructural.weeks[0].days[0].workouts[0].id === workout1Id, "Workout 1 ID still preserved after structural update");
    assert(updatedProgStructural.weeks[0].days[0].workouts[0].blocks[0].id === block1Id, "Block 1 ID still preserved after structural update");
    assert(updatedProgStructural.weeks[0].days[0].workouts[0].blocks[0].items[0].id === item1Id, "Item 1 ID still preserved after structural update");


    const versionAudit = await prisma.auditLog.findFirst({
      where: { entityId: createdProg.id, action: "UPDATE_PROGRAM_VERSION" },
      orderBy: { createdAt: "desc" }
    });
    assert(Boolean(versionAudit), "AuditLog row written for UPDATE_PROGRAM_VERSION");
    if (versionAudit) cleanupAuditLogIds.push(versionAudit.id);

    // =========================================================================
    // TEST 4: RBAC & OWNERSHIP GUARDS VIA HTTP ROUTE HANDLERS
    // =========================================================================
    console.log("\n[TEST 4] RBAC & Ownership Guard Verification...");

    // 4.1 Client calling POST /api/programs -> 403 Forbidden
    const clientReqCreate = createMockRequest("/api/programs", "POST", clientSession.sessionToken, {
      titleEn: "Client Illegal Program",
      sportId: testSport.id
    });
    const clientResCreate = await postProgram(clientReqCreate);
    assert(clientResCreate.status === 403, "CLIENT role blocked from POST /api/programs (HTTP 403)");

    // 4.2 Client calling PATCH /api/programs/[id] -> 403 Forbidden
    const clientReqPatch = createMockRequest(`/api/programs/${createdProg.id}`, "PATCH", clientSession.sessionToken, {
      titleEn: "Client Illegal Update"
    });
    const clientResPatch = await patchProgram(clientReqPatch, { params: Promise.resolve({ id: createdProg.id }) });
    assert(clientResPatch.status === 403, "CLIENT role blocked from PATCH /api/programs/[id] (HTTP 403)");

    // 4.3 Client calling DELETE /api/programs/[id] -> 403 Forbidden
    const clientReqDelete = createMockRequest(`/api/programs/${createdProg.id}`, "DELETE", clientSession.sessionToken);
    const clientResDelete = await deleteProgram(clientReqDelete, { params: Promise.resolve({ id: createdProg.id }) });
    assert(clientResDelete.status === 403, "CLIENT role blocked from DELETE /api/programs/[id] (HTTP 403)");

    // 4.4 Coach B (not creator) calling PATCH /api/programs/[id] -> 403 Forbidden
    const coachBReqPatch = createMockRequest(`/api/programs/${createdProg.id}`, "PATCH", coachBSession.sessionToken, {
      titleEn: "Coach B Unauthorized Update"
    });
    const coachBResPatch = await patchProgram(coachBReqPatch, { params: Promise.resolve({ id: createdProg.id }) });
    assert(coachBResPatch.status === 403, "Unassigned COACH_B blocked from PATCH on Coach A's program (HTTP 403)");

    // 4.5 Coach B (not creator) calling DELETE /api/programs/[id] -> 403 Forbidden
    const coachBReqDelete = createMockRequest(`/api/programs/${createdProg.id}`, "DELETE", coachBSession.sessionToken);
    const coachBResDelete = await deleteProgram(coachBReqDelete, { params: Promise.resolve({ id: createdProg.id }) });
    assert(coachBResDelete.status === 403, "Unassigned COACH_B blocked from DELETE on Coach A's program (HTTP 403)");

    // 4.6 Coach A (creator) calling PATCH /api/programs/[id] -> 200 OK
    const coachAReqPatch = createMockRequest(`/api/programs/${createdProg.id}`, "PATCH", coachASession.sessionToken, {
      titleEn: `P5 Blueprint ${ts} - Coach A Authorized Edit`
    });
    const coachAResPatch = await patchProgram(coachAReqPatch, { params: Promise.resolve({ id: createdProg.id }) });
    assert(coachAResPatch.status === 200, "Creator COACH_A allowed to PATCH own program (HTTP 200)");

    // 4.7 Admin calling PATCH /api/programs/[id] -> 200 OK
    const adminReqPatch = createMockRequest(`/api/programs/${createdProg.id}`, "PATCH", adminSession.sessionToken, {
      titleEn: `P5 Blueprint ${ts} - Admin Authorized Edit`
    });
    const adminResPatch = await patchProgram(adminReqPatch, { params: Promise.resolve({ id: createdProg.id }) });
    assert(adminResPatch.status === 200, "ADMIN allowed to PATCH any program (HTTP 200)");

    // =========================================================================
    // TEST 5: 409 CONFLICT ON DELETE (ACTIVE ASSIGNMENT GUARD)
    // =========================================================================
    console.log("\n[TEST 5] 409 Conflict Protection on Delete...");

    // Apply program to throwaway client via applyProgramToClient
    const applyResult = await programService.applyProgramToClient(
      createdProg.id,
      clientUser.clientProfile!.id,
      coachAUser.coachProfile!.id,
      new Date().toISOString().slice(0, 10),
      { conflictStrategy: "BLOCK" },
      coachAActor
    );
    cleanupProgramAssignmentIds.push(applyResult.programAssignment.id);
    applyResult.workoutAssignments.forEach((wa) => cleanupAssignmentIds.push(wa.id));

    assert(applyResult.programAssignment.sourceMasterVersion === 2, "ProgramAssignment captured sourceMasterVersion = 2");
    assert(applyResult.workoutAssignments.length > 0, "Created workout assignments for athlete");

    // Attempt to delete program while assigned -> Expect HTTP 409 Conflict
    const deleteBlockedReq = createMockRequest(`/api/programs/${createdProg.id}`, "DELETE", adminSession.sessionToken);
    const deleteBlockedRes = await deleteProgram(deleteBlockedReq, { params: Promise.resolve({ id: createdProg.id }) });
    assert(deleteBlockedRes.status === 409, "DELETE /api/programs/[id] blocked with HTTP 409 Conflict when assigned");
    const blockedJson = await deleteBlockedRes.json();
    assert(blockedJson.error.includes("is linked to"), "409 message specifies active assignments guard");

    // Clean client assignments
    await prisma.clientWorkoutAssignmentExercise.deleteMany({
      where: { assignmentId: { in: cleanupAssignmentIds } }
    });
    await prisma.clientWorkoutAssignment.deleteMany({
      where: { id: { in: cleanupAssignmentIds } }
    });
    cleanupAssignmentIds.length = 0;
    await prisma.programAssignment.deleteMany({
      where: { id: { in: cleanupProgramAssignmentIds } }
    });
    cleanupProgramAssignmentIds.length = 0;

    // Delete program now succeeds
    const deleteAllowedReq = createMockRequest(`/api/programs/${createdProg.id}`, "DELETE", adminSession.sessionToken);
    const deleteAllowedRes = await deleteProgram(deleteAllowedReq, { params: Promise.resolve({ id: createdProg.id }) });
    assert(deleteAllowedRes.status === 200, "DELETE /api/programs/[id] succeeds after unlinking assignments (HTTP 200)");
    // Remove from cleanup since it's deleted
    const progIdx = cleanupProgramIds.indexOf(createdProg.id);
    if (progIdx !== -1) cleanupProgramIds.splice(progIdx, 1);

    const deleteAudit = await prisma.auditLog.findFirst({
      where: { entityId: createdProg.id, action: "DELETE_PROGRAM" },
      orderBy: { createdAt: "desc" }
    });
    assert(Boolean(deleteAudit), "AuditLog row written for DELETE_PROGRAM");
    if (deleteAudit) cleanupAuditLogIds.push(deleteAudit.id);

    // =========================================================================
    // TEST 6: DUPLICATE_PROGRAM (INDEPENDENT COPY WITH MASTERVERSION = 1)
    // =========================================================================
    console.log("\n[TEST 6] Program Duplication...");
    const baseForDup = await programService.createProgram(
      {
        titleEn: `P5 Source To Duplicate ${ts}`,
        titleAr: `أصل التكرار ${ts}`,
        sportId: testSport.id,
        difficulty: Difficulty.BEGINNER,
        creatorId: coachAUser.coachProfile!.id,
        weeks: [
          {
            weekNumber: 1,
            days: [
              {
                dayNumber: 1,
                titleEn: "Dup Test Day",
                workouts: [{ templateId: testTemplate.id, orderIndex: 0 }]
              }
            ]
          }
        ]
      },
      coachAActor
    );
    cleanupProgramIds.push(baseForDup.id);

    // Advance version of base to 2
    await programService.updateProgram(
      baseForDup.id,
      {
        weeks: [
          {
            weekNumber: 1,
            days: [
              {
                dayNumber: 1,
                titleEn: "Dup Test Day",
                workouts: [
                  {
                    templateId: testTemplate.id,
                    orderIndex: 0,
                    blocks: [
                      {
                        orderIndex: 1,
                        type: BlockType.CIRCUIT,
                        rounds: 3,
                        items: [{ orderIndex: 1, itemType: BlockItemType.EXERCISE, exerciseId: testExercise.id }]
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

    const dupReq = createMockRequest(`/api/programs/${baseForDup.id}/duplicate`, "POST", coachASession.sessionToken);
    const { POST: postDuplicate } = await import("../../src/app/api/programs/[id]/duplicate/route");
    const dupRes = await postDuplicate(dupReq, { params: Promise.resolve({ id: baseForDup.id }) });
    assert(dupRes.status === 201, "POST /api/programs/[id]/duplicate succeeds with HTTP 201");
    const dupJson = await dupRes.json();
    cleanupProgramIds.push(dupJson.data.id);

    assert(dupJson.data.masterVersion === 1, "Duplicated program resets masterVersion to 1");
    assert(dupJson.data.titleEn.includes("(Copy)"), "Duplicated program appends '(Copy)' to title");
    assert(dupJson.data.status === "DRAFT", "Duplicated program status initializes to DRAFT");

    const dupAudit = await prisma.auditLog.findFirst({
      where: { entityId: dupJson.data.id, action: "DUPLICATE_PROGRAM" },
      orderBy: { createdAt: "desc" }
    });
    assert(Boolean(dupAudit), "AuditLog row written for DUPLICATE_PROGRAM");
    if (dupAudit) cleanupAuditLogIds.push(dupAudit.id);

  } catch (err: any) {
    console.error("Test execution failed:", err);
    assert(false, "Phase 5 test suite crashed", err.message);
  } finally {
    console.log("\n[TEARDOWN] Cleaning up all throwaway test entities in FK-safe order...");

    if (cleanupAssignmentIds.length > 0) {
      await prisma.clientWorkoutAssignmentExercise.deleteMany({ where: { assignmentId: { in: cleanupAssignmentIds } } });
      await prisma.clientWorkoutAssignment.deleteMany({ where: { id: { in: cleanupAssignmentIds } } });
      console.log(`   - Deleted ClientWorkoutAssignments: ${cleanupAssignmentIds.length}`);
    }
    if (cleanupProgramAssignmentIds.length > 0) {
      await prisma.programAssignment.deleteMany({ where: { id: { in: cleanupProgramAssignmentIds } } });
      console.log(`   - Deleted ProgramAssignments: ${cleanupProgramAssignmentIds.length}`);
    }
    if (cleanupProgramIds.length > 0) {
      await prisma.blockItem.deleteMany({
        where: { block: { programWorkout: { day: { week: { programId: { in: cleanupProgramIds } } } } } }
      });
      await prisma.workoutBlock.deleteMany({
        where: { programWorkout: { day: { week: { programId: { in: cleanupProgramIds } } } } }
      });
      await prisma.programWorkout.deleteMany({
        where: { day: { week: { programId: { in: cleanupProgramIds } } } }
      });
      await prisma.programDay.deleteMany({
        where: { week: { programId: { in: cleanupProgramIds } } }
      });
      await prisma.programWeek.deleteMany({
        where: { programId: { in: cleanupProgramIds } }
      });
      await prisma.trainingProgram.deleteMany({ where: { id: { in: cleanupProgramIds } } });
      console.log(`   - Deleted TrainingPrograms: ${cleanupProgramIds.length}`);
    }
    if (cleanupTemplateIds.length > 0) {
      await prisma.blockItem.deleteMany({
        where: { block: { templateId: { in: cleanupTemplateIds } } }
      });
      await prisma.workoutBlock.deleteMany({ where: { templateId: { in: cleanupTemplateIds } } });
      await prisma.workoutTemplateExercise.deleteMany({ where: { templateId: { in: cleanupTemplateIds } } });
      await prisma.workoutTemplate.deleteMany({ where: { id: { in: cleanupTemplateIds } } });
      console.log(`   - Deleted WorkoutTemplates: ${cleanupTemplateIds.length}`);
    }
    if (cleanupExerciseIds.length > 0) {
      await prisma.exercise.deleteMany({ where: { id: { in: cleanupExerciseIds } } });
      console.log(`   - Deleted Exercises: ${cleanupExerciseIds.length}`);
    }
    if (cleanupSportIds.length > 0) {
      await prisma.sport.deleteMany({ where: { id: { in: cleanupSportIds } } });
      console.log(`   - Deleted Sports: ${cleanupSportIds.length}`);
    }
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { id: { in: cleanupAuditLogIds } },
          { entityId: { in: cleanupProgramIds } },
          { userId: { in: cleanupUserIds } }
        ]
      }
    });
    console.log(`   - Cleaned up AuditLogs`);
    if (cleanupClientProfileIds.length > 0) {
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

    // Post-teardown reconciliation check
    console.log("\n[RECONCILIATION] Verifying live database hygiene...");
    const postPrograms = await prisma.trainingProgram.count();
    const postWeeks = await prisma.programWeek.count();
    const postDays = await prisma.programDay.count();
    const postWorkouts = await prisma.programWorkout.count();
    const postBlocks = await prisma.workoutBlock.count();
    const postItems = await prisma.blockItem.count();
    const postUsers = await prisma.user.count();
    const postSports = await prisma.sport.count();
    const postExercises = await prisma.exercise.count();
    const postAudits = await prisma.auditLog.count();

    const programsMatch = postPrograms === basePrograms;
    const weeksMatch = postWeeks === baseWeeks;
    const daysMatch = postDays === baseDays;
    const workoutsMatch = postWorkouts === baseWorkouts;
    const blocksMatch = postBlocks === baseBlocks;
    const itemsMatch = postItems === baseItems;
    const usersMatch = postUsers === baseUsers;
    const sportsMatch = postSports === baseSports;
    const exercisesMatch = postExercises === baseExercises;
    const auditsMatch = postAudits === baseAudits;

    console.log(`   Programs:  ${postPrograms} vs ${basePrograms} -> ${programsMatch ? "MATCH" : "MISMATCH"}`);
    console.log(`   Weeks:     ${postWeeks} vs ${baseWeeks} -> ${weeksMatch ? "MATCH" : "MISMATCH"}`);
    console.log(`   Days:      ${postDays} vs ${baseDays} -> ${daysMatch ? "MATCH" : "MISMATCH"}`);
    console.log(`   Workouts:  ${postWorkouts} vs ${baseWorkouts} -> ${workoutsMatch ? "MATCH" : "MISMATCH"}`);
    console.log(`   Blocks:    ${postBlocks} vs ${baseBlocks} -> ${blocksMatch ? "MATCH" : "MISMATCH"}`);
    console.log(`   Items:     ${postItems} vs ${baseItems} -> ${itemsMatch ? "MATCH" : "MISMATCH"}`);
    console.log(`   Users:     ${postUsers} vs ${baseUsers} -> ${usersMatch ? "MATCH" : "MISMATCH"}`);
    console.log(`   Sports:    ${postSports} vs ${baseSports} -> ${sportsMatch ? "MATCH" : "MISMATCH"}`);
    console.log(`   Exercises: ${postExercises} vs ${baseExercises} -> ${exercisesMatch ? "MATCH" : "MISMATCH"}`);
    console.log(`   Audits:    ${postAudits} vs ${baseAudits} -> ${auditsMatch ? "MATCH" : "MISMATCH"}`);

    assert(
      programsMatch && weeksMatch && daysMatch && workoutsMatch && blocksMatch && itemsMatch && usersMatch && sportsMatch && exercisesMatch && auditsMatch,
      "Zero database residue: All table row counts match baseline exactly"
    );

    await prisma.$disconnect();

    console.log("================================================================================");
    console.log(`=== PHASE 5 SUMMARY: ${passed}/${total} Assertions Passed ===`);
    console.log("================================================================================");
  }
}

run();

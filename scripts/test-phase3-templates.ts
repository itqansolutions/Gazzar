import { PrismaClient, UserRole, BlockType, BlockItemType, MetricType } from "@prisma/client";
import { sessionService } from "../src/lib/auth/session-service";
import { GET as getTemplates, POST as postTemplate } from "../src/app/api/templates/route";
import { GET as getTemplateById, PATCH as patchTemplate, DELETE as deleteTemplate } from "../src/app/api/templates/[id]/route";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

function createMockRequest(
  url: string,
  method: string,
  sessionToken?: string,
  body?: any
): NextRequest {
  const headers = new Headers();
  if (sessionToken) {
    headers.set("cookie", `gx_session=${sessionToken}`);
  }
  if (body) {
    headers.set("content-type", "application/json");
  }

  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function run() {
  console.log("================================================================================");
  console.log("=== PHASE 3 WORKOUT TEMPLATES: BLOCKS & ITEMS HIERARCHY VERIFICATION SUITE ===");
  console.log("================================================================================");

  const cleanupUserIds: string[] = [];
  const cleanupTemplateIds: string[] = [];
  const cleanupProgramIds: string[] = [];
  const cleanupExerciseIds: string[] = [];
  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    testsTotal++;
    if (condition) {
      testsPassed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error("     Details:", details);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 0. Bootstrap test actors
    // -------------------------------------------------------------------------
    console.log("\n[SETUP] Creating throwaway users and test data...");
    const dummyHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";

    const coachUser = await prisma.user.create({
      data: {
        email: `throwaway.phase3.coach.${Date.now()}@gx.test`,
        name: "Phase 3 Coach",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "Phase 3 Test Coach" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coachUser.id);

    const clientUser = await prisma.user.create({
      data: {
        email: `throwaway.phase3.client.${Date.now()}@gx.test`,
        name: "Phase 3 Client",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: { status: "ACTIVE" } }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(clientUser.id);

    const adminUser = await prisma.user.create({
      data: {
        email: `throwaway.phase3.admin.${Date.now()}@gx.test`,
        name: "Phase 3 Admin",
        role: UserRole.ADMIN,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(adminUser.id);

    const sessionCoach = await sessionService.createSession({ userId: coachUser.id });
    const sessionClient = await sessionService.createSession({ userId: clientUser.id });
    const sessionAdmin = await sessionService.createSession({ userId: adminUser.id });

    const tokenCoach = sessionCoach.sessionToken;
    const tokenClient = sessionClient.sessionToken;
    const tokenAdmin = sessionAdmin.sessionToken;

    // Get or create test sport and test exercises
    let testSport = await prisma.sport.findFirst({ where: { isActive: true } });
    if (!testSport) {
      testSport = await prisma.sport.create({
        data: { nameEn: "Fitness Conditioning", nameAr: "اللياقة البدنية", isActive: true }
      });
    }

    const exercise1 = await prisma.exercise.create({
      data: {
        nameEn: `Phase3 Kettlebell Swing ${Date.now()}`,
        nameAr: "تأرجح الكتلبل",
        sportId: testSport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        difficulty: "INTERMEDIATE"
      }
    });
    cleanupExerciseIds.push(exercise1.id);

    const exercise2 = await prisma.exercise.create({
      data: {
        nameEn: `Phase3 Push-up ${Date.now()}`,
        nameAr: "تمرين الضغط",
        sportId: testSport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        difficulty: "BEGINNER"
      }
    });
    cleanupExerciseIds.push(exercise2.id);

    const exercise3 = await prisma.exercise.create({
      data: {
        nameEn: `Phase3 Box Jump ${Date.now()}`,
        nameAr: "قفز الصندوق",
        sportId: testSport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        difficulty: "ADVANCED"
      }
    });
    cleanupExerciseIds.push(exercise3.id);

    console.log("[SETUP COMPLETE] Actors, sport, and exercises ready.");

    // =========================================================================
    // TEST 1: APPROVAL GATE — Coach builds and saves a 3-Round Circuit Template
    // =========================================================================
    console.log("\n--- TEST 1: APPROVAL GATE — 3-Round Circuit Template Creation ---");
    const circuitPayload = {
      titleEn: "Full Body Circuit Conditioning",
      titleAr: "تدريب دائري للجسم كامل",
      descriptionEn: "High-intensity 3-round circuit template for explosive power",
      sportId: testSport.id,
      difficulty: "INTERMEDIATE",
      estimatedDurationMinutes: 35,
      blocks: [
        {
          type: "CIRCUIT",
          title: "Core & Power Circuit",
          order: 0,
          rounds: 3,
          restBetweenRoundsSeconds: 90,
          durationSeconds: null,
          notes: "Perform exercises consecutively with 20s rest between stations, 90s between rounds",
          items: [
            {
              itemType: "EXERCISE",
              order: 0,
              exerciseId: exercise1.id,
              targetRounds: 3,
              targetReps: "15",
              targetWeightKg: 16.0,
              restSeconds: 20,
              instructions: "Hinge at hips, explosive drive"
            },
            {
              itemType: "EXERCISE",
              order: 1,
              exerciseId: exercise2.id,
              targetRounds: 3,
              targetReps: "20",
              targetWeightKg: null,
              restSeconds: 20,
              instructions: "Full lockout at top"
            },
            {
              itemType: "REST",
              order: 2,
              exerciseId: null,
              restSeconds: 60,
              instructions: "Tactical recovery breathing before final movement"
            },
            {
              itemType: "EXERCISE",
              order: 3,
              exerciseId: exercise3.id,
              targetRounds: 3,
              targetReps: "12",
              targetWeightKg: null,
              restSeconds: 90,
              instructions: "Soft landing on the box"
            },
            {
              itemType: "NOTE",
              order: 4,
              exerciseId: null,
              instructions: "Coaching cue: Maintain high cadence across all 3 rounds"
            }
          ]
        }
      ]
    };

    const reqCreateCircuit = createMockRequest("/api/templates", "POST", tokenCoach, circuitPayload);
    const resCreateCircuit = await postTemplate(reqCreateCircuit);
    const bodyCreateCircuit = await resCreateCircuit.json();

    assert(resCreateCircuit.status === 201, "POST /api/templates returns 201 Created", resCreateCircuit.status);
    assert(bodyCreateCircuit.success === true, "Response has success: true");
    const createdCircuitId = bodyCreateCircuit.data?.id;
    if (createdCircuitId) cleanupTemplateIds.push(createdCircuitId);

    // Verify in database: Template, Blocks, Items, and Legacy compatibility
    const dbCircuit = await prisma.workoutTemplate.findUnique({
      where: { id: createdCircuitId },
      include: {
        blocks: {
          orderBy: { orderIndex: "asc" },
          include: {
            items: { orderBy: { orderIndex: "asc" } }
          }
        },
        exercises: { orderBy: { orderIndex: "asc" } }
      }
    });

    assert(Boolean(dbCircuit), "Template persisted in PostgreSQL");
    assert(dbCircuit?.version === 1, "Template initial version is 1", dbCircuit?.version);
    assert(dbCircuit?.blocks.length === 1, "Template has exactly 1 block", dbCircuit?.blocks.length);

    const circuitBlock = dbCircuit?.blocks[0];
    assert(circuitBlock?.type === BlockType.CIRCUIT, "Block type is CIRCUIT", circuitBlock?.type);
    assert(circuitBlock?.rounds === 3, "Block rounds is 3 (Approval Gate requirement)", circuitBlock?.rounds);
    assert(circuitBlock?.restBetweenRoundsSeconds === 90, "Block restBetweenRoundsSeconds is 90s", circuitBlock?.restBetweenRoundsSeconds);
    assert(circuitBlock?.items.length === 5, "Block contains 5 items (3 EXERCISE, 1 REST, 1 NOTE)", circuitBlock?.items.length);

    const exerciseItems = circuitBlock?.items.filter((i) => i.itemType === BlockItemType.EXERCISE) || [];
    const restItems = circuitBlock?.items.filter((i) => i.itemType === BlockItemType.REST) || [];
    const noteItems = circuitBlock?.items.filter((i) => i.itemType === BlockItemType.NOTE) || [];

    assert(exerciseItems.length === 3, "Contains exactly 3 EXERCISE items", exerciseItems.length);
    assert(restItems.length === 1, "Contains exactly 1 REST item", restItems.length);
    assert(noteItems.length === 1, "Contains exactly 1 NOTE item", noteItems.length);
    assert(restItems[0]?.exerciseId === null, "REST item has exerciseId = null", restItems[0]?.exerciseId);
    assert(noteItems[0]?.exerciseId === null, "NOTE item has exerciseId = null", noteItems[0]?.exerciseId);

    // Backward compatibility: 3 exercises saved to legacy WorkoutTemplateExercise
    assert(dbCircuit?.exercises.length === 3, "Legacy WorkoutTemplateExercise populated with 3 exercises", dbCircuit?.exercises.length);
    assert(dbCircuit?.exercises[0].exerciseId === exercise1.id, "Legacy exercise 0 matches exercise1", dbCircuit?.exercises[0].exerciseId);
    assert(dbCircuit?.exercises[1].exerciseId === exercise2.id, "Legacy exercise 1 matches exercise2", dbCircuit?.exercises[1].exerciseId);

    // =========================================================================
    // TEST 2: Multi-Block Template (SINGLE, SUPERSET, CIRCUIT, SEQUENCE)
    // =========================================================================
    console.log("\n--- TEST 2: Multi-Block Template Structure (All 4 Block Types) ---");
    const multiBlockPayload = {
      titleEn: "Advanced Multi-Block Athletic Session",
      titleAr: "جلسة رياضية متعددة البلوكات",
      sportId: testSport.id,
      difficulty: "ADVANCED",
      blocks: [
        {
          type: "SINGLE",
          title: "Warmup Movement",
          order: 0,
          rounds: 1,
          items: [
            { itemType: "EXERCISE", order: 0, exerciseId: exercise2.id, targetSets: 2, targetReps: "10" }
          ]
        },
        {
          type: "SUPERSET",
          title: "Power Superset A",
          order: 1,
          rounds: 4,
          restBetweenRoundsSeconds: 75,
          items: [
            { itemType: "EXERCISE", order: 0, exerciseId: exercise1.id, targetReps: "12" },
            { itemType: "EXERCISE", order: 1, exerciseId: exercise2.id, targetReps: "15" }
          ]
        },
        {
          type: "CIRCUIT",
          title: "High Octane Circuit",
          order: 2,
          rounds: 3,
          restBetweenRoundsSeconds: 120,
          items: [
            { itemType: "EXERCISE", order: 0, exerciseId: exercise3.id, targetReps: "10" },
            { itemType: "EXERCISE", order: 1, exerciseId: exercise1.id, targetReps: "15" },
            { itemType: "REST", order: 2, restSeconds: 45 }
          ]
        },
        {
          type: "SEQUENCE",
          title: "Finisher Sequence",
          order: 3,
          rounds: 1,
          durationSeconds: 300,
          notes: "5-minute continuous EMOM sequence",
          items: [
            { itemType: "EXERCISE", order: 0, exerciseId: exercise2.id, targetReps: "10" },
            { itemType: "NOTE", order: 1, instructions: "Transition without pausing" }
          ]
        }
      ]
    };

    const reqMultiBlock = createMockRequest("/api/templates", "POST", tokenCoach, multiBlockPayload);
    const resMultiBlock = await postTemplate(reqMultiBlock);
    const bodyMultiBlock = await resMultiBlock.json();

    assert(resMultiBlock.status === 201, "POST multi-block template returns 201 Created", resMultiBlock.status);
    const multiBlockId = bodyMultiBlock.data?.id;
    if (multiBlockId) cleanupTemplateIds.push(multiBlockId);

    const dbMultiBlock = await prisma.workoutTemplate.findUnique({
      where: { id: multiBlockId },
      include: {
        blocks: {
          orderBy: { orderIndex: "asc" },
          include: { items: { orderBy: { orderIndex: "asc" } } }
        }
      }
    });

    assert(dbMultiBlock?.blocks.length === 4, "Persisted exactly 4 blocks", dbMultiBlock?.blocks.length);
    assert(dbMultiBlock?.blocks[0].type === BlockType.SINGLE, "Block 0 is SINGLE");
    assert(dbMultiBlock?.blocks[1].type === BlockType.SUPERSET, "Block 1 is SUPERSET");
    assert(dbMultiBlock?.blocks[2].type === BlockType.CIRCUIT, "Block 2 is CIRCUIT");
    assert(dbMultiBlock?.blocks[3].type === BlockType.SEQUENCE, "Block 3 is SEQUENCE");
    assert(dbMultiBlock?.blocks[3].durationSeconds === 300, "Block 3 durationSeconds is 300s");

    // =========================================================================
    // TEST 3: 100% Nullable Metrics (Anti-Fake Defaults Verification)
    // =========================================================================
    console.log("\n--- TEST 3: 100% Nullable Metrics (No Forced Fake Defaults) ---");
    const nullablePayload = {
      titleEn: "Pure Qualitative Template",
      titleAr: "نموذج بدون أرقام مسبقة",
      sportId: testSport.id,
      blocks: [
        {
          type: "SINGLE",
          title: "Open Ended Movement",
          order: 0,
          rounds: null, // Nullable rounds
          durationSeconds: null,
          restBetweenRoundsSeconds: null,
          notes: null,
          items: [
            {
              itemType: "EXERCISE",
              order: 0,
              exerciseId: exercise1.id,
              // Explicitly null metrics
              targetSets: null,
              targetReps: null,
              targetWeightKg: null,
              targetDistanceKm: null,
              targetTimeSeconds: null,
              targetPace: null,
              targetRounds: null,
              restSeconds: null,
              tempo: null,
              instructions: null
            }
          ]
        }
      ]
    };

    const reqNullable = createMockRequest("/api/templates", "POST", tokenCoach, nullablePayload);
    const resNullable = await postTemplate(reqNullable);
    const bodyNullable = await resNullable.json();
    const nullableId = bodyNullable.data?.id;
    if (nullableId) cleanupTemplateIds.push(nullableId);

    const dbNullableItem = await prisma.blockItem.findFirst({
      where: { block: { templateId: nullableId } }
    });

    assert(dbNullableItem?.targetSets === null, "targetSets is strictly null (no fake 3 sets)");
    assert(dbNullableItem?.targetReps === null, "targetReps is strictly null (no fake '10-12' reps)");
    assert(dbNullableItem?.targetWeightKg === null, "targetWeightKg is strictly null");
    assert(dbNullableItem?.targetDistanceKm === null, "targetDistanceKm is strictly null");
    assert(dbNullableItem?.targetTimeSeconds === null, "targetTimeSeconds is strictly null");
    assert(dbNullableItem?.targetPace === null, "targetPace is strictly null");
    assert(dbNullableItem?.targetRounds === null, "targetRounds is strictly null");
    assert(dbNullableItem?.restSeconds === null, "restSeconds is strictly null");
    assert(dbNullableItem?.tempo === null, "tempo is strictly null");
    assert(dbNullableItem?.instructions === null, "instructions is strictly null");

    // =========================================================================
    // TEST 4: GET /api/templates and GET /api/templates/[id] Hierarchy
    // =========================================================================
    console.log("\n--- TEST 4: GET Templates APIs Return Complete Block Hierarchy ---");
    const reqGetAll = createMockRequest("/api/templates", "GET", tokenCoach);
    const resGetAll = await getTemplates(reqGetAll);
    const bodyGetAll = await resGetAll.json();

    assert(resGetAll.status === 200, "GET /api/templates returns 200 OK");
    const foundCircuitInList = bodyGetAll.data?.find((t: any) => t.id === createdCircuitId);
    assert(Boolean(foundCircuitInList), "Found circuit template in list");
    assert(Array.isArray(foundCircuitInList?.blocks), "Template list item contains blocks array");
    assert(foundCircuitInList?.blocks[0]?.items?.length === 5, "Template list item contains complete nested items");

    const reqGetSingle = createMockRequest(`/api/templates/${createdCircuitId}`, "GET", tokenCoach);
    const resGetSingle = await getTemplateById(reqGetSingle, { params: { id: createdCircuitId } });
    const bodyGetSingle = await resGetSingle.json();

    assert(resGetSingle.status === 200, "GET /api/templates/[id] returns 200 OK");
    assert(bodyGetSingle.data?.id === createdCircuitId, "Returned template matches requested ID");
    assert(bodyGetSingle.data?.blocks?.length === 1, "Single template has blocks");
    assert(bodyGetSingle.data?.blocks[0]?.items[0]?.exercise?.nameEn.includes("Kettlebell"), "Exercise relation populated inside block item");

    // =========================================================================
    // TEST 5: Template Update, Block Replacement & Version Increment
    // =========================================================================
    console.log("\n--- TEST 5: Template Update, Clean Block Replacement & Version Bump ---");
    const updatePayload = {
      titleEn: "Full Body Circuit Conditioning (Updated v2)",
      descriptionEn: "Refined circuit with adjusted rest times and exercises",
      blocks: [
        {
          type: "SUPERSET",
          title: "Superset Replacement",
          order: 0,
          rounds: 4,
          restBetweenRoundsSeconds: 60,
          items: [
            { itemType: "EXERCISE", order: 0, exerciseId: exercise2.id, targetReps: "15" },
            { itemType: "EXERCISE", order: 1, exerciseId: exercise3.id, targetReps: "12" }
          ]
        }
      ]
    };

    const reqUpdate = createMockRequest(`/api/templates/${createdCircuitId}`, "PATCH", tokenCoach, updatePayload);
    const resUpdate = await patchTemplate(reqUpdate, { params: { id: createdCircuitId } });
    const bodyUpdate = await resUpdate.json();

    assert(resUpdate.status === 200, "PATCH /api/templates/[id] returns 200 OK");
    assert(bodyUpdate.data?.version === 2, "Template version incremented from 1 to 2", bodyUpdate.data?.version);

    // Verify DB records
    const dbUpdated = await prisma.workoutTemplate.findUnique({
      where: { id: createdCircuitId },
      include: {
        blocks: {
          include: { items: true }
        },
        exercises: true
      }
    });

    assert(dbUpdated?.blocks.length === 1, "Old block replaced; now exactly 1 block");
    assert(dbUpdated?.blocks[0].type === BlockType.SUPERSET, "Block is now SUPERSET");
    assert(dbUpdated?.blocks[0].items.length === 2, "New block contains 2 items");
    assert(dbUpdated?.exercises.length === 2, "Legacy WorkoutTemplateExercise refreshed to 2 items");

    // =========================================================================
    // TEST 6: RBAC & Security Guard on Template Mutations
    // =========================================================================
    console.log("\n--- TEST 6: RBAC & Security Guard Verification ---");
    // 6.1 Client attempts POST -> Expected 403 Forbidden
    const reqClientPost = createMockRequest("/api/templates", "POST", tokenClient, circuitPayload);
    const resClientPost = await postTemplate(reqClientPost);
    assert(resClientPost.status === 403, "CLIENT POST /api/templates blocked with 403 Forbidden", resClientPost.status);

    // 6.2 Client attempts PATCH -> Expected 403 Forbidden
    const reqClientPatch = createMockRequest(`/api/templates/${createdCircuitId}`, "PATCH", tokenClient, updatePayload);
    const resClientPatch = await patchTemplate(reqClientPatch, { params: { id: createdCircuitId } });
    assert(resClientPatch.status === 403, "CLIENT PATCH /api/templates/[id] blocked with 403 Forbidden", resClientPatch.status);

    // 6.3 Client attempts DELETE -> Expected 403 Forbidden
    const reqClientDelete = createMockRequest(`/api/templates/${createdCircuitId}`, "DELETE", tokenClient);
    const resClientDelete = await deleteTemplate(reqClientDelete, { params: { id: createdCircuitId } });
    assert(resClientDelete.status === 403, "CLIENT DELETE /api/templates/[id] blocked with 403 Forbidden", resClientDelete.status);

    // 6.4 Unauthenticated request -> Expected 401 Unauthorized
    const reqUnauth = createMockRequest("/api/templates", "POST", undefined, circuitPayload);
    const resUnauth = await postTemplate(reqUnauth);
    assert(resUnauth.status === 401, "Unauthenticated POST /api/templates returns 401 Unauthorized", resUnauth.status);

    // 6.5 Admin can PATCH -> Expected 200 OK
    const reqAdminPatch = createMockRequest(`/api/templates/${createdCircuitId}`, "PATCH", tokenAdmin, {
      titleEn: "Full Body Circuit Conditioning (Admin Reviewed)"
    });
    const resAdminPatch = await patchTemplate(reqAdminPatch, { params: { id: createdCircuitId } });
    assert(resAdminPatch.status === 200, "ADMIN PATCH /api/templates/[id] returns 200 OK", resAdminPatch.status);

    // =========================================================================
    // TEST 7: Template Delete Restrictions (409 Conflict if Linked)
    // =========================================================================
    console.log("\n--- TEST 7: Template Delete Restrictions & Safe Cascade ---");
    // Link createdCircuit to a program workout
    const testProgram = await prisma.trainingProgram.create({
      data: {
        titleEn: "Throwaway Test Program",
        titleAr: "برنامج اختباري",
        sportId: testSport.id,
        difficulty: "BEGINNER",
        weeks: {
          create: {
            weekNumber: 1,
            days: {
              create: {
                dayNumber: 1,
                titleEn: "Day 1 Workout",
                titleAr: "اليوم الأول",
                workouts: {
                  create: {
                    title: "Linked Workout",
                    templateId: createdCircuitId
                  }
                }
              }
            }
          }
        }
      }
    });
    cleanupProgramIds.push(testProgram.id);

    // Attempt to DELETE linked template -> Expected 409 Conflict
    const reqDeleteLinked = createMockRequest(`/api/templates/${createdCircuitId}`, "DELETE", tokenCoach);
    const resDeleteLinked = await deleteTemplate(reqDeleteLinked, { params: { id: createdCircuitId } });
    const bodyDeleteLinked = await resDeleteLinked.json();

    assert(resDeleteLinked.status === 409, "DELETE linked template returns 409 Conflict", resDeleteLinked.status);
    assert(
      bodyDeleteLinked.error?.includes("program") || bodyDeleteLinked.error?.includes("referenced by"),
      "Conflict message mentions program reference",
      bodyDeleteLinked.error
    );

    // Remove program to allow clean template deletion
    await prisma.trainingProgram.delete({ where: { id: testProgram.id } });
    const progIndex = cleanupProgramIds.indexOf(testProgram.id);
    if (progIndex > -1) cleanupProgramIds.splice(progIndex, 1);

    // Now delete unlinked template -> Expected 200 OK
    const resDeleteClean = await deleteTemplate(reqDeleteLinked, { params: { id: createdCircuitId } });
    assert(resDeleteClean.status === 200, "DELETE unlinked template returns 200 OK", resDeleteClean.status);

    // Verify cascade deletion of blocks and items
    const remainingBlocks = await prisma.workoutBlock.findMany({ where: { templateId: createdCircuitId } });
    assert(remainingBlocks.length === 0, "Blocks cascaded on template delete", remainingBlocks.length);

    const circuitIndex = cleanupTemplateIds.indexOf(createdCircuitId);
    if (circuitIndex > -1) cleanupTemplateIds.splice(circuitIndex, 1);

    console.log("\n================================================================================");
    console.log(`=== PHASE 3 TEST SUMMARY: ${testsPassed} / ${testsTotal} TESTS PASSED ===`);
    console.log("================================================================================");
  } catch (error) {
    console.error("FATAL ERROR IN TEST SUITE:", error);
  } finally {
    // -------------------------------------------------------------------------
    // Cleanup fixtures
    // -------------------------------------------------------------------------
    console.log("\n[CLEANUP] Removing throwaway test fixtures...");

    for (const progId of cleanupProgramIds) {
      try {
        await prisma.trainingProgram.delete({ where: { id: progId } });
      } catch (e: any) {
        console.warn(`Could not delete program ${progId}:`, e.message);
      }
    }

    for (const tplId of cleanupTemplateIds) {
      try {
        await prisma.workoutBlock.deleteMany({ where: { templateId: tplId } });
        await prisma.workoutTemplateExercise.deleteMany({ where: { templateId: tplId } });
        await prisma.workoutTemplate.delete({ where: { id: tplId } });
      } catch (e: any) {
        console.warn(`Could not delete template ${tplId}:`, e.message);
      }
    }

    for (const exId of cleanupExerciseIds) {
      try {
        await prisma.blockItem.deleteMany({ where: { exerciseId: exId } });
        await prisma.workoutTemplateExercise.deleteMany({ where: { exerciseId: exId } });
        await prisma.exercise.delete({ where: { id: exId } });
      } catch (e: any) {
        console.warn(`Could not delete exercise ${exId}:`, e.message);
      }
    }

    for (const uId of cleanupUserIds) {
      try {
        await prisma.session.deleteMany({ where: { userId: uId } });
        await prisma.coachProfile.deleteMany({ where: { userId: uId } });
        await prisma.clientProfile.deleteMany({ where: { userId: uId } });
        await prisma.user.delete({ where: { id: uId } });
      } catch (e: any) {
        console.warn(`Could not delete user ${uId}:`, e.message);
      }
    }

    console.log("[CLEANUP COMPLETE] Database restored to clean state.");
    await prisma.$disconnect();
  }
}

run();

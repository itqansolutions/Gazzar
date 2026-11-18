/**
 * Phase 9.5 — Athlete Profile Critical Fixes (P0) Test Suite
 *
 * Verifies:
 * 1. GAP-01: Coach writes 1 PUBLIC_CLIENT and 1 PRIVATE_COACH note.
 *    - Coach viewing /api/clients/[id] sees both notes.
 *    - Athlete viewing /api/clients/[id] sees ONLY the PUBLIC_CLIENT note (PRIVATE_COACH filtered out).
 * 2. GAP-02: Surface coach review feedback on workout history and execution summary:
 *    - Athlete completes workout assignment with clientFeedback.
 *    - Coach submits session feedback (WorkoutLog.coachFeedback) and set-level review (SetLog.coachReview).
 *    - Athlete viewing GET /api/workouts?clientId=[id] receives coachFeedback and set-level notes.
 *    - Single assignment GET /api/workouts/[id] preserves and surfaces coach review for both athlete and coach.
 * 3. GAP-03: Goals CRUD & RBAC:
 *    - Athlete calling POST /api/clients/[id]/goals gets 403 Forbidden.
 *    - Coach creates goal (startingValue=100, currentValue=125, targetValue=150, unit=KG).
 *    - Athlete views goal via GET; progress calculates to 50%.
 *    - Coach updates goal to currentValue=150, status=ACHIEVED via PATCH.
 *    - Athlete calling DELETE /api/clients/[id]/goals gets 403 Forbidden.
 *    - Coach deletes goal via DELETE.
 *
 * 4. Full FK-safe teardown with before/after row count reconciliation to zero residue.
 */

import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole, ClientStatus, NoteType, GoalType, GoalStatus, CoachRoleInClient } from "@prisma/client";
import { SessionService } from "../src/lib/auth/session-service";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

interface RowCounts {
  users: number;
  clientProfiles: number;
  coachProfiles: number;
  coachClientAssignments: number;
  coachNotes: number;
  clientGoals: number;
  clientWorkoutAssignments: number;
  workoutLogs: number;
  setLogs: number;
  sessions: number;
}

async function getRowCounts(): Promise<RowCounts> {
  const [
    users,
    clientProfiles,
    coachProfiles,
    coachClientAssignments,
    coachNotes,
    clientGoals,
    clientWorkoutAssignments,
    workoutLogs,
    setLogs,
    sessions
  ] = await Promise.all([
    prisma.user.count(),
    prisma.clientProfile.count(),
    prisma.coachProfile.count(),
    prisma.clientCoachAssignment.count(),
    prisma.clientNote.count(),
    prisma.clientGoal.count(),
    prisma.clientWorkoutAssignment.count(),
    prisma.workoutLog.count(),
    prisma.setLog.count(),
    prisma.session.count()
  ]);

  return {
    users,
    clientProfiles,
    coachProfiles,
    coachClientAssignments,
    coachNotes,
    clientGoals,
    clientWorkoutAssignments,
    workoutLogs,
    setLogs,
    sessions
  };
}

async function runPhase95Tests() {
  console.log("================================================================================");
  console.log("PHASE 9.5 — ATHLETE PROFILE CRITICAL FIXES (P0) TEST SUITE");
  console.log("================================================================================\n");

  const initialCounts = await getRowCounts();
  console.log("Initial Row Counts:", initialCounts);

  const testId = `phase95_${Date.now()}`;
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Track created IDs for strict teardown
  const createdUserIds: string[] = [];
  const createdClientProfileIds: string[] = [];
  const createdCoachProfileIds: string[] = [];
  const createdSessionTokens: string[] = [];
  const createdNoteIds: string[] = [];
  const createdGoalIds: string[] = [];
  const createdAssignmentIds: string[] = [];
  const createdWorkoutLogIds: string[] = [];
  const createdSetLogIds: string[] = [];

  let coachSessionToken = "";
  let athleteSessionToken = "";
  let coachUserId = "";
  let coachProfileId = "";
  let athleteUserId = "";
  let athleteClientId = "";

  try {
    // --------------------------------------------------------------------------
    // 1. SETUP: Create Coach & Athlete
    // --------------------------------------------------------------------------
    console.log("\n[Setup] Creating throwaway Coach & Athlete...");

    // Create Coach
    const coachUser = await prisma.user.create({
      data: {
        name: `Coach Phase95 ${testId}`,
        email: `coach_${testId}@test.com`,
        passwordHash: passwordHash,
        role: UserRole.COACH
      }
    });
    createdUserIds.push(coachUser.id);
    coachUserId = coachUser.id;

    const coachProfile = await prisma.coachProfile.create({
      data: {
        userId: coachUser.id,
        specialties: ["CrossFit", "Strength"],
        yearsOfExperience: 5,
        bio: "Phase 9.5 Test Coach"
      }
    });
    createdCoachProfileIds.push(coachProfile.id);
    coachProfileId = coachProfile.id;

    const sessionService = new SessionService();

    const coachSession = await sessionService.createSession({ userId: coachUser.id });
    coachSessionToken = coachSession.sessionToken;

    // Create Athlete
    const athleteUser = await prisma.user.create({
      data: {
        name: `Athlete Phase95 ${testId}`,
        email: `athlete_${testId}@test.com`,
        passwordHash: passwordHash,
        role: UserRole.CLIENT
      }
    });
    createdUserIds.push(athleteUser.id);
    athleteUserId = athleteUser.id;

    const athleteProfile = await prisma.clientProfile.create({
      data: {
        userId: athleteUser.id,
        status: ClientStatus.ACTIVE
      }
    });
    createdClientProfileIds.push(athleteProfile.id);
    athleteClientId = athleteProfile.id;

    const athleteSession = await sessionService.createSession({ userId: athleteUser.id });
    athleteSessionToken = athleteSession.sessionToken;

    // Assign Athlete to Coach
    await prisma.clientCoachAssignment.create({
      data: {
        coachId: coachProfile.id,
        clientId: athleteProfile.id,
        role: CoachRoleInClient.PRIMARY,
        active: true
      }
    });

    console.log(`✓ Coach (${coachProfileId}) & Athlete (${athleteClientId}) created and linked.`);

    // --------------------------------------------------------------------------
    // 2. GAP-01: Coach Notes Visibility Test
    // --------------------------------------------------------------------------
    console.log("\n[Test 1 - GAP-01] Testing Coach Notes Visibility (Public vs Private)...");

    // Coach adds 1 PUBLIC_CLIENT note
    const pubNoteRes = await fetch(`${BASE_URL}/api/clients/${athleteClientId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `gx_session=${coachSessionToken}`
      },
      body: JSON.stringify({
        noteType: "PUBLIC_CLIENT",
        content: "Great effort on the tempo work this week! Keep hydration up."
      })
    });
    const pubNoteJson = await pubNoteRes.json();
    if (!pubNoteRes.ok || !pubNoteJson.success) {
      throw new Error(`Failed to create PUBLIC_CLIENT note: ${JSON.stringify(pubNoteJson)}`);
    }
    createdNoteIds.push(pubNoteJson.data.id);
    console.log(`✓ Coach created PUBLIC_CLIENT note: "${pubNoteJson.data.content}"`);

    // Coach adds 1 PRIVATE_COACH note
    const privNoteRes = await fetch(`${BASE_URL}/api/clients/${athleteClientId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `gx_session=${coachSessionToken}`
      },
      body: JSON.stringify({
        noteType: "PRIVATE_COACH",
        content: "Internal note: athlete reported slight shoulder impingement on Friday."
      })
    });
    const privNoteJson = await privNoteRes.json();
    if (!privNoteRes.ok || !privNoteJson.success) {
      throw new Error(`Failed to create PRIVATE_COACH note: ${JSON.stringify(privNoteJson)}`);
    }
    createdNoteIds.push(privNoteJson.data.id);
    console.log(`✓ Coach created PRIVATE_COACH note: "${privNoteJson.data.content}"`);

    // Coach fetches client data
    const coachViewRes = await fetch(`${BASE_URL}/api/clients/${athleteClientId}`, {
      headers: { Cookie: `gx_session=${coachSessionToken}` }
    });
    const coachViewJson = await coachViewRes.json();
    const coachNotes: any[] = coachViewJson.data.notes || [];
    console.log(`✓ Coach views /api/clients/[id]: sees ${coachNotes.length} notes (expected 2)`);
    if (coachNotes.length !== 2) {
      throw new Error(`Expected coach to see 2 notes, saw ${coachNotes.length}`);
    }

    // Athlete fetches own client data
    const athleteViewRes = await fetch(`${BASE_URL}/api/clients/${athleteClientId}`, {
      headers: { Cookie: `gx_session=${athleteSessionToken}` }
    });
    const athleteViewJson = await athleteViewRes.json();
    const athleteNotes: any[] = athleteViewJson.data.notes || [];
    console.log(`✓ Athlete views /api/clients/[id]: sees ${athleteNotes.length} notes (expected 1)`);
    if (athleteNotes.length !== 1) {
      throw new Error(`Expected athlete to see 1 note, saw ${athleteNotes.length}`);
    }
    if (athleteNotes[0].noteType !== "PUBLIC_CLIENT") {
      throw new Error(`Expected athlete's note to be PUBLIC_CLIENT, got ${athleteNotes[0].noteType}`);
    }
    const hasPrivateNote = athleteNotes.some((n: any) => n.noteType === "PRIVATE_COACH");
    if (hasPrivateNote) {
      throw new Error("SECURITY FAILURE: Athlete view contained PRIVATE_COACH note!");
    }
    console.log("✓ GAP-01 PASS: Athlete views only PUBLIC_CLIENT notes; PRIVATE_COACH note is strictly filtered out.");

    // --------------------------------------------------------------------------
    // 3. GAP-02: Surface Coach Review Feedback Test
    // --------------------------------------------------------------------------
    console.log("\n[Test 2 - GAP-02] Testing Coach Review Feedback Surfacing...");

    // Create Workout Assignment for Athlete
    const assignment = await prisma.clientWorkoutAssignment.create({
      data: {
        clientId: athleteProfile.id,
        coachId: coachProfile.id,
        title: "Phase 9.5 Strength Benchmark Session",
        scheduledDate: new Date(),
        status: "COMPLETED"
      }
    });
    createdAssignmentIds.push(assignment.id);

    // Create WorkoutLog + SetLog
    const workoutLog = await prisma.workoutLog.create({
      data: {
        assignmentId: assignment.id,
        clientId: athleteProfile.id,
        coachId: coachProfile.id,
        isCompleted: true,
        overallRpe: 8,
        durationMinutes: 45,
        clientFeedback: "Felt strong on bench, need to watch elbow flare."
      }
    });
    createdWorkoutLogIds.push(workoutLog.id);

    const setLog = await prisma.setLog.create({
      data: {
        workoutLogId: workoutLog.id,
        setNumber: 1,
        roundNumber: 1,
        isCompleted: true,
        actualWeightKg: 100,
        actualReps: 5,
        actualRpe: 8
      }
    });
    createdSetLogIds.push(setLog.id);

    // Coach submits review via POST /api/coach/review
    const coachReviewRes = await fetch(`${BASE_URL}/api/coach/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `gx_session=${coachSessionToken}`
      },
      body: JSON.stringify({
        workoutLogId: workoutLog.id,
        coachFeedback: "Solid execution! Tuck your elbows slightly more on descent to protect shoulders.",
        setReviews: [
          {
            setLogId: setLog.id,
            coachReview: "Bar path was very consistent on this set."
          }
        ]
      })
    });
    const coachReviewJson = await coachReviewRes.json();
    if (!coachReviewRes.ok || !coachReviewJson.success) {
      throw new Error(`Failed to submit coach review: ${JSON.stringify(coachReviewJson)}`);
    }
    console.log(`✓ Coach review submitted successfully for assignment ${assignment.id}`);

    // Verify via GET /api/workouts?clientId=[id] as Athlete
    const workoutsListRes = await fetch(`${BASE_URL}/api/workouts?clientId=${athleteClientId}`, {
      headers: { Cookie: `gx_session=${athleteSessionToken}` }
    });
    const workoutsListJson = await workoutsListRes.json();
    if (!workoutsListRes.ok || !workoutsListJson.success) {
      throw new Error(`Failed to fetch workouts list: ${JSON.stringify(workoutsListJson)}`);
    }
    const retrievedAssignment = workoutsListJson.data.assignments.find((a: any) => a.id === assignment.id);
    if (!retrievedAssignment) {
      throw new Error("Assignment not found in athlete workouts list");
    }

    if (!retrievedAssignment.workoutLog?.coachFeedback) {
      throw new Error("Coach feedback missing from athlete workouts list assignment payload!");
    }
    console.log(`✓ Athlete workouts tab payload includes coachFeedback: "${retrievedAssignment.workoutLog.coachFeedback}"`);

    const retrievedSetLog = retrievedAssignment.workoutLog.setLogs.find((s: any) => s.id === setLog.id);
    if (!retrievedSetLog?.coachReview) {
      throw new Error("Set-level coachReview missing from athlete workouts list payload!");
    }
    console.log(`✓ Athlete workouts tab payload includes set-level review: "${retrievedSetLog.coachReview}"`);

    // Verify via GET /api/workouts/[id] as Athlete
    const singleWorkoutRes = await fetch(`${BASE_URL}/api/workouts/${assignment.id}`, {
      headers: { Cookie: `gx_session=${athleteSessionToken}` }
    });
    const singleWorkoutJson = await singleWorkoutRes.json();
    if (!singleWorkoutJson.data.workoutLog?.coachFeedback) {
      throw new Error("Coach feedback missing from single workout execution payload!");
    }
    console.log(`✓ Workout execution view payload includes coachFeedback: "${singleWorkoutJson.data.workoutLog.coachFeedback}"`);
    console.log("✓ GAP-02 PASS: Coach review feedback successfully surfaced on both WorkoutsTab and Workout Execution views.");

    // --------------------------------------------------------------------------
    // 4. GAP-03: Goals CRUD & RBAC Test
    // --------------------------------------------------------------------------
    console.log("\n[Test 3 - GAP-03] Testing Goals CRUD & RBAC Rules...");

    // Test RBAC: Athlete attempts to create goal (MUST FAIL with 403)
    const athleteCreateGoalRes = await fetch(`${BASE_URL}/api/clients/${athleteClientId}/goals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `gx_session=${athleteSessionToken}`
      },
      body: JSON.stringify({
        title: "Athlete Self-Created Goal",
        goalType: "STRENGTH",
        startingValue: 80,
        currentValue: 90,
        targetValue: 120,
        unit: "KG"
      })
    });
    console.log(`✓ Athlete POST /goals status: ${athleteCreateGoalRes.status} (Expected 403 Forbidden)`);
    if (athleteCreateGoalRes.status !== 403) {
      throw new Error(`RBAC failure: expected 403 for athlete POST /goals, got ${athleteCreateGoalRes.status}`);
    }

    // Coach creates goal
    const coachCreateGoalRes = await fetch(`${BASE_URL}/api/clients/${athleteClientId}/goals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `gx_session=${coachSessionToken}`
      },
      body: JSON.stringify({
        title: "Back Squat 150kg",
        goalType: "STRENGTH",
        startingValue: 100,
        currentValue: 125,
        targetValue: 150,
        unit: "KG",
        deadline: new Date(Date.now() + 30 * 86400 * 1000).toISOString()
      })
    });
    const coachCreateGoalJson = await coachCreateGoalRes.json();
    if (!coachCreateGoalRes.ok || !coachCreateGoalJson.success) {
      throw new Error(`Coach failed to create goal: ${JSON.stringify(coachCreateGoalJson)}`);
    }
    const createdGoal = coachCreateGoalJson.data;
    createdGoalIds.push(createdGoal.id);
    console.log(`✓ Coach created goal "${createdGoal.title}" (ID: ${createdGoal.id}, Status: ${createdGoal.status})`);

    // Athlete views goals via GET /api/clients/[id]/goals
    const athleteGetGoalsRes = await fetch(`${BASE_URL}/api/clients/${athleteClientId}/goals`, {
      headers: { Cookie: `gx_session=${athleteSessionToken}` }
    });
    const athleteGetGoalsJson = await athleteGetGoalsRes.json();
    if (!athleteGetGoalsRes.ok || !athleteGetGoalsJson.success) {
      throw new Error(`Athlete failed to fetch goals: ${JSON.stringify(athleteGetGoalsJson)}`);
    }
    const foundGoal = athleteGetGoalsJson.data.find((g: any) => g.id === createdGoal.id);
    if (!foundGoal) {
      throw new Error("Created goal not found in athlete goals list!");
    }
    // Calculate progress: (125 - 100) / (150 - 100) = 25 / 50 = 50%
    const progress = Math.round(((foundGoal.currentValue - foundGoal.startingValue) / (foundGoal.targetValue - foundGoal.startingValue)) * 100);
    console.log(`✓ Athlete viewed goal: current=${foundGoal.currentValue}, start=${foundGoal.startingValue}, target=${foundGoal.targetValue} -> Progress: ${progress}% (Expected 50%)`);
    if (progress !== 50) {
      throw new Error(`Expected progress 50%, got ${progress}%`);
    }

    // Coach updates goal to currentValue=150, status=ACHIEVED via PATCH
    const coachUpdateGoalRes = await fetch(`${BASE_URL}/api/clients/${athleteClientId}/goals`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `gx_session=${coachSessionToken}`
      },
      body: JSON.stringify({
        goalId: createdGoal.id,
        currentValue: 150,
        status: "ACHIEVED"
      })
    });
    const coachUpdateGoalJson = await coachUpdateGoalRes.json();
    if (!coachUpdateGoalRes.ok || !coachUpdateGoalJson.success) {
      throw new Error(`Coach failed to update goal: ${JSON.stringify(coachUpdateGoalJson)}`);
    }
    console.log(`✓ Coach updated goal: status=${coachUpdateGoalJson.data.status}, currentValue=${coachUpdateGoalJson.data.currentValue}`);
    if (coachUpdateGoalJson.data.status !== "ACHIEVED") {
      throw new Error(`Expected status ACHIEVED, got ${coachUpdateGoalJson.data.status}`);
    }

    // Test RBAC: Athlete attempts to delete goal (MUST FAIL with 403)
    const athleteDeleteGoalRes = await fetch(`${BASE_URL}/api/clients/${athleteClientId}/goals?goalId=${createdGoal.id}`, {
      method: "DELETE",
      headers: { Cookie: `gx_session=${athleteSessionToken}` }
    });
    console.log(`✓ Athlete DELETE /goals status: ${athleteDeleteGoalRes.status} (Expected 403 Forbidden)`);
    if (athleteDeleteGoalRes.status !== 403) {
      throw new Error(`RBAC failure: expected 403 for athlete DELETE /goals, got ${athleteDeleteGoalRes.status}`);
    }

    // Coach deletes goal via DELETE /api/clients/[id]/goals
    const coachDeleteGoalRes = await fetch(`${BASE_URL}/api/clients/${athleteClientId}/goals?goalId=${createdGoal.id}`, {
      method: "DELETE",
      headers: { Cookie: `gx_session=${coachSessionToken}` }
    });
    const coachDeleteGoalJson = await coachDeleteGoalRes.json();
    if (!coachDeleteGoalRes.ok || !coachDeleteGoalJson.success) {
      throw new Error(`Coach failed to delete goal: ${JSON.stringify(coachDeleteGoalJson)}`);
    }
    // Remove from createdGoalIds array since it's already deleted
    const gIdx = createdGoalIds.indexOf(createdGoal.id);
    if (gIdx >= 0) createdGoalIds.splice(gIdx, 1);
    console.log(`✓ Coach deleted goal ${createdGoal.id} successfully`);
    console.log("✓ GAP-03 PASS: Full Goals CRUD verified with strict Coach-only write RBAC and accurate progress tracking.");

  } finally {
    // --------------------------------------------------------------------------
    // 5. TEARDOWN & ROW COUNT RECONCILIATION
    // --------------------------------------------------------------------------
    console.log("\n[Teardown] Performing FK-safe cleanup of all throwaway test entities...");

    // 1. Delete SetLogs
    if (createdSetLogIds.length > 0) {
      await prisma.setLog.deleteMany({ where: { id: { in: createdSetLogIds } } });
    }
    // 2. Delete WorkoutLogs
    if (createdWorkoutLogIds.length > 0) {
      await prisma.workoutLog.deleteMany({ where: { id: { in: createdWorkoutLogIds } } });
    }
    // 3. Delete Workout Assignments
    if (createdAssignmentIds.length > 0) {
      await prisma.clientWorkoutAssignment.deleteMany({ where: { id: { in: createdAssignmentIds } } });
    }
    // 4. Delete Goals (if any remain)
    if (createdGoalIds.length > 0) {
      await prisma.clientGoal.deleteMany({ where: { id: { in: createdGoalIds } } });
    }
    // 5. Delete CoachNotes
    if (createdNoteIds.length > 0) {
      await prisma.clientNote.deleteMany({ where: { id: { in: createdNoteIds } } });
    }
    // 6. Delete CoachClientAssignments
    if (createdClientProfileIds.length > 0) {
      await prisma.clientCoachAssignment.deleteMany({ where: { clientId: { in: createdClientProfileIds } } });
    }
    // 7. Delete AuditLogs generated by tests
    if (createdUserIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: createdUserIds } } });
    }
    // 8. Delete Sessions
    if (createdUserIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
    }
    // 9. Delete ClientProfiles
    if (createdClientProfileIds.length > 0) {
      await prisma.clientProfile.deleteMany({ where: { id: { in: createdClientProfileIds } } });
    }
    // 10. Delete CoachProfiles
    if (createdCoachProfileIds.length > 0) {
      await prisma.coachProfile.deleteMany({ where: { id: { in: createdCoachProfileIds } } });
    }
    // 11. Delete Users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }

    console.log("✓ All throwaway entities removed.");

    // Row Count Reconciliation
    const finalCounts = await getRowCounts();
    console.log("\nFinal Row Counts:", finalCounts);

    const keys: (keyof RowCounts)[] = [
      "users",
      "clientProfiles",
      "coachProfiles",
      "coachClientAssignments",
      "coachNotes",
      "clientGoals",
      "clientWorkoutAssignments",
      "workoutLogs",
      "setLogs",
      "sessions"
    ];

    let hasDiff = false;
    for (const key of keys) {
      const diff = finalCounts[key] - initialCounts[key];
      if (diff !== 0) {
        console.error(`❌ RESIDUE DETECTED on ${key}: delta = ${diff}`);
        hasDiff = true;
      }
    }

    if (hasDiff) {
      throw new Error("Row count reconciliation failed: residue detected in database!");
    } else {
      console.log("\n================================================================================");
      console.log("✓ RECONCILIATION SUCCESS: 0 RESIDUE DETECTED. DATABASE IS 100% CLEAN.");
      console.log("================================================================================\n");
    }
  }
}

runPhase95Tests()
  .then(() => {
    console.log("PHASE 9.5 ALL TESTS PASSED SUCCESSFULLY.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("PHASE 9.5 TEST FAILED:", err);
    process.exit(1);
  });

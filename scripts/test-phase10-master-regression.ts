/**
 * Phase 10: Master End-to-End Regression Suite & Production Hardening
 *
 * Comprehensive Multi-Role E2E Lifecycle Testing:
 * - Role 1: ADMIN (System Management, Sports, Cross-Academy Reports, Audit Logs)
 * - Role 2: COACH (Master Programs with Blocks, Assignments, Calendar Sessions, Reviews, Goals, Notes)
 * - Role 3: CLIENT / ATHLETE (Profile 360, Public vs Private Notes, Block-Aware Execution, SetLog Upsert, Goals, Nutrition)
 * - Security & Production Hardening:
 *   - Multi-role RBAC enforcement (401 Unauthorized / 403 Forbidden)
 *   - Immutability & Conflict Protection (409 Conflict on completed sessions / referenced models)
 *   - Cross-Athlete Data Isolation
 *   - Zero Database Residue & FK-Safe Teardown Reconciliation
 */

import {
  PrismaClient,
  UserRole,
  GoalType,
  GoalStatus,
  Difficulty,
  BlockType,
  BlockItemType,
  MetricType,
  AssignmentStatus,
  AssignmentSourceType,
  NoteType,
  RestrictionSeverity,
  BodyPart,
  SessionType,
  EventType,
  EventMode,
  AudienceScope,
  AttendanceStatus,
  NutritionAssignmentMode
} from "@prisma/client";
import { sessionService as authSessionService } from "../src/lib/auth/session-service";
import { sessionService as calendarSessionService } from "../src/server/services/session.service";
import { nutritionTrackingService } from "../src/server/services/nutrition-tracking.service";
import { programService, ProgramServiceError } from "../src/server/services/program.service";
import { workoutService, WorkoutServiceError } from "../src/server/services/workout.service";
import { monitoringService } from "../src/server/services/monitoring.service";
import { calendarService } from "../src/server/services/calendar.service";
import { clientService } from "../src/server/services/client.service";
import { healthService } from "../src/server/services/health.service";
import { checkInScheduleService } from "../src/server/services/checkin-schedule.service";
import { sportService } from "../src/server/services/sport.service";
import { nutritionProgramService } from "../src/server/services/nutrition-program.service";
import { GET as getMonitoringHttp } from "../src/app/api/coach/monitoring/route";
import { POST as postReviewHttp } from "../src/app/api/coach/review/route";
import { GET as getReportsHttp } from "../src/app/api/reports/route";
import { GET as getClientHttp } from "../src/app/api/clients/[id]/route";
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

interface BaselineCounts {
  users: number;
  clientProfiles: number;
  coachProfiles: number;
  sports: number;
  exercises: number;
  workoutTemplates: number;
  trainingPrograms: number;
  programWeeks: number;
  programDays: number;
  programWorkouts: number;
  workoutBlocks: number;
  blockItems: number;
  clientWorkoutAssignments: number;
  assignmentBlocks: number;
  assignmentBlockItems: number;
  workoutLogs: number;
  setLogs: number;
  sessions: number;
  attendances: number;
  checkInSchedules: number;
  clientNotes: number;
  clientGoals: number;
  medicalRestrictions: number;
  nutritionPrograms: number;
  nutritionAssignments: number;
  dailyNutritionLogs: number;
  auditLogs: number;
}

async function getLiveCounts(): Promise<BaselineCounts> {
  const [
    users,
    clientProfiles,
    coachProfiles,
    sports,
    exercises,
    workoutTemplates,
    trainingPrograms,
    programWeeks,
    programDays,
    programWorkouts,
    workoutBlocks,
    blockItems,
    clientWorkoutAssignments,
    assignmentBlocks,
    assignmentBlockItems,
    workoutLogs,
    setLogs,
    sessions,
    attendances,
    checkInSchedules,
    clientNotes,
    clientGoals,
    medicalRestrictions,
    nutritionPrograms,
    nutritionAssignments,
    dailyNutritionLogs,
    auditLogs
  ] = await Promise.all([
    prisma.user.count(),
    prisma.clientProfile.count(),
    prisma.coachProfile.count(),
    prisma.sport.count(),
    prisma.exercise.count(),
    prisma.workoutTemplate.count(),
    prisma.trainingProgram.count(),
    prisma.programWeek.count(),
    prisma.programDay.count(),
    prisma.programWorkout.count(),
    prisma.workoutBlock.count(),
    prisma.blockItem.count(),
    prisma.clientWorkoutAssignment.count(),
    prisma.assignmentBlock.count(),
    prisma.assignmentBlockItem.count(),
    prisma.workoutLog.count(),
    prisma.setLog.count(),
    prisma.sessionCalendar.count(),
    prisma.sessionAttendance.count(),
    prisma.athleteCheckInSchedule.count(),
    prisma.clientNote.count(),
    prisma.clientGoal.count(),
    prisma.clientMedicalRestriction.count(),
    prisma.nutritionProgram.count(),
    prisma.clientNutritionAssignment.count(),
    prisma.dailyNutritionLog.count(),
    prisma.auditLog.count()
  ]);

  return {
    users,
    clientProfiles,
    coachProfiles,
    sports,
    exercises,
    workoutTemplates,
    trainingPrograms,
    programWeeks,
    programDays,
    programWorkouts,
    workoutBlocks,
    blockItems,
    clientWorkoutAssignments,
    assignmentBlocks,
    assignmentBlockItems,
    workoutLogs,
    setLogs,
    sessions,
    attendances,
    checkInSchedules,
    clientNotes,
    clientGoals,
    medicalRestrictions,
    nutritionPrograms,
    nutritionAssignments,
    dailyNutritionLogs,
    auditLogs
  };
}

async function run() {
  console.log("================================================================================");
  console.log("=== PHASE 10: MASTER END-TO-END REGRESSION SUITE & PRODUCTION HARDENING ===");
  console.log("================================================================================\n");

  const cleanupUserIds: string[] = [];
  const cleanupSportIds: string[] = [];
  const cleanupExerciseIds: string[] = [];
  const cleanupTemplateIds: string[] = [];
  const cleanupProgramIds: string[] = [];
  const cleanupAssignmentIds: string[] = [];
  const cleanupProgramAssignmentIds: string[] = [];
  const cleanupNutritionProgramIds: string[] = [];
  const cleanupNutritionAssignmentIds: string[] = [];
  const cleanupDailyNutritionLogIds: string[] = [];
  const cleanupSessionIds: string[] = [];
  const cleanupAuditLogIds: string[] = [];

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, title: string, details?: any) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${title}`);
    } else {
      console.error(`  ❌ [FAIL] ${title}`, details ? details : "");
      throw new Error(`Assertion failed: ${title}`);
    }
  }

  // 1. Record initial baseline counts
  console.log("[BASELINE] Recording pre-test database baseline row counts...");
  const baseline = await getLiveCounts();
  console.log("  Baseline:", JSON.stringify(baseline, null, 2));

  const ts = Date.now();
  const dummyHash = "$2a$10$wT0vI8n.dYmZ8yv8Yn8p.O7b2M1e6k1b2c3d4e5f6g7h8i9j0k1l2";

  try {
    // 2. Setup Multi-Role Actors
    console.log("\n[SETUP] Creating throwaway multi-role actors (Admin, Head Coach, Coach A, Coach B, Athlete 1, Athlete 2)...");

    const adminUser = await prisma.user.create({
      data: {
        email: `throwaway.p10.admin.${ts}@gx.test`,
        name: "P10 Admin",
        role: UserRole.ADMIN,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(adminUser.id);
    const adminSession = await authSessionService.createSession({ userId: adminUser.id });
    const adminActor = {
      user: { id: adminUser.id, name: adminUser.name, role: adminUser.role },
      coachProfileId: null,
      clientProfileId: null
    };

    const coachAUser = await prisma.user.create({
      data: {
        email: `throwaway.p10.coacha.${ts}@gx.test`,
        name: "P10 Coach A",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "Head Strength Coach" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coachAUser.id);
    const coachASession = await authSessionService.createSession({ userId: coachAUser.id });
    const coachAActor = {
      user: { id: coachAUser.id, name: coachAUser.name, role: coachAUser.role },
      coachProfileId: coachAUser.coachProfile!.id,
      clientProfileId: null
    };

    const coachBUser = await prisma.user.create({
      data: {
        email: `throwaway.p10.coachb.${ts}@gx.test`,
        name: "P10 Coach B",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "Conditioning Specialist" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(coachBUser.id);
    const coachBSession = await authSessionService.createSession({ userId: coachBUser.id });
    const coachBActor = {
      user: { id: coachBUser.id, name: coachBUser.name, role: coachBUser.role },
      coachProfileId: coachBUser.coachProfile!.id,
      clientProfileId: null
    };

    const athlete1User = await prisma.user.create({
      data: {
        email: `throwaway.p10.ath1.${ts}@gx.test`,
        name: "P10 Athlete 1 (Assigned to A)",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: { status: "ACTIVE", weightKg: 85, heightCm: 180 } }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(athlete1User.id);
    const athlete1Session = await authSessionService.createSession({ userId: athlete1User.id });
    const athlete1Actor = {
      user: { id: athlete1User.id, name: athlete1User.name, role: athlete1User.role },
      coachProfileId: null,
      clientProfileId: athlete1User.clientProfile!.id
    };

    const athlete2User = await prisma.user.create({
      data: {
        email: `throwaway.p10.ath2.${ts}@gx.test`,
        name: "P10 Athlete 2 (Assigned to B)",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: { status: "ACTIVE", weightKg: 72, heightCm: 175 } }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(athlete2User.id);
    const athlete2Session = await authSessionService.createSession({ userId: athlete2User.id });
    const athlete2Actor = {
      user: { id: athlete2User.id, name: athlete2User.name, role: athlete2User.role },
      coachProfileId: null,
      clientProfileId: athlete2User.clientProfile!.id
    };

    // Link Coach A -> Athlete 1, Coach B -> Athlete 2
    await prisma.clientCoachAssignment.create({
      data: {
        clientId: athlete1User.clientProfile!.id,
        coachId: coachAUser.coachProfile!.id,
        active: true
      }
    });

    await prisma.clientCoachAssignment.create({
      data: {
        clientId: athlete2User.clientProfile!.id,
        coachId: coachBUser.coachProfile!.id,
        active: true
      }
    });

    // Create sport and movements
    const sport = await prisma.sport.create({
      data: { nameEn: `P10 Cross-Training ${ts}`, nameAr: `لياقة شاملة ${ts}` }
    });
    cleanupSportIds.push(sport.id);

    const squatEx = await prisma.exercise.create({
      data: {
        nameEn: `P10 Back Squat ${ts}`,
        nameAr: `سكوات ${ts}`,
        sportId: sport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        difficulty: Difficulty.INTERMEDIATE
      }
    });
    cleanupExerciseIds.push(squatEx.id);

    const pullupEx = await prisma.exercise.create({
      data: {
        nameEn: `P10 Weighted Pull-Up ${ts}`,
        nameAr: `عقلة بوزن ${ts}`,
        sportId: sport.id,
        metricType: MetricType.SETS_REPS_WEIGHT,
        difficulty: Difficulty.ADVANCED
      }
    });
    cleanupExerciseIds.push(pullupEx.id);

    console.log("  Setup complete.");

    // =========================================================================
    // SECTION 1: ROLE 1 (ADMIN) SYSTEM AUDIT & AGGREGATED REPORTS
    // =========================================================================
    console.log("\n[SECTION 1] Testing Admin Capabilities, Academy Reports & Audit Logging...");

    const adminReportsReq = createMockRequest("/api/reports", "GET", adminSession.sessionToken);
    const adminReportsRes = await getReportsHttp(adminReportsReq);
    assert(adminReportsRes.status === 200, "1.1 Admin fetches aggregated reports (HTTP 200)");
    const adminReportsJson = await adminReportsRes.json();
    assert(adminReportsJson.success === true, "1.2 Aggregated reports payload marked success");
    assert(typeof adminReportsJson.data.kpi.overallAdherenceRate === "number", "1.3 overallAdherenceRate metric computed as number");
    assert(Array.isArray(adminReportsJson.data.attendanceTrend), "1.4 attendanceTrend historical timeline provided");

    // =========================================================================
    // SECTION 2: ROLE 2 (COACH) PERIODIZATION, BLOCK BUILDER & ASSIGNMENTS
    // =========================================================================
    console.log("\n[SECTION 2] Testing Coach Program Building, Blocks Hierarchy & Customization...");

    // Coach A builds a 2-week periodized master program with a SUPERSET block
    const program = await programService.createProgram(
      {
        titleEn: `P10 Championship Blueprint ${ts}`,
        titleAr: `برنامج البطولة ${ts}`,
        descriptionEn: "Master Periodization",
        sportId: sport.id,
        goalType: GoalType.STRENGTH,
        difficulty: Difficulty.ADVANCED,
        creatorId: coachAUser.coachProfile!.id,
        status: "ACTIVE",
        weeks: [
          {
            weekNumber: 1,
            focusEn: "Week 1 - Strength Accumulation",
            days: [
              {
                dayNumber: 1,
                titleEn: "Lower Body Heavy",
                isRestDay: false,
                workouts: [
                  {
                    title: "Squat + Pull Power Session",
                    orderIndex: 0,
                    blocks: [
                      {
                        orderIndex: 1,
                        type: BlockType.SUPERSET,
                        title: "Strength Superset A",
                        rounds: 3,
                        durationSeconds: 180,
                        restBetweenRoundsSeconds: 120,
                        items: [
                          {
                            orderIndex: 1,
                            itemType: BlockItemType.EXERCISE,
                            exerciseId: squatEx.id,
                            targetSets: 3,
                            targetReps: "5",
                            targetWeightKg: 120,
                            restSeconds: 90
                          },
                          {
                            orderIndex: 2,
                            itemType: BlockItemType.EXERCISE,
                            exerciseId: pullupEx.id,
                            targetSets: 3,
                            targetReps: "6",
                            targetWeightKg: 15,
                            restSeconds: 90
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                dayNumber: 2,
                titleEn: "Rest & Active Recovery",
                isRestDay: true,
                workouts: []
              }
            ]
          }
        ]
      },
      coachAActor
    );
    cleanupProgramIds.push(program.id);

    assert(program.masterVersion === 1, "2.1 Master program created with masterVersion = 1");
    assert(program.weeks[0].days[0].workouts[0].blocks[0].type === BlockType.SUPERSET, "2.2 Block hierarchy correctly preserves SUPERSET type");
    assert(program.weeks[0].days[0].workouts[0].blocks[0].items.length === 2, "2.3 Superset block contains exactly 2 exercises");

    // Coach A assigns the program to Athlete 1
    const applied = await programService.applyProgramToClient(
      program.id,
      athlete1User.clientProfile!.id,
      coachAUser.coachProfile!.id,
      "2026-11-20",
      undefined,
      coachAActor
    );
    cleanupProgramAssignmentIds.push(applied.programAssignment.id);
    for (const w of applied.workoutAssignments) {
      cleanupAssignmentIds.push(w.id);
    }

    assert(applied.workoutAssignments.length === 1, "2.4 Program successfully created 1 scheduled workout assignment for Athlete 1");
    const targetAssignmentId = applied.workoutAssignments[0].id;

    // Verify snapshot decoupling: customize assignment for Athlete 1 without mutating master blueprint
    const customized = await workoutService.customizeAssignment(
      targetAssignmentId,
      {
        title: "Squat Power (Deload Adjusted for Athlete 1)",
        coachNotes: "Lowered back squat to 100kg due to heavy travel fatigue"
      },
      coachAActor
    );
    assert(customized.title === "Squat Power (Deload Adjusted for Athlete 1)", "2.5 Assignment customized cleanly for athlete");

    const masterProgVerify = await programService.getProgramById(program.id);
    assert(
      masterProgVerify?.weeks[0].days[0].workouts[0].title === "Squat + Pull Power Session",
      "2.6 Master program title untouched in blueprint (snapshot isolation guaranteed)"
    );

    // =========================================================================
    // SECTION 3: ROLE 3 (ATHLETE) PROFILE, NOTES PRIVACY & BLOCK EXECUTION
    // =========================================================================
    console.log("\n[SECTION 3] Testing Athlete Experience, Privacy Isolation, Execution & SetLog Upsert...");

    // Coach writes 1 PUBLIC_CLIENT note and 1 PRIVATE_COACH note for Athlete 1
    await healthService.addClientNote(
      athlete1User.clientProfile!.id,
      coachAUser.id,
      NoteType.PUBLIC_CLIENT,
      "P10 Public Note: Great job maintaining posture on squats!",
      coachAActor
    );

    await healthService.addClientNote(
      athlete1User.clientProfile!.id,
      coachAUser.id,
      NoteType.PRIVATE_COACH,
      "P10 Private Note: Athlete complained of tight hip flexor.",
      coachAActor
    );

    // Coach views athlete profile
    const coachViewAthlete = await clientService.getClientById(athlete1User.clientProfile!.id, coachAActor);
    assert(coachViewAthlete.notes.length === 2, "3.1 Coach viewing athlete profile sees BOTH public and private notes (got 2)");

    // Athlete views own profile
    const athleteViewSelf = await clientService.getClientById(athlete1User.clientProfile!.id, athlete1Actor);
    assert(athleteViewSelf.notes.length === 1, "3.2 Athlete viewing own profile sees ONLY the PUBLIC_CLIENT note (got 1)");
    assert(athleteViewSelf.notes[0].noteType === NoteType.PUBLIC_CLIENT, "3.3 Verified only PUBLIC_CLIENT note returned to athlete");

    // Athlete executes workout with block-aware round indicators and records SetLogs
    const athleteWorkout = await workoutService.getAssignmentById(targetAssignmentId, athlete1Actor);
    assert(athleteWorkout !== null, "3.4 Athlete fetches assigned workout successfully");
    const block1 = athleteWorkout?.assignmentBlocks?.[0];
    assert(block1?.type === BlockType.SUPERSET, "3.5 Block-aware execution UI receives SUPERSET block structure");
    const item1 = block1?.items?.[0]; // Squat
    const item2 = block1?.items?.[1]; // Pull-up

    // Save in-progress execution: Round 1 (Item 1 & Item 2)
    const inProgressSave = await workoutService.saveWorkoutExecution(
      targetAssignmentId,
      {
        mode: "SAVE_PROGRESS",
        durationMinutes: 25,
        overallRpe: 8,
        clientFeedback: "Felt strong during the first round",
        exercises: [
          {
            assignmentBlockItemId: item1!.id,
            sets: [
              {
                setNumber: 1,
                roundNumber: 1,
                actualWeightKg: 100,
                actualReps: 5,
                isCompleted: true,
                actualRpe: 8
              }
            ]
          },
          {
            assignmentBlockItemId: item2!.id,
            sets: [
              {
                setNumber: 1,
                roundNumber: 1,
                actualWeightKg: 15,
                actualReps: 6,
                isCompleted: true,
                actualRpe: 8
              }
            ]
          }
        ]
      },
      athlete1Actor
    );
    assert(inProgressSave.effectiveStatus === "IN_PROGRESS", "3.6 Assignment effectiveStatus transitions to IN_PROGRESS");

    const midSetLogs = await prisma.setLog.findMany({
      where: { workoutLog: { assignmentId: targetAssignmentId } }
    });
    assert(midSetLogs.length === 2, "3.7 Exactly 2 SetLog rows saved for Round 1");
    const firstSetLogId = midSetLogs[0].id;

    // Test ATOMIC SetLog Upsert: update Round 1 without deleting/recreating, and add Round 2 with item skip
    const round2Save = await workoutService.saveWorkoutExecution(
      targetAssignmentId,
      {
        mode: "COMPLETE",
        durationMinutes: 52,
        overallRpe: 9,
        clientFeedback: "Finished workout! Skipped second pull-up set due to forearm pump.",
        exercises: [
          {
            assignmentBlockItemId: item1!.id,
            sets: [
              {
                setNumber: 1,
                roundNumber: 1,
                actualWeightKg: 105, // Updated weight in-place
                actualReps: 5,
                isCompleted: true,
                actualRpe: 8.5
              },
              {
                setNumber: 2,
                roundNumber: 2,
                actualWeightKg: 105,
                actualReps: 5,
                isCompleted: true,
                actualRpe: 9
              }
            ]
          },
          {
            assignmentBlockItemId: item2!.id,
            sets: [
              {
                setNumber: 1,
                roundNumber: 1,
                actualWeightKg: 15,
                actualReps: 6,
                isCompleted: true,
                actualRpe: 8
              },
              {
                setNumber: 2,
                roundNumber: 2,
                isCompleted: false,
                isSkipped: true,
                skipReason: "Forearm fatigue"
              }
            ]
          }
        ]
      },
      athlete1Actor
    );
    assert(round2Save.effectiveStatus === "COMPLETED", "3.8 Assignment effectiveStatus transitions to COMPLETED");

    const finalSetLogs = await prisma.setLog.findMany({
      where: { workoutLog: { assignmentId: targetAssignmentId } },
      orderBy: [{ assignmentBlockItemId: "asc" }, { setNumber: "asc" }]
    });
    assert(finalSetLogs.length === 4, "3.9 Total SetLogs is exactly 4 (atomic upsert preserved existing rows without duplicating)");

    const updatedFirstSet = finalSetLogs.find((s) => s.id === firstSetLogId);
    assert(updatedFirstSet !== undefined, "3.10 In-place atomic upsert preserved original row ID");
    assert(updatedFirstSet?.actualWeightKg === 105, "3.11 Updated weight (105kg) saved on existing SetLog");

    const skippedSet = finalSetLogs.find((s) => s.isSkipped === true);
    assert(skippedSet !== undefined, "3.12 Item-level skip recorded on SetLog");
    assert(skippedSet?.skipReason === "Forearm fatigue", "3.13 Skip reason stored accurately on SetLog");

    // =========================================================================
    // SECTION 4: COACH REVIEW & ADHERENCE MONITORING
    // =========================================================================
    console.log("\n[SECTION 4] Testing Coach Review, Set-Level Feedback & Monitoring Feed...");

    // Coach A submits session feedback and set-level review
    const workoutLog = await prisma.workoutLog.findUnique({
      where: { assignmentId: targetAssignmentId }
    });
    assert(workoutLog !== null, "4.1 WorkoutLog exists for completed assignment");

    const reviewReq = createMockRequest("/api/coach/review", "POST", coachASession.sessionToken, {
      workoutLogId: workoutLog!.id,
      coachFeedback: "Masterclass execution on squats! Keep that chest angle tall.",
      setReviews: [
        {
          setLogId: firstSetLogId,
          coachReview: "Great bar speed here."
        }
      ]
    });
    const reviewRes = await postReviewHttp(reviewReq);
    assert(reviewRes.status === 200, "4.2 Coach submits session & set-level review (HTTP 200)");

    // Athlete views workout history and receives coach feedback
    const athleteWorkouts = await workoutService.getAssignments(athlete1User.clientProfile!.id);
    const completedWorkout = athleteWorkouts.find((w: any) => w.id === targetAssignmentId);
    assert(
      completedWorkout?.workoutLog?.coachFeedback === "Masterclass execution on squats! Keep that chest angle tall.",
      "4.3 Coach session feedback surfaced on athlete's workout log"
    );

    // Coach Monitoring Feed scoping
    const coachMonitoringReq = createMockRequest("/api/coach/monitoring", "GET", coachASession.sessionToken);
    const coachMonitoringRes = await getMonitoringHttp(coachMonitoringReq);
    assert(coachMonitoringRes.status === 200, "4.4 Coach A checks monitoring dashboard (HTTP 200)");
    const coachMonitoringJson = await coachMonitoringRes.json();
    const athlete1InFeed = coachMonitoringJson.data.athletes.find((a: any) => a.client.id === athlete1User.clientProfile!.id);
    assert(athlete1InFeed !== undefined, "4.5 Assigned Athlete 1 appears in Coach A monitoring roster");
    assert(athlete1InFeed.adherenceRate === 100, "4.6 Athlete 1 adherence calculated as 100% (1 completed / 1 scheduled)");

    // Coach B monitoring isolation
    const coachBMonitoringReq = createMockRequest("/api/coach/monitoring", "GET", coachBSession.sessionToken);
    const coachBMonitoringRes = await getMonitoringHttp(coachBMonitoringReq);
    const coachBMonitoringJson = await coachBMonitoringRes.json();
    const athlete1InCoachB = coachBMonitoringJson.data.athletes.find((a: any) => a.client.id === athlete1User.clientProfile!.id);
    assert(athlete1InCoachB === undefined, "4.7 Athlete 1 strictly excluded from unassigned Coach B monitoring feed");

    // =========================================================================
    // SECTION 5: GOALS & NUTRITION TRACKING
    // =========================================================================
    console.log("\n[SECTION 5] Testing Goals Progression & Nutrition Snapshot Decoupling...");

    // Coach A adds goal for Athlete 1
    const goal = await healthService.addGoal(
      athlete1User.clientProfile!.id,
      {
        title: "Back Squat 150kg",
        goalType: GoalType.STRENGTH,
        startingValue: 100,
        currentValue: 125,
        targetValue: 150,
        unit: "KG"
      },
      coachAActor
    );
    assert(goal.status === GoalStatus.IN_PROGRESS, "5.1 Goal created with status IN_PROGRESS");

    // Athlete views goal
    const athleteGoals = await healthService.getGoals(athlete1User.clientProfile!.id);
    assert(athleteGoals.length === 1, "5.2 Athlete views goals list (got 1)");
    assert(athleteGoals[0].currentValue === 125, "5.3 Athlete goal currentValue matches 125kg (50% progress)");

    // Coach creates Nutrition Program and assigns to Athlete 1
    const nutProg = await nutritionProgramService.createNutritionProgram(
      {
        title: `P10 Hypertrophy Macros ${ts}`,
        dailyCalories: 3000,
        proteinGrams: 200,
        carbsGrams: 350,
        fatsGrams: 80
      },
      coachAActor
    );
    cleanupNutritionProgramIds.push(nutProg.id);

    const nutAssignment = await nutritionProgramService.assignNutritionProgramToClient(
      {
        clientId: athlete1User.clientProfile!.id,
        nutritionProgramId: nutProg.id
      }
    );
    cleanupNutritionAssignmentIds.push(nutAssignment.id);
    assert(nutAssignment.dailyCalories === 3000, "5.4 Nutrition assignment snapshot decoupled at 3000 kcal");

    // Athlete logs daily nutrition without duplicate rows
    const dailyLog1 = await nutritionTrackingService.saveDailyNutritionLog({
      clientId: athlete1User.clientProfile!.id,
      date: "2026-11-20",
      calories: 2950,
      proteinGrams: 195,
      carbsGrams: 340,
      fatsGrams: 78,
      isManualEntry: true
    });
    cleanupDailyNutritionLogIds.push(dailyLog1.id);

    // Upsert on same date modifies existing row
    const dailyLogUpdate = await nutritionTrackingService.saveDailyNutritionLog({
      clientId: athlete1User.clientProfile!.id,
      date: "2026-11-20",
      calories: 3050,
      proteinGrams: 205,
      isManualEntry: true
    });
    assert(dailyLogUpdate.id === dailyLog1.id, "5.5 DailyNutritionLog upsert updated in-place without creating duplicate row");
    assert(dailyLogUpdate.calories === 3050, "5.6 DailyNutritionLog calories updated to 3050");

    // =========================================================================
    // SECTION 6: UNIFIED CALENDAR & LAZY ATTENDANCE
    // =========================================================================
    console.log("\n[SECTION 6] Testing Unified Calendar & Lazy Attendance Resolution...");

    const now = new Date();
    const startTime = new Date(now.getTime() + 86400000);
    const endTime = new Date(startTime.getTime() + 3600000);

    const calendarSession = await calendarSessionService.createSession(
      {
        title: `P10 Strength Workshop ${ts}`,
        sessionType: SessionType.GROUP,
        eventType: EventType.SEMINAR_WORKSHOP,
        eventMode: EventMode.IN_PERSON,
        audienceScope: AudienceScope.COACH_ROSTER,
        coachId: coachAUser.coachProfile!.id,
        startTime,
        endTime,
        maxParticipants: 10
      },
      coachAActor
    );
    cleanupSessionIds.push(calendarSession.id);

    // Check roster before attendance: eligible roster resolved dynamically with zero pre-generated ghost rows
    const roster = await calendarSessionService.getEligibleAttendees(calendarSession.id);
    const ath1RosterEntry = roster.find((r: any) => r.athleteId === athlete1User.clientProfile!.id);
    assert(ath1RosterEntry !== undefined, "6.1 Eligible roster includes rostered Athlete 1");
    assert(ath1RosterEntry?.status === null, "6.2 Pre-attendance status is null (no ghost attendance rows)");

    // Lazy upsert attendance
    const attendance = await calendarSessionService.updateAttendance(
      calendarSession.id,
      athlete1User.clientProfile!.id,
      AttendanceStatus.PRESENT,
      "Arrived early and well prepared",
      coachAActor
    );
    assert(attendance.status === AttendanceStatus.PRESENT, "6.3 Attendance lazily upserted to PRESENT");

    // =========================================================================
    // SECTION 7: SECURITY GUARDS, IMMUTABILITY & CROSS-ATHLETE ISOLATION
    // =========================================================================
    console.log("\n[SECTION 7] Testing Security Guards, Immutability & Cross-Athlete RBAC...");

    // 7.1 Athlete calling coach/admin endpoints blocked with 403 Forbidden
    const athMonitoringRes = await getMonitoringHttp(createMockRequest("/api/coach/monitoring", "GET", athlete1Session.sessionToken));
    assert(athMonitoringRes.status === 403, "7.1 Athlete blocked with 403 on Coach Monitoring API");

    const athReportsRes = await getReportsHttp(createMockRequest("/api/reports", "GET", athlete1Session.sessionToken));
    assert(athReportsRes.status === 403, "7.2 Athlete blocked with 403 on Aggregated Reports API");

    const athReviewRes = await postReviewHttp(createMockRequest("/api/coach/review", "POST", athlete1Session.sessionToken, { workoutLogId: workoutLog!.id }));
    assert(athReviewRes.status === 403, "7.3 Athlete blocked with 403 on Coach Review API");

    // 7.2 Immutability 409 Conflict: completed workouts cannot be modified, skipped, or deleted
    let modifyCompletedError: any = null;
    try {
      await workoutService.saveWorkoutExecution(targetAssignmentId, { mode: "SAVE_PROGRESS" }, athlete1Actor);
    } catch (e: any) {
      modifyCompletedError = e;
    }
    assert(
      modifyCompletedError instanceof WorkoutServiceError && modifyCompletedError.statusCode === 409,
      "7.4 Modifying completed workout blocked with 409 Conflict"
    );

    let deleteCompletedError: any = null;
    try {
      await workoutService.deleteAssignment(targetAssignmentId, coachAActor);
    } catch (e: any) {
      deleteCompletedError = e;
    }
    assert(
      deleteCompletedError instanceof WorkoutServiceError && deleteCompletedError.statusCode === 409,
      "7.5 Deleting completed workout blocked with 409 Conflict"
    );

    // 7.3 Immutability 409 Conflict: referenced master programs cannot be deleted
    let deleteReferencedProgError: any = null;
    try {
      await programService.deleteProgram(program.id, coachAActor);
    } catch (e: any) {
      deleteReferencedProgError = e;
    }
    assert(
      deleteReferencedProgError instanceof ProgramServiceError && deleteReferencedProgError.statusCode === 409,
      "7.6 Deleting program with active assignments blocked with 409 Conflict"
    );

    // 7.4 Cross-Athlete Data Isolation
    const crossAthleteReq = createMockRequest(`/api/clients/${athlete1User.clientProfile!.id}`, "GET", athlete2Session.sessionToken);
    const crossAthleteRes = await getClientHttp(crossAthleteReq, { params: Promise.resolve({ id: athlete1User.clientProfile!.id }) });
    assert(crossAthleteRes.status === 403, "7.7 Athlete 2 blocked with 403 Forbidden from accessing Athlete 1's profile");

    const crossCoachReq = createMockRequest(`/api/clients/${athlete1User.clientProfile!.id}`, "GET", coachBSession.sessionToken);
    const crossCoachRes = await getClientHttp(crossCoachReq, { params: Promise.resolve({ id: athlete1User.clientProfile!.id }) });
    assert(crossCoachRes.status === 403, "7.8 Unassigned Coach B blocked with 403 Forbidden from accessing Athlete 1's profile");

    console.log("\n================================================================================");
    console.log(`=== ALL ASSERTIONS COMPLETED: ${passed} / ${total} TESTS PASSED (100%) ===`);
    console.log("================================================================================");
  } catch (error) {
    console.error("FATAL ERROR IN MASTER REGRESSION SUITE:", error);
    throw error;
  } finally {
    // 8. Reverse FK-Safe Teardown & Row Count Reconciliation
    console.log("\n[CLEANUP] Executing FK-safe leaf-to-root teardown of all throwaway test fixtures...");

    for (const dId of cleanupDailyNutritionLogIds) {
      await prisma.dailyNutritionLog.deleteMany({ where: { id: dId } });
    }
    for (const naId of cleanupNutritionAssignmentIds) {
      await prisma.clientNutritionAssignment.deleteMany({ where: { id: naId } });
    }
    for (const npId of cleanupNutritionProgramIds) {
      await prisma.nutritionProgram.deleteMany({ where: { id: npId } });
    }

    for (const sId of cleanupSessionIds) {
      await prisma.sessionAttendance.deleteMany({ where: { sessionId: sId } });
      await prisma.sessionCalendar.deleteMany({ where: { id: sId } });
    }

    for (const aId of cleanupAssignmentIds) {
      await prisma.setLog.deleteMany({ where: { workoutLog: { assignmentId: aId } } });
      await prisma.workoutLog.deleteMany({ where: { assignmentId: aId } });
      await prisma.clientWorkoutAssignmentExercise.deleteMany({ where: { assignmentId: aId } });
      await prisma.assignmentBlockItem.deleteMany({ where: { assignmentBlock: { assignmentId: aId } } });
      await prisma.assignmentBlock.deleteMany({ where: { assignmentId: aId } });
      await prisma.clientWorkoutAssignment.deleteMany({ where: { id: aId } });
    }

    for (const paId of cleanupProgramAssignmentIds) {
      await prisma.programAssignment.deleteMany({ where: { id: paId } });
    }

    for (const pId of cleanupProgramIds) {
      await prisma.blockItem.deleteMany({ where: { block: { programWorkout: { day: { week: { programId: pId } } } } } });
      await prisma.workoutBlock.deleteMany({ where: { programWorkout: { day: { week: { programId: pId } } } } });
      await prisma.programWorkout.deleteMany({ where: { day: { week: { programId: pId } } } });
      await prisma.programDay.deleteMany({ where: { week: { programId: pId } } });
      await prisma.programWeek.deleteMany({ where: { programId: pId } });
      await prisma.trainingProgram.deleteMany({ where: { id: pId } });
    }

    for (const eId of cleanupExerciseIds) {
      await prisma.workoutTemplateExercise.deleteMany({ where: { exerciseId: eId } });
      await prisma.clientWorkoutAssignmentExercise.deleteMany({ where: { exerciseId: eId } });
      await prisma.blockItem.deleteMany({ where: { exerciseId: eId } });
      await prisma.assignmentBlockItem.deleteMany({ where: { exerciseId: eId } });
      await prisma.exerciseSport.deleteMany({ where: { exerciseId: eId } });
      await prisma.exercise.deleteMany({ where: { id: eId } });
    }

    for (const sId of cleanupSportIds) {
      await prisma.sport.deleteMany({ where: { id: sId } });
    }

    if (cleanupProgramIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: cleanupProgramIds } } });
    }
    if (cleanupAssignmentIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: cleanupAssignmentIds } } });
    }
    if (cleanupSessionIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: cleanupSessionIds } } });
    }
    if (cleanupNutritionProgramIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: cleanupNutritionProgramIds } } });
    }
    if (cleanupNutritionAssignmentIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: cleanupNutritionAssignmentIds } } });
    }

    for (const uId of cleanupUserIds) {
      await prisma.clientGoal.deleteMany({ where: { client: { userId: uId } } });
      await prisma.clientNote.deleteMany({ where: { OR: [{ client: { userId: uId } }, { authorId: uId }] } });
      await prisma.athleteCheckInSchedule.deleteMany({ where: { client: { userId: uId } } });
      await prisma.clientCoachAssignment.deleteMany({
        where: { OR: [{ coach: { userId: uId } }, { client: { userId: uId } }] }
      });
      await prisma.session.deleteMany({ where: { userId: uId } });
      await prisma.clientProfile.deleteMany({ where: { userId: uId } });
      await prisma.coachProfile.deleteMany({ where: { userId: uId } });
      await prisma.auditLog.deleteMany({ where: { OR: [{ userId: uId }, { entityId: uId }] } });
      await prisma.user.deleteMany({ where: { id: uId } });
    }

    console.log("  Teardown complete.");

    // 9. Reconciliation check
    console.log("\n[RECONCILIATION] Verifying post-test database state against baseline...");
    const postCounts = await getLiveCounts();

    console.log("  Post-Test Counts:", JSON.stringify(postCounts, null, 2));

    const keys = Object.keys(baseline) as (keyof BaselineCounts)[];
    let residueFound = false;

    for (const key of keys) {
      if (postCounts[key] !== baseline[key]) {
        console.error(`  ❌ RESIDUE on table ${key}: expected ${baseline[key]}, found ${postCounts[key]}`);
        residueFound = true;
      }
    }

    if (!residueFound) {
      console.log("\n================================================================================");
      console.log("✅ [PASS] ZERO DATABASE RESIDUE DETECTED. DATABASE IS 100% RECONCILED!");
      console.log("================================================================================");
    } else {
      throw new Error("Reconciliation failed: database residue detected.");
    }
  }

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error("Master regression failed with error:", e);
  process.exit(1);
});

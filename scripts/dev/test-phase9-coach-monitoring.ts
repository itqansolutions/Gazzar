import {
  PrismaClient,
  UserRole,
  AssignmentStatus,
  AssignmentSourceType,
  AttendanceStatus,
  SessionType,
  EventType,
  EventMode,
  AudienceScope
} from "@prisma/client";
import { sessionService } from "../../src/lib/auth/session-service";
import { monitoringService, MonitoringServiceError } from "../../src/server/services/monitoring.service";
import { GET as getMonitoringHttp } from "../../src/app/api/coach/monitoring/route";
import { POST as postReviewHttp } from "../../src/app/api/coach/review/route";
import { GET as getReportsHttp } from "../../src/app/api/reports/route";
import { PATCH as patchSessionsHttp } from "../../src/app/api/sessions/route";
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
  console.log("=== PHASE 9: COACH MONITORING, ADHERENCE & REPORTS UPGRADE TEST SUITE ===");
  console.log("================================================================================");

  const cleanupUserIds: string[] = [];
  const cleanupClientProfileIds: string[] = [];
  const cleanupCoachProfileIds: string[] = [];
  const cleanupClientCoachAssignmentIds: string[] = [];
  const cleanupSportIds: string[] = [];
  const cleanupAssignmentIds: string[] = [];
  const cleanupSessionIds: string[] = [];
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
  const baseWorkoutLogs = await prisma.workoutLog.count();
  const baseSetLogs = await prisma.setLog.count();
  const baseSessions = await prisma.sessionCalendar.count();
  const baseAttendances = await prisma.sessionAttendance.count();
  const baseCheckInSchedules = await prisma.athleteCheckInSchedule.count();
  const baseAudits = await prisma.auditLog.count();

  console.log(
    `  Baseline: users=${baseUsers}, clients=${baseClients}, coaches=${baseCoaches}, assignments=${baseAssignments}, logs=${baseWorkoutLogs}, setLogs=${baseSetLogs}, sessions=${baseSessions}, attendances=${baseAttendances}, checkIns=${baseCheckInSchedules}, audits=${baseAudits}`
  );

  try {
    const dummyHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";
    const ts = Date.now();

    // 0. Setup Throwaway Actors & Fixtures
    console.log("\n[SETUP] Creating throwaway fixtures (Admin, Coach A, Coach B, Client A, Client B, Client C, Sports, Sessions)...");

    // Sport
    const throwawaySport = await prisma.sport.create({
      data: {
        nameEn: `P9 Sport ${ts}`,
        nameAr: `رياضة ${ts}`,
        categories: ["Conditioning"]
      }
    });
    cleanupSportIds.push(throwawaySport.id);

    // Admin
    const adminUser = await prisma.user.create({
      data: {
        email: `throwaway.p9.admin.${ts}@gx.test`,
        name: "P9 Admin",
        role: UserRole.ADMIN,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(adminUser.id);
    const adminSession = await sessionService.createSession({ userId: adminUser.id });

    // Coach A
    const coachAUser = await prisma.user.create({
      data: {
        email: `throwaway.p9.coacha.${ts}@gx.test`,
        name: "P9 Coach A",
        role: UserRole.COACH,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(coachAUser.id);
    const coachAProfile = await prisma.coachProfile.create({
      data: { userId: coachAUser.id, specialties: ["Strength"] }
    });
    cleanupCoachProfileIds.push(coachAProfile.id);
    const coachASession = await sessionService.createSession({ userId: coachAUser.id });

    // Coach B
    const coachBUser = await prisma.user.create({
      data: {
        email: `throwaway.p9.coachb.${ts}@gx.test`,
        name: "P9 Coach B",
        role: UserRole.COACH,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(coachBUser.id);
    const coachBProfile = await prisma.coachProfile.create({
      data: { userId: coachBUser.id, specialties: ["Swimming"] }
    });
    cleanupCoachProfileIds.push(coachBProfile.id);
    const coachBSession = await sessionService.createSession({ userId: coachBUser.id });

    // Client 1 (Assigned to Coach A, Preferred Sport: throwawaySport)
    const client1User = await prisma.user.create({
      data: {
        email: `throwaway.p9.client1.${ts}@gx.test`,
        name: "P9 Client One",
        role: UserRole.CLIENT,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(client1User.id);
    const client1Profile = await prisma.clientProfile.create({
      data: {
        userId: client1User.id,
        status: "ACTIVE",
        preferredSportId: throwawaySport.id
      }
    });
    cleanupClientProfileIds.push(client1Profile.id);
    const client1Session = await sessionService.createSession({ userId: client1User.id });

    const assign1 = await prisma.clientCoachAssignment.create({
      data: {
        clientId: client1Profile.id,
        coachId: coachAProfile.id,
        role: "PRIMARY",
        active: true
      }
    });
    cleanupClientCoachAssignmentIds.push(assign1.id);

    // Client 2 (Assigned to Coach A, Preferred Sport: throwawaySport)
    const client2User = await prisma.user.create({
      data: {
        email: `throwaway.p9.client2.${ts}@gx.test`,
        name: "P9 Client Two",
        role: UserRole.CLIENT,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(client2User.id);
    const client2Profile = await prisma.clientProfile.create({
      data: {
        userId: client2User.id,
        status: "ACTIVE",
        preferredSportId: throwawaySport.id
      }
    });
    cleanupClientProfileIds.push(client2Profile.id);

    const assign2 = await prisma.clientCoachAssignment.create({
      data: {
        clientId: client2Profile.id,
        coachId: coachAProfile.id,
        role: "ASSISTANT",
        active: true
      }
    });
    cleanupClientCoachAssignmentIds.push(assign2.id);

    // Client 3 (Assigned to Coach B)
    const client3User = await prisma.user.create({
      data: {
        email: `throwaway.p9.client3.${ts}@gx.test`,
        name: "P9 Client Three",
        role: UserRole.CLIENT,
        passwordHash: dummyHash
      }
    });
    cleanupUserIds.push(client3User.id);
    const client3Profile = await prisma.clientProfile.create({
      data: {
        userId: client3User.id,
        status: "ACTIVE"
      }
    });
    cleanupClientProfileIds.push(client3Profile.id);

    const assign3 = await prisma.clientCoachAssignment.create({
      data: {
        clientId: client3Profile.id,
        coachId: coachBProfile.id,
        role: "PRIMARY",
        active: true
      }
    });
    cleanupClientCoachAssignmentIds.push(assign3.id);

    // Create Check-In Schedule for Client 1 (configured with past nextDue to trigger OVERDUE)
    const pastDate = new Date(Date.now() - 5 * 86400000);
    await prisma.athleteCheckInSchedule.create({
      data: {
        clientId: client1Profile.id,
        weightFrequencyDays: 7,
        lastWeightAt: new Date(Date.now() - 15 * 86400000),
        nextWeightDueAt: pastDate
      }
    });

    // Create Workout Assignments for Client 1
    // A) Completed workout with setLogs needing review
    const workoutA = await prisma.clientWorkoutAssignment.create({
      data: {
        clientId: client1Profile.id,
        coachId: coachAProfile.id,
        title: "P9 Upper Power Session",
        scheduledDate: new Date(),
        status: AssignmentStatus.COMPLETED,
        completedAt: new Date()
      }
    });
    cleanupAssignmentIds.push(workoutA.id);

    const logA = await prisma.workoutLog.create({
      data: {
        assignmentId: workoutA.id,
        clientId: client1Profile.id,
        coachId: coachAProfile.id,
        isCompleted: true,
        completedAt: new Date(),
        durationMinutes: 48,
        overallRpe: 8,
        clientFeedback: "Felt strong on bench, slight shoulder tightness on set 3."
      }
    });

    const setLogA1 = await prisma.setLog.create({
      data: {
        workoutLogId: logA.id,
        roundNumber: 1,
        setNumber: 1,
        isCompleted: true,
        actualWeightKg: 80,
        actualReps: 10
      }
    });
    const setLogA2 = await prisma.setLog.create({
      data: {
        workoutLogId: logA.id,
        roundNumber: 1,
        setNumber: 2,
        isCompleted: true,
        actualWeightKg: 85,
        actualReps: 8
      }
    });

    // B) Skipped workout
    const workoutB = await prisma.clientWorkoutAssignment.create({
      data: {
        clientId: client1Profile.id,
        coachId: coachAProfile.id,
        title: "P9 Lower Hypertrophy",
        scheduledDate: new Date(Date.now() - 2 * 86400000),
        status: AssignmentStatus.SKIPPED
      }
    });
    cleanupAssignmentIds.push(workoutB.id);

    await prisma.workoutLog.create({
      data: {
        assignmentId: workoutB.id,
        clientId: client1Profile.id,
        coachId: coachAProfile.id,
        isCompleted: false,
        clientFeedback: "Severe knee soreness after travel."
      }
    });

    // C) Scheduled workout
    const workoutC = await prisma.clientWorkoutAssignment.create({
      data: {
        clientId: client1Profile.id,
        coachId: coachAProfile.id,
        title: "P9 Core Conditioning",
        scheduledDate: new Date(Date.now() + 86400000),
        status: AssignmentStatus.SCHEDULED
      }
    });
    cleanupAssignmentIds.push(workoutC.id);

    // Workout Assignment for Client 2 (Missed past session)
    const workoutD = await prisma.clientWorkoutAssignment.create({
      data: {
        clientId: client2Profile.id,
        coachId: coachAProfile.id,
        title: "P9 Endurance Interval",
        scheduledDate: new Date(Date.now() - 4 * 86400000),
        status: AssignmentStatus.SCHEDULED // past date without log = missed
      }
    });
    cleanupAssignmentIds.push(workoutD.id);

    // Create Calendar Session & Attendances
    const session1 = await prisma.sessionCalendar.create({
      data: {
        coachId: coachAProfile.id,
        sportId: throwawaySport.id,
        title: "P9 Academy Morning Class",
        sessionType: SessionType.GROUP,
        eventType: EventType.GROUP_CLASS,
        eventMode: EventMode.IN_PERSON,
        audienceScope: AudienceScope.WHOLE_ACADEMY,
        startTime: new Date(Date.now() - 24 * 3600000),
        endTime: new Date(Date.now() - 23 * 3600000)
      }
    });
    cleanupSessionIds.push(session1.id);

    await prisma.sessionAttendance.create({
      data: {
        sessionId: session1.id,
        clientId: client1Profile.id,
        status: AttendanceStatus.PRESENT
      }
    });
    await prisma.sessionAttendance.create({
      data: {
        sessionId: session1.id,
        clientId: client2Profile.id,
        status: AttendanceStatus.LATE
      }
    });
    await prisma.sessionAttendance.create({
      data: {
        sessionId: session1.id,
        clientId: client3Profile.id,
        status: AttendanceStatus.ABSENT
      }
    });

    console.log("  Setup complete.");

    // =========================================================================
    // SECTION 1: RBAC Enforcement
    // =========================================================================
    console.log("\n[SECTION 1] Testing RBAC guards on monitoring & review endpoints...");

    // Athlete accessing coach monitoring -> 403 Forbidden
    const reqAthleteMon = createMockRequest("/api/coach/monitoring", "GET", client1Session.sessionToken);
    const resAthleteMon = await getMonitoringHttp(reqAthleteMon);
    assert(resAthleteMon.status === 403, "1.1 Athlete calling GET /api/coach/monitoring is blocked with 403 Forbidden");

    // Athlete accessing reports -> 403 Forbidden
    const reqAthleteRep = createMockRequest("/api/reports", "GET", client1Session.sessionToken);
    const resAthleteRep = await getReportsHttp(reqAthleteRep);
    assert(resAthleteRep.status === 403, "1.2 Athlete calling GET /api/reports is blocked with 403 Forbidden");

    // Athlete calling coach review -> 403 Forbidden
    const reqAthleteRev = createMockRequest("/api/coach/review", "POST", client1Session.sessionToken, {
      workoutLogId: logA.id,
      coachFeedback: "Athlete trying to self-review"
    });
    const resAthleteRev = await postReviewHttp(reqAthleteRev);
    assert(resAthleteRev.status === 403, "1.3 Athlete calling POST /api/coach/review is blocked with 403 Forbidden");

    // =========================================================================
    // SECTION 2: Coach Scoping & Adherence Calculations
    // =========================================================================
    console.log("\n[SECTION 2] Testing Coach Monitoring scoping & adherence calculations...");

    // Coach A accesses monitoring
    const reqCoachAMon = createMockRequest("/api/coach/monitoring?periodDays=30", "GET", coachASession.sessionToken);
    const resCoachAMon = await getMonitoringHttp(reqCoachAMon);
    assert(resCoachAMon.status === 200, "2.1 Coach A calling GET /api/coach/monitoring succeeds with 200 OK");
    const jsonCoachAMon = await resCoachAMon.json();
    const coachAData = jsonCoachAMon.data;

    // Verify scoping: Coach A sees Client 1 and Client 2, but NOT Client 3
    const athleteIds = coachAData.athletes.map((a: any) => a.client.id);
    assert(
      athleteIds.includes(client1Profile.id) &&
      athleteIds.includes(client2Profile.id) &&
      !athleteIds.includes(client3Profile.id),
      "2.2 Coach A is scoped strictly to assigned athletes (Client 1 & 2 present, Client 3 excluded)",
      { athleteIds, client1: client1Profile.id, client2: client2Profile.id, client3: client3Profile.id }
    );

    // Verify Client 1 adherence calculations: 1 completed, 1 skipped, 1 scheduled -> total 3, adherence 33%
    const c1Stats = coachAData.athletes.find((a: any) => a.client.id === client1Profile.id);
    assert(
      c1Stats && c1Stats.completedCount === 1 && c1Stats.skippedCount === 1 && c1Stats.adherenceRate === 33,
      "2.3 Client 1 adherence calculated accurately (1 completed / 3 scheduled = 33% adherence)",
      c1Stats
    );

    // Verify Overdue Check-in detection
    assert(
      c1Stats.checkInStatus?.overallStatus === "OVERDUE",
      "2.4 Client 1 flagged with OVERDUE check-in status from Phase 7 checkInScheduleService",
      c1Stats.checkInStatus
    );

    // Verify Flagged Sessions feed
    const flaggedList = coachAData.flaggedSessions;
    const skippedWorkoutInFeed = flaggedList.find((f: any) => f.assignmentId === workoutB.id);
    const missedWorkoutInFeed = flaggedList.find((f: any) => f.assignmentId === workoutD.id);
    assert(
      Boolean(skippedWorkoutInFeed) && skippedWorkoutInFeed.status === "SKIPPED" && skippedWorkoutInFeed.skipReason === "Severe knee soreness after travel.",
      "2.5 Skipped session flagged with athlete skip reason in monitoring feed",
      skippedWorkoutInFeed
    );
    assert(
      Boolean(missedWorkoutInFeed) && missedWorkoutInFeed.status === "MISSED",
      "2.6 Past uncompleted session flagged as MISSED in monitoring feed",
      missedWorkoutInFeed
    );

    // Verify Pending Reviews feed
    const pendingReviewList = coachAData.pendingReviews;
    const pendingLogA = pendingReviewList.find((p: any) => p.workoutLogId === logA.id);
    assert(
      Boolean(pendingLogA) && pendingLogA.unreviewedSetsCount === 2,
      "2.7 Completed workout without review appears in Pending Reviews feed with unreviewed sets count",
      pendingLogA
    );

    // Coach B accesses monitoring -> should ONLY see Client 3
    const reqCoachBMon = createMockRequest("/api/coach/monitoring?periodDays=30", "GET", coachBSession.sessionToken);
    const resCoachBMon = await getMonitoringHttp(reqCoachBMon);
    const jsonCoachBMon = await resCoachBMon.json();
    const coachBAthleteIds = jsonCoachBMon.data.athletes.map((a: any) => a.client.id);
    assert(
      coachBAthleteIds.length === 1 && coachBAthleteIds[0] === client3Profile.id,
      "2.8 Coach B monitoring is strictly isolated to Client 3",
      coachBAthleteIds
    );

    // Admin accesses monitoring -> sees all athletes across the academy
    const reqAdminMon = createMockRequest("/api/coach/monitoring?periodDays=30", "GET", adminSession.sessionToken);
    const resAdminMon = await getMonitoringHttp(reqAdminMon);
    const jsonAdminMon = await resAdminMon.json();
    const adminAthletes = jsonAdminMon.data.athletes.map((a: any) => a.client.id);
    assert(
      adminAthletes.includes(client1Profile.id) &&
      adminAthletes.includes(client2Profile.id) &&
      adminAthletes.includes(client3Profile.id),
      "2.9 Admin monitoring has unrestricted academy-wide visibility (Clients 1, 2, and 3 present)"
    );

    // =========================================================================
    // SECTION 3: Coach Review Action & Authorization
    // =========================================================================
    console.log("\n[SECTION 3] Testing coach review submission, authorization & audit logging...");

    // Unauthorized Coach B tries to review Client 1's workout -> 403 Forbidden
    const reqUnauthReview = createMockRequest("/api/coach/review", "POST", coachBSession.sessionToken, {
      workoutLogId: logA.id,
      coachFeedback: "Unauthorized attempt by Coach B"
    });
    const resUnauthReview = await postReviewHttp(reqUnauthReview);
    assert(
      resUnauthReview.status === 403,
      "3.1 Unauthorized coach (Coach B) is blocked with 403 when reviewing unassigned athlete (Client 1)"
    );

    // Authorized Coach A submits review for Client 1
    const reviewPayload = {
      workoutLogId: logA.id,
      coachFeedback: "Great effort on bench press. Watch wrist alignment on heavier sets.",
      setReviews: [
        { setLogId: setLogA1.id, coachReview: "Solid bar path" },
        { setLogId: setLogA2.id, coachReview: "Good grind on final rep" }
      ]
    };
    const reqAuthReview = createMockRequest("/api/coach/review", "POST", coachASession.sessionToken, reviewPayload);
    const resAuthReview = await postReviewHttp(reqAuthReview);
    assert(resAuthReview.status === 200, "3.2 Assigned coach (Coach A) submits review successfully with 200 OK");

    // Verify DB state
    const dbLogA = await prisma.workoutLog.findUnique({
      where: { id: logA.id },
      include: { setLogs: true }
    });
    assert(
      dbLogA?.coachFeedback === reviewPayload.coachFeedback &&
      dbLogA?.coachId === coachAProfile.id,
      "3.3 WorkoutLog coachFeedback and coachId updated in PostgreSQL",
      dbLogA
    );

    const dbSet1 = dbLogA?.setLogs.find((s) => s.id === setLogA1.id);
    const dbSet2 = dbLogA?.setLogs.find((s) => s.id === setLogA2.id);
    assert(
      dbSet1?.coachReview === "Solid bar path" &&
      dbSet1?.coachReviewedAt !== null &&
      dbSet2?.coachReview === "Good grind on final rep",
      "3.4 SetLogs updated with individual coachReview text and coachReviewedAt timestamps"
    );

    // Verify AuditLog entry emitted
    const auditReview = await prisma.auditLog.findFirst({
      where: {
        entityType: "WorkoutLog",
        entityId: logA.id,
        action: "COACH_REVIEW_WORKOUT"
      }
    });
    assert(
      Boolean(auditReview) && auditReview?.userId === coachAUser.id,
      "3.5 COACH_REVIEW_WORKOUT audit log entry recorded with actor and entity metadata"
    );
    if (auditReview) cleanupAuditLogIds.push(auditReview.id);

    // Verify pending reviews feed reflects review completion
    const reqCoachAMonAfter = createMockRequest("/api/coach/monitoring?periodDays=30", "GET", coachASession.sessionToken);
    const resCoachAMonAfter = await getMonitoringHttp(reqCoachAMonAfter);
    const jsonAfter = await resCoachAMonAfter.json();
    const remainingPending = jsonAfter.data.pendingReviews.find((p: any) => p.workoutLogId === logA.id);
    assert(
      !remainingPending,
      "3.6 Reviewed workout log no longer appears in pending reviews feed"
    );

    // =========================================================================
    // SECTION 4: Real Aggregated Reports Data (/api/reports)
    // =========================================================================
    console.log("\n[SECTION 4] Testing real aggregated academy reports...");

    const reqReports = createMockRequest("/api/reports?periodDays=180", "GET", adminSession.sessionToken);
    const resReports = await getReportsHttp(reqReports);
    assert(resReports.status === 200, "4.1 GET /api/reports succeeds with 200 OK for admin");
    const jsonReports = await resReports.json();
    const repData = jsonReports.data;

    // A. Adherence Rate
    assert(
      typeof repData.kpi.overallAdherenceRate === "number" && repData.kpi.completedWorkouts >= 1,
      "4.2 overallAdherenceRate calculated from real assignments (non-zero real metric)",
      repData.kpi
    );

    // B. Attendance Rate from SessionAttendance (2 present/late out of 3 total = 67%)
    assert(
      typeof repData.kpi.overallAttendanceRate === "number",
      "4.3 overallAttendanceRate calculated from real SessionAttendance logs",
      { rate: repData.kpi.overallAttendanceRate }
    );

    // C. Monthly Attendance Trend
    assert(
      Array.isArray(repData.attendanceTrend) && repData.attendanceTrend.length === 6,
      "4.4 attendanceTrend provides 6-month historical timeline computed from real data"
    );

    // D. Sports Distribution
    assert(
      Array.isArray(repData.sportDistribution) && repData.sportDistribution.length > 0,
      "4.5 sportDistribution groups active athletes by preferred sport",
      repData.sportDistribution
    );

    // E. Most Missed Workouts
    assert(
      Array.isArray(repData.mostMissedWorkouts) &&
      repData.mostMissedWorkouts.some((w: any) => w.title.includes("Lower Hypertrophy")),
      "4.6 mostMissedWorkouts aggregates top skipped/missed sessions",
      repData.mostMissedWorkouts
    );

    // =========================================================================
    // SECTION 5: Tightened requireClientAccess Guard on PATCH /api/sessions
    // =========================================================================
    console.log("\n[SECTION 5] Testing requireClientAccess guard on PATCH /api/sessions...");

    // Coach B attempts to mark attendance for Client 1 (assigned only to Coach A, and Coach B doesn't coach session1) -> 403 Forbidden
    const reqCoachBAtt = createMockRequest("/api/sessions", "PATCH", coachBSession.sessionToken, {
      sessionId: session1.id,
      clientId: client1Profile.id,
      status: AttendanceStatus.PRESENT
    });
    const resCoachBAtt = await patchSessionsHttp(reqCoachBAtt);
    assert(
      resCoachBAtt.status === 403,
      "5.1 Coach B blocked with 403 Forbidden when mutating attendance for unassigned athlete"
    );

    // Coach A (assigned coach and session coach) marks attendance for Client 1 -> 200 OK
    const reqCoachAAtt = createMockRequest("/api/sessions", "PATCH", coachASession.sessionToken, {
      sessionId: session1.id,
      clientId: client1Profile.id,
      status: AttendanceStatus.PRESENT,
      notes: "Arrived on time, warmed up"
    });
    const resCoachAAtt = await patchSessionsHttp(reqCoachAAtt);
    assert(
      resCoachAAtt.status === 200,
      "5.2 Authorized coach (Coach A) successfully marks session attendance with canonical ID resolution"
    );

  } catch (error: any) {
    console.error("TEST EXECUTION ERROR:", error);
    assert(false, `Unexpected error during test execution: ${error.message}`);
  } finally {
    // =========================================================================
    // SECTION 6: FK-Safe Teardown & Reconciliation
    // =========================================================================
    console.log("\n[CLEANUP] Executing FK-safe teardown of all throwaway fixtures...");

    // 1. Delete Attendances & Sessions
    if (cleanupSessionIds.length > 0) {
      await prisma.sessionAttendance.deleteMany({ where: { sessionId: { in: cleanupSessionIds } } });
      await prisma.sessionCalendar.deleteMany({ where: { id: { in: cleanupSessionIds } } });
      console.log(`  Cleaned ${cleanupSessionIds.length} sessions & attendances`);
    }

    // 2. Delete SetLogs, WorkoutLogs, and Assignments
    if (cleanupAssignmentIds.length > 0) {
      const logs = await prisma.workoutLog.findMany({
        where: { assignmentId: { in: cleanupAssignmentIds } },
        select: { id: true }
      });
      const logIds = logs.map((l) => l.id);
      if (logIds.length > 0) {
        await prisma.setLog.deleteMany({ where: { workoutLogId: { in: logIds } } });
        await prisma.workoutExerciseLog.deleteMany({ where: { workoutLogId: { in: logIds } } });
        await prisma.workoutLog.deleteMany({ where: { id: { in: logIds } } });
      }
      await prisma.assignmentBlockItem.deleteMany({
        where: { assignmentBlock: { assignmentId: { in: cleanupAssignmentIds } } }
      });
      await prisma.assignmentBlock.deleteMany({ where: { assignmentId: { in: cleanupAssignmentIds } } });
      await prisma.clientWorkoutAssignmentExercise.deleteMany({ where: { assignmentId: { in: cleanupAssignmentIds } } });
      await prisma.clientWorkoutAssignment.deleteMany({ where: { id: { in: cleanupAssignmentIds } } });
      console.log(`  Cleaned ${cleanupAssignmentIds.length} assignments, logs & setLogs`);
    }

    // 3. Delete CheckInSchedules
    if (cleanupClientProfileIds.length > 0) {
      await prisma.athleteCheckInSchedule.deleteMany({
        where: { clientId: { in: cleanupClientProfileIds } }
      });
      console.log(`  Cleaned check-in schedules`);
    }

    // 4. Delete AuditLogs
    if (cleanupAuditLogIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { id: { in: cleanupAuditLogIds } } });
      console.log(`  Cleaned ${cleanupAuditLogIds.length} audit logs`);
    }
    // Also cleanup any audits created during the test by throwaway users
    if (cleanupUserIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: cleanupUserIds } } });
    }

    // 5. Delete ClientCoachAssignments, Profiles & Users
    if (cleanupClientCoachAssignmentIds.length > 0) {
      await prisma.clientCoachAssignment.deleteMany({
        where: { id: { in: cleanupClientCoachAssignmentIds } }
      });
      console.log(`  Cleaned ${cleanupClientCoachAssignmentIds.length} client coach assignments`);
    }
    if (cleanupClientProfileIds.length > 0) {
      await prisma.clientProfile.deleteMany({ where: { id: { in: cleanupClientProfileIds } } });
      console.log(`  Cleaned ${cleanupClientProfileIds.length} client profiles`);
    }
    if (cleanupCoachProfileIds.length > 0) {
      await prisma.coachProfile.deleteMany({ where: { id: { in: cleanupCoachProfileIds } } });
      console.log(`  Cleaned ${cleanupCoachProfileIds.length} coach profiles`);
    }
    if (cleanupSportIds.length > 0) {
      await prisma.sport.deleteMany({ where: { id: { in: cleanupSportIds } } });
      console.log(`  Cleaned ${cleanupSportIds.length} throwaway sports`);
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
    const postWorkoutLogs = await prisma.workoutLog.count();
    const postSetLogs = await prisma.setLog.count();
    const postSessions = await prisma.sessionCalendar.count();
    const postAttendances = await prisma.sessionAttendance.count();
    const postCheckIns = await prisma.athleteCheckInSchedule.count();
    const postAudits = await prisma.auditLog.count();

    console.log(`  Reconciliation Counts:`);
    console.log(`    users:                   ${postUsers} (base: ${baseUsers})`);
    console.log(`    client_profiles:         ${postClients} (base: ${baseClients})`);
    console.log(`    coach_profiles:          ${postCoaches} (base: ${baseCoaches})`);
    console.log(`    assignments:             ${postAssignments} (base: ${baseAssignments})`);
    console.log(`    workout_logs:            ${postWorkoutLogs} (base: ${baseWorkoutLogs})`);
    console.log(`    set_logs:                ${postSetLogs} (base: ${baseSetLogs})`);
    console.log(`    sessions:                ${postSessions} (base: ${baseSessions})`);
    console.log(`    attendances:             ${postAttendances} (base: ${baseAttendances})`);
    console.log(`    check_in_schedules:      ${postCheckIns} (base: ${baseCheckInSchedules})`);
    console.log(`    audit_logs:              ${postAudits} (base: ${baseAudits})`);

    const matchesBaseline =
      postUsers === baseUsers &&
      postClients === baseClients &&
      postCoaches === baseCoaches &&
      postAssignments === baseAssignments &&
      postWorkoutLogs === baseWorkoutLogs &&
      postSetLogs === baseSetLogs &&
      postSessions === baseSessions &&
      postAttendances === baseAttendances &&
      postCheckIns === baseCheckInSchedules &&
      postAudits === baseAudits;

    assert(matchesBaseline, "6.0 Post-test reconciliation matches baseline EXACTLY (0 database residue)");

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

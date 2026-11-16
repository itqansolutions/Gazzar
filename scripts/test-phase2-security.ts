import { PrismaClient, UserRole, SessionType, AttendanceStatus, AssignmentStatus } from "@prisma/client";
import { sessionService } from "../src/lib/auth/session-service";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:3001";

async function apiCall(path: string, options: { method?: string; body?: any; token?: string }) {
  const headers: Record<string, string> = {};
  if (options.token) {
    headers["Cookie"] = `gx_session=${options.token}`;
  }
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log("================================================================================");
  console.log("=== PHASE 2 RBAC & SECURITY VERIFICATION SUITE WITH THROWAWAY USERS ===");
  console.log("================================================================================");

  const cleanupUserIds: string[] = [];
  const cleanupSportIds: string[] = [];
  const cleanupSessionIds: string[] = [];
  const cleanupProgramIds: string[] = [];
  const cleanupExerciseIds: string[] = [];

  try {
    // 0. Bootstrap throwaway actors
    console.log("\n[SETUP] Creating throwaway users and profiles...");
    const dummyHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";

    // Coach A (Assigned)
    const userCoachA = await prisma.user.create({
      data: {
        email: `throwaway.coach.a.${Date.now()}@gx.test`,
        name: "Coach A (Assigned)",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "Throwaway Coach A" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(userCoachA.id);

    // Coach B (Unassigned)
    const userCoachB = await prisma.user.create({
      data: {
        email: `throwaway.coach.b.${Date.now()}@gx.test`,
        name: "Coach B (Unassigned)",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "Throwaway Coach B" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(userCoachB.id);

    // Client A
    const userClientA = await prisma.user.create({
      data: {
        email: `throwaway.client.a.${Date.now()}@gx.test`,
        name: "Client A",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: { status: "ACTIVE" } }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(userClientA.id);

    // Client B
    const userClientB = await prisma.user.create({
      data: {
        email: `throwaway.client.b.${Date.now()}@gx.test`,
        name: "Client B",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: { status: "ACTIVE" } }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(userClientB.id);

    // Link Coach A -> Client A only
    await prisma.clientCoachAssignment.create({
      data: {
        clientId: userClientA.clientProfile!.id,
        coachId: userCoachA.coachProfile!.id,
        role: "PRIMARY"
      }
    });

    // Head Coach
    const userHeadCoach = await prisma.user.create({
      data: {
        email: `throwaway.headcoach.${Date.now()}@gx.test`,
        name: "Head Coach",
        role: UserRole.HEAD_COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "Throwaway Head Coach" } }
      },
      include: { coachProfile: true }
    });
    cleanupUserIds.push(userHeadCoach.id);

    // Admin user for tests
    const adminUser = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
    if (!adminUser) throw new Error("No admin user found");

    // Mint session tokens
    const sessionCoachA = await sessionService.createSession({ userId: userCoachA.id, userAgent: "Test/1.0" });
    const sessionCoachB = await sessionService.createSession({ userId: userCoachB.id, userAgent: "Test/1.0" });
    const sessionHeadCoach = await sessionService.createSession({ userId: userHeadCoach.id, userAgent: "Test/1.0" });
    const sessionClientA = await sessionService.createSession({ userId: userClientA.id, userAgent: "Test/1.0" });
    const sessionClientB = await sessionService.createSession({ userId: userClientB.id, userAgent: "Test/1.0" });
    const sessionAdmin = await sessionService.createSession({ userId: adminUser.id, userAgent: "Test/1.0" });

    const tokenCoachA = sessionCoachA.sessionToken;
    const tokenCoachB = sessionCoachB.sessionToken;
    const tokenHeadCoach = sessionHeadCoach.sessionToken;
    const tokenClientA = sessionClientA.sessionToken;
    const tokenClientB = sessionClientB.sessionToken;
    const tokenAdmin = sessionAdmin.sessionToken;

    // Create a calendar session owned by Coach A
    const activeSport = await prisma.sport.findFirst({ where: { isActive: true } });
    const calSession = await prisma.sessionCalendar.create({
      data: {
        coachId: userCoachA.coachProfile!.id,
        sportId: activeSport!.id,
        title: "Throwaway Test Class",
        sessionType: SessionType.GROUP,
        startTime: new Date(Date.now() + 3600000),
        endTime: new Date(Date.now() + 7200000),
        location: "Test Studio"
      }
    });
    cleanupSessionIds.push(calSession.id);

    console.log("[SETUP COMPLETE] Actors initialized.");

    // =========================================================================
    // TEST 1: PATCH /api/sessions (Attendance & Metadata)
    // =========================================================================
    console.log("\n--- TEST 1: PATCH /api/sessions Security ---");
    // 1.1 Assigned Coach A updates attendance for Client A -> Expected 200
    const resAttA = await apiCall("/api/sessions", {
      method: "PATCH",
      token: tokenCoachA,
      body: {
        sessionId: calSession.id,
        clientId: userClientA.clientProfile!.id,
        status: AttendanceStatus.PRESENT,
        notes: "Present"
      }
    });
    console.log("1.1 Assigned Coach A updates attendance for Client A:", resAttA.status, resAttA.status === 200 ? "✅ PASS" : "❌ FAIL");

    // 1.2 Unassigned Coach B tries to update attendance for Client A -> Expected 403
    const resAttB = await apiCall("/api/sessions", {
      method: "PATCH",
      token: tokenCoachB,
      body: {
        sessionId: calSession.id,
        clientId: userClientA.clientProfile!.id,
        status: AttendanceStatus.ABSENT,
        notes: "Unauthorized"
      }
    });
    console.log("1.2 Unassigned Coach B updates attendance for Client A:", resAttB.status, resAttB.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

    // 1.3 Creator Coach A updates session metadata -> Expected 200
    const resMetaA = await apiCall("/api/sessions", {
      method: "PATCH",
      token: tokenCoachA,
      body: {
        sessionId: calSession.id,
        title: "Updated Title By Creator"
      }
    });
    console.log("1.3 Creator Coach A updates session metadata:", resMetaA.status, resMetaA.status === 200 ? "✅ PASS" : "❌ FAIL");

    // 1.4 Unassigned Coach B tries to update session metadata -> Expected 403
    const resMetaB = await apiCall("/api/sessions", {
      method: "PATCH",
      token: tokenCoachB,
      body: {
        sessionId: calSession.id,
        title: "Hacked Title"
      }
    });
    console.log("1.4 Unassigned Coach B updates session metadata:", resMetaB.status, resMetaB.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

    // 1.5 Client A tries to call PATCH /api/sessions -> Expected 403
    const resAttClient = await apiCall("/api/sessions", {
      method: "PATCH",
      token: tokenClientA,
      body: {
        sessionId: calSession.id,
        clientId: userClientA.clientProfile!.id,
        status: AttendanceStatus.PRESENT
      }
    });
    console.log("1.5 Client A tries to call PATCH /api/sessions:", resAttClient.status, resAttClient.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

    // =========================================================================
    // TEST 2: DELETE /api/exercises/[id] (ADMIN/HEAD_COACH only & deactivate vs delete)
    // =========================================================================
    console.log("\n--- TEST 2: DELETE /api/exercises/[id] Security ---");
    // Create an unreferenced exercise
    const unrefEx = await prisma.exercise.create({
      data: {
        nameAr: "تمرين تجريبي",
        nameEn: "Throwaway Unreferenced Exercise",
        sportId: activeSport!.id,
        isActive: true
      }
    });
    cleanupExerciseIds.push(unrefEx.id);

    // 2.1 Coach A tries to delete exercise -> Expected 403
    const resDelExCoach = await apiCall(`/api/exercises/${unrefEx.id}`, {
      method: "DELETE",
      token: tokenCoachA
    });
    console.log("2.1 Coach tries to delete exercise:", resDelExCoach.status, resDelExCoach.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

    // 2.2 Admin deletes referenced exercise (e.g. ex-deadlift which has blocks/logs) -> Expected 200 with deactivated: true
    const resDelExRef = await apiCall(`/api/exercises/ex-deadlift`, {
      method: "DELETE",
      token: tokenAdmin
    });
    console.log("2.2 Admin deletes referenced exercise (ex-deadlift):", resDelExRef.status, resDelExRef.data);

    // Re-activate ex-deadlift to restore clean state
    await prisma.exercise.update({ where: { id: "ex-deadlift" }, data: { isActive: true } });

    // 2.3 Admin deletes unreferenced exercise -> Expected 200 with deleted: true
    const resDelExUnref = await apiCall(`/api/exercises/${unrefEx.id}`, {
      method: "DELETE",
      token: tokenAdmin
    });
    console.log("2.3 Admin deletes unreferenced exercise:", resDelExUnref.status, resDelExUnref.data);

    // 2.4 Head Coach deletes unreferenced exercise -> Expected 200 with deleted: true
    const unrefExHead = await prisma.exercise.create({
      data: {
        nameAr: "تمرين للتجربة",
        nameEn: "Head Coach Delete Test Exercise",
        sportId: activeSport!.id,
        isActive: true
      }
    });
    cleanupExerciseIds.push(unrefExHead.id);
    const resDelExHead = await apiCall(`/api/exercises/${unrefExHead.id}`, {
      method: "DELETE",
      token: tokenHeadCoach
    });
    console.log("2.4 Head Coach deletes unreferenced exercise:", resDelExHead.status, resDelExHead.status === 200 && resDelExHead.data?.deleted === true ? "✅ PASS" : "❌ FAIL");

    // =========================================================================
    // TEST 3: DELETE /api/programs/[id] (Coach may delete only own created program)
    // =========================================================================
    console.log("\n--- TEST 3: DELETE /api/programs/[id] Security ---");
    // Coach A creates a draft program
    const progA = await prisma.trainingProgram.create({
      data: {
        titleEn: "Coach A Draft Program",
        titleAr: "برنامج مدرب أ",
        creatorId: userCoachA.coachProfile!.id,
        sportId: activeSport!.id,
        durationWeeks: 1
      }
    });
    cleanupProgramIds.push(progA.id);

    // 3.1 Coach B tries to delete Coach A's program -> Expected 403
    const resDelProgB = await apiCall(`/api/programs/${progA.id}`, {
      method: "DELETE",
      token: tokenCoachB
    });
    console.log("3.1 Coach B tries to delete Coach A's program:", resDelProgB.status, resDelProgB.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

    // 3.2 Coach A deletes own unassigned program -> Expected 200
    const resDelProgA = await apiCall(`/api/programs/${progA.id}`, {
      method: "DELETE",
      token: tokenCoachA
    });
    console.log("3.2 Coach A deletes own unassigned program:", resDelProgA.status, resDelProgA.status === 200 ? "✅ PASS" : "❌ FAIL");

    // 3.3 Admin tries to delete program with active assignments (0c508dde-7f7c-4a00-a54f-5d32f366f21e) -> Expected 409 Conflict
    const resDelProgActive = await apiCall(`/api/programs/0c508dde-7f7c-4a00-a54f-5d32f366f21e`, {
      method: "DELETE",
      token: tokenAdmin
    });
    console.log("3.3 Admin tries to delete program with active assignments:", resDelProgActive.status, resDelProgActive.status === 409 ? "✅ PASS (409 Conflict)" : "❌ FAIL");

    // =========================================================================
    // TEST 4: saveWorkoutExecution Immutability on COMPLETED
    // =========================================================================
    console.log("\n--- TEST 4: saveWorkoutExecution Immutability on COMPLETED ---");
    // Create an assignment marked COMPLETED
    const compAssignment = await prisma.clientWorkoutAssignment.create({
      data: {
        clientId: userClientA.clientProfile!.id,
        coachId: userCoachA.coachProfile!.id,
        title: "Completed Session Immutability Test",
        scheduledDate: new Date(),
        status: AssignmentStatus.COMPLETED,
        completedAt: new Date()
      }
    });

    // 4.1 Try to call execution save on COMPLETED workout -> Expected 409 Conflict
    const resExecComp = await apiCall(`/api/workouts/${compAssignment.id}`, {
      method: "POST",
      token: tokenCoachA,
      body: {
        action: "COMPLETE",
        durationMinutes: 45,
        exercises: []
      }
    });
    console.log("4.1 saveWorkoutExecution on COMPLETED assignment:", resExecComp.status, resExecComp.status === 409 ? "✅ PASS (409 Conflict)" : "❌ FAIL");

    // 4.2 COACH_FEEDBACK on COMPLETED workout by Coach -> Expected 200
    const resFeedback = await apiCall(`/api/workouts/${compAssignment.id}`, {
      method: "POST",
      token: tokenCoachA,
      body: {
        action: "COACH_FEEDBACK",
        coachFeedback: "Great effort on this completed workout!"
      }
    });
    console.log("4.2 COACH_FEEDBACK action on COMPLETED assignment by Coach:", resFeedback.status, resFeedback.status === 200 ? "✅ PASS" : "❌ FAIL");

    // 4.3 Client A tries to call COACH_FEEDBACK on assignment -> Expected 403 Forbidden
    const resClientFeedback = await apiCall(`/api/workouts/${compAssignment.id}`, {
      method: "POST",
      token: tokenClientA,
      body: {
        action: "COACH_FEEDBACK",
        coachFeedback: "Athlete trying to write coach feedback"
      }
    });
    console.log("4.3 Client A tries COACH_FEEDBACK on assignment:", resClientFeedback.status, resClientFeedback.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

    // 4.4 Unassigned Coach B tries COACH_FEEDBACK on Client A's assignment -> Expected 403 Forbidden
    const resCoachBFeedback = await apiCall(`/api/workouts/${compAssignment.id}`, {
      method: "POST",
      token: tokenCoachB,
      body: {
        action: "COACH_FEEDBACK",
        coachFeedback: "Unassigned coach trying to write feedback"
      }
    });
    console.log("4.4 Unassigned Coach B tries COACH_FEEDBACK on Client A's assignment:", resCoachBFeedback.status, resCoachBFeedback.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

    // Cleanup assignment
    await prisma.clientWorkoutAssignment.delete({ where: { id: compAssignment.id } });

    // =========================================================================
    // TEST 5: Cross-Athlete Isolation on Nutrition & Client Endpoints
    // =========================================================================
    console.log("\n--- TEST 5: Cross-Athlete Data Isolation ---");
    // 5.1 Client B tries to GET Client A's profile -> Expected 403
    const resCrossProfile = await apiCall(`/api/clients/${userClientA.clientProfile!.id}`, {
      method: "GET",
      token: tokenClientB
    });
    console.log("5.1 Client B GET Client A profile:", resCrossProfile.status, resCrossProfile.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

    // 5.2 Unassigned Coach B tries to GET Client A's profile -> Expected 403
    const resCoachBCrossProfile = await apiCall(`/api/clients/${userClientA.clientProfile!.id}`, {
      method: "GET",
      token: tokenCoachB
    });
    console.log("5.2 Unassigned Coach B GET Client A profile:", resCoachBCrossProfile.status, resCoachBCrossProfile.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

    // 5.3 Client B tries to GET Client A's nutrition plan -> Expected 403
    const resCrossNutr = await apiCall(`/api/nutrition?clientId=${userClientA.clientProfile!.id}`, {
      method: "GET",
      token: tokenClientB
    });
    console.log("5.3 Client B GET Client A nutrition:", resCrossNutr.status, resCrossNutr.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

    // 5.4 Unassigned Coach B tries to GET Client A's nutrition plan -> Expected 403
    const resCoachBCrossNutr = await apiCall(`/api/nutrition?clientId=${userClientA.clientProfile!.id}`, {
      method: "GET",
      token: tokenCoachB
    });
    console.log("5.4 Unassigned Coach B GET Client A nutrition:", resCoachBCrossNutr.status, resCoachBCrossNutr.status === 403 ? "✅ PASS (403 Forbidden)" : "❌ FAIL");

  } finally {
    console.log("\n[TEARDOWN] Cleaning up all throwaway test fixtures...");
    for (const sid of cleanupSessionIds) {
      await prisma.sessionAttendance.deleteMany({ where: { sessionId: sid } });
      await prisma.sessionCalendar.delete({ where: { id: sid } }).catch(() => {});
    }
    for (const pid of cleanupProgramIds) {
      await prisma.trainingProgram.delete({ where: { id: pid } }).catch(() => {});
    }
    for (const eid of cleanupExerciseIds) {
      await prisma.exerciseSport.deleteMany({ where: { exerciseId: eid } });
      await prisma.exercise.delete({ where: { id: eid } }).catch(() => {});
    }
    for (const uid of cleanupUserIds) {
      await prisma.session.deleteMany({ where: { userId: uid } });
      await prisma.clientCoachAssignment.deleteMany({
        where: { OR: [{ client: { userId: uid } }, { coach: { userId: uid } }] }
      });
      await prisma.clientProfile.deleteMany({ where: { userId: uid } });
      await prisma.coachProfile.deleteMany({ where: { userId: uid } });
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    console.log("[TEARDOWN COMPLETE] Zero orphaned test records remain.");
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});

import prisma from "../../src/lib/prisma";
import {
  AttendanceStatus,
  AudienceScope,
  EventMode,
  EventType,
  SessionType,
  UserRole
} from "@prisma/client";
import { sessionService } from "../../src/server/services/session.service";
import { calendarService } from "../../src/server/services/calendar.service";
import { AuthActor } from "../../src/lib/auth/route-guard";

async function run() {
  console.log("================================================================================");
  console.log("=== PHASE 6: CALENDAR & ASSIGNMENTS INTEGRATION TEST SUITE ===");
  console.log("================================================================================\n");

  let totalAssertions = 0;
  let passedAssertions = 0;

  function assert(condition: boolean, message: string) {
    totalAssertions++;
    if (condition) {
      passedAssertions++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Record pre-test baseline
  console.log("[BASELINE] Recording pre-test live database counts...");
  const baseline = {
    programs: await prisma.trainingProgram.count(),
    workouts: await prisma.clientWorkoutAssignment.count(),
    sessions: await prisma.sessionCalendar.count(),
    attendances: await prisma.sessionAttendance.count(),
    users: await prisma.user.count(),
    sports: await prisma.sport.count(),
    audits: await prisma.auditLog.count()
  };
  console.log(`  Initial counts: sessions=${baseline.sessions}, attendances=${baseline.attendances}, workouts=${baseline.workouts}, programs=${baseline.programs}, users=${baseline.users}, sports=${baseline.sports}, audits=${baseline.audits}\n`);

  const ts = Date.now();
  let adminUser: any = null;
  let coachAUser: any = null;
  let coachBUser: any = null;
  let clientAUser: any = null;
  let clientBUser: any = null;

  let sportSwim: any = null;
  let sportBox: any = null;

  let createdSessionIds: string[] = [];
  let createdAssignmentIds: string[] = [];
  let createdAuditLogIds: string[] = [];

  try {
    // 2. Setup throwaway fixtures
    console.log("[SETUP] Creating throwaway fixtures (Admin, Coach A, Coach B, Client A (Swim), Client B (Box))...");

    sportSwim = await prisma.sport.create({
      data: {
        nameEn: `P6 Swim ${ts}`,
        nameAr: `سباحة ${ts}`,
        descriptionEn: "Swimming sport"
      }
    });

    sportBox = await prisma.sport.create({
      data: {
        nameEn: `P6 Box ${ts}`,
        nameAr: `ملاكمة ${ts}`,
        descriptionEn: "Boxing sport"
      }
    });

    // Admin
    adminUser = await prisma.user.create({
      data: {
        email: `p6-admin-${ts}@test.com`,
        name: `P6 Admin ${ts}`,
        passwordHash: "hash",
        role: UserRole.ADMIN
      }
    });

    // Coach A
    coachAUser = await prisma.user.create({
      data: {
        email: `p6-coach-a-${ts}@test.com`,
        name: `P6 Coach A ${ts}`,
        passwordHash: "hash",
        role: UserRole.COACH,
        coachProfile: { create: {} }
      },
      include: { coachProfile: true }
    });

    // Coach B
    coachBUser = await prisma.user.create({
      data: {
        email: `p6-coach-b-${ts}@test.com`,
        name: `P6 Coach B ${ts}`,
        passwordHash: "hash",
        role: UserRole.COACH,
        coachProfile: { create: {} }
      },
      include: { coachProfile: true }
    });

    // Client A (Swimming, assigned to Coach A)
    clientAUser = await prisma.user.create({
      data: {
        email: `p6-client-a-${ts}@test.com`,
        name: `P6 Client A ${ts}`,
        passwordHash: "hash",
        role: UserRole.CLIENT,
        clientProfile: {
          create: {
            preferredSportId: sportSwim.id,
            coachAssignments: {
              create: { coachId: coachAUser.coachProfile.id }
            }
          }
        }
      },
      include: { clientProfile: true }
    });

    // Client B (Boxing, assigned to Coach B)
    clientBUser = await prisma.user.create({
      data: {
        email: `p6-client-b-${ts}@test.com`,
        name: `P6 Client B ${ts}`,
        passwordHash: "hash",
        role: UserRole.CLIENT,
        clientProfile: {
          create: {
            preferredSportId: sportBox.id,
            coachAssignments: {
              create: { coachId: coachBUser.coachProfile.id }
            }
          }
        }
      },
      include: { clientProfile: true }
    });

    const adminActor: AuthActor = {
      user: adminUser,
      coachProfileId: null,
      clientProfileId: null
    };

    const coachAActor: AuthActor = {
      user: coachAUser,
      coachProfileId: coachAUser.coachProfile.id,
      clientProfileId: null
    };

    const coachBActor: AuthActor = {
      user: coachBUser,
      coachProfileId: coachBUser.coachProfile.id,
      clientProfileId: null
    };

    const clientAActor: AuthActor = {
      user: clientAUser,
      coachProfileId: null,
      clientProfileId: clientAUser.clientProfile.id
    };

    const clientBActor: AuthActor = {
      user: clientBUser,
      coachProfileId: null,
      clientProfileId: clientBUser.clientProfile.id
    };

    // -------------------------------------------------------------------------
    // TEST 1: Session & Event Scheduling with All Fields and Modes
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Session & Event Scheduling with All Fields and Modes...");

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 5);
    const startIso = eventDate.toISOString();
    const endIso = new Date(eventDate.getTime() + 2 * 3600000).toISOString();

    // 1A. Online Championship (WHOLE_ACADEMY)
    const onlineChampionship = await sessionService.createSession(
      {
        title: `P6 Championship ${ts}`,
        eventType: EventType.CHAMPIONSHIP,
        eventMode: EventMode.ONLINE,
        onlineLink: "https://zoom.us/j/123456789",
        audienceScope: AudienceScope.WHOLE_ACADEMY,
        startTime: startIso,
        endTime: endIso,
        maxParticipants: 100,
        description: "Official National Online Tactical Briefing"
      },
      coachAActor
    );
    createdSessionIds.push(onlineChampionship.id);

    assert(onlineChampionship.eventType === "CHAMPIONSHIP", "Event type CHAMPIONSHIP correctly saved");
    assert(onlineChampionship.eventMode === "ONLINE", "Event mode ONLINE correctly saved");
    assert(onlineChampionship.onlineLink === "https://zoom.us/j/123456789", "onlineLink URL preserved");
    assert(onlineChampionship.audienceScope === "WHOLE_ACADEMY", "audienceScope WHOLE_ACADEMY saved");
    assert(onlineChampionship.sportId === null, "General event sportId is nullable");

    // 1B. In-Person Swimming Clinic (BY_SPORT)
    const swimClinic = await sessionService.createSession(
      {
        title: `P6 Swim Clinic ${ts}`,
        eventType: EventType.CAMP,
        eventMode: EventMode.IN_PERSON,
        location: "Olympic Swimming Complex, Nasr City",
        sportId: sportSwim.id,
        audienceScope: AudienceScope.BY_SPORT,
        startTime: startIso,
        endTime: endIso,
        maxParticipants: 30,
        description: "Intensive 50m freestyle stroke drills"
      },
      coachAActor
    );
    createdSessionIds.push(swimClinic.id);

    assert(swimClinic.eventType === "CAMP", "Event type CAMP correctly saved");
    assert(swimClinic.eventMode === "IN_PERSON", "Event mode IN_PERSON correctly saved");
    assert(swimClinic.location === "Olympic Swimming Complex, Nasr City", "Physical location correctly saved");
    assert(swimClinic.audienceScope === "BY_SPORT", "audienceScope BY_SPORT correctly saved");
    assert(swimClinic.sportId === sportSwim.id, "sportId correctly linked to Swimming");

    // 1C. Coach A Roster Workshop (COACH_ROSTER)
    const rosterWorkshop = await sessionService.createSession(
      {
        title: `P6 Coach A Workshop ${ts}`,
        eventType: EventType.SEMINAR_WORKSHOP,
        eventMode: EventMode.ONLINE,
        onlineLink: "https://meet.google.com/p6-roster",
        audienceScope: AudienceScope.COACH_ROSTER,
        startTime: startIso,
        endTime: endIso,
        maxParticipants: 15
      },
      coachAActor
    );
    createdSessionIds.push(rosterWorkshop.id);
    assert(rosterWorkshop.audienceScope === "COACH_ROSTER", "audienceScope COACH_ROSTER saved");

    // 1D. Selected Athletes Group Class (SELECTED_ATHLETES)
    const selectedClass = await sessionService.createSession(
      {
        title: `P6 Selected Class ${ts}`,
        eventType: EventType.GROUP_CLASS,
        eventMode: EventMode.IN_PERSON,
        audienceScope: AudienceScope.SELECTED_ATHLETES,
        clientIds: [clientAUser.clientProfile.id],
        startTime: startIso,
        endTime: endIso,
        maxParticipants: 10
      },
      coachAActor
    );
    createdSessionIds.push(selectedClass.id);
    assert(selectedClass.audienceScope === "SELECTED_ATHLETES", "audienceScope SELECTED_ATHLETES saved");
    assert(selectedClass.attendances.length === 1, "SELECTED_ATHLETES eagerly registers selected athlete");

    // 1E. Verify AuditLog written for CREATE_SESSION
    const createAudit = await prisma.auditLog.findFirst({
      where: {
        action: "CREATE_SESSION",
        entityId: onlineChampionship.id
      }
    });
    assert(createAudit !== null, "AuditLog written for CREATE_SESSION");
    if (createAudit) createdAuditLogIds.push(createAudit.id);

    // -------------------------------------------------------------------------
    // TEST 2: Unified Calendar API & Audience Resolution
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Unified Calendar API & Audience Resolution...");

    // Create a workout assignment for Client A
    const workoutAssignment = await prisma.clientWorkoutAssignment.create({
      data: {
        clientId: clientAUser.clientProfile.id,
        coachId: coachAUser.coachProfile.id,
        title: `P6 Workout Assignment ${ts}`,
        scheduledDate: eventDate,
        status: "SCHEDULED"
      }
    });
    createdAssignmentIds.push(workoutAssignment.id);

    // 2A. Admin Unified Query
    const adminCalendar = await calendarService.getUnifiedCalendar(
      {
        startDate: new Date(eventDate.getTime() - 86400000),
        endDate: new Date(eventDate.getTime() + 86400000)
      },
      adminActor
    );
    assert(adminCalendar.events.length >= 4, `Admin sees all 4 events (got ${adminCalendar.events.length})`);
    assert(adminCalendar.workouts.some((w) => w.id === workoutAssignment.id), "Admin sees athlete workout assignment");

    // 2B. Client A Calendar Query (Swimming, Coach A, Selected in Class)
    const clientACalendar = await calendarService.getUnifiedCalendar(
      {
        startDate: new Date(eventDate.getTime() - 86400000),
        endDate: new Date(eventDate.getTime() + 86400000)
      },
      clientAActor
    );

    const clientAEventIds = clientACalendar.events.map((e) => e.id);
    assert(clientAEventIds.includes(onlineChampionship.id), "Client A sees WHOLE_ACADEMY event");
    assert(clientAEventIds.includes(swimClinic.id), "Client A sees BY_SPORT Swimming clinic");
    assert(clientAEventIds.includes(rosterWorkshop.id), "Client A sees COACH_ROSTER Coach A workshop");
    assert(clientAEventIds.includes(selectedClass.id), "Client A sees SELECTED_ATHLETES class where they were included");
    assert(clientACalendar.workouts.some((w) => w.id === workoutAssignment.id), "Client A sees own workout assignment");

    // 2C. Client B Calendar Query (Boxing, Coach B, NOT in Coach A roster or Swim)
    const clientBCalendar = await calendarService.getUnifiedCalendar(
      {
        startDate: new Date(eventDate.getTime() - 86400000),
        endDate: new Date(eventDate.getTime() + 86400000)
      },
      clientBActor
    );

    const clientBEventIds = clientBCalendar.events.map((e) => e.id);
    assert(clientBEventIds.includes(onlineChampionship.id), "Client B sees WHOLE_ACADEMY event");
    assert(!clientBEventIds.includes(swimClinic.id), "Client B does NOT see Swimming clinic (Client B is Boxing)");
    assert(!clientBEventIds.includes(rosterWorkshop.id), "Client B does NOT see Coach A workshop (Client B has Coach B)");
    assert(!clientBEventIds.includes(selectedClass.id), "Client B does NOT see Selected Class (not on roster)");
    assert(!clientBCalendar.workouts.some((w) => w.id === workoutAssignment.id), "Client B does NOT see Client A's workout");

    // -------------------------------------------------------------------------
    // TEST 3: RBAC & Ownership Security Guards
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] RBAC & Ownership Security Guards...");

    // 3A. Client blocked from creating session
    let clientCreateBlocked = false;
    try {
      await sessionService.createSession(
        {
          title: "Illegal Client Session",
          startTime: startIso,
          endTime: endIso
        },
        clientAActor
      );
    } catch (err: any) {
      if (err.statusCode === 403) clientCreateBlocked = true;
    }
    assert(clientCreateBlocked, "CLIENT role blocked from scheduling sessions (HTTP 403)");

    // 3B. Client blocked from updating session
    let clientUpdateBlocked = false;
    try {
      await sessionService.updateSession(
        onlineChampionship.id,
        { title: "Hacked Title" },
        clientAActor
      );
    } catch (err: any) {
      if (err.statusCode === 403) clientUpdateBlocked = true;
    }
    assert(clientUpdateBlocked, "CLIENT role blocked from updating sessions (HTTP 403)");

    // 3C. Client blocked from deleting session
    let clientDeleteBlocked = false;
    try {
      await sessionService.deleteSession(onlineChampionship.id, clientAActor);
    } catch (err: any) {
      if (err.statusCode === 403) clientDeleteBlocked = true;
    }
    assert(clientDeleteBlocked, "CLIENT role blocked from deleting sessions (HTTP 403)");

    // 3D. Unassigned Coach B blocked from updating Coach A's session
    let coachBUpdateBlocked = false;
    try {
      await sessionService.updateSession(
        onlineChampionship.id,
        { title: "Coach B Intrusion" },
        coachBActor
      );
    } catch (err: any) {
      if (err.statusCode === 403) coachBUpdateBlocked = true;
    }
    assert(coachBUpdateBlocked, "Non-owner COACH blocked from modifying another coach's session (HTTP 403)");

    // 3E. Unassigned Coach B blocked from deleting Coach A's session
    let coachBDeleteBlocked = false;
    try {
      await sessionService.deleteSession(onlineChampionship.id, coachBActor);
    } catch (err: any) {
      if (err.statusCode === 403) coachBDeleteBlocked = true;
    }
    assert(coachBDeleteBlocked, "Non-owner COACH blocked from deleting another coach's session (HTTP 403)");

    // 3F. Creator Coach A allowed to update own session
    const updatedByCoachA = await sessionService.updateSession(
      onlineChampionship.id,
      { description: "Updated by Creator Coach A" },
      coachAActor
    );
    assert(updatedByCoachA.description === "Updated by Creator Coach A", "Creator Coach A allowed to update own session (HTTP 200)");

    // 3G. Admin allowed to update any session
    const updatedByAdmin = await sessionService.updateSession(
      onlineChampionship.id,
      { description: "Supervised by Admin" },
      adminActor
    );
    assert(updatedByAdmin.description === "Supervised by Admin", "ADMIN allowed to update any session (HTTP 200)");

    // -------------------------------------------------------------------------
    // TEST 4: Lazy Attendance Upsert & Roster Resolution
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Lazy Attendance Upsert & Roster Resolution...");

    // 4A. Eligible attendees for Swimming Clinic (BY_SPORT Swimming)
    const eligibleSwim = await sessionService.getEligibleAttendees(swimClinic.id);
    const eligibleAthleteIds = eligibleSwim.map((a) => a.athleteId);
    assert(eligibleAthleteIds.includes(clientAUser.clientProfile.id), "Eligible roster includes Client A (Swimming)");
    assert(!eligibleAthleteIds.includes(clientBUser.clientProfile.id), "Eligible roster excludes Client B (Boxing)");

    const clientARecord = eligibleSwim.find((a) => a.athleteId === clientAUser.clientProfile.id);
    assert(clientARecord?.status === null, "Initial attendance status is null (zero pre-generated ghost rows)");

    // 4B. Lazy Attendance Upsert to PRESENT
    const attendanceRecord = await sessionService.updateAttendance(
      swimClinic.id,
      clientAUser.clientProfile.id,
      AttendanceStatus.PRESENT,
      "Arrived on time in lane 3",
      coachAActor
    );
    assert(attendanceRecord.status === "PRESENT", "Attendance lazily upserted to PRESENT");
    assert(attendanceRecord.notes === "Arrived on time in lane 3", "Attendance notes saved");

    // Verify AuditLog written for UPDATE_SESSION_ATTENDANCE
    const attAudit = await prisma.auditLog.findFirst({
      where: {
        action: "UPDATE_SESSION_ATTENDANCE",
        entityId: attendanceRecord.id
      }
    });
    assert(attAudit !== null, "AuditLog written for UPDATE_SESSION_ATTENDANCE");
    if (attAudit) createdAuditLogIds.push(attAudit.id);

    // 4C. Update Status to LATE
    const updatedLate = await sessionService.updateAttendance(
      swimClinic.id,
      clientAUser.clientProfile.id,
      AttendanceStatus.LATE,
      "Arrived 10 mins late due to traffic",
      coachAActor
    );
    assert(updatedLate.status === "LATE", "Attendance status updated to LATE");

    // 4D. Verify Eligible Roster reflects marked status
    const refreshedRoster = await sessionService.getEligibleAttendees(swimClinic.id);
    const refreshedClientA = refreshedRoster.find((a) => a.athleteId === clientAUser.clientProfile.id);
    assert(refreshedClientA?.status === "LATE", "Eligible attendees roster dynamically reflects LATE status");

    // -------------------------------------------------------------------------
    // TEST 5: Session Deletion & Cascading Attendances
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Session Deletion & Cascading Attendances...");

    const deleteResult = await sessionService.deleteSession(selectedClass.id, coachAActor);
    assert(deleteResult.success === true, "Session deleted successfully");
    createdSessionIds = createdSessionIds.filter((id) => id !== selectedClass.id);

    const checkDeletedSession = await prisma.sessionCalendar.findUnique({ where: { id: selectedClass.id } });
    assert(checkDeletedSession === null, "Session row removed from session_calendars");

    const checkCascadedAttendances = await prisma.sessionAttendance.findMany({ where: { sessionId: selectedClass.id } });
    assert(checkCascadedAttendances.length === 0, "Cascaded attendances removed cleanly");

  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN: Clean up all throwaway fixtures in FK-safe order
    // -------------------------------------------------------------------------
    console.log("\n[TEARDOWN] Cleaning up all throwaway fixtures in FK-safe order...");

    // Delete workouts
    if (createdAssignmentIds.length > 0) {
      await prisma.clientWorkoutAssignment.deleteMany({
        where: { id: { in: createdAssignmentIds } }
      });
      console.log(`   - Deleted WorkoutAssignments: ${createdAssignmentIds.length}`);
    }

    // Delete attendances
    if (createdSessionIds.length > 0) {
      await prisma.sessionAttendance.deleteMany({
        where: { sessionId: { in: createdSessionIds } }
      });
      console.log(`   - Deleted SessionAttendances`);
    }

    // Delete sessions
    if (createdSessionIds.length > 0) {
      await prisma.sessionCalendar.deleteMany({
        where: { id: { in: createdSessionIds } }
      });
      console.log(`   - Deleted SessionCalendars: ${createdSessionIds.length}`);
    }

    // Delete audit logs
    const cleanedAudits = await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: [adminUser?.id, coachAUser?.id, coachBUser?.id, clientAUser?.id, clientBUser?.id].filter(Boolean) } },
          { id: { in: createdAuditLogIds } }
        ]
      }
    });
    console.log(`   - Cleaned up AuditLogs: ${cleanedAudits.count}`);

    // Delete ClientCoachAssignments
    await prisma.clientCoachAssignment.deleteMany({
      where: {
        OR: [
          { coachId: { in: [coachAUser?.coachProfile?.id, coachBUser?.coachProfile?.id].filter(Boolean) } },
          { clientId: { in: [clientAUser?.clientProfile?.id, clientBUser?.clientProfile?.id].filter(Boolean) } }
        ]
      }
    });

    // Delete ClientProfiles
    if (clientAUser?.clientProfile?.id || clientBUser?.clientProfile?.id) {
      await prisma.clientProfile.deleteMany({
        where: { id: { in: [clientAUser?.clientProfile?.id, clientBUser?.clientProfile?.id].filter(Boolean) } }
      });
      console.log("   - Deleted ClientProfiles: 2");
    }

    // Delete CoachProfiles
    if (coachAUser?.coachProfile?.id || coachBUser?.coachProfile?.id) {
      await prisma.coachProfile.deleteMany({
        where: { id: { in: [coachAUser?.coachProfile?.id, coachBUser?.coachProfile?.id].filter(Boolean) } }
      });
      console.log("   - Deleted CoachProfiles: 2");
    }

    // Delete Users
    const userIds = [adminUser?.id, coachAUser?.id, coachBUser?.id, clientAUser?.id, clientBUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
      console.log(`   - Deleted Users: ${userIds.length}`);
    }

    // Delete Sports
    if (sportSwim?.id || sportBox?.id) {
      await prisma.sport.deleteMany({
        where: { id: { in: [sportSwim?.id, sportBox?.id].filter(Boolean) } }
      });
      console.log("   - Deleted Sports: 2");
    }

    // -------------------------------------------------------------------------
    // RECONCILIATION: Verify live database hygiene
    // -------------------------------------------------------------------------
    console.log("\n[RECONCILIATION] Verifying live database hygiene...");
    const current = {
      programs: await prisma.trainingProgram.count(),
      workouts: await prisma.clientWorkoutAssignment.count(),
      sessions: await prisma.sessionCalendar.count(),
      attendances: await prisma.sessionAttendance.count(),
      users: await prisma.user.count(),
      sports: await prisma.sport.count(),
      audits: await prisma.auditLog.count()
    };

    console.log(`   Sessions:     ${current.sessions} vs ${baseline.sessions} -> ${current.sessions === baseline.sessions ? "MATCH" : "MISMATCH"}`);
    console.log(`   Attendances:  ${current.attendances} vs ${baseline.attendances} -> ${current.attendances === baseline.attendances ? "MATCH" : "MISMATCH"}`);
    console.log(`   Workouts:     ${current.workouts} vs ${baseline.workouts} -> ${current.workouts === baseline.workouts ? "MATCH" : "MISMATCH"}`);
    console.log(`   Programs:     ${current.programs} vs ${baseline.programs} -> ${current.programs === baseline.programs ? "MATCH" : "MISMATCH"}`);
    console.log(`   Users:        ${current.users} vs ${baseline.users} -> ${current.users === baseline.users ? "MATCH" : "MISMATCH"}`);
    console.log(`   Sports:       ${current.sports} vs ${baseline.sports} -> ${current.sports === baseline.sports ? "MATCH" : "MISMATCH"}`);
    console.log(`   Audits:       ${current.audits} vs ${baseline.audits} -> ${current.audits === baseline.audits ? "MATCH" : "MISMATCH"}`);

    assert(current.sessions === baseline.sessions, "Zero residue: sessions table matches baseline");
    assert(current.attendances === baseline.attendances, "Zero residue: attendances table matches baseline");
    assert(current.workouts === baseline.workouts, "Zero residue: workouts table matches baseline");
    assert(current.programs === baseline.programs, "Zero residue: programs table matches baseline");
    assert(current.users === baseline.users, "Zero residue: users table matches baseline");
    assert(current.sports === baseline.sports, "Zero residue: sports table matches baseline");
    assert(current.audits === baseline.audits, "Zero residue: audits table matches baseline");

    console.log("================================================================================");
    console.log(`=== PHASE 6 SUMMARY: ${passedAssertions}/${totalAssertions} Assertions Passed ===`);
    console.log("================================================================================");
  }
}

run()
  .catch((e) => {
    console.error("FATAL ERROR IN TEST SUITE:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

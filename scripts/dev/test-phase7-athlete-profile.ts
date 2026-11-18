import {
  PrismaClient,
  UserRole,
  GoalType,
  GoalStatus,
  BodyPart,
  RestrictionSeverity,
  NoteType
} from "@prisma/client";
import { sessionService } from "../../src/lib/auth/session-service";
import { checkInScheduleService } from "../../src/server/services/checkin-schedule.service";
import { healthService, HealthServiceError } from "../../src/server/services/health.service";
import { clientService } from "../../src/server/services/client.service";
import {
  GET as getClientById,
  PATCH as patchClient
} from "../../src/app/api/clients/[id]/route";
import {
  GET as getCheckInSchedule,
  POST as postCheckInSchedule
} from "../../src/app/api/clients/[id]/check-in-schedule/route";
import {
  GET as getMeasurements,
  POST as postMeasurement,
  DELETE as deleteMeasurementHttp
} from "../../src/app/api/clients/[id]/measurements/route";
import {
  GET as getPhotos,
  POST as postPhoto,
  DELETE as deletePhotoHttp
} from "../../src/app/api/clients/[id]/photos/route";
import {
  GET as getMedical,
  POST as postMedical,
  DELETE as deleteMedicalHttp
} from "../../src/app/api/clients/[id]/medical/route";
import {
  GET as getGoals,
  POST as postGoal,
  PATCH as patchGoal,
  DELETE as deleteGoalHttp
} from "../../src/app/api/clients/[id]/goals/route";
import {
  GET as getNotes,
  POST as postNote,
  DELETE as deleteNoteHttp
} from "../../src/app/api/clients/[id]/notes/route";
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
  console.log("=== PHASE 7: ATHLETE PROFILE / CHECK-INS / PHOTOS TEST SUITE ===");
  console.log("================================================================================");

  const cleanupUserIds: string[] = [];
  const cleanupClientProfileIds: string[] = [];
  const cleanupCoachProfileIds: string[] = [];
  const cleanupClientCoachAssignmentIds: string[] = [];
  const cleanupMeasurementIds: string[] = [];
  const cleanupScheduleIds: string[] = [];
  const cleanupPhotoIds: string[] = [];
  const cleanupRestrictionIds: string[] = [];
  const cleanupGoalIds: string[] = [];
  const cleanupNoteIds: string[] = [];
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
  const baseMeasurements = await prisma.clientMeasurementHistory.count();
  const baseSchedules = await prisma.athleteCheckInSchedule.count();
  const basePhotos = await prisma.clientProgressPhoto.count();
  const baseRestrictions = await prisma.clientMedicalRestriction.count();
  const baseGoals = await prisma.clientGoal.count();
  const baseNotes = await prisma.clientNote.count();
  const baseCoachAssignments = await prisma.clientCoachAssignment.count();
  const baseUsers = await prisma.user.count();
  const baseAudits = await prisma.auditLog.count();

  console.log(
    `  Baseline counts: clients=${baseClients}, coaches=${baseCoaches}, measurements=${baseMeasurements}, schedules=${baseSchedules}, photos=${basePhotos}, restrictions=${baseRestrictions}, goals=${baseGoals}, notes=${baseNotes}, users=${baseUsers}, audits=${baseAudits}`
  );

  try {
    const dummyHash = "$2a$10$s.YJQkOnTwqWdvq.9A4bw.S7z7mIHn1NoofWXdeJYELGShNKb4Oze";
    const ts = Date.now();

    // 0. Setup Throwaway Actors
    console.log("\n[SETUP] Creating throwaway fixtures (Admin, Coach A, Coach B, Client A, Client B)...");

    const adminUser = await prisma.user.create({
      data: {
        email: `throwaway.p7.admin.${ts}@gx.test`,
        name: "P7 Admin",
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
        email: `throwaway.p7.coacha.${ts}@gx.test`,
        name: "P7 Coach A",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P7 Coach A Bio" } }
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
        email: `throwaway.p7.coachb.${ts}@gx.test`,
        name: "P7 Coach B",
        role: UserRole.COACH,
        passwordHash: dummyHash,
        coachProfile: { create: { bio: "P7 Coach B Bio" } }
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
        email: `throwaway.p7.clienta.${ts}@gx.test`,
        name: "P7 Client A",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: { status: "ACTIVE", heightCm: 180, weightKg: 90 } }
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
        email: `throwaway.p7.clientb.${ts}@gx.test`,
        name: "P7 Client B",
        role: UserRole.CLIENT,
        passwordHash: dummyHash,
        clientProfile: { create: { status: "ACTIVE", heightCm: 175, weightKg: 75 } }
      },
      include: { clientProfile: true }
    });
    cleanupUserIds.push(clientBUser.id);
    cleanupClientProfileIds.push(clientBUser.clientProfile!.id);
    const clientBSession = await sessionService.createSession({ userId: clientBUser.id });
    const clientBActor = {
      user: { id: clientBUser.id, name: clientBUser.name, role: clientBUser.role },
      coachProfileId: null,
      clientProfileId: clientBUser.clientProfile!.id
    };

    // Assign Coach A to Client A (Coach B remains unassigned to Client A)
    const coachAssignmentA = await prisma.clientCoachAssignment.create({
      data: {
        clientId: clientAUser.clientProfile!.id,
        coachId: coachAUser.coachProfile!.id,
        active: true
      }
    });
    cleanupClientCoachAssignmentIds.push(coachAssignmentA.id);

    const clientAId = clientAUser.clientProfile!.id;
    const clientBId = clientBUser.clientProfile!.id;

    // =========================================================================
    // TEST 1: CHECK-IN SCHEDULE CONFIGURATION & STATUS COMPUTATION
    // =========================================================================
    console.log("\n--- TEST 1: Check-in Schedule Configuration & Status Computation ---");

    const scheduleUpsert = await checkInScheduleService.upsertSchedule(
      clientAId,
      {
        weightFrequencyDays: 7,
        measurementFrequencyDays: 14,
        photoFrequencyDays: 30,
        notes: "Weigh in every Friday morning fasted"
      },
      coachAUser.coachProfile!.id,
      coachAActor
    );
    cleanupScheduleIds.push(scheduleUpsert.schedule!.id);

    assert(
      scheduleUpsert.schedule !== null,
      "1.1 Athlete check-in schedule created"
    );
    assert(
      scheduleUpsert.schedule?.weightFrequencyDays === 7 &&
        scheduleUpsert.schedule?.measurementFrequencyDays === 14 &&
        scheduleUpsert.schedule?.photoFrequencyDays === 30,
      "1.2 Check-in schedule frequencies stored accurately"
    );
    assert(
      scheduleUpsert.status.weight.isConfigured === true &&
        scheduleUpsert.status.weight.frequencyDays === 7,
      "1.3 Weight metric status computed as configured"
    );
    assert(
      scheduleUpsert.status.overallStatus !== "NOT_CONFIGURED",
      "1.4 Overall schedule status computed"
    );

    const schedAudit = await prisma.auditLog.findFirst({
      where: {
        action: "CONFIGURE_CHECKIN_SCHEDULE",
        entityId: scheduleUpsert.schedule!.id
      }
    });
    assert(schedAudit !== null, "1.5 CONFIGURE_CHECKIN_SCHEDULE AuditLog emitted");
    if (schedAudit) cleanupAuditLogIds.push(schedAudit.id);

    // Test HTTP GET and POST on check-in schedule
    const getSchedReq = createMockRequest(`/api/clients/${clientAId}/check-in-schedule`, "GET", coachASession.sessionToken);
    const getSchedRes = await getCheckInSchedule(getSchedReq, { params: Promise.resolve({ id: clientAId }) });
    const getSchedJson = await getSchedRes.json();
    assert(
      getSchedRes.status === 200 && getSchedJson.success && getSchedJson.data.schedule.weightFrequencyDays === 7,
      "1.6 HTTP GET /api/clients/[id]/check-in-schedule returns 200 OK and valid schedule"
    );

    const postSchedReq = createMockRequest(
      `/api/clients/${clientAId}/check-in-schedule`,
      "POST",
      coachASession.sessionToken,
      { weightFrequencyDays: 5, notes: "Adjusted to 5 days" }
    );
    const postSchedRes = await postCheckInSchedule(postSchedReq, { params: Promise.resolve({ id: clientAId }) });
    const postSchedJson = await postSchedRes.json();
    assert(
      postSchedRes.status === 200 && postSchedJson.data.schedule.weightFrequencyDays === 5,
      "1.7 HTTP POST /api/clients/[id]/check-in-schedule updates schedule"
    );

    // =========================================================================
    // TEST 2: MEASUREMENTS HISTORY & AUTOMATIC SCHEDULE ADVANCEMENT
    // =========================================================================
    console.log("\n--- TEST 2: Measurements History & Automatic Schedule Progression ---");

    const measurement1 = await healthService.addMeasurement(
      clientAId,
      {
        weightKg: 85.5,
        heightCm: 180,
        bodyFatPercentage: 18.5,
        waistCm: 84,
        chestCm: 104,
        notes: "Good progress on recomp"
      },
      coachAActor
    );
    cleanupMeasurementIds.push(measurement1.id);

    assert(
      measurement1.weightKg === 85.5 && measurement1.bmi === 26.4,
      "2.1 Measurement created with exact weight and computed BMI (26.4)"
    );

    // Verify client profile current weightKg and heightCm updated
    const updatedClientProfile = await prisma.clientProfile.findUnique({
      where: { id: clientAId },
      select: { weightKg: true, heightCm: true }
    });
    assert(
      updatedClientProfile?.weightKg === 85.5 && updatedClientProfile?.heightCm === 180,
      "2.2 ClientProfile weight and height updated synchronously"
    );

    // Verify check-in schedule lastWeightAt and lastMeasurementAt advanced
    const scheduleAfterMeasurement = await prisma.athleteCheckInSchedule.findUnique({
      where: { clientId: clientAId }
    });
    assert(
      scheduleAfterMeasurement?.lastWeightAt !== null && scheduleAfterMeasurement?.lastMeasurementAt !== null,
      "2.3 Check-in schedule automatically recorded WEIGHT and MEASUREMENT submissions"
    );

    const measAudit = await prisma.auditLog.findFirst({
      where: { action: "RECORD_MEASUREMENT", entityId: measurement1.id }
    });
    assert(measAudit !== null, "2.4 RECORD_MEASUREMENT AuditLog emitted");
    if (measAudit) cleanupAuditLogIds.push(measAudit.id);

    // HTTP GET measurements
    const getMeasReq = createMockRequest(`/api/clients/${clientAId}/measurements`, "GET", coachASession.sessionToken);
    const getMeasRes = await getMeasurements(getMeasReq, { params: Promise.resolve({ id: clientAId }) });
    const getMeasJson = await getMeasRes.json();
    assert(
      getMeasRes.status === 200 && Array.isArray(getMeasJson.data) && getMeasJson.data.length >= 1,
      "2.5 HTTP GET /api/clients/[id]/measurements returns measurement list"
    );

    // HTTP DELETE measurement
    const delMeasReq = createMockRequest(
      `/api/clients/${clientAId}/measurements?measurementId=${measurement1.id}`,
      "DELETE",
      coachASession.sessionToken
    );
    const delMeasRes = await deleteMeasurementHttp(delMeasReq, { params: Promise.resolve({ id: clientAId }) });
    const delMeasJson = await delMeasRes.json();
    assert(
      delMeasRes.status === 200 && delMeasJson.success,
      "2.6 HTTP DELETE /api/clients/[id]/measurements deletes measurement"
    );

    const delMeasAudit = await prisma.auditLog.findFirst({
      where: { action: "DELETE_MEASUREMENT", entityId: measurement1.id }
    });
    assert(delMeasAudit !== null, "2.7 DELETE_MEASUREMENT AuditLog emitted");
    if (delMeasAudit) cleanupAuditLogIds.push(delMeasAudit.id);

    // =========================================================================
    // TEST 3: PROGRESS PHOTOS & CHECK-IN PHOTO ADVANCEMENT
    // =========================================================================
    console.log("\n--- TEST 3: Progress Photos & Photo Check-In Progression ---");

    const photo1 = await healthService.addProgressPhoto(
      clientAId,
      {
        frontImageUrl: "https://gx.test/front_week1.jpg",
        sideImageUrl: "https://gx.test/side_week1.jpg",
        weightAtTime: 85.0,
        notes: "Front and side check-in"
      },
      coachAActor
    );
    cleanupPhotoIds.push(photo1.id);

    assert(
      photo1.frontImageUrl === "https://gx.test/front_week1.jpg" && photo1.weightAtTime === 85.0,
      "3.1 Progress photo record created"
    );

    // Verify check-in schedule lastPhotoAt advanced
    const scheduleAfterPhoto = await prisma.athleteCheckInSchedule.findUnique({
      where: { clientId: clientAId }
    });
    assert(
      scheduleAfterPhoto?.lastPhotoAt !== null,
      "3.2 Check-in schedule automatically recorded PHOTO submission"
    );

    const photoAudit = await prisma.auditLog.findFirst({
      where: { action: "UPLOAD_PROGRESS_PHOTO", entityId: photo1.id }
    });
    assert(photoAudit !== null, "3.3 UPLOAD_PROGRESS_PHOTO AuditLog emitted");
    if (photoAudit) cleanupAuditLogIds.push(photoAudit.id);

    // HTTP GET photos
    const getPhotoReq = createMockRequest(`/api/clients/${clientAId}/photos`, "GET", coachASession.sessionToken);
    const getPhotoRes = await getPhotos(getPhotoReq, { params: Promise.resolve({ id: clientAId }) });
    const getPhotoJson = await getPhotoRes.json();
    assert(
      getPhotoRes.status === 200 && getPhotoJson.data.length >= 1,
      "3.4 HTTP GET /api/clients/[id]/photos returns photo history"
    );

    // HTTP DELETE photo
    const delPhotoReq = createMockRequest(
      `/api/clients/${clientAId}/photos?photoId=${photo1.id}`,
      "DELETE",
      coachASession.sessionToken
    );
    const delPhotoRes = await deletePhotoHttp(delPhotoReq, { params: Promise.resolve({ id: clientAId }) });
    const delPhotoJson = await delPhotoRes.json();
    assert(
      delPhotoRes.status === 200 && delPhotoJson.success,
      "3.5 HTTP DELETE /api/clients/[id]/photos deletes photo"
    );

    const delPhotoAudit = await prisma.auditLog.findFirst({
      where: { action: "DELETE_PROGRESS_PHOTO", entityId: photo1.id }
    });
    assert(delPhotoAudit !== null, "3.6 DELETE_PROGRESS_PHOTO AuditLog emitted");
    if (delPhotoAudit) cleanupAuditLogIds.push(delPhotoAudit.id);

    // =========================================================================
    // TEST 4: MEDICAL RESTRICTIONS & INJURY CLEARANCE
    // =========================================================================
    console.log("\n--- TEST 4: Medical Restrictions & Injury Clearance ---");

    const restriction1 = await healthService.addMedicalRestriction(
      clientAId,
      {
        conditionName: "Patellar Tendonitis",
        bodyPart: BodyPart.KNEE,
        severity: RestrictionSeverity.HIGH,
        restrictedMuscles: ["Quadriceps"],
        restrictedExercises: ["Barbell Back Squat", "Leg Extension"],
        notes: "Avoid deep knee flexion under heavy load"
      },
      coachAActor
    );
    cleanupRestrictionIds.push(restriction1.id);

    assert(
      restriction1.conditionName === "Patellar Tendonitis" &&
        restriction1.bodyPart === BodyPart.KNEE &&
        restriction1.restrictedExercises.includes("Barbell Back Squat"),
      "4.1 Medical restriction created with restricted exercises list"
    );

    const medAudit = await prisma.auditLog.findFirst({
      where: { action: "ADD_MEDICAL_RESTRICTION", entityId: restriction1.id }
    });
    assert(medAudit !== null, "4.2 ADD_MEDICAL_RESTRICTION AuditLog emitted");
    if (medAudit) cleanupAuditLogIds.push(medAudit.id);

    // HTTP GET medical
    const getMedReq = createMockRequest(`/api/clients/${clientAId}/medical`, "GET", coachASession.sessionToken);
    const getMedRes = await getMedical(getMedReq, { params: Promise.resolve({ id: clientAId }) });
    const getMedJson = await getMedRes.json();
    assert(
      getMedRes.status === 200 && getMedJson.data.length >= 1,
      "4.3 HTTP GET /api/clients/[id]/medical returns active restrictions"
    );

    // HTTP DELETE medical
    const delMedReq = createMockRequest(
      `/api/clients/${clientAId}/medical?restrictionId=${restriction1.id}`,
      "DELETE",
      coachASession.sessionToken
    );
    const delMedRes = await deleteMedicalHttp(delMedReq, { params: Promise.resolve({ id: clientAId }) });
    const delMedJson = await delMedRes.json();
    assert(
      delMedRes.status === 200 && delMedJson.success,
      "4.4 HTTP DELETE /api/clients/[id]/medical removes restriction"
    );

    const delMedAudit = await prisma.auditLog.findFirst({
      where: { action: "DELETE_MEDICAL_RESTRICTION", entityId: restriction1.id }
    });
    assert(delMedAudit !== null, "4.5 DELETE_MEDICAL_RESTRICTION AuditLog emitted");
    if (delMedAudit) cleanupAuditLogIds.push(delMedAudit.id);

    // =========================================================================
    // TEST 5: GOALS LIFECYCLE (ADD, UPDATE, DELETE)
    // =========================================================================
    console.log("\n--- TEST 5: Goals Lifecycle ---");

    const goal1 = await healthService.addGoal(
      clientAId,
      {
        title: "Target 80kg Bodyweight",
        goalType: GoalType.WEIGHT_LOSS,
        startingValue: 90.0,
        targetValue: 80.0,
        currentValue: 85.5,
        unit: "KG"
      },
      coachAActor
    );
    cleanupGoalIds.push(goal1.id);

    assert(
      goal1.title === "Target 80kg Bodyweight" &&
        goal1.status === GoalStatus.IN_PROGRESS &&
        goal1.currentValue === 85.5,
      "5.1 Goal created with IN_PROGRESS status and starting values"
    );

    const addGoalAudit = await prisma.auditLog.findFirst({
      where: { action: "ADD_GOAL", entityId: goal1.id }
    });
    assert(addGoalAudit !== null, "5.2 ADD_GOAL AuditLog emitted");
    if (addGoalAudit) cleanupAuditLogIds.push(addGoalAudit.id);

    // Update goal via service / HTTP PATCH
    const patchGoalReq = createMockRequest(
      `/api/clients/${clientAId}/goals`,
      "PATCH",
      coachASession.sessionToken,
      {
        goalId: goal1.id,
        currentValue: 80.0,
        status: GoalStatus.ACHIEVED
      }
    );
    const patchGoalRes = await patchGoal(patchGoalReq, { params: Promise.resolve({ id: clientAId }) });
    const patchGoalJson = await patchGoalRes.json();
    assert(
      patchGoalRes.status === 200 &&
        patchGoalJson.data.currentValue === 80.0 &&
        patchGoalJson.data.status === GoalStatus.ACHIEVED,
      "5.3 HTTP PATCH /api/clients/[id]/goals updates progress to ACHIEVED",
      patchGoalJson
    );

    const updateGoalAudit = await prisma.auditLog.findFirst({
      where: { action: "UPDATE_GOAL", entityId: goal1.id }
    });
    assert(updateGoalAudit !== null, "5.4 UPDATE_GOAL AuditLog emitted");
    if (updateGoalAudit) cleanupAuditLogIds.push(updateGoalAudit.id);

    // HTTP GET goals
    const getGoalsReq = createMockRequest(`/api/clients/${clientAId}/goals`, "GET", coachASession.sessionToken);
    const getGoalsRes = await getGoals(getGoalsReq, { params: Promise.resolve({ id: clientAId }) });
    const getGoalsJson = await getGoalsRes.json();
    assert(
      getGoalsRes.status === 200 && getGoalsJson.data.length >= 1,
      "5.5 HTTP GET /api/clients/[id]/goals returns client goals"
    );

    // HTTP DELETE goal
    const delGoalReq = createMockRequest(
      `/api/clients/${clientAId}/goals?goalId=${goal1.id}`,
      "DELETE",
      coachASession.sessionToken
    );
    const delGoalRes = await deleteGoalHttp(delGoalReq, { params: Promise.resolve({ id: clientAId }) });
    const delGoalJson = await delGoalRes.json();
    assert(
      delGoalRes.status === 200 && delGoalJson.success,
      "5.6 HTTP DELETE /api/clients/[id]/goals deletes goal"
    );

    const delGoalAudit = await prisma.auditLog.findFirst({
      where: { action: "DELETE_GOAL", entityId: goal1.id }
    });
    assert(delGoalAudit !== null, "5.7 DELETE_GOAL AuditLog emitted");
    if (delGoalAudit) cleanupAuditLogIds.push(delGoalAudit.id);

    // =========================================================================
    // TEST 6: COACH NOTES & PRIVACY ISOLATION
    // =========================================================================
    console.log("\n--- TEST 6: Coach Notes & Privacy Isolation ---");

    const privateNote = await healthService.addClientNote(
      clientAId,
      coachAUser.id,
      NoteType.PRIVATE_COACH,
      "Confidential: Athlete tends to skip warmups when tired",
      coachAActor
    );
    cleanupNoteIds.push(privateNote.id);

    const publicNote = await healthService.addClientNote(
      clientAId,
      coachAUser.id,
      NoteType.PUBLIC_CLIENT,
      "Shared: Increase electrolyte intake on workout days",
      coachAActor
    );
    cleanupNoteIds.push(publicNote.id);

    assert(
      privateNote.noteType === NoteType.PRIVATE_COACH && publicNote.noteType === NoteType.PUBLIC_CLIENT,
      "6.1 Both private and public client notes created"
    );

    const noteAudit = await prisma.auditLog.findFirst({
      where: { action: "ADD_CLIENT_NOTE", entityId: privateNote.id }
    });
    assert(noteAudit !== null, "6.2 ADD_CLIENT_NOTE AuditLog emitted");
    if (noteAudit) cleanupAuditLogIds.push(noteAudit.id);

    // Coach A accesses notes -> sees BOTH notes
    const coachNotesRes = await healthService.getClientNotes(clientAId, coachAActor);
    assert(
      coachNotesRes.length === 2,
      "6.3 Coach actor sees all notes (including PRIVATE_COACH)"
    );

    // Athlete (Client A) accesses notes -> sees ONLY PUBLIC_CLIENT note
    const clientNotesRes = await healthService.getClientNotes(clientAId, clientAActor);
    assert(
      clientNotesRes.length === 1 && clientNotesRes[0].noteType === NoteType.PUBLIC_CLIENT,
      "6.4 Athlete actor sees ONLY public notes (PRIVATE_COACH strictly hidden)"
    );

    // Athlete fetching 360 profile via getClientById -> notes filtered
    const client360 = await clientService.getClientById(clientAId, clientAActor);
    assert(
      client360.notes.length === 1 && client360.notes[0].noteType === NoteType.PUBLIC_CLIENT,
      "6.5 getClientById 360 profile filters out private coach notes for CLIENT role"
    );

    // Athlete forbidden from deleting notes
    let athleteDelNoteErr: any = null;
    try {
      await healthService.deleteClientNote(privateNote.id, clientAActor);
    } catch (e: any) {
      athleteDelNoteErr = e;
    }
    assert(
      athleteDelNoteErr instanceof HealthServiceError && athleteDelNoteErr.statusCode === 403,
      "6.6 Athlete forbidden from deleting notes (403 Forbidden)"
    );

    // Coach deleting notes -> succeeds
    const delNoteResult = await healthService.deleteClientNote(privateNote.id, coachAActor, clientAId);
    assert(delNoteResult.success === true, "6.7 Coach successfully deletes note");

    const delNoteAudit = await prisma.auditLog.findFirst({
      where: { action: "DELETE_CLIENT_NOTE", entityId: privateNote.id }
    });
    assert(delNoteAudit !== null, "6.8 DELETE_CLIENT_NOTE AuditLog emitted");
    if (delNoteAudit) cleanupAuditLogIds.push(delNoteAudit.id);

    // =========================================================================
    // TEST 7: RBAC & CROSS-ATHLETE ACCESS CONTROLS
    // =========================================================================
    console.log("\n--- TEST 7: RBAC & Cross-Athlete Access Controls ---");

    // 7.1 Cross-Athlete Coach Access: Coach B (not assigned to Client A) blocked by requireClientAccess
    const coachBReq = createMockRequest(`/api/clients/${clientAId}`, "GET", coachBSession.sessionToken);
    const coachBRes = await getClientById(coachBReq, { params: Promise.resolve({ id: clientAId }) });
    assert(
      coachBRes.status === 403,
      "7.1 Unassigned Coach B blocked with 403 Forbidden from accessing Client A's profile"
    );

    // 7.2 Cross-Athlete Client Access: Client A blocked from accessing Client B's profile
    const clientCrossReq = createMockRequest(`/api/clients/${clientBId}`, "GET", clientASession.sessionToken);
    const clientCrossRes = await getClientById(clientCrossReq, { params: Promise.resolve({ id: clientBId }) });
    assert(
      clientCrossRes.status === 403,
      "7.2 Client A blocked with 403 Forbidden from accessing Client B's profile"
    );

    // 7.3 Athlete forbidden from creating medical restrictions
    const clientMedReq = createMockRequest(
      `/api/clients/${clientAId}/medical`,
      "POST",
      clientASession.sessionToken,
      { conditionName: "Fake Injury", bodyPart: "SHOULDER" }
    );
    const clientMedRes = await postMedical(clientMedReq, { params: Promise.resolve({ id: clientAId }) });
    assert(
      clientMedRes.status === 403,
      "7.3 Athlete blocked with 403 Forbidden from creating medical restrictions"
    );

    // 7.4 Athlete forbidden from creating coach notes
    const clientNoteReq = createMockRequest(
      `/api/clients/${clientAId}/notes`,
      "POST",
      clientASession.sessionToken,
      { content: "Self note", noteType: "PUBLIC_CLIENT" }
    );
    const clientNoteRes = await postNote(clientNoteReq, { params: Promise.resolve({ id: clientAId }) });
    assert(
      clientNoteRes.status === 403,
      "7.4 Athlete blocked with 403 Forbidden from creating coach notes"
    );

    // 7.5 Cross-Client ID Spoofing: Attempting to delete Client B's note via Client A endpoint
    const clientBNote = await healthService.addClientNote(
      clientBId,
      coachAUser.id,
      NoteType.PUBLIC_CLIENT,
      "Client B note",
      coachAActor
    );
    cleanupNoteIds.push(clientBNote.id);

    let spoofNoteErr: any = null;
    try {
      await healthService.deleteClientNote(clientBNote.id, coachAActor, clientAId);
    } catch (e: any) {
      spoofNoteErr = e;
    }
    assert(
      spoofNoteErr instanceof HealthServiceError && spoofNoteErr.statusCode === 403,
      "7.5 Cross-client ID spoofing blocked with 403 Forbidden"
    );
  } catch (err: any) {
    console.error("\n❌ Unhandled exception during Phase 7 test execution:", err);
  } finally {
    console.log("\n================================================================================");
    console.log("[TEARDOWN] Cleaning up all test entities in FK-safe leaf-to-root order...");
    console.log("================================================================================");

    // 1. Delete audit logs
    if (cleanupAuditLogIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { id: { in: cleanupAuditLogIds } } });
      console.log(`  Cleaned ${cleanupAuditLogIds.length} audit logs`);
    }

    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: cleanupUserIds } },
          {
            entityId: {
              in: [
                ...cleanupMeasurementIds,
                ...cleanupPhotoIds,
                ...cleanupRestrictionIds,
                ...cleanupGoalIds,
                ...cleanupNoteIds,
                ...cleanupScheduleIds
              ]
            }
          }
        ]
      }
    });

    // 2. Delete measurements, photos, restrictions, goals, notes, check-in schedules
    if (cleanupMeasurementIds.length > 0) {
      await prisma.clientMeasurementHistory.deleteMany({
        where: { id: { in: cleanupMeasurementIds } }
      });
      console.log(`  Cleaned ${cleanupMeasurementIds.length} measurements`);
    }
    await prisma.clientMeasurementHistory.deleteMany({
      where: {
        OR: [
          { clientId: { in: cleanupClientProfileIds } },
          { recordedByCoachId: { in: cleanupCoachProfileIds } }
        ]
      }
    });

    if (cleanupPhotoIds.length > 0) {
      await prisma.clientProgressPhoto.deleteMany({
        where: { id: { in: cleanupPhotoIds } }
      });
      console.log(`  Cleaned ${cleanupPhotoIds.length} progress photos`);
    }
    await prisma.clientProgressPhoto.deleteMany({
      where: { clientId: { in: cleanupClientProfileIds } }
    });

    if (cleanupRestrictionIds.length > 0) {
      await prisma.clientMedicalRestriction.deleteMany({
        where: { id: { in: cleanupRestrictionIds } }
      });
      console.log(`  Cleaned ${cleanupRestrictionIds.length} medical restrictions`);
    }
    await prisma.clientMedicalRestriction.deleteMany({
      where: { clientId: { in: cleanupClientProfileIds } }
    });

    if (cleanupGoalIds.length > 0) {
      await prisma.clientGoal.deleteMany({
        where: { id: { in: cleanupGoalIds } }
      });
      console.log(`  Cleaned ${cleanupGoalIds.length} client goals`);
    }
    await prisma.clientGoal.deleteMany({
      where: { clientId: { in: cleanupClientProfileIds } }
    });

    if (cleanupNoteIds.length > 0) {
      await prisma.clientNote.deleteMany({
        where: { id: { in: cleanupNoteIds } }
      });
      console.log(`  Cleaned ${cleanupNoteIds.length} client notes`);
    }
    await prisma.clientNote.deleteMany({
      where: {
        OR: [
          { clientId: { in: cleanupClientProfileIds } },
          { authorId: { in: cleanupUserIds } }
        ]
      }
    });

    if (cleanupScheduleIds.length > 0) {
      await prisma.athleteCheckInSchedule.deleteMany({
        where: { id: { in: cleanupScheduleIds } }
      });
      console.log(`  Cleaned ${cleanupScheduleIds.length} check-in schedules`);
    }
    await prisma.athleteCheckInSchedule.deleteMany({
      where: {
        OR: [
          { clientId: { in: cleanupClientProfileIds } },
          { configuredByCoachId: { in: cleanupCoachProfileIds } }
        ]
      }
    });

    // 3. Delete coach assignments
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

    // 4. Delete client profiles, coach profiles, users, sessions
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

    // Final reconciliation check against baseline
    console.log("\n[RECONCILIATION] Verifying post-test live database state against baseline...");
    const postClients = await prisma.clientProfile.count();
    const postCoaches = await prisma.coachProfile.count();
    const postMeasurements = await prisma.clientMeasurementHistory.count();
    const postSchedules = await prisma.athleteCheckInSchedule.count();
    const postPhotos = await prisma.clientProgressPhoto.count();
    const postRestrictions = await prisma.clientMedicalRestriction.count();
    const postGoals = await prisma.clientGoal.count();
    const postNotes = await prisma.clientNote.count();
    const postCoachAssignments = await prisma.clientCoachAssignment.count();
    const postUsers = await prisma.user.count();
    const postAudits = await prisma.auditLog.count();

    console.log(`  Reconciliation Counts:`);
    console.log(`    client_profiles:          ${postClients} (base: ${baseClients})`);
    console.log(`    coach_profiles:           ${postCoaches} (base: ${baseCoaches})`);
    console.log(`    measurements:             ${postMeasurements} (base: ${baseMeasurements})`);
    console.log(`    check_in_schedules:       ${postSchedules} (base: ${baseSchedules})`);
    console.log(`    progress_photos:          ${postPhotos} (base: ${basePhotos})`);
    console.log(`    medical_restrictions:     ${postRestrictions} (base: ${baseRestrictions})`);
    console.log(`    goals:                    ${postGoals} (base: ${baseGoals})`);
    console.log(`    notes:                    ${postNotes} (base: ${baseNotes})`);
    console.log(`    coach_assignments:        ${postCoachAssignments} (base: ${baseCoachAssignments})`);
    console.log(`    users:                    ${postUsers} (base: ${baseUsers})`);
    console.log(`    audit_logs:               ${postAudits} (base: ${baseAudits})`);

    const matchesBaseline =
      postClients === baseClients &&
      postCoaches === baseCoaches &&
      postMeasurements === baseMeasurements &&
      postSchedules === baseSchedules &&
      postPhotos === basePhotos &&
      postRestrictions === baseRestrictions &&
      postGoals === baseGoals &&
      postNotes === baseNotes &&
      postCoachAssignments === baseCoachAssignments &&
      postUsers === baseUsers &&
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

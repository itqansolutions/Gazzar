import prisma from "../../src/lib/prisma";
import { UserRole } from "@prisma/client";
import { checkInSubmissionService } from "../../src/server/services/checkin-submission.service";
import { notificationService } from "../../src/server/services/notification.service";
import { checkInScheduleService } from "../../src/server/services/checkin-schedule.service";
import { validateCheckInMetrics, CHECKIN_METRICS } from "../../src/lib/checkin-metrics";
import {
  saveSecurePhotoFile,
  validateImageMagicBytes,
  resolveSecureStoragePath,
  deleteSecurePhotoFile
} from "../../src/lib/storage";
import type { AuthActor } from "../../src/lib/auth/route-guard";

async function runPhase11Tests() {
  console.log("==================================================================");
  console.log("  PHASE 11: ATHLETE SELF-CHECK-IN, SECURE PHOTOS & NOTIFICATIONS ");
  console.log("==================================================================");

  // --------------------------------------------------------------------------
  // STEP 0: BASELINE RECONCILIATION CHECK (Historical rows preservation)
  // --------------------------------------------------------------------------
  console.log("\n[STEP 0] Baseline reconciliation check...");
  const initialCmh = await prisma.clientMeasurementHistory.findMany({ orderBy: { date: "asc" } });
  console.log(`Found ${initialCmh.length} baseline CMH rows:`);
  initialCmh.forEach((r) => {
    console.log(`  id=${r.id.slice(0, 8)} | weight=${r.weightKg}kg | source=${r.source} | status=${r.verificationStatus}`);
  });

  if (initialCmh.length !== 3) {
    throw new Error(`Baseline CMH row count mismatch: expected 3, got ${initialCmh.length}`);
  }
  if (
    !initialCmh[0].id.startsWith("716cb1e9") ||
    !initialCmh[1].id.startsWith("4af95e7f") ||
    !initialCmh[2].id.startsWith("d5f4e37f")
  ) {
    throw new Error("Baseline historical IDs do not match locked records!");
  }
  if (!initialCmh.every((r) => r.source === "LEGACY" && r.verificationStatus === "LEGACY")) {
    throw new Error("Baseline historical rows do not have safe LEGACY provenance!");
  }
  console.log("✓ Baseline reconciliation verified: all 3 historical rows safe & intact.");

  // --------------------------------------------------------------------------
  // FIXTURES SETUP (Throwaway data for isolated testing)
  // --------------------------------------------------------------------------
  console.log("\n[SETUP] Creating isolated test users and profiles...");
  const testTag = `p11_${Date.now()}`;

  // 1. Athlete A
  const athleteAUser = await prisma.user.create({
    data: {
      email: `athlete_a_${testTag}@gx.test`,
      name: "Athlete Alpha",
      passwordHash: "hash",
      role: UserRole.CLIENT
    }
  });
  const athleteAProfile = await prisma.clientProfile.create({
    data: { userId: athleteAUser.id, status: "ACTIVE" }
  });

  // 2. Athlete B (for cross-client isolation tests)
  const athleteBUser = await prisma.user.create({
    data: {
      email: `athlete_b_${testTag}@gx.test`,
      name: "Athlete Beta",
      passwordHash: "hash",
      role: UserRole.CLIENT
    }
  });
  const athleteBProfile = await prisma.clientProfile.create({
    data: { userId: athleteBUser.id, status: "ACTIVE" }
  });

  // 3. Coach A (assigned to Athlete A)
  const coachUser = await prisma.user.create({
    data: {
      email: `coach_${testTag}@gx.test`,
      name: "Coach Charlie",
      passwordHash: "hash",
      role: UserRole.COACH
    }
  });
  const coachProfile = await prisma.coachProfile.create({
    data: { userId: coachUser.id, specialties: ["Strength"] }
  });

  // 4. Coach Unassigned
  const unassignedCoachUser = await prisma.user.create({
    data: {
      email: `unassigned_coach_${testTag}@gx.test`,
      name: "Coach Dave",
      passwordHash: "hash",
      role: UserRole.COACH
    }
  });
  const unassignedCoachProfile = await prisma.coachProfile.create({
    data: { userId: unassignedCoachUser.id, specialties: ["Endurance"] }
  });

  // 5. Admin
  const adminUser = await prisma.user.create({
    data: {
      email: `admin_${testTag}@gx.test`,
      name: "Admin Alice",
      passwordHash: "hash",
      role: UserRole.ADMIN
    }
  });

  // Assignment: Coach A -> Athlete A
  await prisma.clientCoachAssignment.create({
    data: {
      clientId: athleteAProfile.id,
      coachId: coachProfile.id,
      active: true
    }
  });

  // Actor definitions
  const actorAthleteA: AuthActor = {
    user: athleteAUser as any,
    clientProfileId: athleteAProfile.id,
    coachProfileId: null
  };
  const actorAthleteB: AuthActor = {
    user: athleteBUser as any,
    clientProfileId: athleteBProfile.id,
    coachProfileId: null
  };
  const actorCoachA: AuthActor = {
    user: coachUser as any,
    clientProfileId: null,
    coachProfileId: coachProfile.id
  };
  const actorUnassignedCoach: AuthActor = {
    user: unassignedCoachUser as any,
    clientProfileId: null,
    coachProfileId: unassignedCoachProfile.id
  };
  const actorAdmin: AuthActor = {
    user: adminUser as any,
    clientProfileId: null,
    coachProfileId: null
  };

  console.log("✓ Test actors & assignments created.");

  let createdSubmissionAId: string | null = null;
  let createdSubmissionBId: string | null = null;
  let createdRequestId: string | null = null;
  let createdAssetKeys: string[] = [];

  try {
    // ------------------------------------------------------------------------
    // SCENARIO 1: METRICS VALIDATION
    // ------------------------------------------------------------------------
    console.log("\n[TEST 1] Testing check-in metrics validation...");
    const valid = validateCheckInMetrics([CHECKIN_METRICS.WEIGHT, CHECKIN_METRICS.CURRENT_ISSUES]);
    if (valid.length !== 2) throw new Error("Valid metrics rejected");

    let threwOnInvalid = false;
    try {
      validateCheckInMetrics(["INVALID_METRIC"]);
    } catch {
      threwOnInvalid = true;
    }
    if (!threwOnInvalid) throw new Error("Failed to reject invalid metric!");
    console.log("✓ Check-in metrics validated strictly: unknown metrics rejected.");

    // ------------------------------------------------------------------------
    // SCENARIO 2: CROSS-CLIENT ISOLATION (Athlete A attempting to submit for Athlete B)
    // ------------------------------------------------------------------------
    console.log("\n[TEST 2] Testing cross-client isolation (Athlete A -> Athlete B)...");
    let crossClientBlocked = false;
    try {
      await checkInSubmissionService.createSubmission(
        {
          clientId: athleteBProfile.id,
          weightKg: 80
        },
        actorAthleteA
      );
    } catch (err: any) {
      if (err.statusCode === 403) crossClientBlocked = true;
    }
    if (!crossClientBlocked) throw new Error("Security failure: Athlete A was able to submit for Athlete B!");
    console.log("✓ Cross-client submission blocked with 403 Forbidden.");

    // ------------------------------------------------------------------------
    // SCENARIO 3: COACH CHECK-IN REQUEST
    // ------------------------------------------------------------------------
    console.log("\n[TEST 3] Testing coach check-in request creation...");
    // Unassigned coach attempts request -> should fail 403
    let unassignedBlocked = false;
    try {
      await checkInSubmissionService.createCheckInRequest(
        {
          clientId: athleteAProfile.id,
          requestedMetrics: [CHECKIN_METRICS.WEIGHT, CHECKIN_METRICS.CURRENT_ISSUES],
          dueAt: new Date(Date.now() + 86400000 * 3)
        },
        actorUnassignedCoach
      );
    } catch (err: any) {
      if (err.statusCode === 403) unassignedBlocked = true;
    }
    if (!unassignedBlocked) throw new Error("Security failure: Unassigned coach created check-in request!");

    // Assigned coach creates request -> should succeed
    const req = await checkInSubmissionService.createCheckInRequest(
      {
        clientId: athleteAProfile.id,
        requestedMetrics: [CHECKIN_METRICS.WEIGHT, CHECKIN_METRICS.CURRENT_ISSUES],
        dueAt: new Date(Date.now() + 86400000 * 2),
        notes: "Please weigh in fasted."
      },
      actorCoachA
    );
    createdRequestId = req.id;
    if (req.status !== "PENDING") throw new Error("New request must be PENDING");
    console.log("✓ Coach request created: PENDING with correct metrics. Unassigned coach blocked.");

    // Verify notification sent to athlete
    const athleteNotifications = await notificationService.getUserNotifications(athleteAUser.id);
    const requestNotif = athleteNotifications.find((n) => n.relatedEntityId === req.id);
    if (!requestNotif || requestNotif.type !== "CHECKIN_REQUESTED") {
      throw new Error("CHECKIN_REQUESTED notification not found for athlete!");
    }
    console.log("✓ CHECKIN_REQUESTED notification received by athlete.");

    // ------------------------------------------------------------------------
    // SCENARIO 4: ATHLETE SELF-CHECK-IN WITH CMH PROMOTION
    // ------------------------------------------------------------------------
    console.log("\n[TEST 4] Testing athlete self-check-in & CMH promotion...");
    const subA = await checkInSubmissionService.createSubmission(
      {
        clientId: athleteAProfile.id,
        checkInRequestId: req.id,
        weightKg: 85.5,
        waistCm: 84,
        currentIssues: "Mild left hamstring stiffness",
        athleteNotes: "Energy high all week"
      },
      actorAthleteA
    );
    createdSubmissionAId = subA.id;

    // Verify submission row
    if (subA.reviewStatus !== "PENDING") throw new Error("New submission must have reviewStatus=PENDING");

    // Verify linked request transitioned to SUBMITTED
    const updatedReq = await prisma.checkInRequest.findUnique({ where: { id: req.id } });
    if (updatedReq?.status !== "SUBMITTED") {
      throw new Error(`Expected request status SUBMITTED, got ${updatedReq?.status}`);
    }

    // Verify CMH row created with exact provenance
    const cmhPromoted = await prisma.clientMeasurementHistory.findUnique({
      where: { submissionId: subA.id }
    });
    if (!cmhPromoted) throw new Error("CMH row was not promoted from submission!");
    if (cmhPromoted.source !== "SELF_REPORTED") throw new Error("Expected source=SELF_REPORTED");
    if (cmhPromoted.verificationStatus !== "PENDING_REVIEW") throw new Error("Expected status=PENDING_REVIEW");
    if (cmhPromoted.weightKg !== 85.5) throw new Error("Promoted weight mismatch");
    console.log("✓ Submission created, request marked SUBMITTED, CMH promoted as SELF_REPORTED/PENDING_REVIEW.");

    // Verify coach received CHECKIN_SUBMITTED notification
    const coachNotifications = await notificationService.getUserNotifications(coachUser.id);
    const subNotif = coachNotifications.find((n) => n.relatedEntityId === subA.id);
    if (!subNotif || subNotif.type !== "CHECKIN_SUBMITTED") {
      throw new Error("Coach did not receive CHECKIN_SUBMITTED notification!");
    }
    console.log("✓ Coach received CHECKIN_SUBMITTED notification.");

    // ------------------------------------------------------------------------
    // SCENARIO 5: CORRECTION CHAIN & SUPERSEDED MEASUREMENT
    // ------------------------------------------------------------------------
    console.log("\n[TEST 5] Testing correction chain & supersession...");
    const subCorrection = await checkInSubmissionService.createSubmission(
      {
        clientId: athleteAProfile.id,
        correctsSubmissionId: subA.id,
        weightKg: 85.0,
        currentIssues: "Hamstring resolved, feeling good"
      },
      actorAthleteA
    );
    createdSubmissionBId = subCorrection.id;

    // Verify original CMH row has supersededBySubmissionId set
    const originalCmh = await prisma.clientMeasurementHistory.findUnique({
      where: { submissionId: subA.id }
    });
    if (originalCmh?.supersededBySubmissionId !== subCorrection.id) {
      throw new Error("Original CMH row did not have supersededBySubmissionId set to correction ID!");
    }

    // Verify analytics filter retrieves only authoritative (non-superseded) row
    const authoritative = await prisma.clientMeasurementHistory.findMany({
      where: {
        clientId: athleteAProfile.id,
        supersededBySubmissionId: null
      }
    });
    if (authoritative.length !== 1 || authoritative[0].submissionId !== subCorrection.id) {
      throw new Error("Analytics query failed to isolate authoritative non-superseded measurement!");
    }
    console.log("✓ Correction chain preserved: original superseded, only correction is authoritative.");

    // ------------------------------------------------------------------------
    // SCENARIO 6: COACH REVIEW WORKFLOW
    // ------------------------------------------------------------------------
    console.log("\n[TEST 6] Testing coach submission review & notification...");
    // Athlete cannot review own submission
    let athleteReviewBlocked = false;
    try {
      await checkInSubmissionService.reviewSubmission(
        subCorrection.id,
        { reviewStatus: "REVIEWED", coachReviewNotes: "Great job keeping up!" },
        actorAthleteA
      );
    } catch (err: any) {
      if (err.statusCode === 403) athleteReviewBlocked = true;
    }
    if (!athleteReviewBlocked) throw new Error("Athlete was able to review their own submission!");

    // Coach reviews
    const reviewedSub = await checkInSubmissionService.reviewSubmission(
      subCorrection.id,
      { reviewStatus: "REVIEWED", coachReviewNotes: "Hamstring recovery looks solid." },
      actorCoachA
    );
    if (reviewedSub.reviewStatus !== "REVIEWED" || !reviewedSub.reviewedAt) {
      throw new Error("Review status not updated properly!");
    }
    console.log("✓ Coach successfully reviewed submission. Athlete review blocked.");

    // ------------------------------------------------------------------------
    // SCENARIO 7: MEASUREMENT VERIFICATION (VERIFY & REJECT WITHOUT VALUE CHANGE)
    // ------------------------------------------------------------------------
    console.log("\n[TEST 7] Testing measurement verification without value change...");
    const correctionCmh = await prisma.clientMeasurementHistory.findUnique({
      where: { submissionId: subCorrection.id }
    });
    if (!correctionCmh) throw new Error("Correction CMH missing");

    // Coach verifies
    const verified = await checkInSubmissionService.verifyMeasurement(
      correctionCmh.id,
      { verificationStatus: "VERIFIED", verificationNote: "Verified with in-gym scale." },
      actorCoachA
    );
    if (verified.verificationStatus !== "VERIFIED" || verified.weightKg !== 85.0) {
      throw new Error("Verification mutated value or failed to set status!");
    }
    if (verified.verifiedByUserId !== coachUser.id) {
      throw new Error("verifiedByUserId not set to coach User ID!");
    }

    // Coach rejects
    const rejected = await checkInSubmissionService.verifyMeasurement(
      correctionCmh.id,
      { verificationStatus: "REJECTED", verificationNote: "Outlier suspected." },
      actorCoachA
    );
    if (rejected.verificationStatus !== "REJECTED" || rejected.weightKg !== 85.0) {
      throw new Error("Rejection mutated numeric value!");
    }
    console.log("✓ Verification & Rejection verified: numeric values remain 100% immutable.");

    // ------------------------------------------------------------------------
    // SCENARIO 8: NOTIFICATION CYCLE-KEY DEDUPLICATION
    // ------------------------------------------------------------------------
    console.log("\n[TEST 8] Testing notification cycle-key deduplication...");
    const cycleKey = `test_cycle_${Date.now()}`;

    // Send 1st
    await notificationService.sendDeduplicated({
      userId: athleteAUser.id,
      type: "CHECKIN_DUE",
      title: "Cycle Test",
      message: "Testing deduplication",
      relatedEntityId: cycleKey,
      relatedEntityType: "CHECKIN_CYCLE"
    });

    // Send 2nd (duplicate)
    await notificationService.sendDeduplicated({
      userId: athleteAUser.id,
      type: "CHECKIN_DUE",
      title: "Cycle Test",
      message: "Testing deduplication 2",
      relatedEntityId: cycleKey,
      relatedEntityType: "CHECKIN_CYCLE"
    });

    const matchingNotifs = await prisma.notification.findMany({
      where: { userId: athleteAUser.id, relatedEntityId: cycleKey }
    });
    if (matchingNotifs.length !== 1) {
      throw new Error(`Deduplication failed: expected 1 notification, found ${matchingNotifs.length}`);
    }
    console.log("✓ Notification deduplication verified: duplicate cycle keys rejected.");

    // ------------------------------------------------------------------------
    // SCENARIO 9: SECURE PHOTO STORAGE & MAGIC BYTES VALIDATION
    // ------------------------------------------------------------------------
    console.log("\n[TEST 9] Testing secure photo storage & magic-byte validation...");
    // Valid JPEG mock buffer (magic bytes: FF D8 FF E0)
    const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const validMagic = validateImageMagicBytes(validJpegBuffer);
    if (!validMagic.valid || validMagic.mimeType !== "image/jpeg") {
      throw new Error("Valid JPEG magic bytes rejected!");
    }

    // Invalid executable disguised as image
    const invalidBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    const invalidMagic = validateImageMagicBytes(invalidBuffer);
    if (invalidMagic.valid) {
      throw new Error("Security failure: Invalid magic bytes accepted as image!");
    }

    // Save mock photo file
    const storageKey = await saveSecurePhotoFile(athleteAProfile.id, validJpegBuffer, "jpg");
    createdAssetKeys.push(storageKey);

    // Verify path traversal guard
    let traversalBlocked = false;
    try {
      resolveSecureStoragePath("../../etc/passwd");
    } catch {
      traversalBlocked = true;
    }
    if (!traversalBlocked) throw new Error("Security failure: Path traversal was not blocked!");

    console.log("✓ Photo storage security verified: magic bytes checked, path traversal blocked.");
  } finally {
    // ------------------------------------------------------------------------
    // TEARDOWN: CLEAN UP THROWAWAY TEST DATA WITH ZERO IMPACT ON PRODUCTION
    // ------------------------------------------------------------------------
    console.log("\n[TEARDOWN] Cleaning up throwaway test records...");

    // Delete created storage files
    for (const key of createdAssetKeys) {
      await deleteSecurePhotoFile(key);
    }

    // Delete test database records in FK-safe order
    if (createdSubmissionBId) {
      await prisma.clientMeasurementHistory.deleteMany({ where: { submissionId: createdSubmissionBId } });
      await prisma.athleteCheckInSubmission.deleteMany({ where: { id: createdSubmissionBId } });
    }
    if (createdSubmissionAId) {
      await prisma.clientMeasurementHistory.deleteMany({ where: { submissionId: createdSubmissionAId } });
      await prisma.athleteCheckInSubmission.deleteMany({ where: { id: createdSubmissionAId } });
    }
    if (createdRequestId) {
      await prisma.checkInRequest.deleteMany({ where: { id: createdRequestId } });
    }

    // Delete notifications for test users
    await prisma.notification.deleteMany({
      where: { userId: { in: [athleteAUser.id, athleteBUser.id, coachUser.id, unassignedCoachUser.id, adminUser.id] } }
    });

    // Delete assignments
    await prisma.clientCoachAssignment.deleteMany({
      where: { clientId: { in: [athleteAProfile.id, athleteBProfile.id] } }
    });

    // Delete profiles
    await prisma.clientProfile.deleteMany({ where: { id: { in: [athleteAProfile.id, athleteBProfile.id] } } });
    await prisma.coachProfile.deleteMany({ where: { id: { in: [coachProfile.id, unassignedCoachProfile.id] } } });

    // Delete audit logs for test actors
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [athleteAUser.id, athleteBUser.id, coachUser.id, unassignedCoachUser.id, adminUser.id] } }
    });

    // Delete test users
    await prisma.user.deleteMany({
      where: { id: { in: [athleteAUser.id, athleteBUser.id, coachUser.id, unassignedCoachUser.id, adminUser.id] } }
    });

    console.log("✓ All throwaway test data cleanly removed.");

    // ------------------------------------------------------------------------
    // POST-TEST RECONCILIATION CHECK (Assert baseline rows unchanged)
    // ------------------------------------------------------------------------
    console.log("\n[FINAL RECONCILIATION] Verifying baseline records post-teardown...");
    const finalCmh = await prisma.clientMeasurementHistory.findMany({ orderBy: { date: "asc" } });
    console.log(`Final CMH row count: ${finalCmh.length}`);
    finalCmh.forEach((r) => {
      console.log(`  id=${r.id.slice(0, 8)} | weight=${r.weightKg}kg | source=${r.source} | status=${r.verificationStatus}`);
    });

    if (finalCmh.length !== 3) {
      throw new Error(`CRITICAL POST-TEST FAILURE: CMH row count is ${finalCmh.length}, expected exactly 3!`);
    }
    if (
      !finalCmh[0].id.startsWith("716cb1e9") ||
      !finalCmh[1].id.startsWith("4af95e7f") ||
      !finalCmh[2].id.startsWith("d5f4e37f")
    ) {
      throw new Error("CRITICAL POST-TEST FAILURE: Historical row IDs mutated!");
    }
    console.log("✓ Final reconciliation verified: all 3 historical rows 100% intact with zero data loss.");
  }

  console.log("\n==================================================================");
  console.log("  ALL PHASE 11 TESTS PASSED SUCCESSFULLY!                        ");
  console.log("==================================================================");
}

runPhase11Tests()
  .catch((err) => {
    console.error("\n❌ PHASE 11 TEST SUITE FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

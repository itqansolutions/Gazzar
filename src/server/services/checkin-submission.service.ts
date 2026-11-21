import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { AuthActor, requireClientAccess } from "@/lib/auth/route-guard";
import { auditService } from "./audit.service";
import { notificationService } from "./notification.service";
import { checkInScheduleService } from "./checkin-schedule.service";
import { validateCheckInMetrics, CheckInMetric } from "@/lib/checkin-metrics";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

export class CheckInSubmissionServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "CheckInSubmissionServiceError";
    this.statusCode = statusCode;
  }
}

export interface CreateCheckInSubmissionInput {
  clientId: string;
  checkInRequestId?: string | null;
  correctsSubmissionId?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bodyFatPercentage?: number | null;
  muscleMassKg?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  armsCm?: number | null;
  thighCm?: number | null;
  currentIssues?: string | null;
  athleteNotes?: string | null;
  photoIds?: string[];
}

export interface CreateCheckInRequestInput {
  clientId: string;
  requestedMetrics: string[];
  dueAt: Date | string;
  notes?: string | null;
}

export class CheckInSubmissionService {
  /**
   * Athlete submits a self-check-in.
   * Enforces CLIENT role (own profile only).
   */
  async createSubmission(input: CreateCheckInSubmissionInput, actor: AuthActor) {
    // 1. Role and ownership check
    if (actor.user.role !== UserRole.CLIENT) {
      throw new CheckInSubmissionServiceError("Only athletes can submit self check-ins", 403);
    }

    const access = await requireClientAccess(actor, input.clientId);
    if (!access.ok) {
      throw new CheckInSubmissionServiceError("Forbidden: You can only submit for your own profile", 403);
    }
    const resolvedClientId = access.client.id;

    const submittedAt = new Date();

    // Check check-in request if specified
    if (input.checkInRequestId) {
      const request = await prisma.checkInRequest.findUnique({
        where: { id: input.checkInRequestId }
      });
      if (!request || request.clientId !== resolvedClientId) {
        throw new CheckInSubmissionServiceError("Check-in request not found or does not belong to you", 404);
      }
    }

    // Execute atomic submission creation + CMH promotion + schedule advance
    const result = await prisma.$transaction(async (tx) => {
      // 0. If correcting a previous submission, lock it and verify it is the latest un-corrected leaf
      let originalSubmission: any = null;
      if (input.correctsSubmissionId) {
        const targetSubs = await tx.$queryRaw<any[]>`
          SELECT id, "clientId", "reviewStatus" 
          FROM "athlete_check_in_submissions" 
          WHERE id = ${input.correctsSubmissionId} 
          FOR UPDATE;
        `;
        const targetSub = targetSubs[0];
        if (!targetSub || targetSub.clientId !== resolvedClientId) {
          throw new CheckInSubmissionServiceError("Original submission not found or does not belong to you", 404);
        }

        const existingCorrection = await tx.athleteCheckInSubmission.findFirst({
          where: { correctsSubmissionId: input.correctsSubmissionId },
          select: { id: true }
        });
        if (existingCorrection) {
          throw new CheckInSubmissionServiceError(
            `Cannot correct submission ${input.correctsSubmissionId}: It has already been corrected by submission ${existingCorrection.id}. You must correct the latest submission in the chain.`,
            400
          );
        }

        originalSubmission = await tx.athleteCheckInSubmission.findUnique({
          where: { id: input.correctsSubmissionId },
          include: { generatedMeasurement: true }
        });
      }

      // 1. Create AthleteCheckInSubmission row
      const submission = await tx.athleteCheckInSubmission.create({
        data: {
          clientId: resolvedClientId,
          checkInRequestId: input.checkInRequestId ?? null,
          correctsSubmissionId: input.correctsSubmissionId ?? null,
          submittedAt,
          weightKg: input.weightKg !== undefined ? input.weightKg : null,
          heightCm: input.heightCm !== undefined ? input.heightCm : null,
          bodyFatPercentage: input.bodyFatPercentage !== undefined ? input.bodyFatPercentage : null,
          muscleMassKg: input.muscleMassKg !== undefined ? input.muscleMassKg : null,
          waistCm: input.waistCm !== undefined ? input.waistCm : null,
          chestCm: input.chestCm !== undefined ? input.chestCm : null,
          armsCm: input.armsCm !== undefined ? input.armsCm : null,
          thighCm: input.thighCm !== undefined ? input.thighCm : null,
          currentIssues: input.currentIssues ?? null,
          athleteNotes: input.athleteNotes ?? null,
          reviewStatus: "PENDING"
        }
      });

      // 2. Link any uploaded photos to this submission
      if (input.photoIds && input.photoIds.length > 0) {
        await tx.clientProgressPhoto.updateMany({
          where: {
            id: { in: input.photoIds },
            clientId: resolvedClientId
          },
          data: { submissionId: submission.id }
        });
      }

      // 3. Promote measurement to ClientMeasurementHistory if weightKg or circumferences exist
      const hasMeasurements = [
        input.waistCm,
        input.chestCm,
        input.armsCm,
        input.thighCm,
        input.bodyFatPercentage,
        input.muscleMassKg
      ].some((v) => v !== null && v !== undefined);

      let createdCmh: any = null;
      if (
        (input.weightKg !== null && input.weightKg !== undefined) ||
        hasMeasurements
      ) {
        // Idempotency: verify no CMH row already has this submissionId
        const existingCmh = await tx.clientMeasurementHistory.findUnique({
          where: { submissionId: submission.id }
        });

        if (!existingCmh) {
          createdCmh = await tx.clientMeasurementHistory.create({
            data: {
              clientId: resolvedClientId,
              submissionId: submission.id,
              date: submittedAt,
              weightKg: input.weightKg !== null && input.weightKg !== undefined ? input.weightKg : 0,
              heightCm: input.heightCm ?? null,
              bodyFatPercentage: input.bodyFatPercentage ?? null,
              muscleMassKg: input.muscleMassKg ?? null,
              waistCm: input.waistCm ?? null,
              chestCm: input.chestCm ?? null,
              armsCm: input.armsCm ?? null,
              thighCm: input.thighCm ?? null,
              notes: input.athleteNotes ? `Check-in: ${input.athleteNotes}` : "Self-reported check-in",
              source: "SELF_REPORTED",
              verificationStatus: "PENDING_REVIEW"
            }
          });

          // If this is a correction and the original had a CMH row, mark original as superseded
          if (originalSubmission?.generatedMeasurement) {
            await tx.clientMeasurementHistory.update({
              where: { id: originalSubmission.generatedMeasurement.id },
              data: { supersededBySubmissionId: submission.id }
            });
          }
        }
      }

      // 4. Update linked CheckInRequest status to SUBMITTED
      if (input.checkInRequestId) {
        await tx.checkInRequest.update({
          where: { id: input.checkInRequestId },
          data: { status: "SUBMITTED" }
        });
      }

      // 5. Advance schedule in one single batch operation
      await checkInScheduleService.recordSubmissionBatch(
        resolvedClientId,
        {
          weightKg: input.weightKg,
          hasMeasurements,
          hasPhotos: Boolean(input.photoIds && input.photoIds.length > 0),
          submittedAt
        },
        tx
      );

      return { submission, measurement: createdCmh };
    });

    // 6. Notify assigned coaches
    try {
      const assignments = await prisma.clientCoachAssignment.findMany({
        where: { clientId: resolvedClientId, active: true },
        include: { coach: { include: { user: true } } }
      });

      for (const assign of assignments) {
        if (assign.coach?.user?.id) {
          await notificationService.sendDeduplicated({
            userId: assign.coach.user.id,
            type: NOTIFICATION_TYPES.CHECKIN_SUBMITTED,
            title: "Athlete submitted a check-in",
            message: `${actor.user.name || "Athlete"} has submitted a new check-in for review.`,
            link: `/clients/${resolvedClientId}?tab=checkins`,
            relatedEntityId: result.submission.id,
            relatedEntityType: "AthleteCheckInSubmission"
          });
        }
      }
    } catch (err) {
      console.error("[CheckInSubmissionService] Failed to notify coaches:", err);
    }

    // 7. AuditLog
    await auditService.log({
      actor,
      action: "SUBMIT_ATHLETE_CHECKIN",
      entityType: "AthleteCheckInSubmission",
      entityId: result.submission.id,
      newValues: {
        clientId: resolvedClientId,
        weightKg: input.weightKg,
        hasIssues: Boolean(input.currentIssues),
        correctsSubmissionId: input.correctsSubmissionId,
        checkInRequestId: input.checkInRequestId
      }
    });

    return result.submission;
  }

  /**
   * Retrieves submissions for a client.
   * CLIENT: own profile only.
   * COACH: assigned only.
   * ADMIN / HEAD_COACH: all.
   */
  async getSubmissions(clientId: string, actor: AuthActor) {
    const access = await requireClientAccess(actor, clientId);
    if (!access.ok) {
      throw new CheckInSubmissionServiceError("Forbidden: Unauthorized to view these submissions", 403);
    }
    const resolvedClientId = access.client.id;

    return await prisma.athleteCheckInSubmission.findMany({
      where: { clientId: resolvedClientId },
      orderBy: { submittedAt: "desc" },
      include: {
        generatedMeasurement: true,
        progressPhotos: {
          include: { assets: true }
        },
        reviewedByUser: {
          select: { id: true, name: true, role: true }
        },
        checkInRequest: true,
        correctsSubmission: {
          select: { id: true, submittedAt: true }
        },
        corrections: {
          select: { id: true, submittedAt: true }
        }
      }
    });
  }

  /**
   * Coach or Admin reviews a submission.
   */
  async reviewSubmission(
    submissionId: string,
    input: { reviewStatus: "REVIEWED" | "FLAGGED"; coachReviewNotes?: string },
    actor: AuthActor
  ) {
    if (actor.user.role === UserRole.CLIENT) {
      throw new CheckInSubmissionServiceError("Athletes cannot review submissions", 403);
    }

    const submission = await prisma.athleteCheckInSubmission.findUnique({
      where: { id: submissionId },
      include: { client: true }
    });

    if (!submission) {
      throw new CheckInSubmissionServiceError("Submission not found", 404);
    }

    // Leaf check: cannot review an intermediate node if a child correction exists
    const childCorrection = await prisma.athleteCheckInSubmission.findFirst({
      where: { correctsSubmissionId: submissionId },
      select: { id: true }
    });
    if (childCorrection) {
      throw new CheckInSubmissionServiceError(
        `Cannot review submission ${submissionId}: It has already been superseded by correction ${childCorrection.id}. You must review the latest submission.`,
        400
      );
    }

    const access = await requireClientAccess(actor, submission.clientId);
    if (!access.ok) {
      throw new CheckInSubmissionServiceError("Forbidden: You are not assigned to this athlete", 403);
    }

    const reviewedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.athleteCheckInSubmission.update({
        where: { id: submissionId },
        data: {
          reviewStatus: input.reviewStatus,
          reviewedByUserId: actor.user.id,
          reviewedAt,
          coachReviewNotes: input.coachReviewNotes ?? null
        }
      });

      if (submission.checkInRequestId) {
        await tx.checkInRequest.update({
          where: { id: submission.checkInRequestId },
          data: {
            status: "REVIEWED",
            reviewedAt,
            reviewedByUserId: actor.user.id,
            reviewNotes: input.coachReviewNotes ?? null
          }
        });
      }

      return sub;
    });

    // Notify athlete
    try {
      if (submission.client.userId) {
        await notificationService.sendDeduplicated({
          userId: submission.client.userId,
          type: NOTIFICATION_TYPES.COACH_REVIEW_ADDED,
          title: "Coach reviewed your check-in",
          message: `Your coach has reviewed your check-in: ${input.reviewStatus}.`,
          link: `/clients/${submission.clientId}?tab=checkins`,
          relatedEntityId: submission.id,
          relatedEntityType: "AthleteCheckInSubmission"
        });
      }
    } catch (err) {
      console.error("[CheckInSubmissionService] Failed to notify athlete of review:", err);
    }

    await auditService.log({
      actor,
      action: "REVIEW_ATHLETE_CHECKIN",
      entityType: "AthleteCheckInSubmission",
      entityId: submissionId,
      newValues: {
        reviewStatus: input.reviewStatus,
        coachReviewNotes: input.coachReviewNotes
      }
    });

    return updated;
  }

  /**
   * Verify or Reject a measurement record without modifying its numeric values.
   */
  async verifyMeasurement(
    measurementId: string,
    input: { verificationStatus: "VERIFIED" | "REJECTED"; verificationNote?: string },
    actor: AuthActor
  ) {
    if (actor.user.role === UserRole.CLIENT) {
      throw new CheckInSubmissionServiceError("Athletes cannot verify measurements", 403);
    }

    const measurement = await prisma.clientMeasurementHistory.findUnique({
      where: { id: measurementId },
      include: { submission: true }
    });

    if (!measurement) {
      throw new CheckInSubmissionServiceError("Measurement record not found", 404);
    }

    const access = await requireClientAccess(actor, measurement.clientId);
    if (!access.ok) {
      throw new CheckInSubmissionServiceError("Forbidden: You are not assigned to this athlete", 403);
    }

    if (measurement.supersededBySubmissionId) {
      throw new CheckInSubmissionServiceError(
        `Cannot verify measurement ${measurementId}: It has been superseded by submission ${measurement.supersededBySubmissionId}. Please review the active measurement.`,
        400
      );
    }

    const verifiedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCmh = await tx.clientMeasurementHistory.update({
        where: { id: measurementId },
        data: {
          verificationStatus: input.verificationStatus,
          verifiedByUserId: actor.user.id,
          verifiedAt,
          verificationNote: input.verificationNote ?? null
        }
      });

      // Conditional Prior Reactivation Engine
      if (input.verificationStatus === "REJECTED" && measurement.submission?.correctsSubmissionId) {
        const parentCmh = await tx.clientMeasurementHistory.findUnique({
          where: { submissionId: measurement.submission.correctsSubmissionId }
        });
        if (parentCmh && parentCmh.verificationStatus === "VERIFIED") {
          await tx.clientMeasurementHistory.update({
            where: { id: parentCmh.id },
            data: { supersededBySubmissionId: null }
          });
        }
      }

      return updatedCmh;
    });

    await auditService.log({
      actor,
      action: "VERIFY_MEASUREMENT",
      entityType: "ClientMeasurementHistory",
      entityId: measurementId,
      oldValues: {
        verificationStatus: measurement.verificationStatus
      },
      newValues: {
        verificationStatus: input.verificationStatus,
        verificationNote: input.verificationNote,
        verifiedByUserId: actor.user.id
      }
    });

    return updated;
  }

  /**
   * Coach or Admin creates a manual Check-In Request.
   */
  async createCheckInRequest(input: CreateCheckInRequestInput, actor: AuthActor) {
    if (actor.user.role === UserRole.CLIENT) {
      throw new CheckInSubmissionServiceError("Athletes cannot create check-in requests", 403);
    }

    const access = await requireClientAccess(actor, input.clientId);
    if (!access.ok) {
      throw new CheckInSubmissionServiceError("Forbidden: You are not assigned to this athlete", 403);
    }
    const resolvedClientId = access.client.id;

    // Validate metrics server-side
    const validatedMetrics = validateCheckInMetrics(input.requestedMetrics);

    const dueAtDate = new Date(input.dueAt);
    if (isNaN(dueAtDate.getTime())) {
      throw new CheckInSubmissionServiceError("Invalid dueAt date", 400);
    }

    const request = await prisma.checkInRequest.create({
      data: {
        clientId: resolvedClientId,
        requestedByUserId: actor.user.id,
        requestedByCoachId: actor.coachProfileId ?? null,
        requestedMetrics: validatedMetrics,
        dueAt: dueAtDate,
        notes: input.notes ?? null,
        status: "PENDING"
      }
    });

    // Notify athlete
    try {
      const client = await prisma.clientProfile.findUnique({
        where: { id: resolvedClientId },
        select: { userId: true }
      });

      if (client?.userId) {
        await notificationService.sendDeduplicated({
          userId: client.userId,
          type: NOTIFICATION_TYPES.CHECKIN_REQUESTED,
          title: "Check-in requested by your coach",
          message: input.notes || "Your coach has requested a new check-in. Please submit your metrics.",
          link: `/clients/${resolvedClientId}?tab=checkins`,
          dedupKey: `REQUEST_CREATED:${request.id}`,
          relatedEntityId: request.id,
          relatedEntityType: "CheckInRequest"
        });
      }
    } catch (err) {
      console.error("[CheckInSubmissionService] Failed to notify athlete of request:", err);
    }

    await auditService.log({
      actor,
      action: "CREATE_CHECKIN_REQUEST",
      entityType: "CheckInRequest",
      entityId: request.id,
      newValues: {
        clientId: resolvedClientId,
        requestedMetrics: validatedMetrics,
        dueAt: dueAtDate.toISOString(),
        notes: input.notes
      }
    });

    return request;
  }

  /**
   * Retrieves check-in requests for an athlete.
   */
  async getCheckInRequests(clientId: string, actor: AuthActor) {
    const access = await requireClientAccess(actor, clientId);
    if (!access.ok) {
      throw new CheckInSubmissionServiceError("Forbidden: Unauthorized to view requests", 403);
    }
    const resolvedClientId = access.client.id;

    return await prisma.checkInRequest.findMany({
      where: { clientId: resolvedClientId },
      orderBy: { createdAt: "desc" },
      include: {
        requestedByUser: {
          select: { id: true, name: true, avatar: true, role: true }
        },
        requestedByCoach: {
          include: { user: { select: { id: true, name: true, avatar: true } } }
        },
        submissions: {
          select: { id: true, submittedAt: true, reviewStatus: true }
        }
      }
    });
  }

  /**
   * Coach or Admin cancels a check-in request.
   */
  async cancelCheckInRequest(requestId: string, reason: string | undefined, actor: AuthActor) {
    if (actor.user.role === UserRole.CLIENT) {
      throw new CheckInSubmissionServiceError("Athletes cannot cancel check-in requests", 403);
    }

    const request = await prisma.checkInRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new CheckInSubmissionServiceError("Check-in request not found", 404);
    }

    const access = await requireClientAccess(actor, request.clientId);
    if (!access.ok) {
      throw new CheckInSubmissionServiceError("Forbidden: You are not assigned to this athlete", 403);
    }

    const updated = await prisma.checkInRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledReason: reason ?? "Cancelled by coach"
      }
    });

    await auditService.log({
      actor,
      action: "CANCEL_CHECKIN_REQUEST",
      entityType: "CheckInRequest",
      entityId: requestId,
      newValues: {
        status: "CANCELLED",
        cancelledReason: reason
      }
    });

    return updated;
  }
}

export const checkInSubmissionService = new CheckInSubmissionService();

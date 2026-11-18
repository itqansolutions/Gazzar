import prisma from "@/lib/prisma";
import { BodyPart, RestrictionSeverity, GoalType, GoalStatus, NoteType, UserRole } from "@prisma/client";
import { checkInScheduleService } from "./checkin-schedule.service";
import { AuthActor } from "@/lib/auth/route-guard";
import { auditService } from "./audit.service";

export class HealthServiceError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = "HealthServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class HealthService {
  /**
   * Add a measurement record for an athlete and update current weight
   */
  async addMeasurement(
    clientId: string,
    data: {
      weightKg: number;
      heightCm?: number;
      bodyFatPercentage?: number;
      muscleMassKg?: number;
      waistCm?: number;
      chestCm?: number;
      armsCm?: number;
      thighCm?: number;
      notes?: string;
      date?: string | Date;
      recordedByCoachId?: string;
    },
    actor?: AuthActor
  ) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new HealthServiceError("Client not found", 404);

    const heightM = (data.heightCm || client.heightCm || 178) / 100;
    const bmi = Number((data.weightKg / (heightM * heightM)).toFixed(1));

    const resolvedClientId = client.id;
    const clientHeightCm = client.heightCm;

    const coachId = data.recordedByCoachId || actor?.coachProfileId || null;

    const measurement = await prisma.$transaction(async (tx) => {
      const created = await tx.clientMeasurementHistory.create({
        data: {
          clientId: resolvedClientId,
          date: data.date ? new Date(data.date) : new Date(),
          weightKg: Number(data.weightKg),
          heightCm: data.heightCm ? Number(data.heightCm) : clientHeightCm,
          bmi,
          bodyFatPercentage: data.bodyFatPercentage ? Number(data.bodyFatPercentage) : null,
          muscleMassKg: data.muscleMassKg ? Number(data.muscleMassKg) : null,
          waistCm: data.waistCm ? Number(data.waistCm) : null,
          chestCm: data.chestCm ? Number(data.chestCm) : null,
          armsCm: data.armsCm ? Number(data.armsCm) : null,
          thighCm: data.thighCm ? Number(data.thighCm) : null,
          notes: data.notes || null,
          recordedByCoachId: coachId
        }
      });

      // Update current weight and height on client profile
      await tx.clientProfile.update({
        where: { id: resolvedClientId },
        data: {
          weightKg: Number(data.weightKg),
          ...(data.heightCm && { heightCm: Number(data.heightCm) })
        }
      });

      return created;
    });

    try {
      await checkInScheduleService.recordSubmission(resolvedClientId, "WEIGHT", measurement.date);
      if (
        data.waistCm !== undefined ||
        data.chestCm !== undefined ||
        data.armsCm !== undefined ||
        data.thighCm !== undefined ||
        data.bodyFatPercentage !== undefined
      ) {
        await checkInScheduleService.recordSubmission(resolvedClientId, "MEASUREMENT", measurement.date);
      }
    } catch (schedErr) {
      console.error("[HealthService] Error updating check-in schedule for measurement:", schedErr);
    }

    if (actor) {
      await auditService.log({
        actor,
        action: "RECORD_MEASUREMENT",
        entityType: "ClientMeasurementHistory",
        entityId: measurement.id,
        newValues: {
          clientId: resolvedClientId,
          weightKg: measurement.weightKg,
          bodyFatPercentage: measurement.bodyFatPercentage,
          date: measurement.date
        }
      });
    }

    return measurement;
  }

  /**
   * Delete a measurement record
   */
  async deleteMeasurement(measurementId: string, actor?: AuthActor, clientId?: string) {
    const existing = await prisma.clientMeasurementHistory.findUnique({
      where: { id: measurementId }
    });
    if (!existing) throw new HealthServiceError("Measurement not found", 404);

    if (clientId && existing.clientId !== clientId) {
      throw new HealthServiceError("Measurement does not belong to this client", 403);
    }

    await prisma.clientMeasurementHistory.delete({
      where: { id: measurementId }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "DELETE_MEASUREMENT",
        entityType: "ClientMeasurementHistory",
        entityId: measurementId,
        oldValues: {
          clientId: existing.clientId,
          weightKg: existing.weightKg,
          date: existing.date
        }
      });
    }

    return { success: true, deletedId: measurementId };
  }

  /**
   * Add medical restriction/injury
   */
  async addMedicalRestriction(
    clientId: string,
    data: {
      conditionName: string;
      bodyPart: BodyPart;
      severity?: RestrictionSeverity;
      description?: string;
      restrictedMuscles?: string[];
      restrictedExercises?: string[];
      notes?: string;
    },
    actor?: AuthActor
  ) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new HealthServiceError("Client not found", 404);

    const restriction = await prisma.clientMedicalRestriction.create({
      data: {
        clientId: client.id,
        conditionName: data.conditionName.trim(),
        bodyPart: data.bodyPart,
        severity: data.severity || RestrictionSeverity.MEDIUM,
        description: data.description || null,
        restrictedMuscles: data.restrictedMuscles || [],
        restrictedExercises: data.restrictedExercises || [],
        notes: data.notes || null,
        isActive: true
      }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "ADD_MEDICAL_RESTRICTION",
        entityType: "ClientMedicalRestriction",
        entityId: restriction.id,
        newValues: {
          clientId: client.id,
          conditionName: restriction.conditionName,
          bodyPart: restriction.bodyPart,
          severity: restriction.severity
        }
      });
    }

    return restriction;
  }

  /**
   * Get medical restrictions for a client
   */
  async getMedicalRestrictions(clientId: string) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) return [];
    return await prisma.clientMedicalRestriction.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Delete a medical restriction
   */
  async deleteMedicalRestriction(restrictionId: string, actor?: AuthActor, clientId?: string) {
    const existing = await prisma.clientMedicalRestriction.findUnique({
      where: { id: restrictionId }
    });
    if (!existing) throw new HealthServiceError("Medical restriction not found", 404);

    if (clientId && existing.clientId !== clientId) {
      throw new HealthServiceError("Medical restriction does not belong to this client", 403);
    }

    await prisma.clientMedicalRestriction.delete({
      where: { id: restrictionId }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "DELETE_MEDICAL_RESTRICTION",
        entityType: "ClientMedicalRestriction",
        entityId: restrictionId,
        oldValues: {
          clientId: existing.clientId,
          conditionName: existing.conditionName
        }
      });
    }

    return { success: true, deletedId: restrictionId };
  }

  /**
   * Add client goal
   */
  async addGoal(
    clientId: string,
    data: {
      title: string;
      goalType: GoalType;
      startingValue: number;
      targetValue: number;
      currentValue: number;
      unit?: string;
      deadline?: string | Date;
    },
    actor?: AuthActor
  ) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new HealthServiceError("Client not found", 404);

    const goal = await prisma.clientGoal.create({
      data: {
        clientId: client.id,
        title: data.title.trim(),
        goalType: data.goalType,
        startingValue: Number(data.startingValue),
        targetValue: Number(data.targetValue),
        currentValue: Number(data.currentValue),
        unit: data.unit || "KG",
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: GoalStatus.IN_PROGRESS
      }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "ADD_GOAL",
        entityType: "ClientGoal",
        entityId: goal.id,
        newValues: {
          clientId: client.id,
          title: goal.title,
          goalType: goal.goalType,
          targetValue: goal.targetValue
        }
      });
    }

    return goal;
  }

  /**
   * Update client goal
   */
  async updateGoal(
    goalId: string,
    data: {
      currentValue?: number;
      targetValue?: number;
      status?: GoalStatus;
      title?: string;
    },
    actor?: AuthActor
  ) {
    const existing = await prisma.clientGoal.findUnique({
      where: { id: goalId }
    });
    if (!existing) throw new HealthServiceError("Goal not found", 404);

    const updated = await prisma.clientGoal.update({
      where: { id: goalId },
      data: {
        ...(data.currentValue !== undefined && { currentValue: Number(data.currentValue) }),
        ...(data.targetValue !== undefined && { targetValue: Number(data.targetValue) }),
        ...(data.status && { status: data.status }),
        ...(data.title && { title: data.title.trim() })
      }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "UPDATE_GOAL",
        entityType: "ClientGoal",
        entityId: goalId,
        oldValues: { status: existing.status, currentValue: existing.currentValue },
        newValues: { status: updated.status, currentValue: updated.currentValue }
      });
    }

    return updated;
  }

  /**
   * Get goals for a client
   */
  async getGoals(clientId: string) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) return [];
    return await prisma.clientGoal.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Delete client goal
   */
  async deleteGoal(goalId: string, actor?: AuthActor, clientId?: string) {
    const existing = await prisma.clientGoal.findUnique({
      where: { id: goalId }
    });
    if (!existing) throw new HealthServiceError("Goal not found", 404);

    if (clientId && existing.clientId !== clientId) {
      throw new HealthServiceError("Goal does not belong to this client", 403);
    }

    await prisma.clientGoal.delete({
      where: { id: goalId }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "DELETE_GOAL",
        entityType: "ClientGoal",
        entityId: goalId,
        oldValues: {
          clientId: existing.clientId,
          title: existing.title
        }
      });
    }

    return { success: true, deletedId: goalId };
  }

  /**
   * Add note to client
   */
  async addClientNote(
    clientId: string,
    authorId: string,
    noteType: NoteType,
    content: string,
    actor?: AuthActor
  ) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new HealthServiceError("Client not found", 404);

    const note = await prisma.clientNote.create({
      data: {
        clientId: client.id,
        authorId,
        noteType: noteType || NoteType.PRIVATE_COACH,
        content: content.trim()
      },
      include: {
        author: {
          select: { name: true, avatar: true, role: true }
        }
      }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "ADD_CLIENT_NOTE",
        entityType: "ClientNote",
        entityId: note.id,
        newValues: {
          clientId: client.id,
          noteType: note.noteType,
          preview: note.content.substring(0, 50)
        }
      });
    }

    return note;
  }

  /**
   * Get notes for a client.
   * If actor is CLIENT, private coach notes are strictly filtered out.
   */
  async getClientNotes(clientId: string, actor?: AuthActor) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) return [];

    const isClient = actor?.user?.role === UserRole.CLIENT;
    const where: any = { clientId: client.id };
    if (isClient) {
      where.noteType = { not: NoteType.PRIVATE_COACH };
    }

    return await prisma.clientNote.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Delete note from client.
   * Athletes cannot delete coach notes.
   */
  async deleteClientNote(noteId: string, actor?: AuthActor, clientId?: string) {
    const existing = await prisma.clientNote.findUnique({
      where: { id: noteId }
    });
    if (!existing) throw new HealthServiceError("Note not found", 404);

    if (clientId && existing.clientId !== clientId) {
      throw new HealthServiceError("Note does not belong to this client", 403);
    }

    if (actor?.user?.role === UserRole.CLIENT) {
      throw new HealthServiceError("Forbidden: Athletes cannot delete coach notes", 403);
    }

    await prisma.clientNote.delete({
      where: { id: noteId }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "DELETE_CLIENT_NOTE",
        entityType: "ClientNote",
        entityId: noteId,
        oldValues: {
          clientId: existing.clientId,
          noteType: existing.noteType
        }
      });
    }

    return { success: true, deletedId: noteId };
  }

  /**
   * Add progress photo to client
   */
  async addProgressPhoto(
    clientId: string,
    data: {
      frontImageUrl?: string;
      sideImageUrl?: string;
      backImageUrl?: string;
      weightAtTime?: number;
      notes?: string;
      date?: string | Date;
    },
    actor?: AuthActor
  ) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new HealthServiceError("Client not found", 404);

    const photo = await prisma.clientProgressPhoto.create({
      data: {
        clientId: client.id,
        frontImageUrl: data.frontImageUrl || null,
        sideImageUrl: data.sideImageUrl || null,
        backImageUrl: data.backImageUrl || null,
        weightAtTime: data.weightAtTime ? Number(data.weightAtTime) : client.weightKg,
        notes: data.notes || null,
        date: data.date ? new Date(data.date) : new Date()
      }
    });

    try {
      await checkInScheduleService.recordSubmission(client.id, "PHOTO", photo.date);
    } catch (schedErr) {
      console.error("[HealthService] Error updating check-in schedule for photo:", schedErr);
    }

    if (actor) {
      await auditService.log({
        actor,
        action: "UPLOAD_PROGRESS_PHOTO",
        entityType: "ClientProgressPhoto",
        entityId: photo.id,
        newValues: {
          clientId: client.id,
          date: photo.date,
          weightAtTime: photo.weightAtTime
        }
      });
    }

    return photo;
  }

  /**
   * Delete progress photo
   */
  async deleteProgressPhoto(photoId: string, actor?: AuthActor, clientId?: string) {
    const existing = await prisma.clientProgressPhoto.findUnique({
      where: { id: photoId }
    });
    if (!existing) throw new HealthServiceError("Progress photo not found", 404);

    if (clientId && existing.clientId !== clientId) {
      throw new HealthServiceError("Progress photo does not belong to this client", 403);
    }

    await prisma.clientProgressPhoto.delete({
      where: { id: photoId }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "DELETE_PROGRESS_PHOTO",
        entityType: "ClientProgressPhoto",
        entityId: photoId,
        oldValues: {
          clientId: existing.clientId,
          date: existing.date
        }
      });
    }

    return { success: true, deletedId: photoId };
  }

  /**
   * Get progress photos
   */
  async getProgressPhotos(clientId: string) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) return [];

    return await prisma.clientProgressPhoto.findMany({
      where: { clientId: client.id },
      orderBy: { date: "desc" }
    });
  }

  /**
   * Get client assessments
   */
  async getAssessments(clientId?: string) {
    const where: any = {};
    if (clientId && clientId !== "ALL") {
      where.OR = [{ clientId }, { client: { userId: clientId } }];
    }

    return await prisma.clientAssessment.findMany({
      where,
      include: {
        client: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        },
        coach: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      },
      orderBy: { date: "desc" }
    });
  }

  /**
   * Create client assessment
   */
  async createAssessment(
    data: {
      clientId: string;
      coachId?: string;
      title: string;
      date?: string | Date;
      pushupsCount?: number;
      pullupsCount?: number;
      plankSeconds?: number;
      runningKmTimeSec?: number;
      flexibilityScore?: number;
      vo2Max?: number;
      coachNotes?: string;
    },
    actor?: AuthActor
  ) {
    let coachId = data.coachId || actor?.coachProfileId;
    if (!coachId) {
      const coach = await prisma.coachProfile.findFirst();
      if (!coach) throw new HealthServiceError("No coach found to record assessment", 400);
      coachId = coach.id;
    }

    const assessment = await prisma.clientAssessment.create({
      data: {
        clientId: data.clientId,
        coachId,
        title: data.title.trim(),
        date: data.date ? new Date(data.date) : new Date(),
        pushupsCount: data.pushupsCount !== undefined ? Number(data.pushupsCount) : null,
        pullupsCount: data.pullupsCount !== undefined ? Number(data.pullupsCount) : null,
        plankSeconds: data.plankSeconds !== undefined ? Number(data.plankSeconds) : null,
        runningKmTimeSec: data.runningKmTimeSec !== undefined ? Number(data.runningKmTimeSec) : null,
        flexibilityScore: data.flexibilityScore !== undefined ? Number(data.flexibilityScore) : null,
        vo2Max: data.vo2Max !== undefined ? Number(data.vo2Max) : null,
        coachNotes: data.coachNotes || null
      },
      include: {
        client: { include: { user: true } },
        coach: { include: { user: true } }
      }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "CREATE_ASSESSMENT",
        entityType: "ClientAssessment",
        entityId: assessment.id,
        newValues: {
          clientId: assessment.clientId,
          title: assessment.title,
          pushupsCount: assessment.pushupsCount,
          vo2Max: assessment.vo2Max
        }
      });
    }

    return assessment;
  }

  /**
   * Update client assessment
   */
  async updateAssessment(id: string, data: any, actor?: AuthActor) {
    const existing = await prisma.clientAssessment.findUnique({ where: { id } });
    if (!existing) throw new HealthServiceError("Assessment not found", 404);

    const updated = await prisma.clientAssessment.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title.trim() }),
        ...(data.pushupsCount !== undefined && { pushupsCount: Number(data.pushupsCount) }),
        ...(data.pullupsCount !== undefined && { pullupsCount: Number(data.pullupsCount) }),
        ...(data.plankSeconds !== undefined && { plankSeconds: Number(data.plankSeconds) }),
        ...(data.runningKmTimeSec !== undefined && { runningKmTimeSec: Number(data.runningKmTimeSec) }),
        ...(data.flexibilityScore !== undefined && { flexibilityScore: Number(data.flexibilityScore) }),
        ...(data.vo2Max !== undefined && { vo2Max: Number(data.vo2Max) }),
        ...(data.coachNotes !== undefined && { coachNotes: data.coachNotes })
      }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "UPDATE_ASSESSMENT",
        entityType: "ClientAssessment",
        entityId: id,
        oldValues: { title: existing.title },
        newValues: { title: updated.title }
      });
    }

    return updated;
  }

  /**
   * Delete client assessment
   */
  async deleteAssessment(id: string, actor?: AuthActor) {
    const existing = await prisma.clientAssessment.findUnique({ where: { id } });
    if (!existing) throw new HealthServiceError("Assessment not found", 404);

    await prisma.clientAssessment.delete({
      where: { id }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "DELETE_ASSESSMENT",
        entityType: "ClientAssessment",
        entityId: id,
        oldValues: { title: existing.title, clientId: existing.clientId }
      });
    }

    return { success: true, deletedId: id };
  }
}

export const healthService = new HealthService();

import prisma from "@/lib/prisma";
import { BodyPart, RestrictionSeverity, GoalType, GoalStatus, NoteType } from "@prisma/client";

export class HealthService {
  /**
   * Add a measurement record for an athlete and update current weight
   */
  async addMeasurement(clientId: string, data: {
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
  }) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new Error("Client not found");

    const heightM = (data.heightCm || client.heightCm || 178) / 100;
    const bmi = Number((data.weightKg / (heightM * heightM)).toFixed(1));

    return await prisma.$transaction(async (tx) => {
      const measurement = await tx.clientMeasurementHistory.create({
        data: {
          clientId: client.id,
          date: data.date ? new Date(data.date) : new Date(),
          weightKg: Number(data.weightKg),
          heightCm: data.heightCm ? Number(data.heightCm) : client.heightCm,
          bmi,
          bodyFatPercentage: data.bodyFatPercentage ? Number(data.bodyFatPercentage) : null,
          muscleMassKg: data.muscleMassKg ? Number(data.muscleMassKg) : null,
          waistCm: data.waistCm ? Number(data.waistCm) : null,
          chestCm: data.chestCm ? Number(data.chestCm) : null,
          armsCm: data.armsCm ? Number(data.armsCm) : null,
          thighCm: data.thighCm ? Number(data.thighCm) : null,
          notes: data.notes || null,
          recordedByCoachId: data.recordedByCoachId || null
        }
      });

      // Update current weight and height on client profile
      await tx.clientProfile.update({
        where: { id: client.id },
        data: {
          weightKg: Number(data.weightKg),
          ...(data.heightCm && { heightCm: Number(data.heightCm) })
        }
      });

      return measurement;
    });
  }

  /**
   * Add medical restriction/injury
   */
  async addMedicalRestriction(clientId: string, data: {
    conditionName: string;
    bodyPart: BodyPart;
    severity?: RestrictionSeverity;
    description?: string;
    restrictedMuscles?: string[];
    restrictedExercises?: string[];
    notes?: string;
  }) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new Error("Client not found");

    return await prisma.clientMedicalRestriction.create({
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
  }

  /**
   * Add client goal
   */
  async addGoal(clientId: string, data: {
    title: string;
    goalType: GoalType;
    startingValue: number;
    targetValue: number;
    currentValue: number;
    unit?: string;
    deadline?: string | Date;
  }) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new Error("Client not found");

    return await prisma.clientGoal.create({
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
  }

  /**
   * Add note to client
   */
  async addClientNote(clientId: string, authorId: string, noteType: NoteType, content: string) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new Error("Client not found");

    return await prisma.clientNote.create({
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
  }

  /**
   * Add progress photo to client
   */
  async addProgressPhoto(clientId: string, data: {
    frontImageUrl?: string;
    sideImageUrl?: string;
    backImageUrl?: string;
    weightAtTime?: number;
    notes?: string;
    date?: string | Date;
  }) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new Error("Client not found");

    return await prisma.clientProgressPhoto.create({
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
  async createAssessment(data: {
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
  }) {
    let coachId = data.coachId;
    if (!coachId) {
      const coach = await prisma.coachProfile.findFirst();
      if (!coach) throw new Error("No coach found to record assessment");
      coachId = coach.id;
    }

    return await prisma.clientAssessment.create({
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
  }

  /**
   * Update client assessment
   */
  async updateAssessment(id: string, data: any) {
    return await prisma.clientAssessment.update({
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
  }

  /**
   * Delete client assessment
   */
  async deleteAssessment(id: string) {
    return await prisma.clientAssessment.delete({
      where: { id }
    });
  }
}

export const healthService = new HealthService();



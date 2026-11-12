import prisma from "@/lib/prisma";

export interface UpsertCheckInScheduleInput {
  weightFrequencyDays?: number | null;
  measurementFrequencyDays?: number | null;
  photoFrequencyDays?: number | null;
  otherReadingFrequencyDays?: number | null;
  notes?: string | null;
}

export interface MetricScheduleStatus {
  frequencyDays: number | null;
  lastAt: string | null;
  nextDueAt: string | null;
  isConfigured: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
  daysRemaining: number | null;
  daysOverdue: number | null;
}

export interface CheckInStatusSummary {
  overallStatus: "OVERDUE" | "DUE_SOON" | "UP_TO_DATE" | "NOT_CONFIGURED";
  overdueCount: number;
  dueSoonCount: number;
  weight: MetricScheduleStatus;
  measurement: MetricScheduleStatus;
  photo: MetricScheduleStatus;
  otherReading: MetricScheduleStatus;
}

function calculateMetricStatus(
  frequencyDays: number | null | undefined,
  lastAt: Date | null | undefined,
  nextDueAt: Date | null | undefined,
  now: Date
): MetricScheduleStatus {
  if (!frequencyDays || frequencyDays <= 0) {
    return {
      frequencyDays: null,
      lastAt: lastAt ? lastAt.toISOString() : null,
      nextDueAt: null,
      isConfigured: false,
      isOverdue: false,
      isDueSoon: false,
      daysRemaining: null,
      daysOverdue: null
    };
  }

  const effectiveNextDue = nextDueAt || (lastAt ? new Date(lastAt.getTime() + frequencyDays * 86400000) : now);
  const diffMs = effectiveNextDue.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  const isOverdue = diffMs < 0;
  const isDueSoon = !isOverdue && diffDays <= 2;

  return {
    frequencyDays,
    lastAt: lastAt ? lastAt.toISOString() : null,
    nextDueAt: effectiveNextDue.toISOString(),
    isConfigured: true,
    isOverdue,
    isDueSoon,
    daysRemaining: isOverdue ? 0 : Math.max(0, diffDays),
    daysOverdue: isOverdue ? Math.abs(diffDays) : null
  };
}

export class CheckInScheduleService {
  /**
   * Get an athlete's check-in schedule with computed status flags
   */
  async getSchedule(clientId: string) {
    // Resolve clientId whether passed as ClientProfile.id or User.id
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] },
      select: { id: true }
    });

    if (!client) {
      throw new Error("Client not found");
    }

    const schedule = await prisma.athleteCheckInSchedule.findUnique({
      where: { clientId: client.id }
    });

    const now = new Date();

    const weightStatus = calculateMetricStatus(
      schedule?.weightFrequencyDays,
      schedule?.lastWeightAt,
      schedule?.nextWeightDueAt,
      now
    );

    const measurementStatus = calculateMetricStatus(
      schedule?.measurementFrequencyDays,
      schedule?.lastMeasurementAt,
      schedule?.nextMeasurementDueAt,
      now
    );

    const photoStatus = calculateMetricStatus(
      schedule?.photoFrequencyDays,
      schedule?.lastPhotoAt,
      schedule?.nextPhotoDueAt,
      now
    );

    const otherStatus = calculateMetricStatus(
      schedule?.otherReadingFrequencyDays,
      schedule?.lastOtherReadingAt,
      schedule?.nextOtherReadingDueAt,
      now
    );

    const metrics = [weightStatus, measurementStatus, photoStatus, otherStatus];
    const configured = metrics.filter((m) => m.isConfigured);
    const overdueCount = configured.filter((m) => m.isOverdue).length;
    const dueSoonCount = configured.filter((m) => m.isDueSoon).length;

    let overallStatus: CheckInStatusSummary["overallStatus"] = "NOT_CONFIGURED";
    if (overdueCount > 0) {
      overallStatus = "OVERDUE";
    } else if (dueSoonCount > 0) {
      overallStatus = "DUE_SOON";
    } else if (configured.length > 0) {
      overallStatus = "UP_TO_DATE";
    }

    const status: CheckInStatusSummary = {
      overallStatus,
      overdueCount,
      dueSoonCount,
      weight: weightStatus,
      measurement: measurementStatus,
      photo: photoStatus,
      otherReading: otherStatus
    };

    return {
      schedule,
      status
    };
  }

  /**
   * Configure or update an athlete's check-in schedule
   */
  async upsertSchedule(
    clientId: string,
    input: UpsertCheckInScheduleInput,
    configuredByCoachId?: string | null
  ) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] },
      include: { checkInSchedule: true }
    });

    if (!client) {
      throw new Error("Client not found");
    }

    const now = new Date();
    const existing = client.checkInSchedule;

    // Calculate next due dates
    const calculateNextDue = (
      frequencyDays: number | null | undefined,
      lastAt: Date | null | undefined,
      existingNext: Date | null | undefined
    ): Date | null => {
      if (!frequencyDays || frequencyDays <= 0) return null;
      if (lastAt) {
        return new Date(lastAt.getTime() + frequencyDays * 86400000);
      }
      return existingNext || new Date(now.getTime() + frequencyDays * 86400000);
    };

    const weightFreq =
      input.weightFrequencyDays !== undefined ? input.weightFrequencyDays : existing?.weightFrequencyDays;
    const measurementFreq =
      input.measurementFrequencyDays !== undefined ? input.measurementFrequencyDays : existing?.measurementFrequencyDays;
    const photoFreq =
      input.photoFrequencyDays !== undefined ? input.photoFrequencyDays : existing?.photoFrequencyDays;
    const otherFreq =
      input.otherReadingFrequencyDays !== undefined ? input.otherReadingFrequencyDays : existing?.otherReadingFrequencyDays;

    const nextWeightDueAt = calculateNextDue(weightFreq, existing?.lastWeightAt, existing?.nextWeightDueAt);
    const nextMeasurementDueAt = calculateNextDue(measurementFreq, existing?.lastMeasurementAt, existing?.nextMeasurementDueAt);
    const nextPhotoDueAt = calculateNextDue(photoFreq, existing?.lastPhotoAt, existing?.nextPhotoDueAt);
    const nextOtherReadingDueAt = calculateNextDue(otherFreq, existing?.lastOtherReadingAt, existing?.nextOtherReadingDueAt);

    const savedSchedule = await prisma.athleteCheckInSchedule.upsert({
      where: { clientId: client.id },
      create: {
        clientId: client.id,
        configuredByCoachId: configuredByCoachId || null,
        weightFrequencyDays: weightFreq ?? null,
        measurementFrequencyDays: measurementFreq ?? null,
        photoFrequencyDays: photoFreq ?? null,
        otherReadingFrequencyDays: otherFreq ?? null,
        nextWeightDueAt,
        nextMeasurementDueAt,
        nextPhotoDueAt,
        nextOtherReadingDueAt,
        notes: input.notes !== undefined ? input.notes : existing?.notes
      },
      update: {
        ...(configuredByCoachId && { configuredByCoachId }),
        ...(input.weightFrequencyDays !== undefined && { weightFrequencyDays: input.weightFrequencyDays }),
        ...(input.measurementFrequencyDays !== undefined && { measurementFrequencyDays: input.measurementFrequencyDays }),
        ...(input.photoFrequencyDays !== undefined && { photoFrequencyDays: input.photoFrequencyDays }),
        ...(input.otherReadingFrequencyDays !== undefined && { otherReadingFrequencyDays: input.otherReadingFrequencyDays }),
        nextWeightDueAt,
        nextMeasurementDueAt,
        nextPhotoDueAt,
        nextOtherReadingDueAt,
        ...(input.notes !== undefined && { notes: input.notes })
      }
    });

    return await this.getSchedule(client.id);
  }

  /**
   * Automatically advance next-due date when a submission (weight/measurement/photo) occurs
   */
  async recordSubmission(
    clientId: string,
    type: "WEIGHT" | "MEASUREMENT" | "PHOTO" | "OTHER",
    submissionDate: Date = new Date()
  ) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] },
      select: { id: true }
    });

    if (!client) return null;

    const schedule = await prisma.athleteCheckInSchedule.findUnique({
      where: { clientId: client.id }
    });

    if (!schedule) return null;

    const updateData: any = {};

    if (type === "WEIGHT") {
      updateData.lastWeightAt = submissionDate;
      if (schedule.weightFrequencyDays && schedule.weightFrequencyDays > 0) {
        updateData.nextWeightDueAt = new Date(submissionDate.getTime() + schedule.weightFrequencyDays * 86400000);
      }
    } else if (type === "MEASUREMENT") {
      updateData.lastMeasurementAt = submissionDate;
      if (schedule.measurementFrequencyDays && schedule.measurementFrequencyDays > 0) {
        updateData.nextMeasurementDueAt = new Date(
          submissionDate.getTime() + schedule.measurementFrequencyDays * 86400000
        );
      }
    } else if (type === "PHOTO") {
      updateData.lastPhotoAt = submissionDate;
      if (schedule.photoFrequencyDays && schedule.photoFrequencyDays > 0) {
        updateData.nextPhotoDueAt = new Date(submissionDate.getTime() + schedule.photoFrequencyDays * 86400000);
      }
    } else if (type === "OTHER") {
      updateData.lastOtherReadingAt = submissionDate;
      if (schedule.otherReadingFrequencyDays && schedule.otherReadingFrequencyDays > 0) {
        updateData.nextOtherReadingDueAt = new Date(
          submissionDate.getTime() + schedule.otherReadingFrequencyDays * 86400000
        );
      }
    }

    if (Object.keys(updateData).length > 0) {
      return await prisma.athleteCheckInSchedule.update({
        where: { id: schedule.id },
        data: updateData
      });
    }

    return schedule;
  }
}

export const checkInScheduleService = new CheckInScheduleService();

import prisma from "@/lib/prisma";
import { Difficulty, AssignmentStatus } from "@prisma/client";

export interface TemplateExerciseInput {
  exerciseId: string;
  orderIndex?: number;
  targetSets?: number;
  targetReps?: string;
  targetWeightKg?: number;
  restSeconds?: number;
  tempo?: string;
  notes?: string;
}

export interface CreateTemplateInput {
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  sportId: string;
  difficulty?: Difficulty;
  creatorId?: string;
  exercises?: TemplateExerciseInput[];
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {}

export interface AssignWorkoutInput {
  clientId: string;
  coachId?: string;
  templateId?: string;
  programId?: string;
  scheduledDate: string | Date;
  coachNotes?: string;
}

export class WorkoutService {
  /**
   * Fetch all workout templates
   */
  async getTemplates(sportId?: string) {
    const where: any = {};
    if (sportId && sportId !== "ALL") {
      where.sportId = sportId;
    }

    return await prisma.workoutTemplate.findMany({
      where,
      include: {
        sport: true,
        creator: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        },
        exercises: {
          include: {
            exercise: {
              include: {
                sport: true,
                primaryMuscle: true,
                equipment: true
              }
            }
          },
          orderBy: { orderIndex: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Fetch single template by ID
   */
  async getTemplateById(id: string) {
    return await prisma.workoutTemplate.findUnique({
      where: { id },
      include: {
        sport: true,
        creator: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        },
        exercises: {
          include: {
            exercise: {
              include: {
                sport: true,
                primaryMuscle: true,
                equipment: true
              }
            }
          },
          orderBy: { orderIndex: "asc" }
        }
      }
    });
  }

  /**
   * Create template with nested exercises atomically
   */
  async createTemplate(data: CreateTemplateInput) {
    return await prisma.$transaction(async (tx) => {
      // Find default creator if not passed
      let creatorId = data.creatorId;
      if (!creatorId) {
        const firstCoach = await tx.coachProfile.findFirst();
        creatorId = firstCoach?.id;
      }

      const template = await tx.workoutTemplate.create({
        data: {
          titleAr: data.titleAr.trim(),
          titleEn: data.titleEn.trim(),
          descriptionAr: data.descriptionAr?.trim(),
          descriptionEn: data.descriptionEn?.trim(),
          sportId: data.sportId,
          difficulty: data.difficulty || Difficulty.INTERMEDIATE,
          creatorId: creatorId || undefined
        }
      });

      if (data.exercises && data.exercises.length > 0) {
        await tx.workoutTemplateExercise.createMany({
          data: data.exercises.map((ex, idx) => ({
            templateId: template.id,
            exerciseId: ex.exerciseId,
            orderIndex: ex.orderIndex ?? idx,
            targetSets: ex.targetSets ?? 3,
            targetReps: ex.targetReps ?? "10-12",
            targetWeightKg: ex.targetWeightKg ? Number(ex.targetWeightKg) : null,
            restSeconds: ex.restSeconds ?? 60,
            tempo: ex.tempo || null,
            notes: ex.notes || null
          }))
        });
      }

      return await tx.workoutTemplate.findUnique({
        where: { id: template.id },
        include: {
          sport: true,
          exercises: {
            include: { exercise: true },
            orderBy: { orderIndex: "asc" }
          }
        }
      });
    });
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, data: UpdateTemplateInput) {
    return await prisma.$transaction(async (tx) => {
      await tx.workoutTemplate.update({
        where: { id },
        data: {
          ...(data.titleAr && { titleAr: data.titleAr.trim() }),
          ...(data.titleEn && { titleEn: data.titleEn.trim() }),
          ...(data.descriptionAr !== undefined && { descriptionAr: data.descriptionAr?.trim() }),
          ...(data.descriptionEn !== undefined && { descriptionEn: data.descriptionEn?.trim() }),
          ...(data.sportId && { sportId: data.sportId }),
          ...(data.difficulty && { difficulty: data.difficulty })
        }
      });

      if (data.exercises !== undefined) {
        // Replace template exercises
        await tx.workoutTemplateExercise.deleteMany({
          where: { templateId: id }
        });

        if (data.exercises.length > 0) {
          await tx.workoutTemplateExercise.createMany({
            data: data.exercises.map((ex, idx) => ({
              templateId: id,
              exerciseId: ex.exerciseId,
              orderIndex: ex.orderIndex ?? idx,
              targetSets: ex.targetSets ?? 3,
              targetReps: ex.targetReps ?? "10-12",
              targetWeightKg: ex.targetWeightKg ? Number(ex.targetWeightKg) : null,
              restSeconds: ex.restSeconds ?? 60,
              tempo: ex.tempo || null,
              notes: ex.notes || null
            }))
          });
        }
      }

      return await tx.workoutTemplate.findUnique({
        where: { id },
        include: {
          sport: true,
          exercises: {
            include: { exercise: true },
            orderBy: { orderIndex: "asc" }
          }
        }
      });
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string) {
    await prisma.workoutTemplate.delete({
      where: { id }
    });
    return true;
  }

  /**
   * Assign a workout template or program to an athlete
   */
  async assignWorkout(data: AssignWorkoutInput) {
    let coachId = data.coachId;
    if (!coachId) {
      const coach = await prisma.coachProfile.findFirst();
      if (!coach) throw new Error("No coach found in database to assign workout");
      coachId = coach.id;
    }

    return await prisma.clientWorkoutAssignment.create({
      data: {
        clientId: data.clientId,
        coachId,
        templateId: data.templateId || null,
        programId: data.programId || null,
        scheduledDate: new Date(data.scheduledDate),
        coachNotes: data.coachNotes || null,
        status: AssignmentStatus.SCHEDULED
      },
      include: {
        template: {
          include: {
            sport: true,
            exercises: {
              include: { exercise: true },
              orderBy: { orderIndex: "asc" }
            }
          }
        },
        client: {
          include: { user: true }
        }
      }
    });
  }

  /**
   * Get assignments
   */
  async getAssignments(clientId?: string) {
    const where: any = {};
    if (clientId) {
      where.clientId = clientId;
    }

    return await prisma.clientWorkoutAssignment.findMany({
      where,
      include: {
        template: {
          include: {
            sport: true,
            exercises: {
              include: { exercise: true },
              orderBy: { orderIndex: "asc" }
            }
          }
        },
        client: {
          include: { user: true }
        },
        coach: {
          include: { user: true }
        },
        workoutLog: true
      },
      orderBy: { scheduledDate: "desc" }
    });
  }

  /**
   * Fetch single assignment by ID
   */
  async getAssignmentById(id: string) {
    return await prisma.clientWorkoutAssignment.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            sport: true,
            exercises: {
              include: { exercise: true },
              orderBy: { orderIndex: "asc" }
            }
          }
        },
        client: {
          include: { user: true }
        },
        coach: {
          include: { user: true }
        },
        workoutLog: {
          include: {
            exercises: {
              include: {
                exercise: true,
                sets: { orderBy: { setNumber: "asc" } }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Save completed workout execution into PostgreSQL
   */
  async saveWorkoutExecution(
    assignmentId: string,
    data: {
      durationMinutes: number;
      overallRpe?: number;
      clientFeedback?: string;
      coachFeedback?: string;
      exercises: Array<{
        exerciseId: string;
        sets: Array<{
          setNumber: number;
          actualWeightKg?: number;
          actualReps?: number;
          actualRpe?: number;
          isCompleted?: boolean;
        }>;
      }>;
    }
  ) {
    const assignment = await prisma.clientWorkoutAssignment.findUnique({
      where: { id: assignmentId }
    });
    if (!assignment) throw new Error("Assignment not found");

    return await prisma.$transaction(async (tx) => {
      // Mark assignment as completed
      await tx.clientWorkoutAssignment.update({
        where: { id: assignmentId },
        data: {
          status: AssignmentStatus.COMPLETED,
          completedAt: new Date()
        }
      });

      // Create or update WorkoutLog
      const log = await tx.workoutLog.upsert({
        where: { assignmentId },
        create: {
          assignmentId,
          clientId: assignment.clientId,
          coachId: assignment.coachId,
          completedAt: new Date(),
          durationMinutes: data.durationMinutes,
          overallRpe: data.overallRpe || 8,
          clientFeedback: data.clientFeedback || null,
          coachFeedback: data.coachFeedback || null,
          isCompleted: true
        },
        update: {
          completedAt: new Date(),
          durationMinutes: data.durationMinutes,
          overallRpe: data.overallRpe || 8,
          clientFeedback: data.clientFeedback || null,
          coachFeedback: data.coachFeedback || null,
          isCompleted: true
        }
      });

      // Create exercise logs and sets
      if (data.exercises && data.exercises.length > 0) {
        for (const ex of data.exercises) {
          const exLog = await tx.workoutExerciseLog.create({
            data: {
              workoutLogId: log.id,
              exerciseId: ex.exerciseId
            }
          });

          if (ex.sets && ex.sets.length > 0) {
            await tx.setLog.createMany({
              data: ex.sets.map((s) => ({
                exerciseLogId: exLog.id,
                setNumber: s.setNumber,
                actualWeightKg: s.actualWeightKg !== undefined ? Number(s.actualWeightKg) : null,
                actualReps: s.actualReps !== undefined ? Number(s.actualReps) : null,
                actualRpe: s.actualRpe !== undefined ? Number(s.actualRpe) : null,
                isCompleted: s.isCompleted ?? true
              }))
            });
          }
        }
      }

      return log;
    });
  }
}

export const workoutService = new WorkoutService();


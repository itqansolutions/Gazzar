import prisma from "@/lib/prisma";
import { GoalType, Difficulty, AssignmentStatus } from "@prisma/client";

export class ProgramService {
  /**
   * Get all training programs with sports, weeks, and days
   */
  async getPrograms() {
    return await prisma.trainingProgram.findMany({
      include: {
        sport: true,
        creator: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        },
        weeks: {
          include: {
            days: {
              include: {
                workouts: {
                  include: {
                    template: {
                      include: {
                        sport: true,
                        exercises: { include: { exercise: true } }
                      }
                    }
                  },
                  orderBy: { orderIndex: "asc" }
                }
              },
              orderBy: { dayNumber: "asc" }
            }
          },
          orderBy: { weekNumber: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Create training program with structured weeks and days
   */
  async createProgram(data: {
    titleAr: string;
    titleEn: string;
    descriptionAr?: string;
    descriptionEn?: string;
    durationWeeks: number;
    sportId?: string;
    goalType?: GoalType;
    difficulty?: Difficulty;
    creatorId?: string;
    weeks?: Array<{
      weekNumber: number;
      focusNotes?: string;
      days: Array<{
        dayNumber: number;
        dayName: string;
        isRestDay: boolean;
        templateId?: string;
        customWorkoutName?: string;
        notes?: string;
      }>;
    }>;
  }) {
    let sportId = data.sportId;
    if (!sportId) {
      const firstSport = await prisma.sport.findFirst();
      if (!firstSport) throw new Error("No sport found to associate with program");
      sportId = firstSport.id;
    }

    let creatorId = data.creatorId;
    if (!creatorId) {
      const coach = await prisma.coachProfile.findFirst();
      if (coach) creatorId = coach.id;
    }

    return await prisma.$transaction(async (tx) => {
      const program = await tx.trainingProgram.create({
        data: {
          titleAr: data.titleAr,
          titleEn: data.titleEn,
          descriptionAr: data.descriptionAr || null,
          descriptionEn: data.descriptionEn || null,
          durationWeeks: Number(data.durationWeeks) || 4,
          sportId,
          goalType: data.goalType || GoalType.GENERAL_FITNESS,
          difficulty: data.difficulty || Difficulty.BEGINNER,
          creatorId: creatorId || null
        }
      });

      if (data.weeks && data.weeks.length > 0) {
        for (const w of data.weeks) {
          const week = await tx.programWeek.create({
            data: {
              programId: program.id,
              weekNumber: w.weekNumber,
              focusEn: w.focusNotes || null,
              focusAr: w.focusNotes || null
            }
          });

          if (w.days && w.days.length > 0) {
            for (const d of w.days) {
              const day = await tx.programDay.create({
                data: {
                  weekId: week.id,
                  dayNumber: d.dayNumber,
                  titleEn: d.dayName,
                  titleAr: d.dayName,
                  isRestDay: d.isRestDay ?? false
                }
              });

              if (!d.isRestDay && d.templateId) {
                await tx.programWorkout.create({
                  data: {
                    dayId: day.id,
                    templateId: d.templateId,
                    orderIndex: 0
                  }
                });
              }
            }
          }
        }
      }

      return program;
    });
  }

  /**
   * Delete program
   */
  async deleteProgram(id: string) {
    return await prisma.trainingProgram.delete({
      where: { id }
    });
  }

  /**
   * Apply structured program to client by creating scheduled assignments
   */
  async applyProgramToClient(
    programId: string,
    clientId: string,
    coachId: string,
    startDate: string | Date
  ) {
    const program = await prisma.trainingProgram.findUnique({
      where: { id: programId },
      include: {
        weeks: {
          include: {
            days: {
              include: {
                workouts: true
              }
            }
          },
          orderBy: { weekNumber: "asc" }
        }
      }
    });
    if (!program) throw new Error("Program not found");

    const baseDate = new Date(startDate);
    const createdAssignments = [];

    for (const week of program.weeks) {
      for (const day of week.days) {
        if (day.isRestDay || day.workouts.length === 0) continue;

        for (const pw of day.workouts) {
          // Calculate offset in days from start date
          const dayOffset = (week.weekNumber - 1) * 7 + (day.dayNumber - 1);
          const scheduledDate = new Date(baseDate);
          scheduledDate.setDate(scheduledDate.getDate() + dayOffset);

          const assignment = await prisma.clientWorkoutAssignment.create({
            data: {
              clientId,
              coachId,
              programId: program.id,
              templateId: pw.templateId,
              scheduledDate,
              status: AssignmentStatus.SCHEDULED,
              coachNotes: `Week ${week.weekNumber} Day ${day.dayNumber}: ${day.titleEn} (${program.titleEn})`
            }
          });
          createdAssignments.push(assignment);
        }
      }
    }

    return createdAssignments;
  }
}

export const programService = new ProgramService();

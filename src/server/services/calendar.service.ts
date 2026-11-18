import prisma from "@/lib/prisma";
import { AudienceScope, UserRole } from "@prisma/client";
import { AuthActor } from "@/lib/auth/route-guard";

export interface CalendarQueryOptions {
  startDate?: Date | string;
  endDate?: Date | string;
  sportId?: string;
  coachId?: string;
  athleteId?: string;
  view?: "ALL" | "EVENTS" | "WORKOUTS";
}

export class CalendarService {
  /**
   * Unified calendar query returning both Macro Academy Events (SessionCalendar)
   * and Micro Athlete Workouts (ClientWorkoutAssignment) in the specified date range.
   */
  async getUnifiedCalendar(options: CalendarQueryOptions, actor: AuthActor) {
    const startDate = options.startDate
      ? new Date(options.startDate)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = options.endDate
      ? new Date(options.endDate)
      : new Date(new Date().setDate(new Date().getDate() + 30));
    const view = options.view || "ALL";

    let events: any[] = [];
    let workouts: any[] = [];

    // 1. Fetch Events if view === "ALL" or "EVENTS"
    if (view === "ALL" || view === "EVENTS") {
      const eventWhere: any = {
        startTime: { gte: startDate, lte: endDate }
      };

      if (options.sportId && options.sportId !== "ALL") {
        eventWhere.OR = [
          { sportId: options.sportId },
          { sportId: null }
        ];
      }

      if (options.coachId && options.coachId !== "ALL") {
        eventWhere.coachId = options.coachId;
      }

      // Role-based visibility for events
      if (actor.user.role === UserRole.CLIENT) {
        const client = await prisma.clientProfile.findUnique({
          where: { userId: actor.user.id },
          select: {
            id: true,
            preferredSportId: true,
            coachAssignments: { select: { coachId: true } }
          }
        });

        if (client) {
          const assignedCoachIds = client.coachAssignments.map((ca) => ca.coachId);
          eventWhere.AND = [
            {
              OR: [
                { audienceScope: AudienceScope.WHOLE_ACADEMY },
                ...(client.preferredSportId
                  ? [{ audienceScope: AudienceScope.BY_SPORT, sportId: client.preferredSportId }]
                  : []),
                ...(assignedCoachIds.length > 0
                  ? [{ audienceScope: AudienceScope.COACH_ROSTER, coachId: { in: assignedCoachIds } }]
                  : []),
                {
                  audienceScope: AudienceScope.SELECTED_ATHLETES,
                  attendances: { some: { clientId: client.id } }
                }
              ]
            }
          ];
        } else {
          // If no client profile found for athlete, only whole academy events
          eventWhere.audienceScope = AudienceScope.WHOLE_ACADEMY;
        }
      }

      events = await prisma.sessionCalendar.findMany({
        where: eventWhere,
        include: {
          coach: {
            include: {
              user: { select: { id: true, name: true, avatar: true, email: true } }
            }
          },
          sport: { select: { id: true, nameEn: true, nameAr: true } },
          attendances: {
            include: {
              client: {
                include: {
                  user: { select: { id: true, name: true, avatar: true } }
                }
              }
            }
          }
        },
        orderBy: { startTime: "asc" }
      });
    }

    // 2. Fetch Workouts if view === "ALL" or "WORKOUTS"
    if (view === "ALL" || view === "WORKOUTS") {
      const workoutWhere: any = {
        scheduledDate: { gte: startDate, lte: endDate }
      };

      if (actor.user.role === UserRole.CLIENT) {
        const client = await prisma.clientProfile.findUnique({
          where: { userId: actor.user.id },
          select: { id: true }
        });
        if (client) {
          workoutWhere.clientId = client.id;
        } else {
          workoutWhere.clientId = "__NO_CLIENT__";
        }
      } else {
        // Coach or Admin
        if (options.athleteId && options.athleteId !== "ALL") {
          workoutWhere.clientId = options.athleteId;
        }
        if (options.coachId && options.coachId !== "ALL") {
          workoutWhere.coachId = options.coachId;
        } else if (actor.user.role === UserRole.COACH && (!options.athleteId || options.athleteId === "ALL")) {
          // By default, coach sees workouts they assigned or assigned to their athletes
          if (actor.coachProfileId) {
            workoutWhere.OR = [
              { coachId: actor.coachProfileId },
              { client: { coachAssignments: { some: { coachId: actor.coachProfileId } } } }
            ];
          }
        }
      }

      workouts = await prisma.clientWorkoutAssignment.findMany({
        where: workoutWhere,
        include: {
          client: {
            include: {
              user: { select: { id: true, name: true, avatar: true, email: true } },
              sport: { select: { id: true, nameEn: true, nameAr: true } }
            }
          },
          coach: {
            include: {
              user: { select: { id: true, name: true, avatar: true, email: true } }
            }
          },
          template: {
            select: { id: true, titleEn: true, titleAr: true }
          },
          program: {
            select: { id: true, titleEn: true, titleAr: true }
          },
          assignmentBlocks: {
            include: {
              items: {
                include: {
                  exercise: { select: { id: true, nameEn: true, nameAr: true, metricType: true } }
                }
              }
            }
          },
          exercises: {
            include: {
              exercise: { select: { id: true, nameEn: true, nameAr: true, metricType: true } }
            }
          },
          workoutLog: {
            select: {
              id: true,
              isCompleted: true,
              completedAt: true,
              startedAt: true,
              overallRpe: true
            }
          }
        },
        orderBy: { scheduledDate: "asc" }
      });
    }

    return {
      events,
      workouts
    };
  }
}

export const calendarService = new CalendarService();

import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAssignedClientIdsForActor, requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const allowedClientIds = await getAssignedClientIdsForActor(auth.actor);
    const clientWhere = allowedClientIds !== null ? { id: { in: allowedClientIds } } : {};

    const [
      clientsCount,
      coachesCount,
      exercisesCount,
      templatesCount,
      assignmentsCount,
      sessionsCount,
      recentClients,
      upcomingSessions
    ] = await Promise.all([
      prisma.clientProfile.count({ where: clientWhere }),
      prisma.coachProfile.count(),
      prisma.exercise.count(),
      prisma.workoutTemplate.count(),
      prisma.clientWorkoutAssignment.count({
        where: allowedClientIds !== null ? { clientId: { in: allowedClientIds } } : {}
      }),
      prisma.sessionCalendar.count(),
      prisma.clientProfile.findMany({
        where: clientWhere,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          sport: true
        }
      }),
      prisma.sessionCalendar.findMany({
        take: 3,
        orderBy: { startTime: "asc" },
        include: {
          attendances: true,
          coach: {
            include: {
              user: {
                select: { name: true }
              }
            }
          }
        }
      })
    ]);

    let athleteDashboard: any = null;

    if (auth.actor.user.role === UserRole.CLIENT) {
      const clientProfile = await prisma.clientProfile.findFirst({
        where: {
          OR: [
            ...(auth.actor.clientProfileId ? [{ id: auth.actor.clientProfileId }] : []),
            { userId: auth.actor.user.id }
          ]
        },
        include: {
          sport: true,
          user: true,
          coachAssignments: {
            where: { active: true },
            include: {
              coach: { include: { user: true } }
            }
          }
        }
      });

      if (clientProfile) {
        const [todayWorkout, activeProgramAssignment, activeNutrition, checkInSched, recentAssessment] =
          await Promise.all([
            prisma.clientWorkoutAssignment.findFirst({
              where: {
                clientId: clientProfile.id,
                status: { in: ["SCHEDULED", "COMPLETED"] }
              },
              orderBy: { scheduledDate: "desc" },
              include: {
                template: true,
                workoutLog: true,
                exercises: true
              }
            }),
            prisma.programAssignment.findFirst({
              where: {
                clientId: clientProfile.id,
                isActive: true
              },
              orderBy: { startDate: "desc" },
              include: {
                program: true
              }
            }),
            prisma.clientNutritionAssignment.findFirst({
              where: {
                clientId: clientProfile.id,
                isActive: true
              },
              orderBy: { startDate: "desc" },
              include: {
                nutritionProgram: true
              }
            }),
            prisma.athleteCheckInSchedule.findUnique({
              where: { clientId: clientProfile.id }
            }),
            prisma.clientAssessment.findFirst({
              where: { clientId: clientProfile.id },
              orderBy: { date: "desc" }
            })
          ]);

        athleteDashboard = {
          clientProfile,
          todayWorkout,
          activeProgram: activeProgramAssignment?.program || null,
          programAssignment: activeProgramAssignment,
          nutritionPlan: activeNutrition?.nutritionProgram || null,
          checkInSchedule: checkInSched,
          recentAssessment
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          clientsCount,
          coachesCount,
          exercisesCount,
          templatesCount,
          totalWorkouts: assignmentsCount + sessionsCount
        },
        recentClients,
        upcomingSessions,
        athleteDashboard
      }
    });
  } catch (error: any) {
    console.error("[GET /api/dashboard] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

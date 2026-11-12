import { NextResponse } from "next/server";
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
        upcomingSessions
      }
    });
  } catch (error: any) {
    console.error("[GET /api/dashboard] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

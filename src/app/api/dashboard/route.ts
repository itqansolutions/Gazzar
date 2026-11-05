import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
      prisma.clientProfile.count(),
      prisma.coachProfile.count(),
      prisma.exercise.count(),
      prisma.workoutTemplate.count(),
      prisma.clientWorkoutAssignment.count(),
      prisma.sessionCalendar.count(),
      prisma.clientProfile.findMany({
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

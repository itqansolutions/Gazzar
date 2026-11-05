import prisma from "@/lib/prisma";
import { AttendanceStatus, SessionType } from "@prisma/client";

export class SessionService {
  /**
   * Get all session calendars with coach, sport, and attendances
   */
  async getSessions() {
    return await prisma.sessionCalendar.findMany({
      include: {
        coach: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        },
        sport: true,
        attendances: {
          include: {
            client: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatar: true }
                }
              }
            }
          }
        }
      },
      orderBy: { startTime: "asc" }
    });
  }

  /**
   * Create a new session
   */
  async createSession(data: {
    coachId: string;
    sportId: string;
    title: string;
    sessionType?: SessionType;
    startTime: string | Date;
    endTime: string | Date;
    location?: string;
    maxParticipants?: number;
    clientIds?: string[];
  }) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.sessionCalendar.create({
        data: {
          coachId: data.coachId,
          sportId: data.sportId,
          title: data.title,
          sessionType: data.sessionType || SessionType.INDIVIDUAL,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          location: data.location || "GX Main Hall",
          maxParticipants: data.maxParticipants || 1
        }
      });

      if (data.clientIds && data.clientIds.length > 0) {
        await tx.sessionAttendance.createMany({
          data: data.clientIds.map((clientId) => ({
            sessionId: session.id,
            clientId,
            status: AttendanceStatus.PRESENT
          })),
          skipDuplicates: true
        });
      }

      return session;
    });
  }

  /**
   * Update attendance status for a client in a session
   */
  async updateAttendance(
    sessionId: string,
    clientId: string,
    status: AttendanceStatus,
    notes?: string
  ) {
    return await prisma.sessionAttendance.upsert({
      where: {
        sessionId_clientId: {
          sessionId,
          clientId
        }
      },
      update: {
        status,
        ...(notes !== undefined && { notes })
      },
      create: {
        sessionId,
        clientId,
        status,
        notes: notes || null
      }
    });
  }
}

export const sessionService = new SessionService();

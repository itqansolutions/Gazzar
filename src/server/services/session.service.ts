import prisma from "@/lib/prisma";
import {
  AttendanceStatus,
  AudienceScope,
  EventMode,
  EventType,
  SessionType,
  UserRole
} from "@prisma/client";
import { AuthActor } from "@/lib/auth/route-guard";
import { auditService } from "@/server/services/audit.service";

export class SessionServiceError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = "SessionServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class SessionService {
  /**
   * Get all session calendars with coach, sport, and attendances
   */
  async getSessions(filter?: {
    startDate?: Date | string;
    endDate?: Date | string;
    coachId?: string;
    sportId?: string;
    eventType?: EventType;
    eventMode?: EventMode;
  }) {
    const whereClause: any = {};

    if (filter?.startDate || filter?.endDate) {
      whereClause.startTime = {};
      if (filter.startDate) whereClause.startTime.gte = new Date(filter.startDate);
      if (filter.endDate) whereClause.startTime.lte = new Date(filter.endDate);
    }

    if (filter?.coachId && filter.coachId !== "ALL") {
      whereClause.coachId = filter.coachId;
    }

    if (filter?.sportId && filter.sportId !== "ALL") {
      whereClause.sportId = filter.sportId;
    }

    if (filter?.eventType) {
      whereClause.eventType = filter.eventType;
    }

    if (filter?.eventMode) {
      whereClause.eventMode = filter.eventMode;
    }

    return await prisma.sessionCalendar.findMany({
      where: whereClause,
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
   * Get a single session by ID
   */
  async getSessionById(sessionId: string) {
    const session = await prisma.sessionCalendar.findUnique({
      where: { id: sessionId },
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
      }
    });

    if (!session) {
      throw new SessionServiceError("Session not found", 404);
    }

    return session;
  }

  /**
   * Create a new session/event with RBAC and audit logging
   */
  async createSession(
    data: {
      coachId?: string;
      sportId?: string | null;
      title: string;
      sessionType?: SessionType;
      eventType?: EventType;
      eventMode?: EventMode;
      onlineLink?: string | null;
      location?: string | null;
      description?: string | null;
      audienceScope?: AudienceScope;
      isAllDay?: boolean;
      startTime: string | Date;
      endTime: string | Date;
      maxParticipants?: number;
      clientIds?: string[];
    },
    actor?: AuthActor
  ) {
    if (actor?.user?.role === UserRole.CLIENT) {
      throw new SessionServiceError("Forbidden: Athletes cannot schedule academy sessions or events", 403);
    }

    let assignedCoachId = data.coachId;
    if (actor?.user?.role === UserRole.COACH) {
      if (assignedCoachId && actor.coachProfileId && assignedCoachId !== actor.coachProfileId) {
        throw new SessionServiceError("Forbidden: Coaches may only schedule sessions for themselves", 403);
      }
      assignedCoachId = actor.coachProfileId || assignedCoachId;
    }

    if (!assignedCoachId) {
      throw new SessionServiceError("coachId is required to schedule a session", 400);
    }

    if (!data.title?.trim()) {
      throw new SessionServiceError("Title is required", 400);
    }

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.sessionCalendar.create({
        data: {
          coachId: assignedCoachId!,
          sportId: data.sportId || null,
          title: data.title.trim(),
          sessionType: data.sessionType || SessionType.INDIVIDUAL,
          eventType: data.eventType || EventType.GROUP_CLASS,
          eventMode: data.eventMode || EventMode.ONLINE,
          onlineLink: data.eventMode === EventMode.ONLINE ? (data.onlineLink?.trim() || null) : null,
          location: data.eventMode === EventMode.IN_PERSON ? (data.location?.trim() || "GX Main Gym Floor") : (data.location?.trim() || null),
          description: data.description?.trim() || null,
          audienceScope: data.audienceScope || AudienceScope.WHOLE_ACADEMY,
          isAllDay: Boolean(data.isAllDay),
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          maxParticipants: data.maxParticipants && data.maxParticipants > 0 ? data.maxParticipants : 1
        },
        include: {
          coach: { include: { user: true } },
          sport: true
        }
      });

      if (data.clientIds && data.clientIds.length > 0) {
        await tx.sessionAttendance.createMany({
          data: data.clientIds.map((clientId) => ({
            sessionId: created.id,
            clientId,
            status: AttendanceStatus.PRESENT
          })),
          skipDuplicates: true
        });
      }

      return created;
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "CREATE_SESSION",
        entityType: "SessionCalendar",
        entityId: session.id,
        newValues: {
          title: session.title,
          eventType: session.eventType,
          eventMode: session.eventMode,
          audienceScope: session.audienceScope,
          startTime: session.startTime
        }
      });
    }

    return await this.getSessionById(session.id);
  }

  /**
   * Update session metadata with RBAC and audit logging
   */
  async updateSession(
    sessionId: string,
    data: {
      title?: string;
      sessionType?: SessionType;
      eventType?: EventType;
      eventMode?: EventMode;
      onlineLink?: string | null;
      location?: string | null;
      description?: string | null;
      audienceScope?: AudienceScope;
      isAllDay?: boolean;
      startTime?: string | Date;
      endTime?: string | Date;
      maxParticipants?: number;
      sportId?: string | null;
      coachId?: string;
    },
    actor?: AuthActor
  ) {
    if (actor?.user?.role === UserRole.CLIENT) {
      throw new SessionServiceError("Forbidden: Athletes cannot edit sessions", 403);
    }

    const existing = await prisma.sessionCalendar.findUnique({
      where: { id: sessionId },
      include: { coach: true }
    });

    if (!existing) {
      throw new SessionServiceError("Session not found", 404);
    }

    if (actor?.user?.role === UserRole.COACH) {
      const isOwner =
        existing.coachId === actor.coachProfileId ||
        existing.coach?.userId === actor.user.id;
      if (!isOwner) {
        throw new SessionServiceError("Forbidden: You may only modify sessions you coach", 403);
      }
    }

    const updated = await prisma.sessionCalendar.update({
      where: { id: sessionId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.sessionType !== undefined && { sessionType: data.sessionType }),
        ...(data.eventType !== undefined && { eventType: data.eventType }),
        ...(data.eventMode !== undefined && { eventMode: data.eventMode }),
        ...(data.onlineLink !== undefined && { onlineLink: data.onlineLink?.trim() || null }),
        ...(data.location !== undefined && { location: data.location?.trim() || null }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.audienceScope !== undefined && { audienceScope: data.audienceScope }),
        ...(data.isAllDay !== undefined && { isAllDay: data.isAllDay }),
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
        ...(data.maxParticipants !== undefined && { maxParticipants: data.maxParticipants }),
        ...(data.sportId !== undefined && { sportId: data.sportId || null }),
        ...(data.coachId && actor?.user?.role !== UserRole.COACH && { coachId: data.coachId })
      },
      include: {
        coach: { include: { user: true } },
        sport: true,
        attendances: { include: { client: { include: { user: true } } } }
      }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "UPDATE_SESSION",
        entityType: "SessionCalendar",
        entityId: sessionId,
        oldValues: {
          title: existing.title,
          eventType: existing.eventType,
          startTime: existing.startTime
        },
        newValues: {
          title: updated.title,
          eventType: updated.eventType,
          startTime: updated.startTime
        }
      });
    }

    return updated;
  }

  /**
   * Delete a session and its attendances
   */
  async deleteSession(sessionId: string, actor?: AuthActor) {
    if (actor?.user?.role === UserRole.CLIENT) {
      throw new SessionServiceError("Forbidden: Athletes cannot delete sessions", 403);
    }

    const existing = await prisma.sessionCalendar.findUnique({
      where: { id: sessionId },
      include: { coach: true }
    });

    if (!existing) {
      throw new SessionServiceError("Session not found", 404);
    }

    if (actor?.user?.role === UserRole.COACH) {
      const isOwner =
        existing.coachId === actor.coachProfileId ||
        existing.coach?.userId === actor.user.id;
      if (!isOwner) {
        throw new SessionServiceError("Forbidden: You may only delete sessions you coach", 403);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.sessionAttendance.deleteMany({ where: { sessionId } });
      await tx.sessionCalendar.delete({ where: { id: sessionId } });
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "DELETE_SESSION",
        entityType: "SessionCalendar",
        entityId: sessionId,
        oldValues: {
          title: existing.title,
          eventType: existing.eventType,
          startTime: existing.startTime
        }
      });
    }

    return { success: true, deletedSessionId: sessionId };
  }

  /**
   * Update attendance status for a client in a session (lazy upsert)
   */
  async updateAttendance(
    sessionId: string,
    clientId: string,
    status: AttendanceStatus,
    notes?: string,
    actor?: AuthActor
  ) {
    if (actor?.user?.role === UserRole.CLIENT) {
      throw new SessionServiceError("Forbidden: Athletes cannot mark attendance", 403);
    }

    const session = await prisma.sessionCalendar.findUnique({
      where: { id: sessionId },
      include: { coach: true }
    });

    if (!session) {
      throw new SessionServiceError("Session not found", 404);
    }

    if (actor?.user?.role === UserRole.COACH) {
      const isOwner =
        session.coachId === actor.coachProfileId ||
        session.coach?.userId === actor.user.id;
      if (!isOwner) {
        throw new SessionServiceError("Forbidden: You may only record attendance for sessions you coach", 403);
      }
    }

    const attendance = await prisma.sessionAttendance.upsert({
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
      },
      include: {
        client: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        }
      }
    });

    if (actor) {
      await auditService.log({
        actor,
        action: "UPDATE_SESSION_ATTENDANCE",
        entityType: "SessionAttendance",
        entityId: attendance.id,
        newValues: {
          sessionId,
          clientId,
          status,
          notes
        }
      });
    }

    return attendance;
  }

  /**
   * Get eligible attendees for an event based on its audienceScope
   * Supports lazy attendance: returns all eligible athletes with their current attendance status (if marked)
   */
  async getEligibleAttendees(sessionId: string) {
    const session = await prisma.sessionCalendar.findUnique({
      where: { id: sessionId },
      include: {
        attendances: true
      }
    });

    if (!session) {
      throw new SessionServiceError("Session not found", 404);
    }

    let athletes: any[] = [];

    switch (session.audienceScope) {
      case AudienceScope.WHOLE_ACADEMY: {
        athletes = await prisma.clientProfile.findMany({
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
            sport: { select: { id: true, nameEn: true, nameAr: true } }
          },
          orderBy: { user: { name: "asc" } }
        });
        break;
      }
      case AudienceScope.BY_SPORT: {
        if (!session.sportId) {
          athletes = await prisma.clientProfile.findMany({
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
              sport: { select: { id: true, nameEn: true, nameAr: true } }
            },
            orderBy: { user: { name: "asc" } }
          });
        } else {
          athletes = await prisma.clientProfile.findMany({
            where: { preferredSportId: session.sportId },
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
              sport: { select: { id: true, nameEn: true, nameAr: true } }
            },
            orderBy: { user: { name: "asc" } }
          });
        }
        break;
      }
      case AudienceScope.COACH_ROSTER: {
        const assignments = await prisma.clientCoachAssignment.findMany({
          where: { coachId: session.coachId },
          include: {
            client: {
              include: {
                user: { select: { id: true, name: true, email: true, avatar: true } },
                sport: { select: { id: true, nameEn: true, nameAr: true } }
              }
            }
          }
        });
        athletes = assignments.map((a) => a.client);
        break;
      }
      case AudienceScope.SELECTED_ATHLETES: {
        const clientIds = session.attendances.map((a) => a.clientId);
        athletes = await prisma.clientProfile.findMany({
          where: { id: { in: clientIds } },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
            sport: { select: { id: true, nameEn: true, nameAr: true } }
          },
          orderBy: { user: { name: "asc" } }
        });
        break;
      }
    }

    const attendanceMap = new Map(session.attendances.map((a) => [a.clientId, a]));

    return athletes.map((athlete) => {
      const att = attendanceMap.get(athlete.id);
      return {
        athleteId: athlete.id,
        name: athlete.user?.name || "Athlete",
        email: athlete.user?.email,
        avatar: athlete.user?.avatar,
        sportName: athlete.sport?.nameEn || athlete.sport?.nameAr || "General",
        status: att ? att.status : null,
        notes: att?.notes || null,
        attendanceId: att?.id || null
      };
    });
  }
}

export const sessionService = new SessionService();

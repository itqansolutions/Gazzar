import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../prisma";
import type {
  ISessionRepository,
  SessionRecord,
  SessionRecordWithUser
} from "./types";

export class PrismaSessionRepository implements ISessionRepository {
  private client: PrismaClient;

  constructor(client: PrismaClient = defaultPrisma) {
    this.client = client;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRecordWithUser | null> {
    try {
      const record = await this.client.session.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              avatar: true,
              phone: true
            }
          }
        }
      });

      if (!record) return null;

      return {
        id: record.id,
        userId: record.userId,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
        lastUsedAt: record.lastUsedAt,
        revokedAt: record.revokedAt,
        userAgent: record.userAgent,
        ipAddress: record.ipAddress,
        user: record.user
      };
    } catch (err: unknown) {
      console.error("[SessionRepository] Database read error:", err instanceof Error ? err.message : "Unknown");
      throw new Error("DATABASE_READ_ERROR");
    }
  }

  async createSession(data: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    lastUsedAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<SessionRecord> {
    try {
      const created = await this.client.session.create({
        data: {
          id: data.id,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          createdAt: data.createdAt,
          lastUsedAt: data.lastUsedAt,
          userAgent: data.userAgent ?? null,
          ipAddress: data.ipAddress ?? null
        }
      });

      return {
        id: created.id,
        userId: created.userId,
        tokenHash: created.tokenHash,
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
        lastUsedAt: created.lastUsedAt,
        revokedAt: created.revokedAt,
        userAgent: created.userAgent,
        ipAddress: created.ipAddress
      };
    } catch (err: unknown) {
      console.error("[SessionRepository] Database insert error:", err instanceof Error ? err.message : "Unknown");
      throw new Error("DATABASE_WRITE_ERROR");
    }
  }

  async updateSessionActivity(
    sessionId: string,
    lastUsedAt: Date,
    newExpiresAt: Date
  ): Promise<boolean> {
    try {
      const res = await this.client.session.updateMany({
        where: {
          id: sessionId,
          revokedAt: null
        },
        data: {
          lastUsedAt,
          expiresAt: newExpiresAt
        }
      });
      return res.count > 0;
    } catch (err: unknown) {
      console.error("[SessionRepository] Database update error:", err instanceof Error ? err.message : "Unknown");
      return false;
    }
  }

  async revokeSessionByTokenHash(tokenHash: string): Promise<boolean> {
    try {
      const res = await this.client.session.updateMany({
        where: {
          tokenHash,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
      return res.count > 0;
    } catch (err: unknown) {
      console.error("[SessionRepository] Database revoke error:", err instanceof Error ? err.message : "Unknown");
      throw new Error("DATABASE_WRITE_ERROR");
    }
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    try {
      const whereClause: {
        userId: string;
        revokedAt: null;
        id?: { not: string };
      } = {
        userId,
        revokedAt: null
      };

      if (exceptSessionId) {
        whereClause.id = { not: exceptSessionId };
      }

      const res = await this.client.session.updateMany({
        where: whereClause,
        data: {
          revokedAt: new Date()
        }
      });

      return res.count;
    } catch (err: unknown) {
      console.error("[SessionRepository] Database bulk revoke error:", err instanceof Error ? err.message : "Unknown");
      throw new Error("DATABASE_WRITE_ERROR");
    }
  }
}

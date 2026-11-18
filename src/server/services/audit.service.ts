import prisma from "@/lib/prisma";
import type { AuthActor } from "@/lib/auth/route-guard";

export interface LogAuditInput {
  actor?: AuthActor | { user?: { id?: string; name?: string; role?: string } } | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
}

export class AuditService {
  async log(input: LogAuditInput) {
    try {
      const user = input.actor?.user;
      return await prisma.auditLog.create({
        data: {
          userId: user?.id || null,
          userName: user?.name || "System",
          userRole: (user?.role as any) || "SYSTEM",
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId || null,
          oldValues: input.oldValues
            ? typeof input.oldValues === "string"
              ? input.oldValues
              : JSON.stringify(input.oldValues)
            : null,
          newValues: input.newValues
            ? typeof input.newValues === "string"
              ? input.newValues
              : JSON.stringify(input.newValues)
            : null,
          ipAddress: input.ipAddress || "127.0.0.1"
        }
      });
    } catch (err: any) {
      console.error("[AUDIT_SERVICE_LOG_ERROR]:", err.message);
      return null;
    }
  }
}

export const auditService = new AuditService();

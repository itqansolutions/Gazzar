import { AuditLog, User } from "@/types";
import { initialAuditLogs } from "./mockData";

let auditLogsStore: AuditLog[] = [...initialAuditLogs];

export function logAuditEvent(params: {
  user?: User | { id?: string; name?: string; role?: string } | null;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
}) {
  const newLog: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    userId: params.user?.id || "system",
    userName: params.user?.name || "النظام / System",
    userRole: params.user?.role || "SYSTEM",
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    oldValues: params.oldValues ? (typeof params.oldValues === "string" ? params.oldValues : JSON.stringify(params.oldValues)) : undefined,
    newValues: params.newValues ? (typeof params.newValues === "string" ? params.newValues : JSON.stringify(params.newValues)) : undefined,
    ipAddress: params.ipAddress || "127.0.0.1",
    createdAt: new Date().toISOString()
  };

  auditLogsStore.unshift(newLog);
  return newLog;
}

export function getAuditLogs(): AuditLog[] {
  return [...auditLogsStore];
}
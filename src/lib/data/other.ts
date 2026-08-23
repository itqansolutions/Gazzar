import {
  ClientAssessment,
  SessionCalendar,
  MealPlan,
  Membership,
  AuditLog,
  Notification
} from "@/types";

export const initialAssessments: ClientAssessment[] = [];
export const initialCalendars: SessionCalendar[] = [];
export const initialMealPlans: MealPlan[] = [];
export const initialMemberships: Membership[] = [];
export const initialAuditLogs: AuditLog[] = [
  {
    id: "audit-init",
    userId: "user-admin",
    userName: "أحمد الجزار (المدير العام)",
    userRole: "ADMIN",
    action: "SYSTEM_INITIALIZATION",
    entityType: "System",
    entityId: "init",
    newValues: "Clean Academy Database Initialized with Admin Account",
    ipAddress: "127.0.0.1",
    createdAt: new Date().toISOString()
  }
];
export const initialNotifications: Notification[] = [];

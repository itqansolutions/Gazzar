import prisma from "@/lib/prisma";
import { NOTIFICATION_TYPES, NotificationType } from "@/lib/notification-types";

export interface SendNotificationInput {
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  link?: string | null;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
}

export class NotificationService {
  /**
   * Sends an in-app notification with strict deduplication based on stable cycle / entity keys.
   * If relatedEntityId is provided, checks if ANY notification (read or unread)
   * with the same userId, type, and relatedEntityId already exists.
   */
  async sendDeduplicated(input: SendNotificationInput) {
    if (input.relatedEntityId) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: input.userId,
          type: input.type,
          relatedEntityId: input.relatedEntityId,
        },
      });

      if (existing) {
        // Deduplicated: already sent for this stable cycle or entity
        return existing;
      }
    }

    return await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        relatedEntityType: input.relatedEntityType ?? null,
        read: false,
      },
    });
  }

  /**
   * Retrieves notifications for a user, sorted descending by date.
   */
  async getUserNotifications(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
    const where: any = { userId };
    if (options?.unreadOnly) {
      where.read = false;
    }

    return await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
    });
  }

  /**
   * Gets unread count for badge display.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: { userId, read: false },
    });
  }

  /**
   * Marks a specific notification as read. Enforces owner check.
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return null;
    }

    if (notification.userId !== userId) {
      throw new Error("Forbidden: You can only update your own notifications");
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /**
   * Marks all notifications as read for a given user.
   */
  async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}

export const notificationService = new NotificationService();

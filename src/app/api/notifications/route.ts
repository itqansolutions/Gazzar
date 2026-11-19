import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/route-guard";
import { notificationService } from "@/server/services/notification.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const [notifications, unreadCount] = await Promise.all([
      notificationService.getUserNotifications(auth.actor.user.id, { unreadOnly, limit }),
      notificationService.getUnreadCount(auth.actor.user.id)
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error: any) {
    console.error("[GET /api/notifications] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

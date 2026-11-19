import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/route-guard";
import { notificationService } from "@/server/services/notification.service";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    await notificationService.markAllAsRead(auth.actor.user.id);
    return NextResponse.json({ success: true, message: "All notifications marked as read" });
  } catch (error: any) {
    console.error("[PATCH /api/notifications/read-all] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/route-guard";
import { notificationService } from "@/server/services/notification.service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);

    const updated = await notificationService.markAsRead(id, auth.actor.user.id);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/notifications/[id]/read] Error:", error);
    const status = error.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

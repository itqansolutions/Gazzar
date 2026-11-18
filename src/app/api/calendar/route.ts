import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/route-guard";
import { calendarService } from "@/server/services/calendar.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const sportId = searchParams.get("sportId") || undefined;
    const coachId = searchParams.get("coachId") || undefined;
    const athleteId = searchParams.get("athleteId") || undefined;
    const viewParam = searchParams.get("view")?.toUpperCase();
    const view = viewParam === "EVENTS" || viewParam === "WORKOUTS" ? viewParam : "ALL";

    const data = await calendarService.getUnifiedCalendar(
      {
        startDate,
        endDate,
        sportId,
        coachId,
        athleteId,
        view
      },
      auth.actor
    );

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error("[GET /api/calendar] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load calendar" },
      { status: 500 }
    );
  }
}

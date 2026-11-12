import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { coachService } from "@/server/services/coach.service";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const coaches = await coachService.getCoaches();
    return NextResponse.json({ success: true, data: coaches });
  } catch (err: any) {
    console.error("[API_COACHES_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const newCoach = await coachService.createCoach(body);
    return NextResponse.json({ success: true, data: newCoach }, { status: 201 });
  } catch (err: any) {
    console.error("[API_COACHES_POST_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { coachService } from "@/server/services/coach.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const coaches = await coachService.getCoaches();
    return NextResponse.json({ success: true, data: coaches });
  } catch (err: any) {
    console.error("[API_COACHES_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newCoach = await coachService.createCoach(body);
    return NextResponse.json({ success: true, data: newCoach }, { status: 201 });
  } catch (err: any) {
    console.error("[API_COACHES_POST_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

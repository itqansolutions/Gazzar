import { NextRequest, NextResponse } from "next/server";
import { sessionService } from "@/server/services/session.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessions = await sessionService.getSessions();
    return NextResponse.json({ success: true, data: sessions });
  } catch (error: any) {
    console.error("[GET /api/sessions] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await sessionService.createSession(body);
    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/sessions] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const attendance = await sessionService.updateAttendance(
      body.sessionId,
      body.clientId,
      body.status,
      body.notes
    );
    return NextResponse.json({ success: true, data: attendance });
  } catch (error: any) {
    console.error("[PATCH /api/sessions] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

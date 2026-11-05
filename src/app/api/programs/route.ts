import { NextRequest, NextResponse } from "next/server";
import { programService } from "@/server/services/program.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const programs = await programService.getPrograms();
    return NextResponse.json({ success: true, data: programs });
  } catch (error: any) {
    console.error("[GET /api/programs] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "APPLY") {
      const assignments = await programService.applyProgramToClient(
        body.programId,
        body.clientId,
        body.coachId,
        body.startDate
      );
      return NextResponse.json({ success: true, data: assignments });
    }

    const program = await programService.createProgram(body);
    return NextResponse.json({ success: true, data: program }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/programs] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

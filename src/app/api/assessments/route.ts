import { NextRequest, NextResponse } from "next/server";
import { healthService } from "@/server/services/health.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const assessments = await healthService.getAssessments(clientId);
    return NextResponse.json({ success: true, data: assessments });
  } catch (error: any) {
    console.error("[GET /api/assessments] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const assessment = await healthService.createAssessment(body);
    return NextResponse.json({ success: true, data: assessment }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/assessments] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { healthService } from "@/server/services/health.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await req.json();

    const restriction = await healthService.addMedicalRestriction(clientId, body);
    return NextResponse.json({ success: true, data: restriction });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/medical] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add medical restriction" },
      { status: 500 }
    );
  }
}

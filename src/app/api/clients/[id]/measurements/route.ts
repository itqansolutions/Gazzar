import { NextRequest, NextResponse } from "next/server";
import { healthService } from "@/server/services/health.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await req.json();

    const measurement = await healthService.addMeasurement(clientId, body);
    return NextResponse.json({ success: true, data: measurement });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/measurements] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add measurement" },
      { status: 500 }
    );
  }
}

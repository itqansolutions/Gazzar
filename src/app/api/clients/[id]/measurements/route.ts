import { NextRequest, NextResponse } from "next/server";
import { healthService } from "@/server/services/health.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id: clientId } = await params;
    const access = await requireClientAccess(auth.actor, clientId);
    if (!access.ok) return access.response;

    const body = await req.json();

    const measurement = await healthService.addMeasurement(access.client.id, body);
    return NextResponse.json({ success: true, data: measurement });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/measurements] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add measurement" },
      { status: 500 }
    );
  }
}

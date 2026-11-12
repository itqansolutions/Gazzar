import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { healthService } from "@/server/services/health.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id: clientId } = await params;
    const access = await requireClientAccess(auth.actor, clientId);
    if (!access.ok) return access.response;

    const body = await req.json();

    const restriction = await healthService.addMedicalRestriction(access.client.id, body);
    return NextResponse.json({ success: true, data: restriction });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/medical] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add medical restriction" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/route-guard";
import { sportService, SportServiceError } from "@/server/services/sport.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const sport = await sportService.getSportById(id);
    return NextResponse.json({ success: true, data: sport });
  } catch (err: any) {
    console.error("[API_SPORTS_ID_GET_ERROR]:", err);
    const status = err instanceof SportServiceError ? err.statusCode : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await req.json();
    const updated = await sportService.updateSport(id, body);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[API_SPORTS_PATCH_ERROR]:", err);
    const status = err instanceof SportServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    await sportService.deleteSport(id);

    return NextResponse.json({ success: true, message: "Sport deleted successfully" });
  } catch (err: any) {
    console.error("[API_SPORTS_DELETE_ERROR]:", err);
    const status = err instanceof SportServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

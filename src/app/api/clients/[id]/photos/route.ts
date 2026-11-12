import { NextRequest, NextResponse } from "next/server";
import { healthService } from "@/server/services/health.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id: clientId } = await params;
    const access = await requireClientAccess(auth.actor, clientId);
    if (!access.ok) return access.response;

    const photos = await healthService.getProgressPhotos(access.client.id);
    return NextResponse.json({ success: true, data: photos });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
    const photo = await healthService.addProgressPhoto(access.client.id, body);
    return NextResponse.json({ success: true, data: photo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

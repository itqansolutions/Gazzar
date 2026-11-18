import { NextRequest, NextResponse } from "next/server";
import { healthService, HealthServiceError } from "@/server/services/health.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const access = await requireClientAccess(auth.actor, id);
    if (!access.ok) return access.response;

    const photos = await healthService.getProgressPhotos(access.client.id);
    return NextResponse.json({ success: true, data: photos });
  } catch (error: any) {
    console.error("[GET /api/clients/[id]/photos] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const access = await requireClientAccess(auth.actor, id);
    if (!access.ok) return access.response;

    const body = await req.json();
    const photo = await healthService.addProgressPhoto(access.client.id, body, auth.actor);
    return NextResponse.json({ success: true, data: photo }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/photos] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const access = await requireClientAccess(auth.actor, id);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("photoId") || searchParams.get("id");

    if (!photoId) {
      return NextResponse.json({ success: false, error: "photoId is required" }, { status: 400 });
    }

    const result = await healthService.deleteProgressPhoto(photoId, auth.actor, access.client.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[DELETE /api/clients/[id]/photos] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

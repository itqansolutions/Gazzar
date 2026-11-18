import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
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

    const notes = await healthService.getClientNotes(access.client.id, auth.actor);
    return NextResponse.json({ success: true, data: notes });
  } catch (error: any) {
    console.error("[GET /api/clients/[id]/notes] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const access = await requireClientAccess(auth.actor, id);
    if (!access.ok) return access.response;

    const body = await req.json();

    const note = await healthService.addClientNote(
      access.client.id,
      auth.actor.user.id,
      body.noteType,
      body.content,
      auth.actor
    );
    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/notes] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add client note" },
      { status }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await Promise.resolve(params);
    const access = await requireClientAccess(auth.actor, id);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get("noteId") || searchParams.get("id");

    if (!noteId) {
      return NextResponse.json({ success: false, error: "noteId is required" }, { status: 400 });
    }

    const result = await healthService.deleteClientNote(noteId, auth.actor, access.client.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[DELETE /api/clients/[id]/notes] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

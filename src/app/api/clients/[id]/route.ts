import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { clientService } from "@/server/services/client.service";
import { requireAuth, requireClientAccess } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const access = await requireClientAccess(auth.actor, params.id);
    if (!access.ok) return access.response;

    const client = await clientService.getClientById(access.client.id);
    if (!client) {
      return NextResponse.json({ success: false, message: "Client not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: client });
  } catch (err: any) {
    console.error("[API_CLIENT_ID_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const access = await requireClientAccess(auth.actor, params.id);
    if (!access.ok) return access.response;

    const body = await request.json();
    const updated = await clientService.updateClient(access.client.id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[API_CLIENT_ID_PATCH_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    await clientService.deleteClient(params.id);
    return NextResponse.json({ success: true, message: "Client deleted successfully" });
  } catch (err: any) {
    console.error("[API_CLIENT_ID_DELETE_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

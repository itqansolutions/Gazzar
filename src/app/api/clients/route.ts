import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { clientService } from "@/server/services/client.service";
import { getAssignedClientIdsForActor, requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "ALL") as any;
    const search = searchParams.get("search") || undefined;

    const allowedClientIds = await getAssignedClientIdsForActor(auth.actor);
    const clients = await clientService.getClients({
      status,
      search,
      clientIds: allowedClientIds ?? undefined
    });
    return NextResponse.json({ success: true, data: clients });
  } catch (err: any) {
    console.error("[API_CLIENTS_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const coachId =
      body.coachId ||
      (auth.actor.user.role === UserRole.COACH ? auth.actor.coachProfileId ?? undefined : undefined);

    const newClient = await clientService.createClient({
      ...body,
      coachId
    });
    return NextResponse.json({ success: true, data: newClient }, { status: 201 });
  } catch (err: any) {
    console.error("[API_CLIENTS_POST_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
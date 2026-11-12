import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/route-guard";
import { sportService, SportServiceError } from "@/server/services/sport.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const search = searchParams.get("search") || undefined;

    const sports = await sportService.getSports({ activeOnly, search });
    return NextResponse.json({ success: true, data: sports });
  } catch (err: any) {
    console.error("[API_SPORTS_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const sport = await sportService.createSport(body);

    return NextResponse.json({ success: true, data: sport }, { status: 201 });
  } catch (err: any) {
    console.error("[API_SPORTS_POST_ERROR]:", err);
    const status = err instanceof SportServiceError ? err.statusCode : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

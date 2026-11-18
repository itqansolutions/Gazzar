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

    const goals = await healthService.getGoals(access.client.id);
    return NextResponse.json({ success: true, data: goals });
  } catch (error: any) {
    console.error("[GET /api/clients/[id]/goals] Error:", error);
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
    const goal = await healthService.addGoal(access.client.id, body, auth.actor);
    return NextResponse.json({ success: true, data: goal }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/goals] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function PATCH(
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
    if (!body.goalId) {
      return NextResponse.json({ success: false, error: "goalId is required" }, { status: 400 });
    }

    const updated = await healthService.updateGoal(body.goalId, body, auth.actor);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/clients/[id]/goals] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
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
    const goalId = searchParams.get("goalId") || searchParams.get("id");

    if (!goalId) {
      return NextResponse.json({ success: false, error: "goalId is required" }, { status: 400 });
    }

    const result = await healthService.deleteGoal(goalId, auth.actor, access.client.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[DELETE /api/clients/[id]/goals] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
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

    const measurements = await prisma.clientMeasurementHistory.findMany({
      where: { clientId: access.client.id },
      include: {
        recordedByCoach: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      },
      orderBy: { date: "asc" }
    });

    return NextResponse.json({ success: true, data: measurements });
  } catch (error: any) {
    console.error("[GET /api/clients/[id]/measurements] Error:", error);
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

    const measurement = await healthService.addMeasurement(access.client.id, body, auth.actor);
    return NextResponse.json({ success: true, data: measurement }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/clients/[id]/measurements] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 400;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add measurement" },
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
    const measurementId = searchParams.get("measurementId") || searchParams.get("id");

    if (!measurementId) {
      return NextResponse.json(
        { success: false, error: "measurementId query parameter is required" },
        { status: 400 }
      );
    }

    const result = await healthService.deleteMeasurement(measurementId, auth.actor, access.client.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[DELETE /api/clients/[id]/measurements] Error:", error);
    const status = error instanceof HealthServiceError ? error.statusCode : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

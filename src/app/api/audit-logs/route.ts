import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    console.error("[GET /api/audit-logs] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const log = await prisma.auditLog.create({
      data: {
        userId: auth.actor.user.id,
        userName: auth.actor.user.name,
        userRole: auth.actor.user.role,
        action: body.action,
        entityType: body.entityType,
        entityId: body.entityId || null,
        oldValues: body.oldValues ? JSON.stringify(body.oldValues) : null,
        newValues: body.newValues ? JSON.stringify(body.newValues) : null,
        ipAddress: body.ipAddress || null
      }
    });
    return NextResponse.json({ success: true, data: log }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/audit-logs] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

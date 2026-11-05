import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
    const body = await req.json();
    const log = await prisma.auditLog.create({
      data: {
        userId: body.userId || null,
        userName: body.userName || null,
        userRole: body.userRole || null,
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

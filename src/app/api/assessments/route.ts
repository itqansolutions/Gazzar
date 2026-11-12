import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { healthService } from "@/server/services/health.service";
import {
  getAssignedClientIdsForActor,
  requireAuth,
  requireClientAccess
} from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const requestedClientId = searchParams.get("clientId") || undefined;

    if (requestedClientId) {
      const access = await requireClientAccess(auth.actor, requestedClientId);
      if (!access.ok) return access.response;
      const assessments = await healthService.getAssessments(access.client.id);
      return NextResponse.json({ success: true, data: assessments });
    }

    const allowedClientIds = await getAssignedClientIdsForActor(auth.actor);
    if (allowedClientIds !== null) {
      const assessments = await prisma.clientAssessment.findMany({
        where: { clientId: { in: allowedClientIds } },
        include: {
          client: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          coach: { include: { user: { select: { id: true, name: true, avatar: true } } } }
        },
        orderBy: { date: "desc" }
      });
      return NextResponse.json({ success: true, data: assessments });
    }

    const assessments = await healthService.getAssessments();
    return NextResponse.json({ success: true, data: assessments });
  } catch (error: any) {
    console.error("[GET /api/assessments] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH, UserRole.COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    if (!body.clientId) {
      return NextResponse.json({ success: false, error: "clientId is required" }, { status: 400 });
    }

    const access = await requireClientAccess(auth.actor, body.clientId);
    if (!access.ok) return access.response;

    const assessment = await healthService.createAssessment({
      ...body,
      clientId: access.client.id,
      coachId: body.coachId || auth.actor.coachProfileId || undefined
    });
    return NextResponse.json({ success: true, data: assessment }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/assessments] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

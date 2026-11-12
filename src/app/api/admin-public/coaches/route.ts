import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const coaches = await prisma.coachProfile.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        publicProfile: true
      },
      orderBy: { user: { name: "asc" } }
    });

    return NextResponse.json({ success: true, data: coaches });
  } catch (error: any) {
    console.error("[GET /api/admin-public/coaches] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { coachProfileId, isPublic, publicTitle, publicBio, displayOrder } = body;

    if (!coachProfileId) {
      return NextResponse.json(
        { success: false, error: "coachProfileId is required" },
        { status: 400 }
      );
    }

    const publicProfile = await prisma.publicCoachProfile.upsert({
      where: { coachProfileId },
      update: {
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
        ...(publicTitle !== undefined && { publicTitle }),
        ...(publicBio !== undefined && { publicBio }),
        ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) })
      },
      create: {
        coachProfileId,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        publicTitle,
        publicBio,
        displayOrder: displayOrder ? Number(displayOrder) : 0
      }
    });

    return NextResponse.json({ success: true, data: publicProfile });
  } catch (error: any) {
    console.error("[POST /api/admin-public/coaches] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const publicProfile = await prisma.publicCoachProfile.findUnique({
      where: { id: params.id },
      include: {
        coachProfile: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        }
      }
    });

    if (!publicProfile) {
      return NextResponse.json({ success: false, error: "Public profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: publicProfile });
  } catch (error: any) {
    console.error("[GET /api/admin-public/coaches/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const updated = await prisma.publicCoachProfile.update({
      where: { id: params.id },
      data: {
        ...(body.isPublic !== undefined && { isPublic: Boolean(body.isPublic) }),
        ...(body.publicTitle !== undefined && { publicTitle: body.publicTitle }),
        ...(body.publicBio !== undefined && { publicBio: body.publicBio }),
        ...(body.displayOrder !== undefined && { displayOrder: Number(body.displayOrder) })
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PUT /api/admin-public/coaches/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    await prisma.publicCoachProfile.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: "Public coach profile reset successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/admin-public/coaches/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

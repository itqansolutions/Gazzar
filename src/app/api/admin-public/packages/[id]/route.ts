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

    const pkg = await prisma.publicPackage.findUnique({
      where: { id: params.id }
    });

    if (!pkg) {
      return NextResponse.json({ success: false, error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: pkg });
  } catch (error: any) {
    console.error("[GET /api/admin-public/packages/[id]] Error:", error);
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
    const updated = await prisma.publicPackage.update({
      where: { id: params.id },
      data: {
        ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr }),
        ...(body.descriptionEn !== undefined && { descriptionEn: body.descriptionEn }),
        ...(body.descriptionAr !== undefined && { descriptionAr: body.descriptionAr }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.durationDays !== undefined && { durationDays: Number(body.durationDays) }),
        ...(body.sessionsCount !== undefined && {
          sessionsCount: body.sessionsCount ? Number(body.sessionsCount) : null
        }),
        ...(body.sportsIncluded !== undefined && { sportsIncluded: body.sportsIncluded }),
        ...(body.benefits !== undefined && { benefits: body.benefits }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        ...(body.isFeatured !== undefined && { isFeatured: Boolean(body.isFeatured) }),
        ...(body.displayOrder !== undefined && { displayOrder: Number(body.displayOrder) })
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PUT /api/admin-public/packages/[id]] Error:", error);
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

    await prisma.publicPackage.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: "Package deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/admin-public/packages/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

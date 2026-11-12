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

    const image = await prisma.galleryImage.findUnique({
      where: { id: params.id }
    });

    if (!image) {
      return NextResponse.json({ success: false, error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: image });
  } catch (error: any) {
    console.error("[GET /api/admin-public/gallery/[id]] Error:", error);
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
    const updated = await prisma.galleryImage.update({
      where: { id: params.id },
      data: {
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.storageKey !== undefined && { storageKey: body.storageKey }),
        ...(body.caption !== undefined && { caption: body.caption }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        ...(body.displayOrder !== undefined && { displayOrder: Number(body.displayOrder) })
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PUT /api/admin-public/gallery/[id]] Error:", error);
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

    await prisma.galleryImage.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: "Gallery image deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/admin-public/gallery/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

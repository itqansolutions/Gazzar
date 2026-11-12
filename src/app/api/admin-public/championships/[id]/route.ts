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

    const championship = await prisma.championship.findUnique({
      where: { id: params.id }
    });

    if (!championship) {
      return NextResponse.json({ success: false, error: "Championship not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: championship });
  } catch (error: any) {
    console.error("[GET /api/admin-public/championships/[id]] Error:", error);
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
    const updated = await prisma.championship.update({
      where: { id: params.id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.year !== undefined && { year: body.year ? Number(body.year) : null }),
        ...(body.date !== undefined && { date: body.date ? new Date(body.date) : null }),
        ...(body.imageUrls !== undefined && { imageUrls: body.imageUrls }),
        ...(body.videoUrl !== undefined && { videoUrl: body.videoUrl }),
        ...(body.results !== undefined && { results: body.results }),
        ...(body.isPublished !== undefined && { isPublished: Boolean(body.isPublished) }),
        ...(body.isFeatured !== undefined && { isFeatured: Boolean(body.isFeatured) }),
        ...(body.displayOrder !== undefined && { displayOrder: Number(body.displayOrder) })
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PUT /api/admin-public/championships/[id]] Error:", error);
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

    await prisma.championship.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: "Championship deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/admin-public/championships/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

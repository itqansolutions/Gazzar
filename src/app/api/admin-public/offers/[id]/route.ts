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

    const offer = await prisma.publicOffer.findUnique({
      where: { id: params.id },
      include: { package: true }
    });

    if (!offer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: offer });
  } catch (error: any) {
    console.error("[GET /api/admin-public/offers/[id]] Error:", error);
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
    const updated = await prisma.publicOffer.update({
      where: { id: params.id },
      data: {
        ...(body.packageId !== undefined && { packageId: body.packageId || null }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.discount !== undefined && {
          discount: body.discount ? Number(body.discount) : null
        }),
        ...(body.promoPrice !== undefined && {
          promoPrice: body.promoPrice ? Number(body.promoPrice) : null
        }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: new Date(body.endDate) }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) })
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PUT /api/admin-public/offers/[id]] Error:", error);
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

    await prisma.publicOffer.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: "Offer deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE /api/admin-public/offers/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

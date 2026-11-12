import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const offers = await prisma.publicOffer.findMany({
      include: {
        package: {
          select: { id: true, nameEn: true, price: true, currency: true }
        }
      },
      orderBy: { endDate: "desc" }
    });

    return NextResponse.json({ success: true, data: offers });
  } catch (error: any) {
    console.error("[GET /api/admin-public/offers] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const {
      packageId,
      title,
      description,
      discount,
      promoPrice,
      startDate,
      endDate,
      isActive = true
    } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "title, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const created = await prisma.publicOffer.create({
      data: {
        packageId: packageId || null,
        title,
        description,
        discount: discount ? Number(discount) : null,
        promoPrice: promoPrice ? Number(promoPrice) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: Boolean(isActive)
      }
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/admin-public/offers] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

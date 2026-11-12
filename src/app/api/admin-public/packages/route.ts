import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const packages = await prisma.publicPackage.findMany({
      orderBy: { displayOrder: "asc" }
    });

    return NextResponse.json({ success: true, data: packages });
  } catch (error: any) {
    console.error("[GET /api/admin-public/packages] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const {
      nameEn,
      nameAr,
      descriptionEn,
      descriptionAr,
      price,
      currency = "EGP",
      durationDays,
      sessionsCount,
      sportsIncluded = [],
      benefits = [],
      isActive = true,
      isFeatured = false,
      displayOrder = 0
    } = body;

    if (!nameEn || price === undefined || !durationDays) {
      return NextResponse.json(
        { success: false, error: "nameEn, price, and durationDays are required" },
        { status: 400 }
      );
    }

    const created = await prisma.publicPackage.create({
      data: {
        nameEn,
        nameAr,
        descriptionEn,
        descriptionAr,
        price: Number(price),
        currency,
        durationDays: Number(durationDays),
        sessionsCount: sessionsCount ? Number(sessionsCount) : null,
        sportsIncluded: Array.isArray(sportsIncluded) ? sportsIncluded : [],
        benefits: Array.isArray(benefits) ? benefits : [],
        isActive: Boolean(isActive),
        isFeatured: Boolean(isFeatured),
        displayOrder: Number(displayOrder)
      }
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/admin-public/packages] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

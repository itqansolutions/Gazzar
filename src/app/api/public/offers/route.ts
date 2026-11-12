import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const offers = await prisma.publicOffer.findMany({
      where: {
        isActive: true,
        endDate: { gte: new Date() }
      },
      include: {
        package: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
            price: true,
            currency: true,
            durationDays: true
          }
        }
      },
      orderBy: { endDate: "asc" }
    });

    return NextResponse.json(
      { success: true, data: offers },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate"
        }
      }
    );
  } catch (error: any) {
    console.error("[GET /api/public/offers] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load offers" },
      { status: 500 }
    );
  }
}

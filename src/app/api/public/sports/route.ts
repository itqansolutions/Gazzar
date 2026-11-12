import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sports = await prisma.sport.findMany({
      where: { isActive: true },
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        icon: true,
        imageUrl: true,
        descriptionEn: true,
        descriptionAr: true,
        categories: true
      },
      orderBy: { nameEn: "asc" }
    });

    return NextResponse.json(
      { success: true, data: sports },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
        }
      }
    );
  } catch (error: any) {
    console.error("[GET /api/public/sports] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load sports" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packages = await prisma.publicPackage.findMany({
      where: { isActive: true },
      include: {
        offers: {
          where: {
            isActive: true,
            endDate: { gte: new Date() }
          }
        }
      },
      orderBy: { displayOrder: "asc" }
    });

    return NextResponse.json(
      { success: true, data: packages },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate"
        }
      }
    );
  } catch (error: any) {
    console.error("[GET /api/public/packages] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load packages" },
      { status: 500 }
    );
  }
}

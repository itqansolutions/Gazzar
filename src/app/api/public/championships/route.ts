import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const championships = await prisma.championship.findMany({
      where: { isPublished: true },
      orderBy: [
        { isFeatured: "desc" },
        { displayOrder: "asc" },
        { year: "desc" }
      ]
    });

    return NextResponse.json(
      { success: true, data: championships },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
        }
      }
    );
  } catch (error: any) {
    console.error("[GET /api/public/championships] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load championships" },
      { status: 500 }
    );
  }
}

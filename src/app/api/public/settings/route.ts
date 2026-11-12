import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.academySetting.findMany();
    const dictionary: Record<string, string> = {};
    for (const s of settings) {
      dictionary[s.key] = s.value;
    }

    return NextResponse.json(
      { success: true, data: dictionary },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
        }
      }
    );
  } catch (error: any) {
    console.error("[GET /api/public/settings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

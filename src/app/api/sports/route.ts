import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sports = await prisma.sport.findMany({
      orderBy: { nameEn: "asc" }
    });
    return NextResponse.json({ success: true, data: sports });
  } catch (err: any) {
    console.error("[API_SPORTS_GET_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

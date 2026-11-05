import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nameEn = body.nameEn || body.name;
    const nameAr = body.nameAr || body.name;
    const sport = await prisma.sport.create({
      data: {
        nameEn,
        nameAr,
        icon: body.icon || "🏆",
        descriptionEn: body.description || null,
        descriptionAr: body.description || null,
        categories: body.categories || ["Training", "Fitness"]
      }
    });

    return NextResponse.json({ success: true, data: sport }, { status: 201 });
  } catch (err: any) {
    console.error("[API_SPORTS_POST_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const championships = await prisma.championship.findMany({
      orderBy: [{ displayOrder: "asc" }, { year: "desc" }]
    });

    return NextResponse.json({ success: true, data: championships });
  } catch (error: any) {
    console.error("[GET /api/admin-public/championships] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const {
      title,
      description,
      year,
      date,
      imageUrls = [],
      videoUrl,
      results,
      isPublished = true,
      isFeatured = false,
      displayOrder = 0
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const created = await prisma.championship.create({
      data: {
        title,
        description,
        year: year ? Number(year) : null,
        date: date ? new Date(date) : null,
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
        videoUrl: videoUrl || null,
        results: results || null,
        isPublished: Boolean(isPublished),
        isFeatured: Boolean(isFeatured),
        displayOrder: Number(displayOrder)
      }
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/admin-public/championships] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

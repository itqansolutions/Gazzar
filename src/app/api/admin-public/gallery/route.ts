import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const images = await prisma.galleryImage.findMany({
      orderBy: { displayOrder: "asc" }
    });

    return NextResponse.json({ success: true, data: images });
  } catch (error: any) {
    console.error("[GET /api/admin-public/gallery] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { imageUrl, storageKey, caption, category, isActive = true, displayOrder = 0 } = body;

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: "imageUrl is required" }, { status: 400 });
    }

    const created = await prisma.galleryImage.create({
      data: {
        imageUrl,
        storageKey: storageKey || null,
        caption: caption || null,
        category: category || null,
        isActive: Boolean(isActive),
        displayOrder: Number(displayOrder)
      }
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/admin-public/gallery] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

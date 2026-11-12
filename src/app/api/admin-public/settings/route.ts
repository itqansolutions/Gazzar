import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const settings = await prisma.academySetting.findMany();
    const dictionary: Record<string, string> = {};
    for (const s of settings) {
      dictionary[s.key] = s.value;
    }

    return NextResponse.json({ success: true, data: dictionary });
  } catch (error: any) {
    console.error("[GET /api/admin-public/settings] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json(); // Expected: Record<string, string>
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Settings object required" },
        { status: 400 }
      );
    }

    const updates = Object.entries(body).map(([key, val]) =>
      prisma.academySetting.upsert({
        where: { key },
        update: { value: String(val ?? "") },
        create: { key, value: String(val ?? "") }
      })
    );

    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      message: "Academy settings updated successfully"
    });
  } catch (error: any) {
    console.error("[PUT /api/admin-public/settings] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

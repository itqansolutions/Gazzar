import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const dataToUpdate: any = {};
    if (body.nameEn) dataToUpdate.nameEn = body.nameEn;
    if (body.nameAr) dataToUpdate.nameAr = body.nameAr;
    if (body.name) {
      dataToUpdate.nameEn = body.name;
      dataToUpdate.nameAr = body.name;
    }
    if (body.icon !== undefined) dataToUpdate.icon = body.icon;
    if (body.description !== undefined) dataToUpdate.description = body.description;
    if (body.isActive !== undefined) dataToUpdate.isActive = body.isActive;

    const updated = await prisma.sport.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[API_SPORTS_PATCH_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.sport.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Sport deleted successfully" });
  } catch (err: any) {
    console.error("[API_SPORTS_DELETE_ERROR]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const isAdminOrHead =
      auth.actor.user.role === UserRole.ADMIN || auth.actor.user.role === UserRole.HEAD_COACH;
    if (!isAdminOrHead && auth.actor.user.id !== id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        createdAt: true,
        clientProfile: true,
        coachProfile: true
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (err: any) {
    console.error("[GET /api/users/[id]] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const dataToUpdate: any = {};
    if (body.name) dataToUpdate.name = body.name.trim();
    if (body.email) dataToUpdate.email = body.email.toLowerCase().trim();
    if (body.role && auth.actor.user.role === UserRole.ADMIN) dataToUpdate.role = body.role;
    if (body.phone !== undefined) dataToUpdate.phone = body.phone;
    if (body.avatar !== undefined) dataToUpdate.avatar = body.avatar;
    if (body.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        createdAt: true
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[PATCH /api/users/[id]] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (err: any) {
    console.error("[DELETE /api/users/[id]] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
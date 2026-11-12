import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.HEAD_COACH]);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity

    // Invalidate prior unused tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    // Create new token record
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const resetUrl = `${protocol}://${host}/reset-password?token=${rawToken}`;

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        resetUrl,
        expiresAt
      }
    });
  } catch (error: any) {
    console.error("[POST /api/auth/reset-link] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate password reset link" },
      { status: 500 }
    );
  }
}

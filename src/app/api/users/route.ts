import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        createdAt: true,
        clientProfile: {
          select: { id: true, status: true, weightKg: true, heightCm: true }
        },
        coachProfile: {
          select: { id: true, bio: true, specialties: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ success: true, data: users });
  } catch (err: any) {
    console.error("[GET /api/users] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email || !body.name || !body.role) {
      return NextResponse.json(
        { success: false, message: "Name, email and role are required" },
        { status: 400 }
      );
    }

    const email = body.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(body.password || "Gazzar@2026", 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name: body.name.trim(),
          role: body.role,
          phone: body.phone || null,
          avatar: body.avatar || null,
          passwordHash
        },
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

      if (body.role === "CLIENT") {
        await tx.clientProfile.create({
          data: {
            userId: newUser.id,
            status: "ACTIVE"
          }
        });
      } else if (body.role === "COACH" || body.role === "HEAD_COACH") {
        await tx.coachProfile.create({
          data: {
            userId: newUser.id,
            specialties: ["Strength & Conditioning", "Fitness"],
            yearsOfExperience: 1
          }
        });
      }

      return newUser;
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/users] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
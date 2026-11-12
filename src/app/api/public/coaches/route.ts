import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const coaches = await prisma.coachProfile.findMany({
      where: {
        publicProfile: {
          isPublic: true
        }
      },
      select: {
        id: true,
        specialties: true,
        bio: true,
        yearsOfExperience: true,
        user: {
          select: {
            name: true,
            avatar: true
          }
        },
        publicProfile: {
          select: {
            publicTitle: true,
            publicBio: true,
            displayOrder: true
          }
        }
      },
      orderBy: {
        publicProfile: {
          displayOrder: "asc"
        }
      }
    });

    // Strictly returns public-safe fields only (no userId, no email, no passwordHash)
    const formattedCoaches = coaches.map((c) => ({
      id: c.id,
      name: c.user.name,
      avatar: c.user.avatar || "/coach_abdullah_portrait.png",
      bio: c.publicProfile?.publicBio || c.bio,
      specialties: c.specialties || [],
      yearsOfExperience: c.yearsOfExperience || 0,
      title:
        c.publicProfile?.publicTitle ||
        (c.specialties?.[0] ? `Coach — ${c.specialties[0]}` : "Elite Coach"),
      displayOrder: c.publicProfile?.displayOrder ?? 0
    }));

    return NextResponse.json(
      { success: true, data: formattedCoaches },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
        }
      }
    );
  } catch (error: any) {
    console.error("[GET /api/public/coaches] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch public coaches" },
      { status: 500 }
    );
  }
}

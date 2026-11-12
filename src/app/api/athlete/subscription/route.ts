import { NextRequest, NextResponse } from "next/server";
import { UserRole, MembershipPlan, AttendanceStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/route-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const targetClientId = searchParams.get("clientId");

    let clientId: string | null = null;
    const isStaff =
      auth.actor.user.role === UserRole.ADMIN ||
      auth.actor.user.role === UserRole.HEAD_COACH ||
      auth.actor.user.role === UserRole.COACH;

    // Strict privacy enforcement: CLIENT role can ONLY see their own profile
    if (isStaff && targetClientId) {
      clientId = targetClientId;
    } else {
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: auth.actor.user.id },
        select: { id: true }
      });
      clientId = clientProfile?.id ?? null;
    }

    if (!clientId) {
      return NextResponse.json({
        success: true,
        data: null,
        computedStatus: "NO_ACTIVE_SUBSCRIPTION",
        message: "No athlete client profile linked to this user."
      });
    }

    // Retrieve client profile status
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { id: clientId },
      select: { id: true, status: true, membershipExpiry: true }
    });

    // Fetch client's latest membership
    const membership = await prisma.membership.findFirst({
      where: { clientId },
      orderBy: { endDate: "desc" }
    });

    if (!membership) {
      return NextResponse.json({
        success: true,
        data: null,
        computedStatus: "NO_ACTIVE_SUBSCRIPTION",
        message: "No membership found for this athlete."
      });
    }

    const now = new Date();
    const endDate = new Date(membership.endDate);
    const msDiff = endDate.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

    // Status logic conforming to Audit Task 3a
    let computedStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "SUSPENDED" = "ACTIVE";

    if (
      clientProfile?.status === "SUSPENDED" ||
      clientProfile?.status === "FROZEN"
    ) {
      computedStatus = "SUSPENDED";
    } else if (
      now.getTime() >= endDate.getTime() ||
      clientProfile?.status === "EXPIRED"
    ) {
      computedStatus = "EXPIRED";
    } else if (remainingDays <= 7 && remainingDays > 0) {
      computedStatus = "EXPIRING_SOON";
    } else {
      computedStatus = "ACTIVE";
    }

    // Session-based tracking for PERSONAL_TRAINING or GROUP_CLASS
    const isSessionBased =
      membership.planType === MembershipPlan.PERSONAL_TRAINING ||
      membership.planType === MembershipPlan.GROUP_CLASS;

    let attendedSessions = 0;
    let totalSessions: number | null = null;
    let sessionDetailsNote: string | null = null;

    if (isSessionBased) {
      try {
        attendedSessions = await prisma.sessionAttendance.count({
          where: {
            clientId,
            status: AttendanceStatus.PRESENT,
            session: {
              startTime: {
                gte: membership.startDate,
                lte: membership.endDate
              }
            }
          }
        });
      } catch {
        attendedSessions = 0;
      }

      // Check notes for explicitly written quota like "12 sessions"
      if (membership.notes) {
        const match = membership.notes.match(/(\d+)\s*(?:sessions|جلسات|session)/i);
        if (match) {
          totalSessions = parseInt(match[1], 10);
        }
      }

      if (!totalSessions) {
        sessionDetailsNote = "Contact Academy for session details";
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: membership.id,
        clientId: membership.clientId,
        planType: membership.planType,
        startDate: membership.startDate,
        endDate: membership.endDate,
        totalAmount: membership.totalAmount,
        paidAmount: membership.paidAmount,
        remainingAmount: membership.remainingAmount,
        paymentStatus: membership.paymentStatus,
        paymentMethod: membership.paymentMethod,
        notes: membership.notes,
        remainingDays,
        isExpired: computedStatus === "EXPIRED",
        computedStatus,
        clientStatus: clientProfile?.status,
        isSessionBased,
        attendedSessions,
        totalSessions,
        sessionDetailsNote
      }
    });
  } catch (error: any) {
    console.error("[GET /api/athlete/subscription] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

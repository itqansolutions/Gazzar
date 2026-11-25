import prisma from "@/lib/prisma";
import { MembershipPlan, PaymentStatus } from "@prisma/client";

export const MEMBERSHIP_PACKAGES = [
  {
    id: "pkg-1",
    nameEn: "12 Sessions",
    nameAr: "12 حصة",
    description: "12 sessions, valid for 30 days.",
    price: 2800,
    currency: "EGP",
    durationDays: 30,
    sessionsCount: 12,
    planType: MembershipPlan.GROUP_CLASS
  },
  {
    id: "pkg-2",
    nameEn: "1 Month (Unlimited)",
    nameAr: "شهر (غير محدود)",
    description: "Unlimited access for 1 month.",
    price: 3500,
    currency: "EGP",
    durationDays: 30,
    planType: MembershipPlan.MONTHLY
  },
  {
    id: "pkg-3",
    nameEn: "3 Months (Unlimited)",
    nameAr: "3 شهور (غير محدود)",
    description: "Unlimited access for 3 months.",
    price: 7500,
    currency: "EGP",
    durationDays: 90,
    planType: MembershipPlan.THREE_MONTHS
  },
  {
    id: "pkg-4",
    nameEn: "6 Months (Unlimited)",
    nameAr: "6 شهور (غير محدود)",
    description: "Unlimited access for 6 months.",
    price: 12000,
    currency: "EGP",
    durationDays: 180,
    planType: MembershipPlan.SIX_MONTHS
  }
];

export class MembershipService {
  /**
   * Get available membership packages
   */
  async getPackages() {
    // Single price list: the website CMS packages (Public Packages) are the source of truth.
    try {
      const rows = await prisma.publicPackage.findMany({
        where: { isActive: true },
        orderBy: [{ displayOrder: "asc" }, { price: "asc" }]
      });
      if (rows.length > 0) {
        return rows.map((r) => {
          const days = r.durationDays;
          const planType = r.sessionsCount
            ? MembershipPlan.GROUP_CLASS
            : days <= 45
            ? MembershipPlan.MONTHLY
            : days <= 120
            ? MembershipPlan.THREE_MONTHS
            : days <= 240
            ? MembershipPlan.SIX_MONTHS
            : MembershipPlan.ANNUAL;
          // Some CMS rows keep "(Unlimited)" in the Arabic-name field; only use nameEn as the display name.
          const nameEn = r.sessionsCount && !/session/i.test(r.nameEn) ? `${r.nameEn} (${r.sessionsCount} sessions)` : r.nameEn;
          return {
            id: r.id,
            nameEn,
            nameAr: r.nameAr || nameEn,
            description: r.descriptionEn || "",
            price: r.price,
            currency: r.currency,
            durationDays: days,
            sessionsCount: r.sessionsCount ?? undefined,
            planType
          };
        });
      }
    } catch (e) {
      console.error("[membership.getPackages] CMS read failed, using fallback list", e);
    }
    return MEMBERSHIP_PACKAGES;
  }

  /**
   * Get all active and past memberships with client info
   */
  async getMemberships() {
    return await prisma.membership.findMany({
      include: {
        client: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, avatar: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Create a new client membership and update their profile expiry
   */
  async createMembership(data: {
    clientId: string;
    planType: MembershipPlan;
    startDate: string | Date;
    endDate: string | Date;
    totalAmount: number;
    paidAmount?: number;
    paymentStatus?: PaymentStatus;
    paymentMethod?: string;
    notes?: string;
  }) {
    const paidAmount = Number(data.paidAmount ?? data.totalAmount);
    const totalAmount = Number(data.totalAmount);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    let paymentStatus = data.paymentStatus;
    if (!paymentStatus) {
      if (paidAmount >= totalAmount) paymentStatus = PaymentStatus.PAID;
      else if (paidAmount > 0) paymentStatus = PaymentStatus.PARTIAL;
      else paymentStatus = PaymentStatus.UNPAID;
    }

    return await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          clientId: data.clientId,
          planType: data.planType,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          totalAmount,
          paidAmount,
          remainingAmount,
          paymentStatus,
          paymentMethod: data.paymentMethod || "Cash",
          notes: data.notes || null
        },
        include: {
          client: {
            include: {
              user: true
            }
          }
        }
      });

      // Update client profile expiry date
      await tx.clientProfile.update({
        where: { id: data.clientId },
        data: {
          membershipExpiry: new Date(data.endDate),
          status: "ACTIVE"
        }
      });

      return membership;
    });
  }
}

export const membershipService = new MembershipService();

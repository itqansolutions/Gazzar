import prisma from "@/lib/prisma";
import { MembershipPlan, PaymentStatus } from "@prisma/client";

export const MEMBERSHIP_PACKAGES = [
  {
    id: "pkg-1",
    nameEn: "1 Month Standard",
    nameAr: "اشتراك شهر قياسي",
    description: "Full gym floor access, locker, sauna, and 1 fitness assessment.",
    price: 1500,
    currency: "EGP",
    durationDays: 30,
    planType: MembershipPlan.MONTHLY
  },
  {
    id: "pkg-2",
    nameEn: "3 Months Transformation",
    nameAr: "باقة التحول - 3 أشهر",
    description: "Full access, customized workout plan, monthly inbody test & nutrition check.",
    price: 3800,
    currency: "EGP",
    durationDays: 90,
    planType: MembershipPlan.THREE_MONTHS
  },
  {
    id: "pkg-3",
    nameEn: "6 Months Elite",
    nameAr: "باقة النخبة - 6 أشهر",
    description: "Priority access, nutrition guidance, quarterly body assessment & 3 guest passes.",
    price: 6800,
    currency: "EGP",
    durationDays: 180,
    planType: MembershipPlan.SIX_MONTHS
  },
  {
    id: "pkg-4",
    nameEn: "Annual Championship",
    nameAr: "الباقة السنوية - الأبطال",
    description: "Unlimited gym access 365 days, full VIP perks, freeze option (up to 45 days).",
    price: 11500,
    currency: "EGP",
    durationDays: 365,
    planType: MembershipPlan.ANNUAL
  },
  {
    id: "pkg-5",
    nameEn: "1-on-1 VIP PT (12 Sessions)",
    nameAr: "تدريب شخصي VIP (12 جلسة)",
    description: "12 private 1-on-1 coaching sessions with Head Coach or Elite Coach.",
    price: 5400,
    currency: "EGP",
    durationDays: 45,
    sessionsCount: 12,
    planType: MembershipPlan.PERSONAL_TRAINING
  }
];

export class MembershipService {
  /**
   * Get available membership packages
   */
  getPackages() {
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

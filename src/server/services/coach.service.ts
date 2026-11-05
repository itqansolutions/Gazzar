import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

export interface CreateCoachInput {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role?: UserRole;
  bio?: string;
  yearsOfExperience?: number;
  specialties?: string[];
  avatar?: string;
}

export interface UpdateCoachInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  bio?: string;
  yearsOfExperience?: number;
  specialties?: string[];
  avatar?: string;
}

export class CoachService {
  /**
   * Fetch all coaches with their user profile and active client count
   */
  async getCoaches() {
    const coaches = await prisma.coachProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            createdAt: true
          }
        },
        clientAssignments: {
          where: { active: true },
          select: { id: true, clientId: true }
        }
      },
      orderBy: { yearsOfExperience: "desc" }
    });

    return coaches.map((c) => ({
      ...c,
      assignedClientsCount: c.clientAssignments.length
    }));
  }

  /**
   * Fetch single coach profile
   */
  async getCoachById(id: string): Promise<any> {
    const coach = await prisma.coachProfile.findFirst({
      where: {
        OR: [{ id }, { userId: id }]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
            createdAt: true
          }
        },
        clientAssignments: {
          where: { active: true },
          include: {
            client: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phone: true, avatar: true }
                }
              }
            }
          }
        }
      }
    });

    if (!coach) {
      const user = await prisma.user.findUnique({
        where: { id }
      });
      if (user && (user.role === UserRole.COACH || user.role === UserRole.HEAD_COACH)) {
        await prisma.coachProfile.create({
          data: {
            userId: user.id,
            specialties: ["General Fitness", "Strength & Conditioning"],
            yearsOfExperience: 1
          }
        });
        return await this.getCoachById(id);
      }
    }

    return coach;
  }

  /**
   * Create coach and user atomically in PostgreSQL
   */
  async createCoach(data: CreateCoachInput) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      throw new Error(`Email ${normalizedEmail} is already registered to another user`);
    }

    const plainPassword = data.password || "A@123456";
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: data.name.trim(),
          passwordHash,
          role: data.role || UserRole.COACH,
          phone: data.phone?.trim() || "+20 100 000 0000",
          avatar: data.avatar || "/coach_dark_hero.jpg"
        }
      });

      const coach = await tx.coachProfile.create({
        data: {
          userId: user.id,
          bio: data.bio?.trim() || "Certified Coach at GX Fitness Academy",
          yearsOfExperience: data.yearsOfExperience ? Number(data.yearsOfExperience) : 3,
          specialties: data.specialties && data.specialties.length > 0 ? data.specialties : ["CrossFit", "Strength & Conditioning"]
        },
        include: { user: true }
      });

      return coach;
    });
  }

  /**
   * Update coach details and user profile
   */
  async updateCoach(id: string, data: UpdateCoachInput) {
    const existing = await prisma.coachProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] }
    });

    if (!existing) {
      throw new Error("Coach profile not found");
    }

    return await prisma.$transaction(async (tx) => {
      if (data.name || data.email || data.phone || data.role || data.avatar) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(data.name && { name: data.name.trim() }),
            ...(data.email && { email: data.email.toLowerCase().trim() }),
            ...(data.phone && { phone: data.phone.trim() }),
            ...(data.role && { role: data.role }),
            ...(data.avatar && { avatar: data.avatar })
          }
        });
      }

      const updated = await tx.coachProfile.update({
        where: { id: existing.id },
        data: {
          ...(data.bio !== undefined && { bio: data.bio.trim() }),
          ...(data.yearsOfExperience !== undefined && { yearsOfExperience: Number(data.yearsOfExperience) }),
          ...(data.specialties && { specialties: data.specialties })
        },
        include: { user: true }
      });

      return updated;
    });
  }

  /**
   * Delete coach and underlying user
   */
  async deleteCoach(id: string) {
    const existing = await prisma.coachProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] }
    });

    if (!existing) {
      throw new Error("Coach profile not found");
    }

    await prisma.user.delete({
      where: { id: existing.userId }
    });

    return true;
  }
}

export const coachService = new CoachService();

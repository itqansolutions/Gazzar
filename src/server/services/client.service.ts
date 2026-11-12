import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ClientStatus, Gender, CoachRoleInClient, UserRole } from "@prisma/client";

export interface CreateClientInput {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  gender?: Gender;
  dob?: string;
  heightCm?: number;
  weightKg?: number;
  address?: string;
  emergencyContact?: string;
  status?: ClientStatus;
  preferredSportId?: string;
  membershipExpiry?: string;
  coachId?: string;
  coachRole?: CoachRoleInClient;
  coachNotes?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  gender?: Gender;
  dob?: string;
  heightCm?: number;
  weightKg?: number;
  address?: string;
  emergencyContact?: string;
  status?: ClientStatus;
  preferredSportId?: string;
  membershipExpiry?: string;
  coachId?: string;
  coachRole?: CoachRoleInClient;
  coachNotes?: string;
}

export class ClientService {
  /**
   * Fetch all clients with related user, sport, and coach assignments
   */
  async getClients(filters?: { status?: ClientStatus | "ALL"; search?: string; clientIds?: string[] }) {
    const where: any = {};

    if (filters?.clientIds !== undefined) {
      where.id = { in: filters.clientIds };
    }

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters?.search && filters.search.trim() !== "") {
      const q = filters.search.trim();
      where.OR = [
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { phone: { contains: q, mode: "insensitive" } } }
      ];
    }

    const clients = await prisma.clientProfile.findMany({
      where,
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
        sport: true,
        coachAssignments: {
          where: { active: true },
          include: {
            coach: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return clients;
  }

  /**
   * Fetch a single client 360 profile by ClientProfile.id or User.id
   */
  async getClientById(id: string): Promise<any> {
    const client = await prisma.clientProfile.findFirst({
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
        sport: true,
        coachAssignments: {
          include: {
            coach: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                  }
                }
              }
            }
          }
        },
        measurements: {
          orderBy: { date: "asc" }
        },
        goals: true,
        medicalRestrictions: true,
        progressPhotos: {
          orderBy: { date: "desc" }
        },
        assessments: {
          orderBy: { date: "desc" }
        },
        workoutAssignments: {
          include: {
            template: true,
            program: true,
            workoutLog: true
          },
          orderBy: { scheduledDate: "desc" }
        },
        programAssignments: {
          include: {
            program: true
          },
          orderBy: { startDate: "desc" }
        },
        nutritionAssignments: {
          include: {
            nutritionProgram: true
          },
          orderBy: { startDate: "desc" }
        },
        checkInSchedule: true,
        notes: {
          include: {
            author: {
              select: { name: true, avatar: true }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!client) {
      // Check if user exists with role CLIENT and auto-provision missing ClientProfile
      const user = await prisma.user.findUnique({
        where: { id }
      });
      if (user && user.role === UserRole.CLIENT) {
        await prisma.clientProfile.create({
          data: {
            userId: user.id,
            status: "ACTIVE"
          }
        });
        return await this.getClientById(id);
      }
    }

    return client;
  }

  /**
   * Create a new client and underlying User record atomically in PostgreSQL
   */
  async createClient(data: CreateClientInput) {
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      throw new Error(`Email ${normalizedEmail} is already registered to another user`);
    }

    // Default password hash (A@123456) or hashed provided password
    const plainPassword = data.password || "A@123456";
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    return await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: data.name.trim(),
          passwordHash,
          role: UserRole.CLIENT,
          phone: data.phone?.trim() || "+20 100 000 0000",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
        }
      });

      // 2. Create Client Profile
      const client = await tx.clientProfile.create({
        data: {
          userId: user.id,
          gender: data.gender || Gender.MALE,
          dob: data.dob ? new Date(data.dob) : new Date("1998-05-15"),
          heightCm: data.heightCm ? Number(data.heightCm) : 175,
          weightKg: data.weightKg ? Number(data.weightKg) : 80,
          address: data.address || "Cairo, Egypt",
          emergencyContact: data.emergencyContact || "+20 100 999 8888",
          status: data.status || ClientStatus.ACTIVE,
          preferredSportId: data.preferredSportId || undefined,
          membershipExpiry: data.membershipExpiry ? new Date(data.membershipExpiry) : new Date("2026-12-31")
        }
      });

      // 3. Assign Coach if provided
      if (data.coachId) {
        await tx.clientCoachAssignment.create({
          data: {
            clientId: client.id,
            coachId: data.coachId,
            role: data.coachRole || CoachRoleInClient.PRIMARY,
            notes: data.coachNotes,
            active: true
          }
        });
      }

      return client;
    });
  }

  /**
   * Update client details and underlying user profile
   */
  async updateClient(id: string, data: UpdateClientInput) {
    const existing = await prisma.clientProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] }
    });

    if (!existing) {
      throw new Error("Client not found");
    }

    return await prisma.$transaction(async (tx) => {
      // Update User fields if provided
      if (data.name || data.email || data.phone || data.avatar) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(data.name && { name: data.name.trim() }),
            ...(data.email && { email: data.email.toLowerCase().trim() }),
            ...(data.phone && { phone: data.phone.trim() }),
            ...(data.avatar && { avatar: data.avatar })
          }
        });
      }

      // Update Client fields
      const updatedClient = await tx.clientProfile.update({
        where: { id: existing.id },
        data: {
          ...(data.gender && { gender: data.gender }),
          ...(data.dob && { dob: new Date(data.dob) }),
          ...(data.heightCm !== undefined && { heightCm: Number(data.heightCm) }),
          ...(data.weightKg !== undefined && { weightKg: Number(data.weightKg) }),
          ...(data.address && { address: data.address }),
          ...(data.emergencyContact && { emergencyContact: data.emergencyContact }),
          ...(data.status && { status: data.status }),
          ...(data.preferredSportId && { preferredSportId: data.preferredSportId }),
          ...(data.membershipExpiry && { membershipExpiry: new Date(data.membershipExpiry) })
        }
      });

      // Manage coach assignment update if requested
      if (data.coachId) {
        await tx.clientCoachAssignment.upsert({
          where: {
            clientId_coachId: {
              clientId: existing.id,
              coachId: data.coachId
            }
          },
          update: {
            role: data.coachRole || CoachRoleInClient.PRIMARY,
            notes: data.coachNotes,
            active: true
          },
          create: {
            clientId: existing.id,
            coachId: data.coachId,
            role: data.coachRole || CoachRoleInClient.PRIMARY,
            notes: data.coachNotes,
            active: true
          }
        });
      }

      return updatedClient;
    });
  }

  /**
   * Delete client and underlying User record
   */
  async deleteClient(id: string) {
    const existing = await prisma.clientProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] }
    });

    if (!existing) {
      throw new Error("Client not found");
    }

    // Deleting the User cascades and deletes the ClientProfile and assignments
    await prisma.user.delete({
      where: { id: existing.userId }
    });

    return true;
  }

  /**
   * Assign or update a coach assignment for a client
   */
  async assignCoachToClient(
    clientId: string,
    coachId: string,
    role: CoachRoleInClient = CoachRoleInClient.PRIMARY,
    notes?: string
  ) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new Error("Client not found");

    return await prisma.clientCoachAssignment.upsert({
      where: {
        clientId_coachId: {
          clientId: client.id,
          coachId
        }
      },
      update: {
        role,
        notes,
        active: true
      },
      create: {
        clientId: client.id,
        coachId,
        role,
        notes,
        active: true
      }
    });
  }

  /**
   * Deactivate coach assignment
   */
  async removeCoachFromClient(clientId: string, coachId: string) {
    const client = await prisma.clientProfile.findFirst({
      where: { OR: [{ id: clientId }, { userId: clientId }] }
    });
    if (!client) throw new Error("Client not found");

    return await prisma.clientCoachAssignment.updateMany({
      where: {
        clientId: client.id,
        coachId
      },
      data: {
        active: false
      }
    });
  }
}

export const clientService = new ClientService();

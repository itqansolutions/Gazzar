import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../prisma";
import type { UserRole } from "@/types";

export interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  avatar: string | null;
  phone: string | null;
  createdAt: Date;
}

export interface IUserRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(id: string): Promise<AuthUserRecord | null>;
}

export class PrismaUserRepository implements IUserRepository {
  private client: PrismaClient;

  constructor(client: PrismaClient = defaultPrisma) {
    this.client = client;
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    try {
      const user = await this.client.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          role: true,
          avatar: true,
          phone: true,
          createdAt: true
        }
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        createdAt: user.createdAt
      };
    } catch (err: unknown) {
      console.error("[UserRepository] Database error finding user by email:", err instanceof Error ? err.message : "Unknown");
      throw new Error("DATABASE_USER_READ_ERROR");
    }
  }

  async findUserById(id: string): Promise<AuthUserRecord | null> {
    try {
      const user = await this.client.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          role: true,
          avatar: true,
          phone: true,
          createdAt: true
        }
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        createdAt: user.createdAt
      };
    } catch (err: unknown) {
      console.error("[UserRepository] Database error finding user by id:", err instanceof Error ? err.message : "Unknown");
      throw new Error("DATABASE_USER_READ_ERROR");
    }
  }
}

import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../prisma";
import { hashPassword, validatePasswordStrength } from "./password";

export interface AdminProvisioningInput {
  email: string;
  name: string;
  password: string;
  phone?: string | null;
}

export interface SanitizedAdminUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN";
  phone: string | null;
  createdAt: Date;
}

export type AdminProvisioningResult =
  | {
      success: true;
      user: SanitizedAdminUser;
      message: string;
    }
  | {
      success: false;
      reason:
        | "INVALID_INPUT"
        | "ADMIN_ALREADY_EXISTS"
        | "EMAIL_ALREADY_IN_USE"
        | "DATABASE_ERROR";
      message: string;
    };

export interface IAdminProvisioningRepository {
  hasExistingAdmin(): Promise<boolean>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  createFirstAdminInTransaction(data: {
    email: string;
    name: string;
    passwordHash: string;
    phone?: string | null;
  }): Promise<SanitizedAdminUser>;
}

export class PrismaAdminProvisioningRepository implements IAdminProvisioningRepository {
  private client: PrismaClient;

  constructor(client: PrismaClient = defaultPrisma) {
    this.client = client;
  }

  async hasExistingAdmin(): Promise<boolean> {
    const adminCount = await this.client.user.count({
      where: { role: "ADMIN" }
    });
    return adminCount > 0;
  }

  async findUserByEmail(email: string): Promise<{ id: string } | null> {
    return await this.client.user.findUnique({
      where: { email },
      select: { id: true }
    });
  }

  async createFirstAdminInTransaction(data: {
    email: string;
    name: string;
    passwordHash: string;
    phone?: string | null;
  }): Promise<SanitizedAdminUser> {
    return await this.client.$transaction(async (tx) => {
      // 1. PostgreSQL transaction-level advisory lock to serialize concurrent attempts
      // 7483920158493021 is a constant 64-bit int lock identifier for GX admin provisioning
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7483920158493021);`;
      } catch {
        // Fallback or non-Postgres environments (e.g. SQLite in some tests)
      }

      // 2. Double-check within atomic transaction
      const existingAdmin = await tx.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true }
      });

      if (existingAdmin) {
        throw new Error("ADMIN_ALREADY_EXISTS");
      }

      const existingEmail = await tx.user.findUnique({
        where: { email: data.email },
        select: { id: true }
      });

      if (existingEmail) {
        throw new Error("EMAIL_ALREADY_IN_USE");
      }

      // 3. Create ADMIN user
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          role: "ADMIN",
          phone: data.phone || null
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          createdAt: true
        }
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: "ADMIN" as const,
        phone: user.phone,
        createdAt: user.createdAt
      };
    });
  }
}

export class AdminProvisioningService {
  private repository: IAdminProvisioningRepository;

  constructor(repository: IAdminProvisioningRepository = new PrismaAdminProvisioningRepository()) {
    this.repository = repository;
  }

  async checkAdminStatus(): Promise<{ hasAdmin: boolean }> {
    const hasAdmin = await this.repository.hasExistingAdmin();
    return { hasAdmin };
  }

  async provisionFirstAdmin(input: AdminProvisioningInput): Promise<AdminProvisioningResult> {
    // 1. Validate Input Structure
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {
        success: false,
        reason: "INVALID_INPUT",
        message: "Invalid input payload"
      };
    }

    const { email, name, password, phone } = input;

    // Validate email
    if (!email || typeof email !== "string") {
      return {
        success: false,
        reason: "INVALID_INPUT",
        message: "A valid email address is required"
      };
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmedEmail.length < 5 || trimmedEmail.length > 255 || !emailRegex.test(trimmedEmail)) {
      return {
        success: false,
        reason: "INVALID_INPUT",
        message: "Invalid email address format or length"
      };
    }

    // Validate name
    if (!name || typeof name !== "string") {
      return {
        success: false,
        reason: "INVALID_INPUT",
        message: "Name is required"
      };
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return {
        success: false,
        reason: "INVALID_INPUT",
        message: "Name must be between 2 and 100 characters"
      };
    }

    // Validate phone (optional)
    let sanitizedPhone: string | null = null;
    if (phone !== undefined && phone !== null && phone !== "") {
      if (typeof phone !== "string" || phone.length > 30) {
        return {
          success: false,
          reason: "INVALID_INPUT",
          message: "Phone number is invalid or too long"
        };
      }
      sanitizedPhone = phone.trim();
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        reason: "INVALID_INPUT",
        message: passwordValidation.error || "Password does not meet administrative strength requirements"
      };
    }

    // 2. Pre-Check Fast Fail: Reject if an ADMIN already exists
    try {
      const alreadyHasAdmin = await this.repository.hasExistingAdmin();
      if (alreadyHasAdmin) {
        return {
          success: false,
          reason: "ADMIN_ALREADY_EXISTS",
          message: "Refusing to provision: An ADMIN account already exists in the system."
        };
      }
    } catch (err: unknown) {
      return {
        success: false,
        reason: "DATABASE_ERROR",
        message: "Failed to verify existing administrator accounts"
      };
    }

    // 3. Pre-Check Email Collision
    try {
      const existingUser = await this.repository.findUserByEmail(trimmedEmail);
      if (existingUser) {
        return {
          success: false,
          reason: "EMAIL_ALREADY_IN_USE",
          message: "The specified email is already registered."
        };
      }
    } catch (err: unknown) {
      return {
        success: false,
        reason: "DATABASE_ERROR",
        message: "Failed to verify email availability"
      };
    }

    // 4. Hash Password
    let passwordHash: string;
    try {
      passwordHash = hashPassword(password);
    } catch {
      return {
        success: false,
        reason: "INVALID_INPUT",
        message: "Failed to securely hash password"
      };
    }

    // 5. Execute Atomic Creation in Transaction
    try {
      const sanitizedUser = await this.repository.createFirstAdminInTransaction({
        email: trimmedEmail,
        name: trimmedName,
        passwordHash,
        phone: sanitizedPhone
      });

      return {
        success: true,
        user: sanitizedUser,
        message: "First ADMIN account provisioned successfully."
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg === "ADMIN_ALREADY_EXISTS") {
        return {
          success: false,
          reason: "ADMIN_ALREADY_EXISTS",
          message: "Refusing to provision: An ADMIN account already exists in the system."
        };
      }
      if (errMsg === "EMAIL_ALREADY_IN_USE") {
        return {
          success: false,
          reason: "EMAIL_ALREADY_IN_USE",
          message: "The specified email is already registered."
        };
      }

      return {
        success: false,
        reason: "DATABASE_ERROR",
        message: "A database error occurred during admin provisioning."
      };
    }
  }
}

export const adminProvisioningService = new AdminProvisioningService();

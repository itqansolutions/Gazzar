import type { SessionUser } from "@/types";
import { verifyPassword } from "./password";
import { SessionService, sessionService as defaultSessionService } from "./session-service";
import { IUserRepository, PrismaUserRepository } from "./user-repository";
import type { SessionValidationResult } from "./types";

// Constant-time dummy bcrypt hash for non-existent users (prevents timing analysis)
const DUMMY_BCRYPT_HASH = "$2a$10$e7d16909a68041cea235c6e79d2c16f3feeaee4a3d7b49d085c8c9";

export interface LoginParams {
  email: unknown;
  password: unknown;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export type LoginResult =
  | {
      success: true;
      sessionToken: string;
      expiresAt: Date;
      user: SessionUser;
    }
  | {
      success: false;
      reason: "INVALID_INPUT" | "INVALID_CREDENTIALS" | "SERVER_ERROR";
      message: string;
    };

export class AuthService {
  private userRepo: IUserRepository;
  private sessionService: SessionService;

  constructor(
    userRepo: IUserRepository = new PrismaUserRepository(),
    sessionService: SessionService = defaultSessionService
  ) {
    this.userRepo = userRepo;
    this.sessionService = sessionService;
  }

  /**
   * Authenticates user credentials and provisions a secure session.
   * - Enforces input bounds
   * - Single generic error message for invalid credentials
   * - Constant-time timing mitigation against user enumeration
   * - Sets zero raw tokens in database
   */
  async login(params: LoginParams): Promise<LoginResult> {
    const { email, password, userAgent, ipAddress } = params;

    // 1. Strict Input Validation & Length Limits
    if (
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return {
        success: false,
        reason: "INVALID_INPUT",
        message: "البريد الإلكتروني وكلمة المرور مطلوبان"
      };
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (
      trimmedEmail.length < 3 ||
      trimmedEmail.length > 255 ||
      !trimmedEmail.includes("@") ||
      password.length < 1 ||
      password.length > 128
    ) {
      return {
        success: false,
        reason: "INVALID_INPUT",
        message: "البريد الإلكتروني أو كلمة المرور غير صالحة"
      };
    }

    // 2. Fetch User Record
    let user;
    try {
      user = await this.userRepo.findUserByEmail(trimmedEmail);
    } catch {
      return {
        success: false,
        reason: "SERVER_ERROR",
        message: "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً"
      };
    }

    // 3. Password Verification with Timing Mitigation
    const targetHash = user?.passwordHash || DUMMY_BCRYPT_HASH;
    const isPasswordValid = verifyPassword(password, targetHash);

    if (!user || !isPasswordValid) {
      return {
        success: false,
        reason: "INVALID_CREDENTIALS",
        message: "بيانات الدخول غير صحيحة"
      };
    }

    // 4. Create Centralized Server-Side Session
    let sessionResult;
    try {
      sessionResult = await this.sessionService.createSession({
        userId: user.id,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null
      });
    } catch {
      return {
        success: false,
        reason: "SERVER_ERROR",
        message: "فشل في إنشاء الجلسة، يرجى المحاولة لاحقاً"
      };
    }

    // 5. Build Sanitized User Profile (Zero Hashes)
    const sanitizedUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone
    };

    return {
      success: true,
      sessionToken: sessionResult.sessionToken,
      expiresAt: sessionResult.expiresAt,
      user: sanitizedUser
    };
  }

  /**
   * Invalidates the active session token server-side.
   */
  async logout(sessionToken: string | null | undefined): Promise<boolean> {
    if (!sessionToken || typeof sessionToken !== "string") {
      return true; // Idempotent logout
    }

    try {
      return await this.sessionService.revokeSession(sessionToken);
    } catch {
      return false;
    }
  }

  /**
   * Validates session token and returns the authenticated user context.
   */
  async getCurrentUser(sessionToken: string | null | undefined): Promise<SessionValidationResult> {
    if (!sessionToken || typeof sessionToken !== "string") {
      return { valid: false, reason: "INVALID_TOKEN" };
    }

    return await this.sessionService.validateSession(sessionToken);
  }
}

export const authService = new AuthService();

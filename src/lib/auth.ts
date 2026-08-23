import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User, UserRole } from "@/types";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "gazzar_sports_coaching_jwt_super_secret_key_2026";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  coachId?: string;
  clientId?: string;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  // Allow demo passwords
  if (password === "password123" || password === "123456") return true;
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return password === hash;
  }
}

export function createAuthToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export function getDemoAccounts() {
  const users = db.getUsers();
  return [
    {
      role: "ADMIN" as UserRole,
      titleAr: "مدير الأكاديمية (Admin)",
      titleEn: "Academy Admin",
      user: users.find(u => u.role === "ADMIN")!
    },
    {
      role: "HEAD_COACH" as UserRole,
      titleAr: "كبير المدربين (Head Coach)",
      titleEn: "Head Coach",
      user: users.find(u => u.role === "HEAD_COACH")!
    },
    {
      role: "COACH" as UserRole,
      titleAr: "كابتن تدريب (Coach)",
      titleEn: "Personal Coach",
      user: users.find(u => u.role === "COACH")!
    },
    {
      role: "CLIENT" as UserRole,
      titleAr: "مشترك / لاعب (Client)",
      titleEn: "Client Athlete",
      user: users.find(u => u.role === "CLIENT")!
    }
  ];
}
import { User, CoachProfile } from "@/types";

export const initialUsers: User[] = [
  {
    id: "user-admin",
    email: "admin@gxacademy.com",
    name: "Abdullah (Admin)",
    role: "ADMIN",
    password: "A@123456",
    phone: "+20 100 123 4567",
    avatar: "/coach_dark_hero.jpg",
    createdAt: new Date().toISOString()
  },
  {
    id: "user-coach-abdullah",
    email: "abdullah@gxfitness.com",
    name: "Coach Abdullah Elgazzar",
    role: "HEAD_COACH",
    password: "A@123456",
    phone: "+20 100 000 0001",
    avatar: "/coach_dark_hero.jpg",
    createdAt: new Date().toISOString()
  }
];

export const initialCoachProfiles: CoachProfile[] = [
  {
    id: "coach-abdullah",
    userId: "user-coach-abdullah",
    specialties: ["CrossFit", "Olympic Lifting", "Strength & Conditioning"],
    bio: "Founder & Head Coach of GX Fitness Academy. ELFIT athlete and performance director.",
    yearsOfExperience: 10
  }
];

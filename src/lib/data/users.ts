import { User, CoachProfile } from "@/types";

export const initialUsers: User[] = [
  {
    id: "user-admin",
    email: "admin@gx.com",
    name: "Abdullah Elgazzar",
    role: "ADMIN",
    password: "A@123456",
    phone: "+20 100 123 4567",
    avatar: "/coach_dark_hero.jpg",
    createdAt: new Date().toISOString()
  }
];

export const initialCoachProfiles: CoachProfile[] = [];

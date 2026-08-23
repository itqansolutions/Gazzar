import { User, CoachProfile } from "@/types";

export const initialUsers: User[] = [
  {
    id: "user-admin",
    email: "admin@gazzar.com",
    name: "أحمد الجزار (المدير العام)",
    role: "ADMIN",
    password: "A@123456",
    phone: "+20 100 123 4567",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    createdAt: new Date().toISOString()
  }
];

export const initialCoachProfiles: CoachProfile[] = [];

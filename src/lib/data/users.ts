import { User, CoachProfile } from "@/types";

export const initialUsers: User[] = [
  {
    id: "user-admin",
    email: "admin@gazzar.com",
    name: "أحمد الجزار (المدير العام)",
    role: "ADMIN",
    phone: "+20 100 123 4567",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "user-headcoach",
    email: "headcoach@gazzar.com",
    name: "كابتن حسام حسن (كبير المدربين)",
    role: "HEAD_COACH",
    phone: "+20 101 234 5678",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    createdAt: "2026-01-05T00:00:00.000Z"
  },
  {
    id: "user-coach-1",
    email: "ali@gazzar.com",
    name: "كابتن علي منصور",
    role: "COACH",
    phone: "+20 102 345 6789",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    createdAt: "2026-01-10T00:00:00.000Z"
  },
  {
    id: "user-coach-2",
    email: "mahmoud@gazzar.com",
    name: "كابتن محمود سمير",
    role: "COACH",
    phone: "+20 103 456 7890",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
    createdAt: "2026-01-12T00:00:00.000Z"
  },
  {
    id: "user-coach-3",
    email: "sara@gazzar.com",
    name: "كابتن سارة كمال (أخصائية تغذية)",
    role: "COACH",
    phone: "+20 104 567 8901",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    createdAt: "2026-01-15T00:00:00.000Z"
  },
  {
    id: "user-client-1",
    email: "mohamed@gmail.com",
    name: "محمد إبراهيم الفقي",
    role: "CLIENT",
    phone: "+20 111 888 9999",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200",
    createdAt: "2026-02-01T00:00:00.000Z"
  },
  {
    id: "user-client-2",
    email: "karim@gmail.com",
    name: "كريم عادل الشناوي",
    role: "CLIENT",
    phone: "+20 112 777 8888",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200",
    createdAt: "2026-02-05T00:00:00.000Z"
  },
  {
    id: "user-client-3",
    email: "yasmin@gmail.com",
    name: "ياسمين طارق الألفي",
    role: "CLIENT",
    phone: "+20 113 666 7777",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    createdAt: "2026-02-10T00:00:00.000Z"
  },
  {
    id: "user-client-4",
    email: "omar@gmail.com",
    name: "عمر سامح زهران",
    role: "CLIENT",
    phone: "+20 114 555 6666",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    createdAt: "2026-02-15T00:00:00.000Z"
  }
];

export const initialCoachProfiles: CoachProfile[] = [
  {
    id: "coach-head",
    userId: "user-headcoach",
    user: initialUsers[1],
    specialties: ["كمال أجسام", "إعداد بدني عام", "تأهيل إصابات"],
    bio: "كبير المدربين بخبرة 15 عاماً في تدريب الأبطال وإدارة البرامج الرياضية",
    yearsOfExperience: 15,
    assignedClientsCount: 4,
    attendanceRate: 98,
    completionRate: 94
  },
  {
    id: "coach-1",
    userId: "user-coach-1",
    user: initialUsers[2],
    specialties: ["كمال أجسام وتضخيم", "تدريب القوة"],
    bio: "مدرب معتمد من ISSA متخصص في القوة وزيادة الكتلة العضلية",
    yearsOfExperience: 7,
    headCoachId: "coach-head",
    assignedClientsCount: 2,
    attendanceRate: 94,
    completionRate: 90
  },
  {
    id: "coach-2",
    userId: "user-coach-2",
    user: initialUsers[3],
    specialties: ["كروس فيت", "جري ولياقة قلبية"],
    bio: "مدرب كروس فيت معتمد L2 متخصص في اللياقة الوظيفية والتحمل",
    yearsOfExperience: 5,
    headCoachId: "coach-head",
    assignedClientsCount: 2,
    attendanceRate: 92,
    completionRate: 88
  },
  {
    id: "coach-3",
    userId: "user-coach-3",
    user: initialUsers[4],
    specialties: ["تغذية رياضية", "فيتنس سيدات", "خسارة وزن"],
    bio: "أخصائية تغذية رياضية معتمدة ومدربة فيتنس",
    yearsOfExperience: 6,
    headCoachId: "coach-head",
    assignedClientsCount: 2,
    attendanceRate: 96,
    completionRate: 95
  }
];
import {
  User,
  UserRole,
  CoachProfile,
  ClientProfile,
  ClientCoachAssignment,
  Sport,
  MuscleGroup,
  Equipment,
  Exercise,
  WorkoutTemplate,
  TrainingProgram,
  ClientWorkoutAssignment,
  WorkoutLog,
  ClientMeasurementHistory,
  ClientGoal,
  ClientMedicalRestriction,
  ClientProgressPhoto,
  ClientAssessment,
  SessionCalendar,
  SessionAttendance,
  MealPlan,
  Membership,
  ClientNote,
  AuditLog,
  Notification
} from "@/types";

import {
  initialSports,
  initialMuscleGroups,
  initialEquipment,
  initialExercises,
  initialUsers,
  initialCoachProfiles,
  initialClients,
  initialCoachAssignments,
  initialMedicalRestrictions,
  initialMeasurements,
  initialGoals,
  initialTemplates,
  initialPrograms,
  initialAssignments,
  initialWorkoutLogs,
  initialAssessments,
  initialCalendars,
  initialMealPlans,
  initialMemberships,
  initialClientNotes,
  initialProgressPhotos,
  initialAuditLogs,
  initialNotifications
} from "./mockData";
import { logAuditEvent, getAuditLogs } from "./audit";

// In-Memory live reactive store
class CoachingStore {
  private users: User[] = [...initialUsers];
  private coachProfiles: CoachProfile[] = [...initialCoachProfiles];
  private clients: ClientProfile[] = [...initialClients];
  private coachAssignments: ClientCoachAssignment[] = [...initialCoachAssignments];
  private sports: Sport[] = [...initialSports];
  private muscleGroups: MuscleGroup[] = [...initialMuscleGroups];
  private equipment: Equipment[] = [...initialEquipment];
  private exercises: Exercise[] = [...initialExercises];
  private templates: WorkoutTemplate[] = [...initialTemplates];
  private programs: TrainingProgram[] = [...initialPrograms];
  private assignments: ClientWorkoutAssignment[] = [...initialAssignments];
  private workoutLogs: WorkoutLog[] = [...initialWorkoutLogs];
  private measurements: ClientMeasurementHistory[] = [...initialMeasurements];
  private goals: ClientGoal[] = [...initialGoals];
  private medicalRestrictions: ClientMedicalRestriction[] = [...initialMedicalRestrictions];
  private progressPhotos: ClientProgressPhoto[] = [...initialProgressPhotos];
  private assessments: ClientAssessment[] = [...initialAssessments];
  private calendars: SessionCalendar[] = [...initialCalendars];
  private mealPlans: MealPlan[] = [...initialMealPlans];
  private memberships: Membership[] = [...initialMemberships];
  private clientNotes: ClientNote[] = [...initialClientNotes];
  private notifications: Notification[] = [...initialNotifications];

  // --- Users & Auth ---
  getUsers() { return [...this.users]; }
  getUserById(id: string) { return this.users.find(u => u.id === id); }
  getUserByEmail(email: string) { return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()); }

  createUser(data: {
    email: string;
    name: string;
    role: UserRole;
    password?: string;
    phone?: string;
    avatar?: string;
    specialties?: string[];
    bio?: string;
    yearsOfExperience?: number;
    weightKg?: number;
    heightCm?: number;
    preferredSportId?: string;
  }): User {
    const existing = this.getUserByEmail(data.email);
    if (existing) {
      throw new Error("User with this email already exists");
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      role: data.role,
      password: data.password || "A@123456",
      phone: data.phone || "+20 100 000 0000",
      avatar: data.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200`,
      createdAt: new Date().toISOString()
    };

    this.users.unshift(newUser);

    // If COACH or HEAD_COACH, create CoachProfile
    if (data.role === "COACH" || data.role === "HEAD_COACH") {
      const coachProf: CoachProfile = {
        id: `coach-${Date.now()}`,
        userId: newUser.id,
        specialties: data.specialties && data.specialties.length > 0 ? data.specialties : ["تدريب لياقة عامة", "كمال أجسام"],
        bio: data.bio || "كابتن معتمد في الأكاديمية",
        yearsOfExperience: data.yearsOfExperience || 3,
        assignedClientsCount: 0
      };
      this.coachProfiles.push(coachProf);
    }

    // If CLIENT, create ClientProfile
    if (data.role === "CLIENT") {
      const clientProf: ClientProfile = {
        id: `client-${Date.now()}`,
        userId: newUser.id,
        user: newUser,
        dob: "1998-05-15",
        gender: "MALE",
        heightCm: data.heightCm || 175,
        weightKg: data.weightKg || 80,
        status: "ACTIVE",
        preferredSportId: data.preferredSportId || "sport-bodybuilding",
        createdAt: new Date().toISOString(),
        emergencyContact: "+20 100 999 8888"
      };
      this.clients.unshift(clientProf);
    }

    logAuditEvent({
      action: "CREATE_USER",
      user: { id: "user-admin", name: "أحمد الجزار", role: "ADMIN" },
      entityType: "User",
      entityId: newUser.id,
      newValues: { email: newUser.email, role: newUser.role, name: newUser.name }
    });
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error("User not found");
    const old = { ...this.users[index] };
    this.users[index] = { ...this.users[index], ...updates };
    logAuditEvent({
      action: "UPDATE_USER",
      user: { id: "user-admin", name: "أحمد الجزار", role: "ADMIN" },
      entityType: "User",
      entityId: id,
      oldValues: old,
      newValues: this.users[index]
    });
    return this.users[index];
  }

  deleteUser(id: string): boolean {
    const user = this.getUserById(id);
    if (!user) return false;
    if (user.role === "ADMIN" && this.users.filter(u => u.role === "ADMIN").length <= 1) {
      throw new Error("Cannot delete the only Admin user");
    }
    this.users = this.users.filter(u => u.id !== id);
    this.clients = this.clients.filter(c => c.userId !== id);
    this.coachProfiles = this.coachProfiles.filter(cp => cp.userId !== id);
    logAuditEvent({
      action: "DELETE_USER",
      user: { id: "user-admin", name: "أحمد الجزار", role: "ADMIN" },
      entityType: "User",
      entityId: id,
      oldValues: { email: user.email, name: user.name }
    });
    return true;
  }

  // --- Coaches ---
  getCoaches() {
    return this.coachProfiles.map(cp => {
      const user = this.users.find(u => u.id === cp.userId);
      const headCoach = cp.headCoachId ? this.coachProfiles.find(h => h.id === cp.headCoachId) : undefined;
      const assignedCount = this.coachAssignments.filter(ca => ca.coachId === cp.id && ca.active).length;
      return {
        ...cp,
        user,
        headCoach,
        assignedClientsCount: assignedCount || cp.assignedClientsCount
      };
    });
  }

  getCoachById(id: string) {
    const cp = this.coachProfiles.find(c => c.id === id || c.userId === id);
    if (!cp) return undefined;
    const user = this.users.find(u => u.id === cp.userId);
    return { ...cp, user };
  }

  // --- Clients ---
  getClients(filterCoachId?: string, userRole?: string, currentUserId?: string) {
    return this.clients.map(c => this.getClient360(c.id)!).filter(c => {
      if (!c) return false;
      if (userRole === "COACH" && currentUserId) {
        const coachProfile = this.coachProfiles.find(cp => cp.userId === currentUserId || cp.id === currentUserId);
        if (coachProfile) {
          const isAssigned = this.coachAssignments.some(ca => ca.clientId === c.id && ca.coachId === coachProfile.id && ca.active);
          return isAssigned;
        }
      }
      if (filterCoachId) {
        return this.coachAssignments.some(ca => ca.clientId === c.id && ca.coachId === filterCoachId && ca.active);
      }
      return true;
    });
  }

  getClient360(id: string): ClientProfile | undefined {
    const client = this.clients.find(c => c.id === id || c.userId === id);
    if (!client) return undefined;

    const user = this.users.find(u => u.id === client.userId) || client.user;
    const sport = this.sports.find(s => s.id === client.preferredSportId);
    const coaches = this.coachAssignments
      .filter(ca => ca.clientId === client.id)
      .map(ca => ({
        ...ca,
        coach: this.getCoachById(ca.coachId)
      }));

    const clientMeasurements = this.measurements.filter(m => m.clientId === client.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const clientGoals = this.goals.filter(g => g.clientId === client.id);
    const clientMed = this.medicalRestrictions.filter(m => m.clientId === client.id);
    const clientPhotos = this.progressPhotos.filter(p => p.clientId === client.id);
    const clientAssessments = this.assessments.filter(a => a.clientId === client.id);
    const clientWorkouts = this.assignments
      .filter(a => a.clientId === client.id)
      .map(a => ({
        ...a,
        template: a.templateId ? this.templates.find(t => t.id === a.templateId) : undefined,
        program: a.programId ? this.programs.find(p => p.id === a.programId) : undefined,
        workoutLog: this.workoutLogs.find(wl => wl.assignmentId === a.id)
      }));

    const clientNotes = this.clientNotes.filter(n => n.clientId === client.id);

    return {
      ...client,
      user,
      sport,
      coaches,
      measurements: clientMeasurements,
      goals: clientGoals,
      medicalRestrictions: clientMed,
      progressPhotos: clientPhotos,
      assessments: clientAssessments,
      workoutAssignments: clientWorkouts,
      notes: clientNotes
    };
  }

  createClient(data: Partial<ClientProfile> & { name: string; email: string; phone?: string }) {
    const userId = `user-${Date.now()}`;
    const newUser: User = {
      id: userId,
      email: data.email,
      name: data.name,
      role: "CLIENT",
      phone: data.phone,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=200`,
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);

    const clientId = `client-${Date.now()}`;
    const newClient: ClientProfile = {
      id: clientId,
      userId: userId,
      user: newUser,
      dob: data.dob,
      gender: data.gender || "MALE",
      heightCm: data.heightCm || 175,
      weightKg: data.weightKg || 80,
      address: data.address,
      emergencyContact: data.emergencyContact,
      status: data.status || "ACTIVE",
      preferredSportId: data.preferredSportId || "sport-1",
      membershipExpiry: data.membershipExpiry || "2026-12-31",
      createdAt: new Date().toISOString()
    };
    this.clients.push(newClient);

    logAuditEvent({
      action: "CREATE_CLIENT",
      entityType: "ClientProfile",
      entityId: clientId,
      newValues: { name: data.name, email: data.email, status: newClient.status }
    });

    return this.getClient360(clientId)!;
  }

  assignCoachToClient(clientId: string, coachId: string, role: any = "PRIMARY", notes?: string) {
    const existing = this.coachAssignments.find(ca => ca.clientId === clientId && ca.coachId === coachId);
    if (existing) {
      existing.role = role;
      existing.active = true;
      existing.notes = notes;
    } else {
      const newAssign: ClientCoachAssignment = {
        id: `assign-${Date.now()}`,
        clientId,
        coachId,
        role,
        assignedAt: new Date().toISOString(),
        active: true,
        notes
      };
      this.coachAssignments.push(newAssign);
    }

    logAuditEvent({
      action: "ASSIGN_COACH",
      entityType: "ClientCoachAssignment",
      entityId: clientId,
      newValues: { clientId, coachId, role, notes }
    });

    return this.getClient360(clientId);
  }

  addMeasurement(clientId: string, data: Omit<ClientMeasurementHistory, "id" | "clientId">) {
    const heightM = (data.heightCm || 175) / 100;
    const bmi = Number((data.weightKg / (heightM * heightM)).toFixed(1));
    const newM: ClientMeasurementHistory = {
      id: `m-${Date.now()}`,
      clientId,
      ...data,
      bmi: data.bmi || bmi
    };
    this.measurements.push(newM);

    // Update client current weight
    const client = this.clients.find(c => c.id === clientId);
    if (client) {
      const oldWeight = client.weightKg;
      client.weightKg = data.weightKg;
      if (data.heightCm) client.heightCm = data.heightCm;

      logAuditEvent({
        action: "UPDATE_WEIGHT_MEASUREMENT",
        entityType: "ClientProfile",
        entityId: clientId,
        oldValues: { weightKg: oldWeight },
        newValues: { weightKg: data.weightKg, bmi, bodyFat: data.bodyFatPercentage }
      });
    }

    return newM;
  }

  addMedicalRestriction(clientId: string, data: Omit<ClientMedicalRestriction, "id" | "clientId" | "createdAt">) {
    const newRestriction: ClientMedicalRestriction = {
      id: `med-${Date.now()}`,
      clientId,
      ...data,
      createdAt: new Date().toISOString()
    };
    this.medicalRestrictions.push(newRestriction);

    logAuditEvent({
      action: "ADD_MEDICAL_RESTRICTION",
      entityType: "ClientMedicalRestriction",
      entityId: newRestriction.id,
      newValues: data
    });

    return newRestriction;
  }

  addGoal(clientId: string, data: Omit<ClientGoal, "id" | "clientId">) {
    const newGoal: ClientGoal = {
      id: `goal-${Date.now()}`,
      clientId,
      ...data
    };
    this.goals.push(newGoal);
    return newGoal;
  }

  addProgressPhoto(clientId: string, data: Omit<ClientProgressPhoto, "id" | "clientId">) {
    const newPhoto: ClientProgressPhoto = {
      id: `photo-${Date.now()}`,
      clientId,
      ...data
    };
    this.progressPhotos.push(newPhoto);
    return newPhoto;
  }

  addClientNote(clientId: string, authorId: string, noteType: any, content: string) {
    const newNote: ClientNote = {
      id: `note-${Date.now()}`,
      clientId,
      authorId,
      noteType,
      content,
      createdAt: new Date().toISOString()
    };
    this.clientNotes.push(newNote);
    return newNote;
  }

  // --- Sports & Exercises ---
  getSports() { return [...this.sports]; }
  getMuscleGroups() { return [...this.muscleGroups]; }
  getEquipment() { return [...this.equipment]; }

  getExercises(filters?: { sportId?: string; muscleId?: string; difficulty?: string; search?: string }) {
    let result = this.exercises.map(ex => ({
      ...ex,
      sport: this.sports.find(s => s.id === ex.sportId),
      primaryMuscle: this.muscleGroups.find(m => m.id === ex.primaryMuscleId),
      equipment: this.equipment.find(eq => eq.id === ex.equipmentId)
    }));

    if (filters?.sportId) result = result.filter(e => e.sportId === filters.sportId);
    if (filters?.muscleId) result = result.filter(e => e.primaryMuscleId === filters.muscleId);
    if (filters?.difficulty) result = result.filter(e => e.difficulty === filters.difficulty);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(e => e.nameAr.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q));
    }
    return result;
  }

  getExerciseById(id: string) {
    const ex = this.exercises.find(e => e.id === id);
    if (!ex) return undefined;
    return {
      ...ex,
      sport: this.sports.find(s => s.id === ex.sportId),
      primaryMuscle: this.muscleGroups.find(m => m.id === ex.primaryMuscleId),
      equipment: this.equipment.find(eq => eq.id === ex.equipmentId)
    };
  }

  createExercise(data: Omit<Exercise, "id">) {
    const newEx: Exercise = {
      id: `ex-${Date.now()}`,
      ...data
    };
    this.exercises.push(newEx);
    logAuditEvent({
      action: "CREATE_EXERCISE",
      entityType: "Exercise",
      entityId: newEx.id,
      newValues: { nameAr: newEx.nameAr, nameEn: newEx.nameEn, sportId: newEx.sportId }
    });
    return this.getExerciseById(newEx.id)!;
  }

  // --- Templates & Programs ---
  getTemplates() {
    return this.templates.map(t => ({
      ...t,
      sport: this.sports.find(s => s.id === t.sportId),
      creator: t.creatorId ? this.getCoachById(t.creatorId) : undefined,
      exercises: t.exercises.map(te => ({
        ...te,
        exercise: this.getExerciseById(te.exerciseId)!
      }))
    }));
  }

  getTemplateById(id: string) {
    return this.getTemplates().find(t => t.id === id);
  }

  createTemplate(data: Omit<WorkoutTemplate, "id" | "createdAt">) {
    const newTpl: WorkoutTemplate = {
      id: `tpl-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    this.templates.push(newTpl);
    logAuditEvent({
      action: "CREATE_WORKOUT_TEMPLATE",
      entityType: "WorkoutTemplate",
      entityId: newTpl.id,
      newValues: { titleAr: newTpl.titleAr, titleEn: newTpl.titleEn }
    });
    return this.getTemplateById(newTpl.id)!;
  }

  getPrograms() {
    return this.programs.map(p => ({
      ...p,
      sport: this.sports.find(s => s.id === p.sportId),
      creator: p.creatorId ? this.getCoachById(p.creatorId) : undefined,
      weeks: p.weeks?.map(w => ({
        ...w,
        days: w.days.map(d => ({
          ...d,
          workouts: d.workouts.map(pw => ({
            ...pw,
            template: this.getTemplateById(pw.templateId)!
          }))
        }))
      }))
    }));
  }

  getProgramById(id: string) {
    return this.getPrograms().find(p => p.id === id);
  }

  // --- Workout Assignments & Execution Logger ---
  getAssignments(clientId?: string) {
    let list = this.assignments.map(a => ({
      ...a,
      client: this.getClient360(a.clientId),
      coach: this.getCoachById(a.coachId),
      template: a.templateId ? this.getTemplateById(a.templateId) : undefined,
      program: a.programId ? this.getProgramById(a.programId) : undefined,
      workoutLog: this.workoutLogs.find(wl => wl.assignmentId === a.id)
    }));

    if (clientId) list = list.filter(a => a.clientId === clientId);
    return list;
  }

  getAssignmentById(id: string) {
    return this.getAssignments().find(a => a.id === id);
  }

  assignWorkout(data: Omit<ClientWorkoutAssignment, "id" | "status" | "workoutLog">) {
    const newAssign: ClientWorkoutAssignment = {
      id: `assign-wo-${Date.now()}`,
      status: "SCHEDULED",
      ...data
    };
    this.assignments.unshift(newAssign);

    // Send notification to client
    const client = this.clients.find(c => c.id === data.clientId);
    if (client) {
      this.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: client.userId,
        title: "تمرين جديد مخصص لك! 🏋️‍♂️",
        message: `تم تعيين تمرين جديد لك بتاريخ ${data.scheduledDate}`,
        type: "WORKOUT",
        read: false,
        link: `/workout/${newAssign.id}/execute`,
        createdAt: new Date().toISOString()
      });
    }

    logAuditEvent({
      action: "ASSIGN_WORKOUT",
      entityType: "ClientWorkoutAssignment",
      entityId: newAssign.id,
      newValues: { clientId: data.clientId, scheduledDate: data.scheduledDate }
    });

    return this.getAssignmentById(newAssign.id)!;
  }

  saveWorkoutExecution(assignmentId: string, executionData: {
    durationMinutes: number;
    overallRpe: number;
    clientFeedback?: string;
    exercises: {
      exerciseId: string;
      sets: {
        setNumber: number;
        actualReps?: number;
        actualWeightKg?: number;
        actualDistanceKm?: number;
        actualTimeSeconds?: number;
        actualRpe?: number;
        isCompleted: boolean;
      }[];
    }[];
  }) {
    const assignment = this.assignments.find(a => a.id === assignmentId);
    if (assignment) {
      assignment.status = "COMPLETED";
      assignment.completedAt = new Date().toISOString();
    }

    const logId = `wlog-${Date.now()}`;
    const newLog: WorkoutLog = {
      id: logId,
      assignmentId,
      clientId: assignment?.clientId || "client-1",
      coachId: assignment?.coachId,
      startedAt: new Date(Date.now() - executionData.durationMinutes * 60000).toISOString(),
      completedAt: new Date().toISOString(),
      durationMinutes: executionData.durationMinutes,
      overallRpe: executionData.overallRpe,
      clientFeedback: executionData.clientFeedback,
      isCompleted: true,
      exercises: executionData.exercises.map((e, idx) => ({
        id: `wex-${logId}-${idx}`,
        workoutLogId: logId,
        exerciseId: e.exerciseId,
        exercise: this.getExerciseById(e.exerciseId)!,
        sets: e.sets.map((s, sIdx) => ({
          id: `set-${logId}-${idx}-${sIdx}`,
          ...s
        }))
      }))
    };

    this.workoutLogs.unshift(newLog);

    logAuditEvent({
      action: "COMPLETE_WORKOUT_EXECUTION",
      entityType: "WorkoutLog",
      entityId: logId,
      newValues: { assignmentId, rpe: executionData.overallRpe, duration: executionData.durationMinutes }
    });

    return newLog;
  }

  // --- Assessments ---
  getAssessments(clientId?: string) {
    return this.assessments.filter(a => !clientId || a.clientId === clientId);
  }

  createAssessment(data: Omit<ClientAssessment, "id">) {
    const newAssess: ClientAssessment = {
      id: `assess-${Date.now()}`,
      ...data
    };
    this.assessments.push(newAssess);
    logAuditEvent({
      action: "CREATE_ASSESSMENT",
      entityType: "ClientAssessment",
      entityId: newAssess.id,
      newValues: { clientId: data.clientId, title: data.title }
    });
    return newAssess;
  }

  // --- Calendars & Attendance ---
  getCalendars() {
    return this.calendars.map(cal => ({
      ...cal,
      coach: this.getCoachById(cal.coachId),
      sport: this.sports.find(s => s.id === cal.sportId),
      attendances: cal.attendances?.map(att => ({
        ...att,
        client: this.getClient360(att.clientId)
      }))
    }));
  }

  updateSessionAttendance(sessionId: string, clientId: string, status: any, notes?: string) {
    const session = this.calendars.find(s => s.id === sessionId);
    if (!session) return false;
    if (!session.attendances) session.attendances = [];

    const existing = session.attendances.find(a => a.clientId === clientId);
    if (existing) {
      existing.status = status;
      if (notes) existing.notes = notes;
    } else {
      session.attendances.push({
        id: `att-${Date.now()}`,
        sessionId,
        clientId,
        status,
        notes
      });
    }

    logAuditEvent({
      action: "UPDATE_ATTENDANCE",
      entityType: "SessionAttendance",
      entityId: `${sessionId}-${clientId}`,
      newValues: { sessionId, clientId, status }
    });

    return true;
  }

  // --- Meal Plans & Memberships ---
  getMealPlans(clientId?: string) {
    return this.mealPlans.filter(m => !clientId || m.clientId === clientId);
  }

  getMembershipPlans() {
    return [
      {
        id: "plan-vip-36",
        nameAr: "باقة التدريب الفردي VIP (36 حصة)",
        nameEn: "VIP 1-on-1 PT (36 Sessions)",
        description: "متابعة تدريبية وتغذية كاملة مع كابتن أساسي ومساعد",
        price: 8500,
        currency: "EGP",
        durationDays: 90,
        sessionsCount: 36
      },
      {
        id: "plan-crossfit-unlimited",
        nameAr: "اشتراك كروس فيت غير محدود",
        nameEn: "CrossFit Unlimited Monthly",
        description: "حضور كافة كلاسات الـ WOD والتحمل يومياً",
        price: 2200,
        currency: "EGP",
        durationDays: 30
      },
      {
        id: "plan-academy-monthly",
        nameAr: "اشتراك الأكاديمية العام (شهري)",
        nameEn: "Standard Academy Membership",
        description: "استخدام الصالة وجداول التمارين العامة",
        price: 1500,
        currency: "EGP",
        durationDays: 30
      }
    ];
  }

  getMemberships(clientId?: string) {
    return this.memberships.map(m => ({
      ...m,
      client: this.getClient360(m.clientId)
    })).filter(m => !clientId || m.clientId === clientId);
  }

  // --- Notifications & Audit ---
  getNotifications(userId: string) {
    return this.notifications.filter(n => n.userId === userId);
  }

  markNotificationAsRead(id: string) {
    const n = this.notifications.find(item => item.id === id);
    if (n) n.read = true;
    return n;
  }

  getAuditLogs() {
    return getAuditLogs();
  }
}

// Global Singleton Instance
const globalForStore = globalThis as unknown as { coachingStore: CoachingStore };
export const db = globalForStore.coachingStore || new CoachingStore();
if (process.env.NODE_ENV !== "production") globalForStore.coachingStore = db;

export default db;
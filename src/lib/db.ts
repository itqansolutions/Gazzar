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

const STORAGE_KEY = "gazzar_clean_db_v3";

// In-Memory live reactive & localStorage persistent store
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

  constructor() {
    this.loadFromStorage();
  }

  // --- Persistence & Sync Layer ---
  public loadFromStorage(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr) return false;
      const data = JSON.parse(dataStr);

      if (data.users?.length) this.users = data.users;
      if (data.coachProfiles?.length) this.coachProfiles = data.coachProfiles;
      if (data.clients?.length) this.clients = data.clients;
      if (data.coachAssignments?.length) this.coachAssignments = data.coachAssignments;
      if (data.sports?.length) this.sports = data.sports;
      if (data.muscleGroups?.length) this.muscleGroups = data.muscleGroups;
      if (data.equipment?.length) this.equipment = data.equipment;
      if (data.exercises?.length) this.exercises = data.exercises;
      if (data.templates?.length) this.templates = data.templates;
      if (data.programs?.length) this.programs = data.programs;
      if (data.assignments?.length) this.assignments = data.assignments;
      if (data.workoutLogs?.length) this.workoutLogs = data.workoutLogs;
      if (data.measurements?.length) this.measurements = data.measurements;
      if (data.goals?.length) this.goals = data.goals;
      if (data.medicalRestrictions?.length) this.medicalRestrictions = data.medicalRestrictions;
      if (data.progressPhotos?.length) this.progressPhotos = data.progressPhotos;
      if (data.assessments?.length) this.assessments = data.assessments;
      if (data.calendars?.length) this.calendars = data.calendars;
      if (data.mealPlans?.length) this.mealPlans = data.mealPlans;
      if (data.memberships?.length) this.memberships = data.memberships;
      if (data.clientNotes?.length) this.clientNotes = data.clientNotes;
      if (data.notifications?.length) this.notifications = data.notifications;
      return true;
    } catch (e) {
      console.error("Failed to load store from localStorage", e);
      return false;
    }
  }

  public saveToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const state = {
        users: this.users,
        coachProfiles: this.coachProfiles,
        clients: this.clients,
        coachAssignments: this.coachAssignments,
        sports: this.sports,
        muscleGroups: this.muscleGroups,
        equipment: this.equipment,
        exercises: this.exercises,
        templates: this.templates,
        programs: this.programs,
        assignments: this.assignments,
        workoutLogs: this.workoutLogs,
        measurements: this.measurements,
        goals: this.goals,
        medicalRestrictions: this.medicalRestrictions,
        progressPhotos: this.progressPhotos,
        assessments: this.assessments,
        calendars: this.calendars,
        mealPlans: this.mealPlans,
        memberships: this.memberships,
        clientNotes: this.clientNotes,
        notifications: this.notifications
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("gazzar_db_change"));
    } catch (e) {
      console.error("Failed to save store to localStorage", e);
    }
  }

  public resetToDefaults(): void {
    this.users = [...initialUsers];
    this.coachProfiles = [...initialCoachProfiles];
    this.clients = [...initialClients];
    this.coachAssignments = [...initialCoachAssignments];
    this.sports = [...initialSports];
    this.muscleGroups = [...initialMuscleGroups];
    this.equipment = [...initialEquipment];
    this.exercises = [...initialExercises];
    this.templates = [...initialTemplates];
    this.programs = [...initialPrograms];
    this.assignments = [...initialAssignments];
    this.workoutLogs = [...initialWorkoutLogs];
    this.measurements = [...initialMeasurements];
    this.goals = [...initialGoals];
    this.medicalRestrictions = [...initialMedicalRestrictions];
    this.progressPhotos = [...initialProgressPhotos];
    this.assessments = [...initialAssessments];
    this.calendars = [...initialCalendars];
    this.mealPlans = [...initialMealPlans];
    this.memberships = [...initialMemberships];
    this.clientNotes = [...initialClientNotes];
    this.notifications = [...initialNotifications];
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("gazzar_db_change"));
    }
  }

  // --- Users & Auth CRUD ---
  getUsers() {
    this.loadFromStorage();
    return [...this.users];
  }

  getUserById(id: string) {
    this.loadFromStorage();
    return this.users.find(u => u.id === id);
  }

  getUserByEmail(email: string) {
    this.loadFromStorage();
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

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
    this.loadFromStorage();
    const existing = this.getUserByEmail(data.email);
    if (existing) {
      throw new Error(`البريد الإلكتروني ${data.email} مسجل بالفعل لمستخدم آخر`);
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      role: data.role,
      password: data.password || "A@123456",
      phone: data.phone || "+20 100 000 0000",
      avatar: data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      createdAt: new Date().toISOString()
    };

    this.users.unshift(newUser);

    if (data.role === "COACH" || data.role === "HEAD_COACH") {
      const coachProf: CoachProfile = {
        id: `coach-${Date.now()}`,
        userId: newUser.id,
        user: newUser,
        specialties: data.specialties && data.specialties.length > 0 ? data.specialties : ["لياقة بدنية", "كمال أجسام"],
        bio: data.bio || "كابتن معتمد في الأكاديمية",
        yearsOfExperience: data.yearsOfExperience || 3,
        assignedClientsCount: 0,
        attendanceRate: 98,
        completionRate: 95
      };
      this.coachProfiles.unshift(coachProf);
    }

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

    this.saveToStorage();

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
    this.loadFromStorage();
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error("User not found");
    const old = { ...this.users[index] };
    this.users[index] = { ...this.users[index], ...updates };

    // sync with coach or client profile
    const client = this.clients.find(c => c.userId === id);
    if (client) {
      client.user = { ...this.users[index] };
    }
    const coach = this.coachProfiles.find(cp => cp.userId === id);
    if (coach) {
      coach.user = { ...this.users[index] };
    }

    this.saveToStorage();

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
    this.loadFromStorage();
    const user = this.getUserById(id);
    if (!user) return false;
    if (user.role === "ADMIN" && this.users.filter(u => u.role === "ADMIN").length <= 1) {
      throw new Error("لا يمكن حذف حساب الأدمن الوحيد في النظام");
    }
    this.users = this.users.filter(u => u.id !== id);
    this.clients = this.clients.filter(c => c.userId !== id);
    this.coachProfiles = this.coachProfiles.filter(cp => cp.userId !== id);
    this.saveToStorage();

    logAuditEvent({
      action: "DELETE_USER",
      user: { id: "user-admin", name: "أحمد الجزار", role: "ADMIN" },
      entityType: "User",
      entityId: id,
      oldValues: { email: user.email, name: user.name }
    });
    return true;
  }

  // --- Coaches CRUD ---
  getCoaches(): CoachProfile[] {
    this.loadFromStorage();
    return this.coachProfiles.map(cp => ({
      ...cp,
      user: this.getUserById(cp.userId) || cp.user
    }));
  }

  getCoachById(id: string): CoachProfile | undefined {
    this.loadFromStorage();
    const cp = this.coachProfiles.find(c => c.id === id || c.userId === id);
    if (!cp) return undefined;
    return {
      ...cp,
      user: this.getUserById(cp.userId) || cp.user
    };
  }

  // --- Clients CRUD & Client 360 ---
  getClients(status?: string, userRole?: string, userId?: string): ClientProfile[] {
    this.loadFromStorage();
    let list = this.clients.map(c => {
      const user = this.getUserById(c.userId) || c.user;
      const sport = this.sports.find(s => s.id === c.preferredSportId);
      const coaches = this.coachAssignments
        .filter(ca => ca.clientId === c.id)
        .map(ca => ({
          ...ca,
          coach: this.getCoachById(ca.coachId)
        }));
      const clientMed = this.medicalRestrictions.filter(m => m.clientId === c.id);
      return {
        ...c,
        user,
        sport,
        coaches,
        medicalRestrictions: clientMed
      };
    });

    if (status && status !== "ALL") {
      list = list.filter(c => c.status === status);
    }
    if (userRole === "COACH" && userId) {
      list = list.filter(c => c.coaches?.some(ca => ca.coachId === userId));
    }
    if (userRole === "CLIENT" && userId) {
      list = list.filter(c => c.userId === userId);
    }

    return list;
  }

  getClientById(id: string): ClientProfile | undefined {
    this.loadFromStorage();
    return this.getClients().find(c => c.id === id || c.userId === id);
  }

  getClient360(id: string): ClientProfile | undefined {
    this.loadFromStorage();
    const client = this.clients.find(c => c.id === id || c.userId === id);
    if (!client) return undefined;

    const user = this.getUserById(client.userId) || client.user;
    const sport = this.sports.find(s => s.id === client.preferredSportId);
    const coaches = this.coachAssignments
      .filter(ca => ca.clientId === client.id)
      .map(ca => ({
        ...ca,
        coach: this.getCoachById(ca.coachId)
      }));

    const clientMeasurements = this.measurements
      .filter(m => m.clientId === client.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

  createClient(data: Partial<ClientProfile> & { name: string; email: string; phone?: string; password?: string }) {
    this.loadFromStorage();
    const userId = `user-${Date.now()}`;
    const newUser: User = {
      id: userId,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      role: "CLIENT",
      password: data.password || "A@123456",
      phone: data.phone || "+20 100 000 0000",
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200`,
      createdAt: new Date().toISOString()
    };
    this.users.unshift(newUser);

    const clientId = `client-${Date.now()}`;
    const newClient: ClientProfile = {
      id: clientId,
      userId: userId,
      user: newUser,
      dob: data.dob || "1998-05-15",
      gender: data.gender || "MALE",
      heightCm: data.heightCm || 175,
      weightKg: data.weightKg || 80,
      address: data.address || "القاهرة، مصر",
      emergencyContact: data.emergencyContact || "+20 100 999 8888",
      status: data.status || "ACTIVE",
      preferredSportId: data.preferredSportId || "sport-bodybuilding",
      membershipExpiry: data.membershipExpiry || "2026-12-31",
      createdAt: new Date().toISOString()
    };
    this.clients.unshift(newClient);

    this.saveToStorage();

    logAuditEvent({
      action: "CREATE_CLIENT",
      user: { id: "user-admin", name: "أحمد الجزار", role: "ADMIN" },
      entityType: "ClientProfile",
      entityId: clientId,
      newValues: { name: data.name, email: data.email, status: newClient.status }
    });

    return this.getClient360(clientId)!;
  }

  updateClient(id: string, updates: Partial<ClientProfile> & { name?: string; email?: string; phone?: string; avatar?: string }): ClientProfile {
    this.loadFromStorage();
    const index = this.clients.findIndex(c => c.id === id || c.userId === id);
    if (index === -1) throw new Error("Client not found");

    const client = this.clients[index];
    if (updates.name || updates.email || updates.phone || updates.avatar) {
      this.updateUser(client.userId, {
        ...(updates.name && { name: updates.name }),
        ...(updates.email && { email: updates.email }),
        ...(updates.phone && { phone: updates.phone }),
        ...(updates.avatar && { avatar: updates.avatar })
      });
    }

    this.clients[index] = { ...this.clients[index], ...updates };
    this.saveToStorage();
    return this.getClient360(this.clients[index].id)!;
  }

  deleteClient(id: string): boolean {
    this.loadFromStorage();
    const client = this.clients.find(c => c.id === id || c.userId === id);
    if (!client) return false;
    this.clients = this.clients.filter(c => c.id !== client.id);
    this.users = this.users.filter(u => u.id !== client.userId);
    this.measurements = this.measurements.filter(m => m.clientId !== client.id);
    this.goals = this.goals.filter(g => g.clientId !== client.id);
    this.medicalRestrictions = this.medicalRestrictions.filter(m => m.clientId !== client.id);
    this.assignments = this.assignments.filter(a => a.clientId !== client.id);
    this.clientNotes = this.clientNotes.filter(n => n.clientId !== client.id);
    this.saveToStorage();
    return true;
  }

  assignCoachToClient(clientId: string, coachId: string, role: any = "PRIMARY", notes?: string) {
    this.loadFromStorage();
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

    this.saveToStorage();

    logAuditEvent({
      action: "ASSIGN_COACH",
      user: { id: "user-admin", name: "أحمد الجزار", role: "ADMIN" },
      entityType: "ClientCoachAssignment",
      entityId: clientId,
      newValues: { clientId, coachId, role, notes }
    });

    return this.getClient360(clientId);
  }

  // --- Measurements & Medical Restrictions CRUD ---
  addMeasurement(clientId: string, data: Omit<ClientMeasurementHistory, "id" | "clientId">) {
    this.loadFromStorage();
    const heightM = (data.heightCm || 175) / 100;
    const bmi = Number((data.weightKg / (heightM * heightM)).toFixed(1));
    const newM: ClientMeasurementHistory = {
      id: `m-${Date.now()}`,
      clientId,
      ...data,
      bmi: data.bmi || bmi
    };
    this.measurements.push(newM);

    const client = this.clients.find(c => c.id === clientId);
    if (client) {
      client.weightKg = data.weightKg;
      if (data.heightCm) client.heightCm = data.heightCm;
    }

    this.saveToStorage();
    return newM;
  }

  deleteMeasurement(id: string): boolean {
    this.loadFromStorage();
    this.measurements = this.measurements.filter(m => m.id !== id);
    this.saveToStorage();
    return true;
  }

  addMedicalRestriction(clientId: string, data: Omit<ClientMedicalRestriction, "id" | "clientId" | "createdAt">) {
    this.loadFromStorage();
    const newRestriction: ClientMedicalRestriction = {
      id: `med-${Date.now()}`,
      clientId,
      ...data,
      createdAt: new Date().toISOString()
    };
    this.medicalRestrictions.push(newRestriction);
    this.saveToStorage();
    return newRestriction;
  }

  deleteMedicalRestriction(id: string): boolean {
    this.loadFromStorage();
    this.medicalRestrictions = this.medicalRestrictions.filter(m => m.id !== id);
    this.saveToStorage();
    return true;
  }

  addGoal(clientId: string, data: Omit<ClientGoal, "id" | "clientId">) {
    this.loadFromStorage();
    const newGoal: ClientGoal = {
      id: `goal-${Date.now()}`,
      clientId,
      ...data
    };
    this.goals.push(newGoal);
    this.saveToStorage();
    return newGoal;
  }

  updateGoal(id: string, updates: Partial<ClientGoal>): ClientGoal | undefined {
    this.loadFromStorage();
    const g = this.goals.find(item => item.id === id);
    if (!g) return undefined;
    Object.assign(g, updates);
    this.saveToStorage();
    return g;
  }

  deleteGoal(id: string): boolean {
    this.loadFromStorage();
    this.goals = this.goals.filter(g => g.id !== id);
    this.saveToStorage();
    return true;
  }

  addProgressPhoto(clientId: string, data: Omit<ClientProgressPhoto, "id" | "clientId">) {
    this.loadFromStorage();
    const newPhoto: ClientProgressPhoto = {
      id: `photo-${Date.now()}`,
      clientId,
      ...data
    };
    this.progressPhotos.push(newPhoto);
    this.saveToStorage();
    return newPhoto;
  }

  addClientNote(clientId: string, authorId: string, noteType: any, content: string) {
    this.loadFromStorage();
    const newNote: ClientNote = {
      id: `note-${Date.now()}`,
      clientId,
      authorId,
      noteType,
      content,
      createdAt: new Date().toISOString()
    };
    this.clientNotes.push(newNote);
    this.saveToStorage();
    return newNote;
  }

  deleteClientNote(id: string): boolean {
    this.loadFromStorage();
    this.clientNotes = this.clientNotes.filter(n => n.id !== id);
    this.saveToStorage();
    return true;
  }

  // --- Sports & Exercises CRUD ---
  getSports() {
    this.loadFromStorage();
    return [...this.sports];
  }

  createSport(data: Omit<Sport, "id">): Sport {
    this.loadFromStorage();
    const newSport: Sport = {
      id: `sport-${Date.now()}`,
      ...data
    };
    this.sports.push(newSport);
    this.saveToStorage();
    return newSport;
  }

  updateSport(id: string, updates: Partial<Sport>): Sport {
    this.loadFromStorage();
    const idx = this.sports.findIndex(s => s.id === id);
    if (idx === -1) throw new Error("Sport not found");
    this.sports[idx] = { ...this.sports[idx], ...updates };
    this.saveToStorage();
    return this.sports[idx];
  }

  deleteSport(id: string): boolean {
    this.loadFromStorage();
    this.sports = this.sports.filter(s => s.id !== id);
    this.saveToStorage();
    return true;
  }

  getMuscleGroups() {
    this.loadFromStorage();
    return [...this.muscleGroups];
  }

  getEquipment() {
    this.loadFromStorage();
    return [...this.equipment];
  }

  getExercises(filters?: { sportId?: string; muscleId?: string; difficulty?: string; search?: string }) {
    this.loadFromStorage();
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
    this.loadFromStorage();
    const ex = this.exercises.find(e => e.id === id);
    if (!ex) return undefined;
    return {
      ...ex,
      sport: this.sports.find(s => s.id === ex.sportId),
      primaryMuscle: this.muscleGroups.find(m => m.id === ex.primaryMuscleId),
      equipment: this.equipment.find(eq => eq.id === ex.equipmentId)
    };
  }

  createExercise(data: Omit<Exercise, "id">): Exercise {
    this.loadFromStorage();
    const newEx: Exercise = {
      id: `ex-${Date.now()}`,
      ...data
    };
    this.exercises.unshift(newEx);
    this.saveToStorage();
    return this.getExerciseById(newEx.id)!;
  }

  updateExercise(id: string, updates: Partial<Exercise>): Exercise {
    this.loadFromStorage();
    const idx = this.exercises.findIndex(e => e.id === id);
    if (idx === -1) throw new Error("Exercise not found");
    this.exercises[idx] = { ...this.exercises[idx], ...updates };
    this.saveToStorage();
    return this.getExerciseById(id)!;
  }

  deleteExercise(id: string): boolean {
    this.loadFromStorage();
    this.exercises = this.exercises.filter(e => e.id !== id);
    this.saveToStorage();
    return true;
  }

  // --- Templates & Programs CRUD ---
  getTemplates() {
    this.loadFromStorage();
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
    this.loadFromStorage();
    return this.getTemplates().find(t => t.id === id);
  }

  createTemplate(data: Omit<WorkoutTemplate, "id" | "createdAt">): WorkoutTemplate {
    this.loadFromStorage();
    const newTpl: WorkoutTemplate = {
      id: `tpl-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    this.templates.unshift(newTpl);
    this.saveToStorage();
    return this.getTemplateById(newTpl.id)!;
  }

  updateTemplate(id: string, updates: Partial<WorkoutTemplate>): WorkoutTemplate {
    this.loadFromStorage();
    const idx = this.templates.findIndex(t => t.id === id);
    if (idx === -1) throw new Error("Template not found");
    this.templates[idx] = { ...this.templates[idx], ...updates };
    this.saveToStorage();
    return this.getTemplateById(id)!;
  }

  deleteTemplate(id: string): boolean {
    this.loadFromStorage();
    this.templates = this.templates.filter(t => t.id !== id);
    this.saveToStorage();
    return true;
  }

  getPrograms() {
    this.loadFromStorage();
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
    this.loadFromStorage();
    return this.getPrograms().find(p => p.id === id);
  }

  createProgram(data: Omit<TrainingProgram, "id" | "createdAt">): TrainingProgram {
    this.loadFromStorage();
    const newProg: TrainingProgram = {
      id: `prog-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    this.programs.unshift(newProg);
    this.saveToStorage();
    return this.getProgramById(newProg.id)!;
  }

  deleteProgram(id: string): boolean {
    this.loadFromStorage();
    this.programs = this.programs.filter(p => p.id !== id);
    this.saveToStorage();
    return true;
  }

  // --- Workout Assignments & Execution Logger CRUD ---
  getAssignments(clientId?: string) {
    this.loadFromStorage();
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
    this.loadFromStorage();
    return this.getAssignments().find(a => a.id === id);
  }

  assignWorkout(data: Omit<ClientWorkoutAssignment, "id" | "status" | "workoutLog">) {
    this.loadFromStorage();
    const newAssign: ClientWorkoutAssignment = {
      id: `assign-wo-${Date.now()}`,
      status: "SCHEDULED",
      ...data
    };
    this.assignments.unshift(newAssign);

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

    this.saveToStorage();
    return this.getAssignmentById(newAssign.id)!;
  }

  deleteAssignment(id: string): boolean {
    this.loadFromStorage();
    this.assignments = this.assignments.filter(a => a.id !== id);
    this.saveToStorage();
    return true;
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
    this.loadFromStorage();
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
    this.saveToStorage();
    return newLog;
  }

  // --- Assessments CRUD ---
  getAssessments(clientId?: string) {
    this.loadFromStorage();
    return this.assessments.filter(a => !clientId || a.clientId === clientId);
  }

  createAssessment(data: Omit<ClientAssessment, "id">) {
    this.loadFromStorage();
    const newAssess: ClientAssessment = {
      id: `assess-${Date.now()}`,
      ...data
    };
    this.assessments.unshift(newAssess);
    this.saveToStorage();
    return newAssess;
  }

  deleteAssessment(id: string): boolean {
    this.loadFromStorage();
    this.assessments = this.assessments.filter(a => a.id !== id);
    this.saveToStorage();
    return true;
  }

  // --- Calendars & Attendance CRUD ---
  getCalendars() {
    this.loadFromStorage();
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

  createCalendarSession(data: Omit<SessionCalendar, "id">): SessionCalendar {
    this.loadFromStorage();
    const newSession: SessionCalendar = {
      id: `session-${Date.now()}`,
      ...data
    };
    this.calendars.unshift(newSession);
    this.saveToStorage();
    return newSession;
  }

  deleteCalendarSession(id: string): boolean {
    this.loadFromStorage();
    this.calendars = this.calendars.filter(c => c.id !== id);
    this.saveToStorage();
    return true;
  }

  updateSessionAttendance(sessionId: string, clientId: string, status: any, notes?: string) {
    this.loadFromStorage();
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

    this.saveToStorage();
    return true;
  }

  // --- Meal Plans CRUD ---
  getMealPlans(clientId?: string) {
    this.loadFromStorage();
    return this.mealPlans.filter(m => !clientId || m.clientId === clientId);
  }

  createMealPlan(data: Omit<MealPlan, "id">): MealPlan {
    this.loadFromStorage();
    const newPlan: MealPlan = {
      id: `meal-${Date.now()}`,
      ...data
    };
    this.mealPlans.unshift(newPlan);
    this.saveToStorage();
    return newPlan;
  }

  deleteMealPlan(id: string): boolean {
    this.loadFromStorage();
    this.mealPlans = this.mealPlans.filter(m => m.id !== id);
    this.saveToStorage();
    return true;
  }

  // --- Memberships CRUD ---
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
    this.loadFromStorage();
    return this.memberships.map(m => ({
      ...m,
      client: this.getClient360(m.clientId)
    })).filter(m => !clientId || m.clientId === clientId);
  }

  createMembership(data: Omit<Membership, "id">): Membership {
    this.loadFromStorage();
    const newMem: Membership = {
      id: `mem-${Date.now()}`,
      ...data
    };
    this.memberships.unshift(newMem);
    this.saveToStorage();
    return newMem;
  }

  deleteMembership(id: string): boolean {
    this.loadFromStorage();
    this.memberships = this.memberships.filter(m => m.id !== id);
    this.saveToStorage();
    return true;
  }

  // --- Notifications & Audit ---
  getNotifications(userId: string) {
    this.loadFromStorage();
    return this.notifications.filter(n => n.userId === userId);
  }

  markNotificationAsRead(id: string) {
    this.loadFromStorage();
    const n = this.notifications.find(item => item.id === id);
    if (n) {
      n.read = true;
      this.saveToStorage();
    }
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

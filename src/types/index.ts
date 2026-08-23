export type UserRole = "ADMIN" | "HEAD_COACH" | "COACH" | "CLIENT";

export type ClientStatus = "LEAD" | "ACTIVE" | "FROZEN" | "INACTIVE" | "EXPIRED" | "SUSPENDED" | "ARCHIVED";

export type Gender = "MALE" | "FEMALE";

export type CoachRoleInClient = "PRIMARY" | "ASSISTANT" | "NUTRITIONIST" | "PHYSIOTHERAPIST";

export type MetricType = "SETS_REPS_WEIGHT" | "DISTANCE_TIME_PACE" | "LAPS_TIME" | "ROUNDS_REPS_TIME" | "TIME_HOLD";

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type GoalType = "WEIGHT_LOSS" | "MUSCLE_GAIN" | "STRENGTH" | "ENDURANCE" | "PERFORMANCE" | "REHABILITATION" | "GENERAL_FITNESS";

export type GoalStatus = "IN_PROGRESS" | "ACHIEVED" | "ABANDONED";

export type RestrictionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BodyPart = "KNEE" | "SHOULDER" | "LOWER_BACK" | "NECK" | "ANKLE" | "WRIST" | "ELBOW" | "HIP" | "HEART" | "ASTHMA" | "OTHER";

export type AssignmentStatus = "SCHEDULED" | "COMPLETED" | "SKIPPED" | "MISSED";

export type SessionType = "INDIVIDUAL" | "GROUP" | "ASSESSMENT" | "RECOVERY";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type MembershipPlan = "MONTHLY" | "THREE_MONTHS" | "SIX_MONTHS" | "ANNUAL" | "PERSONAL_TRAINING" | "GROUP_CLASS";

export interface MembershipPackage {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  sessionsCount?: number;
}

export type PaymentStatus = "PAID" | "PARTIAL" | "UNPAID";

export type NoteType = "PRIVATE_COACH" | "PUBLIC_CLIENT";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
}

export interface CoachProfile {
  id: string;
  userId: string;
  user?: User;
  specialties: string[];
  bio?: string;
  yearsOfExperience: number;
  headCoachId?: string;
  headCoach?: CoachProfile;
  assignedClientsCount?: number;
  attendanceRate?: number;
  completionRate?: number;
}

export interface ClientProfile {
  id: string;
  userId: string;
  user: User;
  dob?: string;
  gender: Gender;
  heightCm?: number;
  weightKg?: number;
  address?: string;
  emergencyContact?: string;
  status: ClientStatus;
  preferredSportId?: string;
  sport?: Sport;
  membershipExpiry?: string;
  coaches?: ClientCoachAssignment[];
  measurements?: ClientMeasurementHistory[];
  goals?: ClientGoal[];
  medicalRestrictions?: ClientMedicalRestriction[];
  progressPhotos?: ClientProgressPhoto[];
  assessments?: ClientAssessment[];
  workoutAssignments?: ClientWorkoutAssignment[];
  notes?: ClientNote[];
  createdAt: string;
}

export interface ClientCoachAssignment {
  id: string;
  clientId: string;
  client?: ClientProfile;
  coachId: string;
  coach?: CoachProfile;
  role: CoachRoleInClient;
  assignedAt: string;
  active: boolean;
  notes?: string;
}

export interface Sport {
  id: string;
  nameAr: string;
  nameEn: string;
  icon?: string;
  imageUrl?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  categories: string[];
}

export interface MuscleGroup {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
}

export interface Equipment {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface Exercise {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  instructionsAr?: string;
  instructionsEn?: string;
  commonMistakesAr?: string;
  commonMistakesEn?: string;
  coachTipsAr?: string;
  coachTipsEn?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  difficulty: Difficulty;
  metricType: MetricType;
  sportId: string;
  sport?: Sport;
  primaryMuscleId?: string;
  primaryMuscle?: MuscleGroup;
  equipmentId?: string;
  equipment?: Equipment;
  contraindicatedBodyParts: BodyPart[];
}

export interface WorkoutTemplateExercise {
  id: string;
  templateId: string;
  exerciseId: string;
  exercise: Exercise;
  orderIndex: number;
  targetSets?: number;
  targetReps?: string;
  targetWeightKg?: number;
  targetDistanceKm?: number;
  targetTimeSeconds?: number;
  targetPace?: string;
  targetRounds?: number;
  restSeconds?: number;
  tempo?: string;
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  sportId: string;
  sport?: Sport;
  difficulty: Difficulty;
  creatorId?: string;
  creator?: CoachProfile;
  exercises: WorkoutTemplateExercise[];
  createdAt: string;
}

export interface TrainingProgram {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  durationWeeks: number;
  sportId: string;
  sport?: Sport;
  goalType: GoalType;
  difficulty: Difficulty;
  creatorId?: string;
  isTemplate: boolean;
  weeks?: ProgramWeek[];
  createdAt: string;
}

export interface ProgramWeek {
  id: string;
  programId: string;
  weekNumber: number;
  focusAr?: string;
  focusEn?: string;
  days: ProgramDay[];
}

export interface ProgramDay {
  id: string;
  weekId: string;
  dayNumber: number;
  titleAr: string;
  titleEn: string;
  isRestDay: boolean;
  workouts: ProgramWorkout[];
}

export interface ProgramWorkout {
  id: string;
  dayId: string;
  templateId: string;
  template: WorkoutTemplate;
  orderIndex: number;
}

export interface ClientWorkoutAssignment {
  id: string;
  clientId: string;
  client?: ClientProfile;
  coachId: string;
  coach?: CoachProfile;
  templateId?: string;
  template?: WorkoutTemplate;
  programId?: string;
  program?: TrainingProgram;
  scheduledDate: string;
  status: AssignmentStatus;
  completedAt?: string;
  coachNotes?: string;
  workoutLog?: WorkoutLog;
}

export interface SetLog {
  id: string;
  exerciseLogId?: string;
  setNumber: number;
  targetReps?: string;
  targetWeightKg?: number;
  actualReps?: number;
  actualWeightKg?: number;
  actualDistanceKm?: number;
  actualTimeSeconds?: number;
  actualRpe?: number;
  isCompleted: boolean;
}

export interface WorkoutExerciseLog {
  id: string;
  workoutLogId?: string;
  exerciseId: string;
  exercise: Exercise;
  notes?: string;
  sets: SetLog[];
}

export interface WorkoutLog {
  id: string;
  assignmentId?: string;
  clientId: string;
  coachId?: string;
  startedAt: string;
  completedAt?: string;
  durationMinutes?: number;
  overallRpe?: number;
  clientFeedback?: string;
  coachFeedback?: string;
  isCompleted: boolean;
  exercises: WorkoutExerciseLog[];
}

export interface ClientMeasurementHistory {
  id: string;
  clientId: string;
  date: string;
  weightKg: number;
  heightCm?: number;
  bmi?: number;
  bodyFatPercentage?: number;
  muscleMassKg?: number;
  waistCm?: number;
  chestCm?: number;
  armsCm?: number;
  thighCm?: number;
  notes?: string;
}

export interface ClientGoal {
  id: string;
  clientId: string;
  goalType: GoalType;
  title: string;
  startingValue: number;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: string;
  status: GoalStatus;
}

export interface ClientMedicalRestriction {
  id: string;
  clientId: string;
  conditionName: string;
  bodyPart: BodyPart;
  severity: RestrictionSeverity;
  description?: string;
  restrictedMuscles: string[];
  restrictedExercises: string[];
  isActive: boolean;
  notes?: string;
  createdAt?: string;
}

export interface ClientProgressPhoto {
  id: string;
  clientId: string;
  date: string;
  frontImageUrl?: string;
  sideImageUrl?: string;
  backImageUrl?: string;
  weightAtTime?: number;
  notes?: string;
}

export interface ClientAssessment {
  id: string;
  clientId: string;
  coachId: string;
  coach?: CoachProfile;
  date: string;
  title: string;
  pushupsCount?: number;
  pullupsCount?: number;
  plankSeconds?: number;
  runningKmTimeSec?: number;
  flexibilityScore?: number;
  vo2Max?: number;
  coachNotes?: string;
}

export interface SessionCalendar {
  id: string;
  coachId: string;
  coach?: CoachProfile;
  sportId: string;
  sport?: Sport;
  title: string;
  sessionType: SessionType;
  startTime: string;
  endTime: string;
  location?: string;
  maxParticipants: number;
  attendances?: SessionAttendance[];
}

export interface SessionAttendance {
  id: string;
  sessionId: string;
  clientId: string;
  client?: ClientProfile;
  status: AttendanceStatus;
  notes?: string;
}

export interface MealPlan {
  id: string;
  clientId: string;
  coachId: string;
  title: string;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterLiters: number;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snacks?: string;
  notes?: string;
  isActive: boolean;
}

export interface Membership {
  id: string;
  clientId: string;
  client?: ClientProfile;
  planType: MembershipPlan;
  startDate: string;
  endDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  notes?: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  authorId: string;
  author?: User;
  noteType: NoteType;
  content: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}
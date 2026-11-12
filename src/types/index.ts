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
  programAssignments?: ProgramAssignment[];
  nutritionAssignments?: ClientNutritionAssignment[];
  checkInSchedule?: AthleteCheckInSchedule | null;
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
  isActive?: boolean;
  _count?: {
    exercises?: number;
    exerciseSports?: number;
    templates?: number;
    programs?: number;
    clients?: number;
    sessions?: number;
  };
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

export interface ExerciseSportLink {
  exerciseId: string;
  sportId: string;
  assignedAt: string;
  sport?: Sport;
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
  isActive?: boolean;
  sportId?: string | null;
  sport?: Sport | null;
  sportIds?: string[];
  sports?: Sport[];
  exerciseSports?: ExerciseSportLink[];
  primaryMuscleId?: string | null;
  primaryMuscle?: MuscleGroup | null;
  equipmentId?: string | null;
  equipment?: Equipment | null;
  contraindicatedBodyParts: BodyPart[];
}

export interface WorkoutTemplateExercise {
  id: string;
  templateId: string;
  exerciseId: string;
  exercise: Exercise;
  orderIndex: number;
  targetSets?: number | null;
  targetReps?: string | null;
  targetWeightKg?: number | null;
  targetDistanceKm?: number | null;
  targetTimeSeconds?: number | null;
  targetPace?: string | null;
  targetRounds?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
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
  isActive?: boolean;
  _count?: {
    programWorkouts?: number;
    assignments?: number;
    exercises?: number;
  };
  exercises: WorkoutTemplateExercise[];
  createdAt: string;
}

export type ProgramLifecycleStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type NutritionAssignmentMode = "INHERITED" | "CUSTOM_OVERRIDE" | "MANUAL";

export interface NutritionProgram {
  id: string;
  title: string;
  description?: string | null;
  goalType?: GoalType | null;
  dailyCalories?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatsGrams?: number | null;
  waterLiters?: number | null;
  breakfast?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  snacks?: string | null;
  notes?: string | null;
  mealsJson?: NutritionDayPlan[] | NutritionMeal[] | unknown;
  isActive: boolean;
  creatorId?: string | null;
  creator?: CoachProfile | null;
  _count?: {
    trainingPrograms?: number;
    clientAssignments?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface NutritionFoodItem {
  id: string;
  nameEn: string;
  nameAr?: string;
  servingSize?: number;
  servingUnit?: string;
  quantity: number;
  calories?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatsGrams?: number | null;
  notes?: string | null;
}

export interface NutritionMeal {
  id: string;
  mealName: string;
  mealTime?: string;
  instructions?: string | null;
  foodItems: NutritionFoodItem[];
}

export interface NutritionDayPlan {
  dayNumber: number;
  dayTitle?: string;
  meals: NutritionMeal[];
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetCarbs?: number | null;
  targetFats?: number | null;
  targetWaterLiters?: number | null;
  notes?: string | null;
}

export interface LoggedFoodItem {
  id: string;
  foodName: string;
  servingSize?: number;
  servingUnit?: string;
  quantity?: number;
  calories?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatsGrams?: number | null;
  isCustomItem?: boolean;
}

export interface LoggedMeal {
  id: string;
  mealName: string;
  loggedAt?: string;
  foodItems: LoggedFoodItem[];
  calories?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatsGrams?: number | null;
  notes?: string | null;
}

export interface DailyNutritionLog {
  id: string;
  clientId: string;
  client?: ClientProfile;
  nutritionAssignmentId?: string | null;
  nutritionAssignment?: ClientNutritionAssignment | null;
  date: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterLiters: number;
  isManualEntry: boolean;
  loggedMealsJson?: LoggedMeal[] | unknown;
  clientNotes?: string | null;
  coachFeedback?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionAdherenceSummary {
  clientId: string;
  dateFrom: string;
  dateTo: string;
  totalDays: number;
  loggedDays: number;
  missingLogDays: string[];
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  avgWater: number;
  plannedDailyCalories?: number | null;
  plannedDailyProtein?: number | null;
  plannedDailyCarbs?: number | null;
  plannedDailyFats?: number | null;
  plannedDailyWater?: number | null;
  calorieAdherencePercentage?: number | null;
  proteinAdherencePercentage?: number | null;
  waterAdherencePercentage?: number | null;
  overallComplianceScore: number;
}

export interface TrainingProgram {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  durationWeeks: number;
  sportId: string;
  sport?: Sport;
  goalType: GoalType;
  difficulty: Difficulty;
  creatorId?: string | null;
  creator?: CoachProfile | null;
  nutritionProgramId?: string | null;
  nutritionProgram?: NutritionProgram | null;
  isTemplate: boolean;
  isActive?: boolean;
  status?: ProgramLifecycleStatus;
  _count?: {
    weeks?: number;
    assignments?: number;
    programAssignments?: number;
  };
  weeks?: ProgramWeek[];
  createdAt: string;
}

export interface ProgramWeek {
  id: string;
  programId: string;
  weekNumber: number;
  focusAr?: string | null;
  focusEn?: string | null;
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
  template?: WorkoutTemplate;
  orderIndex: number;
}

export interface ProgramAssignment {
  id: string;
  clientId: string;
  programId: string;
  coachId: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  notes?: string | null;
  program?: TrainingProgram;
  createdAt?: string;
}

export interface ClientNutritionAssignment {
  id: string;
  clientId: string;
  client?: ClientProfile;
  coachId?: string | null;
  coach?: CoachProfile | null;
  nutritionProgramId?: string | null;
  nutritionProgram?: NutritionProgram | null;
  programAssignmentId?: string | null;
  mode: NutritionAssignmentMode;
  title: string;
  description?: string | null;
  dailyCalories?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatsGrams?: number | null;
  waterLiters?: number | null;
  breakfast?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  snacks?: string | null;
  notes?: string | null;
  mealsJson?: unknown;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
}

export interface ClientWorkoutAssignmentExercise {
  id: string;
  assignmentId: string;
  exerciseId: string;
  exercise?: Exercise;
  exerciseNameEn?: string | null;
  metricType: MetricType;
  orderIndex: number;
  targetSets?: number | null;
  targetReps?: string | null;
  targetWeightKg?: number | null;
  targetDistanceKm?: number | null;
  targetTimeSeconds?: number | null;
  targetPace?: string | null;
  targetRounds?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
}

export type EffectiveAssignmentStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "MISSED";

export interface ClientWorkoutAssignment {
  id: string;
  clientId: string;
  client?: ClientProfile;
  coachId: string;
  coach?: CoachProfile;
  sourceType?: "INDIVIDUAL" | "TEMPLATE" | "PROGRAM";
  title?: string | null;
  description?: string | null;
  templateId?: string;
  template?: WorkoutTemplate;
  programId?: string;
  program?: TrainingProgram;
  programAssignmentId?: string | null;
  programWeekNumber?: number | null;
  programDayNumber?: number | null;
  programDayTitle?: string | null;
  scheduledDate: string;
  status: AssignmentStatus;
  effectiveStatus?: EffectiveAssignmentStatus;
  completedAt?: string;
  coachNotes?: string;
  exercises?: ClientWorkoutAssignmentExercise[];
  workoutLog?: WorkoutLog;
}

export interface SetLog {
  id: string;
  exerciseLogId?: string;
  setNumber: number;
  targetReps?: string;
  targetWeightKg?: number;
  targetDistanceKm?: number;
  targetTimeSeconds?: number;
  targetPace?: string;
  targetRounds?: number;
  actualReps?: number;
  actualWeightKg?: number;
  actualDistanceKm?: number;
  actualTimeSeconds?: number;
  actualPace?: string;
  actualRounds?: number;
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

export interface AthleteCheckInSchedule {
  id: string;
  clientId: string;
  configuredByCoachId?: string | null;
  weightFrequencyDays?: number | null;
  measurementFrequencyDays?: number | null;
  otherReadingFrequencyDays?: number | null;
  photoFrequencyDays?: number | null;
  lastWeightAt?: string | null;
  lastMeasurementAt?: string | null;
  lastOtherReadingAt?: string | null;
  lastPhotoAt?: string | null;
  nextWeightDueAt?: string | null;
  nextMeasurementDueAt?: string | null;
  nextOtherReadingDueAt?: string | null;
  nextPhotoDueAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  client?: ClientProfile;
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
  client?: ClientProfile;
  coachId: string;
  coach?: CoachProfile;
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

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string | null;
  phone?: string | null;
  coachId?: string | null;
  clientId?: string | null;
}
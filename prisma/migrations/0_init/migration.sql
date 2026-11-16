-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'HEAD_COACH', 'COACH', 'CLIENT');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('LEAD', 'ACTIVE', 'FROZEN', 'INACTIVE', 'EXPIRED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "CoachRoleInClient" AS ENUM ('PRIMARY', 'ASSISTANT', 'NUTRITIONIST', 'PHYSIOTHERAPIST');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('SETS_REPS_WEIGHT', 'DISTANCE_TIME_PACE', 'LAPS_TIME', 'ROUNDS_REPS_TIME', 'TIME_HOLD');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'ENDURANCE', 'PERFORMANCE', 'REHABILITATION', 'GENERAL_FITNESS');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('IN_PROGRESS', 'ACHIEVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "RestrictionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BodyPart" AS ENUM ('KNEE', 'SHOULDER', 'LOWER_BACK', 'NECK', 'ANKLE', 'WRIST', 'ELBOW', 'HIP', 'HEART', 'ASTHMA', 'OTHER');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'SKIPPED', 'MISSED');

-- CreateEnum
CREATE TYPE "AssignmentSourceType" AS ENUM ('INDIVIDUAL', 'TEMPLATE', 'PROGRAM');

-- CreateEnum
CREATE TYPE "NutritionAssignmentMode" AS ENUM ('INHERITED', 'CUSTOM_OVERRIDE', 'MANUAL');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('INDIVIDUAL', 'GROUP', 'ASSESSMENT', 'RECOVERY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "MembershipPlan" AS ENUM ('MONTHLY', 'THREE_MONTHS', 'SIX_MONTHS', 'ANNUAL', 'PERSONAL_TRAINING', 'GROUP_CLASS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('PRIVATE_COACH', 'PUBLIC_CLIENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "phone" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialties" TEXT[],
    "bio" TEXT,
    "yearsOfExperience" INTEGER NOT NULL DEFAULT 0,
    "headCoachId" TEXT,

    CONSTRAINT "coach_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "gender" "Gender" NOT NULL DEFAULT 'MALE',
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "address" TEXT,
    "emergencyContact" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferredSportId" TEXT,
    "membershipExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_coach_assignments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "role" "CoachRoleInClient" NOT NULL DEFAULT 'PRIMARY',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "client_coach_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT,
    "imageUrl" TEXT,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "categories" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "muscle_groups" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "muscle_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "instructionsAr" TEXT,
    "instructionsEn" TEXT,
    "commonMistakesAr" TEXT,
    "commonMistakesEn" TEXT,
    "coachTipsAr" TEXT,
    "coachTipsEn" TEXT,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "metricType" "MetricType" NOT NULL DEFAULT 'SETS_REPS_WEIGHT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sportId" TEXT,
    "primaryMuscleId" TEXT,
    "equipmentId" TEXT,
    "contraindicatedBodyParts" "BodyPart"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_sports" (
    "exerciseId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_sports_pkey" PRIMARY KEY ("exerciseId","sportId")
);

-- CreateTable
CREATE TABLE "workout_templates" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "sportId" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "creatorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_template_exercises" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "targetSets" INTEGER DEFAULT 3,
    "targetReps" TEXT DEFAULT '10-12',
    "targetWeightKg" DOUBLE PRECISION,
    "targetDistanceKm" DOUBLE PRECISION,
    "targetTimeSeconds" INTEGER,
    "targetPace" TEXT,
    "targetRounds" INTEGER,
    "restSeconds" INTEGER DEFAULT 60,
    "tempo" TEXT,
    "notes" TEXT,

    CONSTRAINT "workout_template_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_programs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goalType" "GoalType",
    "dailyCalories" INTEGER,
    "proteinGrams" INTEGER,
    "carbsGrams" INTEGER,
    "fatsGrams" INTEGER,
    "waterLiters" DOUBLE PRECISION,
    "breakfast" TEXT,
    "lunch" TEXT,
    "dinner" TEXT,
    "snacks" TEXT,
    "notes" TEXT,
    "mealsJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_programs" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "durationWeeks" INTEGER NOT NULL DEFAULT 4,
    "sportId" TEXT NOT NULL,
    "goalType" "GoalType" NOT NULL DEFAULT 'GENERAL_FITNESS',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "creatorId" TEXT,
    "nutritionProgramId" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_weeks" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "focusAr" TEXT,
    "focusEn" TEXT,

    CONSTRAINT "program_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_days" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "isRestDay" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "program_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_workouts" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "program_workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_assignments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_workout_assignments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "sourceType" "AssignmentSourceType" NOT NULL DEFAULT 'TEMPLATE',
    "title" TEXT,
    "description" TEXT,
    "templateId" TEXT,
    "programId" TEXT,
    "programAssignmentId" TEXT,
    "programWeekNumber" INTEGER,
    "programDayNumber" INTEGER,
    "programDayTitle" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMP(3),
    "coachNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_workout_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_workout_assignment_exercises" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "exerciseNameEn" TEXT,
    "metricType" "MetricType" NOT NULL DEFAULT 'SETS_REPS_WEIGHT',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "targetSets" INTEGER,
    "targetReps" TEXT,
    "targetWeightKg" DOUBLE PRECISION,
    "targetDistanceKm" DOUBLE PRECISION,
    "targetTimeSeconds" INTEGER,
    "targetPace" TEXT,
    "targetRounds" INTEGER,
    "restSeconds" INTEGER,
    "tempo" TEXT,
    "notes" TEXT,

    CONSTRAINT "client_workout_assignment_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "overallRpe" INTEGER,
    "clientFeedback" TEXT,
    "coachFeedback" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercise_logs" (
    "id" TEXT NOT NULL,
    "workoutLogId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "workout_exercise_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "set_logs" (
    "id" TEXT NOT NULL,
    "exerciseLogId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "targetReps" TEXT,
    "targetWeightKg" DOUBLE PRECISION,
    "targetDistanceKm" DOUBLE PRECISION,
    "targetTimeSeconds" INTEGER,
    "targetPace" TEXT,
    "targetRounds" INTEGER,
    "actualReps" INTEGER,
    "actualWeightKg" DOUBLE PRECISION,
    "actualDistanceKm" DOUBLE PRECISION,
    "actualTimeSeconds" INTEGER,
    "actualPace" TEXT,
    "actualRounds" INTEGER,
    "actualRpe" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "set_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_measurement_histories" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "recordedByCoachId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bodyFatPercentage" DOUBLE PRECISION,
    "muscleMassKg" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "armsCm" DOUBLE PRECISION,
    "thighCm" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "client_measurement_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_check_in_schedules" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "configuredByCoachId" TEXT,
    "weightFrequencyDays" INTEGER,
    "measurementFrequencyDays" INTEGER,
    "otherReadingFrequencyDays" INTEGER,
    "photoFrequencyDays" INTEGER,
    "lastWeightAt" TIMESTAMP(3),
    "lastMeasurementAt" TIMESTAMP(3),
    "lastOtherReadingAt" TIMESTAMP(3),
    "lastPhotoAt" TIMESTAMP(3),
    "nextWeightDueAt" TIMESTAMP(3),
    "nextMeasurementDueAt" TIMESTAMP(3),
    "nextOtherReadingDueAt" TIMESTAMP(3),
    "nextPhotoDueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_check_in_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_goals" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "goalType" "GoalType" NOT NULL,
    "title" TEXT NOT NULL,
    "startingValue" DOUBLE PRECISION NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "deadline" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_medical_restrictions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "conditionName" TEXT NOT NULL,
    "bodyPart" "BodyPart" NOT NULL,
    "severity" "RestrictionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "restrictedMuscles" TEXT[],
    "restrictedExercises" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_medical_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_progress_photos" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frontImageUrl" TEXT,
    "sideImageUrl" TEXT,
    "backImageUrl" TEXT,
    "frontStorageKey" TEXT,
    "sideStorageKey" TEXT,
    "backStorageKey" TEXT,
    "frontMimeType" TEXT,
    "sideMimeType" TEXT,
    "backMimeType" TEXT,
    "uploadedByUserId" TEXT,
    "weightAtTime" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "client_progress_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_assessments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "pushupsCount" INTEGER,
    "pullupsCount" INTEGER,
    "plankSeconds" INTEGER,
    "runningKmTimeSec" INTEGER,
    "flexibilityScore" INTEGER,
    "vo2Max" DOUBLE PRECISION,
    "coachNotes" TEXT,

    CONSTRAINT "client_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_calendars" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL DEFAULT 'INDIVIDUAL',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "maxParticipants" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "session_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_attendances" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,

    CONSTRAINT "session_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dailyCalories" INTEGER NOT NULL DEFAULT 2000,
    "proteinGrams" INTEGER NOT NULL DEFAULT 150,
    "carbsGrams" INTEGER NOT NULL DEFAULT 200,
    "fatsGrams" INTEGER NOT NULL DEFAULT 60,
    "waterLiters" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "breakfast" TEXT,
    "lunch" TEXT,
    "dinner" TEXT,
    "snacks" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_nutrition_assignments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT,
    "nutritionProgramId" TEXT,
    "programAssignmentId" TEXT,
    "mode" "NutritionAssignmentMode" NOT NULL DEFAULT 'INHERITED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dailyCalories" INTEGER,
    "proteinGrams" INTEGER,
    "carbsGrams" INTEGER,
    "fatsGrams" INTEGER,
    "waterLiters" DOUBLE PRECISION,
    "breakfast" TEXT,
    "lunch" TEXT,
    "dinner" TEXT,
    "snacks" TEXT,
    "notes" TEXT,
    "mealsJson" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_nutrition_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_nutrition_logs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nutritionAssignmentId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proteinGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbsGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatsGrams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waterLiters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isManualEntry" BOOLEAN NOT NULL DEFAULT false,
    "loggedMealsJson" JSONB,
    "clientNotes" TEXT,
    "coachFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_nutrition_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "planType" "MembershipPlan" NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "paymentMethod" TEXT DEFAULT 'Cash',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_notes" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "noteType" "NoteType" NOT NULL DEFAULT 'PRIVATE_COACH',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" TEXT,
    "newValues" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_coach_profiles" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publicTitle" TEXT,
    "publicBio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_coach_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_packages" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "durationDays" INTEGER NOT NULL,
    "sessionsCount" INTEGER,
    "sportsIncluded" TEXT[],
    "benefits" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "championships" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER,
    "date" TIMESTAMP(3),
    "imageUrls" TEXT[],
    "videoUrl" TEXT,
    "results" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "championships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_offers" (
    "id" TEXT NOT NULL,
    "packageId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discount" DOUBLE PRECISION,
    "promoPrice" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "caption" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "coach_profiles_userId_key" ON "coach_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_userId_key" ON "client_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_coach_assignments_clientId_coachId_key" ON "client_coach_assignments"("clientId", "coachId");

-- CreateIndex
CREATE UNIQUE INDEX "muscle_groups_code_key" ON "muscle_groups"("code");

-- CreateIndex
CREATE INDEX "exercise_sports_sportId_idx" ON "exercise_sports"("sportId");

-- CreateIndex
CREATE INDEX "program_assignments_clientId_isActive_idx" ON "program_assignments"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "client_workout_assignments_clientId_scheduledDate_idx" ON "client_workout_assignments"("clientId", "scheduledDate");

-- CreateIndex
CREATE INDEX "client_workout_assignments_programAssignmentId_idx" ON "client_workout_assignments"("programAssignmentId");

-- CreateIndex
CREATE INDEX "client_workout_assignment_exercises_assignmentId_orderIndex_idx" ON "client_workout_assignment_exercises"("assignmentId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "workout_logs_assignmentId_key" ON "workout_logs"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_check_in_schedules_clientId_key" ON "athlete_check_in_schedules"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "session_attendances_sessionId_clientId_key" ON "session_attendances"("sessionId", "clientId");

-- CreateIndex
CREATE INDEX "client_nutrition_assignments_clientId_isActive_idx" ON "client_nutrition_assignments"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "daily_nutrition_logs_clientId_date_idx" ON "daily_nutrition_logs"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_nutrition_logs_clientId_date_key" ON "daily_nutrition_logs"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "public_coach_profiles_coachProfileId_key" ON "public_coach_profiles"("coachProfileId");

-- AddForeignKey
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_headCoachId_fkey" FOREIGN KEY ("headCoachId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_preferredSportId_fkey" FOREIGN KEY ("preferredSportId") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_coach_assignments" ADD CONSTRAINT "client_coach_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_coach_assignments" ADD CONSTRAINT "client_coach_assignments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_primaryMuscleId_fkey" FOREIGN KEY ("primaryMuscleId") REFERENCES "muscle_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_sports" ADD CONSTRAINT "exercise_sports_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_sports" ADD CONSTRAINT "exercise_sports_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "workout_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_programs" ADD CONSTRAINT "nutrition_programs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_nutritionProgramId_fkey" FOREIGN KEY ("nutritionProgramId") REFERENCES "nutrition_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_weeks" ADD CONSTRAINT "program_weeks_programId_fkey" FOREIGN KEY ("programId") REFERENCES "training_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "program_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_workouts" ADD CONSTRAINT "program_workouts_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "program_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_workouts" ADD CONSTRAINT "program_workouts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "workout_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_programId_fkey" FOREIGN KEY ("programId") REFERENCES "training_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_workout_assignments" ADD CONSTRAINT "client_workout_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_workout_assignments" ADD CONSTRAINT "client_workout_assignments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_workout_assignments" ADD CONSTRAINT "client_workout_assignments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "workout_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_workout_assignments" ADD CONSTRAINT "client_workout_assignments_programId_fkey" FOREIGN KEY ("programId") REFERENCES "training_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_workout_assignments" ADD CONSTRAINT "client_workout_assignments_programAssignmentId_fkey" FOREIGN KEY ("programAssignmentId") REFERENCES "program_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_workout_assignment_exercises" ADD CONSTRAINT "client_workout_assignment_exercises_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "client_workout_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_workout_assignment_exercises" ADD CONSTRAINT "client_workout_assignment_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "client_workout_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise_logs" ADD CONSTRAINT "workout_exercise_logs_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "workout_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise_logs" ADD CONSTRAINT "workout_exercise_logs_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_exerciseLogId_fkey" FOREIGN KEY ("exerciseLogId") REFERENCES "workout_exercise_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_measurement_histories" ADD CONSTRAINT "client_measurement_histories_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_measurement_histories" ADD CONSTRAINT "client_measurement_histories_recordedByCoachId_fkey" FOREIGN KEY ("recordedByCoachId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_check_in_schedules" ADD CONSTRAINT "athlete_check_in_schedules_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_check_in_schedules" ADD CONSTRAINT "athlete_check_in_schedules_configuredByCoachId_fkey" FOREIGN KEY ("configuredByCoachId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_goals" ADD CONSTRAINT "client_goals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_medical_restrictions" ADD CONSTRAINT "client_medical_restrictions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_progress_photos" ADD CONSTRAINT "client_progress_photos_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_assessments" ADD CONSTRAINT "client_assessments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_assessments" ADD CONSTRAINT "client_assessments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_calendars" ADD CONSTRAINT "session_calendars_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_calendars" ADD CONSTRAINT "session_calendars_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "session_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_nutrition_assignments" ADD CONSTRAINT "client_nutrition_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_nutrition_assignments" ADD CONSTRAINT "client_nutrition_assignments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_nutrition_assignments" ADD CONSTRAINT "client_nutrition_assignments_nutritionProgramId_fkey" FOREIGN KEY ("nutritionProgramId") REFERENCES "nutrition_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_nutrition_assignments" ADD CONSTRAINT "client_nutrition_assignments_programAssignmentId_fkey" FOREIGN KEY ("programAssignmentId") REFERENCES "program_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_nutrition_logs" ADD CONSTRAINT "daily_nutrition_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_nutrition_logs" ADD CONSTRAINT "daily_nutrition_logs_nutritionAssignmentId_fkey" FOREIGN KEY ("nutritionAssignmentId") REFERENCES "client_nutrition_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_coach_profiles" ADD CONSTRAINT "public_coach_profiles_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_offers" ADD CONSTRAINT "public_offers_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;


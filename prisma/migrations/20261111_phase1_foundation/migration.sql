BEGIN;

-- CreateEnum
CREATE TYPE "AssignmentSourceType" AS ENUM ('INDIVIDUAL', 'TEMPLATE', 'PROGRAM');

-- CreateEnum
CREATE TYPE "NutritionAssignmentMode" AS ENUM ('INHERITED', 'CUSTOM_OVERRIDE', 'MANUAL');

-- DropForeignKey
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_sportId_fkey";

-- AlterTable
ALTER TABLE "sports" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "sportId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "workout_templates" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "training_programs" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nutritionProgramId" TEXT;

-- AlterTable
ALTER TABLE "client_workout_assignments" ADD COLUMN     "description" TEXT,
ADD COLUMN     "programAssignmentId" TEXT,
ADD COLUMN     "programDayNumber" INTEGER,
ADD COLUMN     "programDayTitle" TEXT,
ADD COLUMN     "programWeekNumber" INTEGER,
ADD COLUMN     "sourceType" "AssignmentSourceType" NOT NULL DEFAULT 'TEMPLATE',
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "set_logs" ADD COLUMN     "actualPace" TEXT,
ADD COLUMN     "actualRounds" INTEGER,
ADD COLUMN     "targetDistanceKm" DOUBLE PRECISION,
ADD COLUMN     "targetPace" TEXT,
ADD COLUMN     "targetRounds" INTEGER,
ADD COLUMN     "targetTimeSeconds" INTEGER;

-- AlterTable
ALTER TABLE "client_progress_photos" ADD COLUMN     "backMimeType" TEXT,
ADD COLUMN     "backStorageKey" TEXT,
ADD COLUMN     "frontMimeType" TEXT,
ADD COLUMN     "frontStorageKey" TEXT,
ADD COLUMN     "sideMimeType" TEXT,
ADD COLUMN     "sideStorageKey" TEXT,
ADD COLUMN     "uploadedByUserId" TEXT;

-- CreateTable
CREATE TABLE "exercise_sports" (
    "exerciseId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_sports_pkey" PRIMARY KEY ("exerciseId","sportId")
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

-- CreateIndex
CREATE INDEX "exercise_sports_sportId_idx" ON "exercise_sports"("sportId");

-- CreateIndex
CREATE INDEX "program_assignments_clientId_isActive_idx" ON "program_assignments"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "client_workout_assignment_exercises_assignmentId_orderIndex_idx" ON "client_workout_assignment_exercises"("assignmentId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_check_in_schedules_clientId_key" ON "athlete_check_in_schedules"("clientId");

-- CreateIndex
CREATE INDEX "client_nutrition_assignments_clientId_isActive_idx" ON "client_nutrition_assignments"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "client_workout_assignments_clientId_scheduledDate_idx" ON "client_workout_assignments"("clientId", "scheduledDate");

-- CreateIndex
CREATE INDEX "client_workout_assignments_programAssignmentId_idx" ON "client_workout_assignments"("programAssignmentId");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_sports" ADD CONSTRAINT "exercise_sports_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_sports" ADD CONSTRAINT "exercise_sports_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_programs" ADD CONSTRAINT "nutrition_programs_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_nutritionProgramId_fkey" FOREIGN KEY ("nutritionProgramId") REFERENCES "nutrition_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_programId_fkey" FOREIGN KEY ("programId") REFERENCES "training_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_workout_assignments" ADD CONSTRAINT "client_workout_assignments_programAssignmentId_fkey" FOREIGN KEY ("programAssignmentId") REFERENCES "program_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_workout_assignment_exercises" ADD CONSTRAINT "client_workout_assignment_exercises_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "client_workout_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_workout_assignment_exercises" ADD CONSTRAINT "client_workout_assignment_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_check_in_schedules" ADD CONSTRAINT "athlete_check_in_schedules_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_check_in_schedules" ADD CONSTRAINT "athlete_check_in_schedules_configuredByCoachId_fkey" FOREIGN KEY ("configuredByCoachId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_nutrition_assignments" ADD CONSTRAINT "client_nutrition_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_nutrition_assignments" ADD CONSTRAINT "client_nutrition_assignments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_nutrition_assignments" ADD CONSTRAINT "client_nutrition_assignments_nutritionProgramId_fkey" FOREIGN KEY ("nutritionProgramId") REFERENCES "nutrition_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_nutrition_assignments" ADD CONSTRAINT "client_nutrition_assignments_programAssignmentId_fkey" FOREIGN KEY ("programAssignmentId") REFERENCES "program_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;


COMMIT;

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('SINGLE', 'SUPERSET', 'CIRCUIT', 'SEQUENCE');

-- CreateEnum
CREATE TYPE "BlockItemType" AS ENUM ('EXERCISE', 'REST', 'NOTE');

-- DropForeignKey
ALTER TABLE "program_workouts" DROP CONSTRAINT "program_workouts_templateId_fkey";

-- AlterTable
ALTER TABLE "client_workout_assignments" ADD COLUMN     "programWorkoutOrder" INTEGER;

-- AlterTable
ALTER TABLE "program_assignments" ADD COLUMN     "programTitleSnapshot" TEXT,
ADD COLUMN     "sourceMasterVersion" INTEGER;

-- AlterTable
ALTER TABLE "program_workouts" ADD COLUMN     "title" TEXT,
ALTER COLUMN "templateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "set_logs" ADD COLUMN     "assignmentBlockItemId" TEXT,
ADD COLUMN     "coachReview" TEXT,
ADD COLUMN     "coachReviewedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "isSkipped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roundNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "skipReason" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "workoutLogId" TEXT,
ALTER COLUMN "exerciseLogId" DROP NOT NULL,
ALTER COLUMN "setNumber" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "training_programs" ADD COLUMN     "masterVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "workout_templates" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "workout_blocks" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "programWorkoutId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "type" "BlockType" NOT NULL DEFAULT 'SINGLE',
    "title" TEXT,
    "rounds" INTEGER,
    "durationSeconds" INTEGER,
    "restBetweenRoundsSeconds" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_items" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "itemType" "BlockItemType" NOT NULL DEFAULT 'EXERCISE',
    "exerciseId" TEXT,
    "targetSets" INTEGER,
    "targetReps" TEXT,
    "targetWeightKg" DOUBLE PRECISION,
    "targetDistanceKm" DOUBLE PRECISION,
    "targetTimeSeconds" INTEGER,
    "targetPace" TEXT,
    "targetRounds" INTEGER,
    "restSeconds" INTEGER,
    "tempo" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_blocks" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "type" "BlockType" NOT NULL DEFAULT 'SINGLE',
    "title" TEXT,
    "rounds" INTEGER,
    "durationSeconds" INTEGER,
    "restBetweenRoundsSeconds" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_block_items" (
    "id" TEXT NOT NULL,
    "assignmentBlockId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "itemType" "BlockItemType" NOT NULL DEFAULT 'EXERCISE',
    "exerciseId" TEXT,
    "exerciseNameSnapshot" TEXT,
    "metricTypeSnapshot" "MetricType" NOT NULL DEFAULT 'SETS_REPS_WEIGHT',
    "targetSets" INTEGER,
    "targetReps" TEXT,
    "targetWeightKg" DOUBLE PRECISION,
    "targetDistanceKm" DOUBLE PRECISION,
    "targetTimeSeconds" INTEGER,
    "targetPace" TEXT,
    "targetRounds" INTEGER,
    "restSeconds" INTEGER,
    "tempo" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_block_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_blocks_templateId_orderIndex_idx" ON "workout_blocks"("templateId", "orderIndex");

-- CreateIndex
CREATE INDEX "workout_blocks_programWorkoutId_orderIndex_idx" ON "workout_blocks"("programWorkoutId", "orderIndex");

-- CreateIndex
CREATE INDEX "block_items_blockId_orderIndex_idx" ON "block_items"("blockId", "orderIndex");

-- CreateIndex
CREATE INDEX "assignment_blocks_assignmentId_orderIndex_idx" ON "assignment_blocks"("assignmentId", "orderIndex");

-- CreateIndex
CREATE INDEX "assignment_block_items_assignmentBlockId_orderIndex_idx" ON "assignment_block_items"("assignmentBlockId", "orderIndex");

-- CreateIndex
CREATE INDEX "set_logs_exerciseLogId_idx" ON "set_logs"("exerciseLogId");

-- CreateIndex
CREATE INDEX "set_logs_workoutLogId_idx" ON "set_logs"("workoutLogId");

-- CreateIndex
CREATE INDEX "set_logs_assignmentBlockItemId_idx" ON "set_logs"("assignmentBlockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_item_round_set_unique" ON "set_logs"("workoutLogId", "assignmentBlockItemId", "roundNumber", "setNumber");

-- AddForeignKey
ALTER TABLE "program_workouts" ADD CONSTRAINT "program_workouts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "workout_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_blocks" ADD CONSTRAINT "workout_blocks_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "workout_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_blocks" ADD CONSTRAINT "workout_blocks_programWorkoutId_fkey" FOREIGN KEY ("programWorkoutId") REFERENCES "program_workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_items" ADD CONSTRAINT "block_items_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "workout_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_items" ADD CONSTRAINT "block_items_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_blocks" ADD CONSTRAINT "assignment_blocks_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "client_workout_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_block_items" ADD CONSTRAINT "assignment_block_items_assignmentBlockId_fkey" FOREIGN KEY ("assignmentBlockId") REFERENCES "assignment_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_block_items" ADD CONSTRAINT "assignment_block_items_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "workout_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_assignmentBlockItemId_fkey" FOREIGN KEY ("assignmentBlockItemId") REFERENCES "assignment_block_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


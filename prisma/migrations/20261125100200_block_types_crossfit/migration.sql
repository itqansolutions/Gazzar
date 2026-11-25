-- Additive only: CrossFit block formats and their parameters/results. No existing rows are modified.
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'AMRAP';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'FOR_TIME';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'EMOM';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'TABATA';

ALTER TABLE "workout_blocks" ADD COLUMN "workSeconds" INTEGER;
ALTER TABLE "workout_blocks" ADD COLUMN "restSeconds" INTEGER;
ALTER TABLE "workout_blocks" ADD COLUMN "intervalSeconds" INTEGER;

ALTER TABLE "assignment_blocks" ADD COLUMN "workSeconds" INTEGER;
ALTER TABLE "assignment_blocks" ADD COLUMN "restSeconds" INTEGER;
ALTER TABLE "assignment_blocks" ADD COLUMN "intervalSeconds" INTEGER;
ALTER TABLE "assignment_blocks" ADD COLUMN "resultRounds" INTEGER;
ALTER TABLE "assignment_blocks" ADD COLUMN "resultReps" INTEGER;
ALTER TABLE "assignment_blocks" ADD COLUMN "resultTimeSeconds" INTEGER;

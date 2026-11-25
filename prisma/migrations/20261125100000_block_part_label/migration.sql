-- Additive only: nullable part label (e.g. Warm-up / Strength / Core / Endurance) on template and assignment blocks.
ALTER TABLE "workout_blocks" ADD COLUMN "partLabel" TEXT;
ALTER TABLE "assignment_blocks" ADD COLUMN "partLabel" TEXT;

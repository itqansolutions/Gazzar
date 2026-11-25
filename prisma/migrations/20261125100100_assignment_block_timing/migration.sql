-- Additive only: per-part start/finish timestamps recorded when the athlete taps Start / Done.
ALTER TABLE "assignment_blocks" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "assignment_blocks" ADD COLUMN "finishedAt" TIMESTAMP(3);

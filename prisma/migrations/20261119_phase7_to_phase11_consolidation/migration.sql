-- ============================================================================
-- MIGRATION: 20261119_phase7_to_phase11_consolidation
-- Target: Bridges database state from Phase 6 to Phase 11
-- ============================================================================

-- 1. Create New Phase 11 Enums
CREATE TYPE "MeasurementSource" AS ENUM ('COACH_RECORDED', 'SELF_REPORTED', 'LEGACY');
CREATE TYPE "MeasurementVerificationStatus" AS ENUM ('PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'LEGACY');
CREATE TYPE "PhotoRecordType" AS ENUM ('PHYSIQUE_SET', 'INBODY_SCAN', 'OTHER');
CREATE TYPE "PhotoAssetAngle" AS ENUM ('FRONT', 'SIDE', 'BACK', 'FULL', 'NOT_APPLICABLE');
CREATE TYPE "CheckInReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'FLAGGED');
CREATE TYPE "CheckInRequestStatus" AS ENUM ('PENDING', 'SUBMITTED', 'REVIEWED', 'CANCELLED');

-- 2. Create Phase 11 Models
CREATE TABLE "check_in_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "requestedByCoachId" TEXT,
    "scheduleId" TEXT,
    "requestedMetrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dueAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "CheckInRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewNotes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_in_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "athlete_check_in_submissions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "checkInRequestId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "bodyFatPercentage" DOUBLE PRECISION,
    "muscleMassKg" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "armsCm" DOUBLE PRECISION,
    "thighCm" DOUBLE PRECISION,
    "currentIssues" TEXT,
    "athleteNotes" TEXT,
    "correctsSubmissionId" TEXT,
    "reviewStatus" "CheckInReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "coachReviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_check_in_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_progress_photo_assets" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "angle" "PhotoAssetAngle" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_progress_photo_assets_pkey" PRIMARY KEY ("id")
);

-- 3. Alter Existing Tables (Additive Columns)
ALTER TABLE "client_measurement_histories" 
    ADD COLUMN "source" "MeasurementSource" NOT NULL DEFAULT 'LEGACY',
    ADD COLUMN "verificationStatus" "MeasurementVerificationStatus" NOT NULL DEFAULT 'LEGACY',
    ADD COLUMN "verifiedByUserId" TEXT,
    ADD COLUMN "verifiedAt" TIMESTAMP(3),
    ADD COLUMN "verificationNote" TEXT,
    ADD COLUMN "submissionId" TEXT,
    ADD COLUMN "supersededBySubmissionId" TEXT;

ALTER TABLE "client_progress_photos"
    ADD COLUMN "frontStorageKey" TEXT,
    ADD COLUMN "sideStorageKey" TEXT,
    ADD COLUMN "backStorageKey" TEXT,
    ADD COLUMN "frontMimeType" TEXT,
    ADD COLUMN "sideMimeType" TEXT,
    ADD COLUMN "backMimeType" TEXT,
    ADD COLUMN "recordType" "PhotoRecordType" NOT NULL DEFAULT 'PHYSIQUE_SET',
    ADD COLUMN "submissionId" TEXT;

ALTER TABLE "notifications"
    ADD COLUMN "dedupKey" TEXT,
    ADD COLUMN "relatedEntityId" TEXT,
    ADD COLUMN "relatedEntityType" TEXT;

-- 4. Foreign Key Constraints (Protected with ON DELETE RESTRICT where chain integrity is vital)
ALTER TABLE "check_in_requests" 
    ADD CONSTRAINT "check_in_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "check_in_requests_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "check_in_requests_requestedByCoachId_fkey" FOREIGN KEY ("requestedByCoachId") REFERENCES "coach_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "check_in_requests_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "athlete_check_in_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "check_in_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "athlete_check_in_submissions"
    ADD CONSTRAINT "athlete_check_in_submissions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "athlete_check_in_submissions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "athlete_check_in_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "athlete_check_in_submissions_checkInRequestId_fkey" FOREIGN KEY ("checkInRequestId") REFERENCES "check_in_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "athlete_check_in_submissions_correctsSubmissionId_fkey" FOREIGN KEY ("correctsSubmissionId") REFERENCES "athlete_check_in_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "athlete_check_in_submissions_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_measurement_histories"
    ADD CONSTRAINT "client_measurement_histories_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "client_measurement_histories_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "athlete_check_in_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "client_measurement_histories_supersededBySubmissionId_fkey" FOREIGN KEY ("supersededBySubmissionId") REFERENCES "athlete_check_in_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_progress_photos"
    ADD CONSTRAINT "client_progress_photos_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "athlete_check_in_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client_progress_photo_assets"
    ADD CONSTRAINT "client_progress_photo_assets_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "client_progress_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "client_progress_photo_assets_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Indexes and Partial Unique Constraints
CREATE UNIQUE INDEX "client_measurement_histories_submissionId_key" ON "client_measurement_histories"("submissionId");
CREATE INDEX "athlete_check_in_submissions_clientId_submittedAt_idx" ON "athlete_check_in_submissions"("clientId", "submittedAt");
CREATE INDEX "athlete_check_in_submissions_checkInRequestId_idx" ON "athlete_check_in_submissions"("checkInRequestId");
CREATE INDEX "check_in_requests_clientId_status_idx" ON "check_in_requests"("clientId", "status");
CREATE INDEX "check_in_requests_requestedByUserId_idx" ON "check_in_requests"("requestedByUserId");
CREATE INDEX "check_in_requests_requestedByCoachId_idx" ON "check_in_requests"("requestedByCoachId");
CREATE INDEX "client_progress_photo_assets_photoId_idx" ON "client_progress_photo_assets"("photoId");
CREATE INDEX "notifications_userId_type_relatedEntityId_idx" ON "notifications"("userId", "type", "relatedEntityId");
CREATE INDEX "notifications_userId_dedupKey_idx" ON "notifications"("userId", "dedupKey");

-- Correction Chain Uniqueness (Strictly prevents branching at DB level)
CREATE UNIQUE INDEX "athlete_check_in_submissions_correctsSubmissionId_key" 
    ON "athlete_check_in_submissions"("correctsSubmissionId");

CREATE UNIQUE INDEX "athlete_check_in_submissions_corrects_unique_idx" 
    ON "athlete_check_in_submissions"("correctsSubmissionId") 
    WHERE "correctsSubmissionId" IS NOT NULL;

-- Notification Dedup Key Uniqueness (Scoped per user)
CREATE UNIQUE INDEX "notifications_user_dedup_idx" 
    ON "notifications"("userId", "dedupKey") 
    WHERE "dedupKey" IS NOT NULL;

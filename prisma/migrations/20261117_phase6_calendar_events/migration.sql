-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GROUP_CLASS', 'CHAMPIONSHIP', 'CAMP', 'SEMINAR_WORKSHOP', 'GENERAL_EVENT');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('ONLINE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "AudienceScope" AS ENUM ('WHOLE_ACADEMY', 'BY_SPORT', 'COACH_ROSTER', 'SELECTED_ATHLETES');

-- DropForeignKey
ALTER TABLE "session_calendars" DROP CONSTRAINT "session_calendars_sportId_fkey";

-- AlterTable
ALTER TABLE "session_calendars" ALTER COLUMN "sportId" DROP NOT NULL,
ADD COLUMN     "audienceScope" "AudienceScope" NOT NULL DEFAULT 'WHOLE_ACADEMY',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "eventMode" "EventMode" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "eventType" "EventType" NOT NULL DEFAULT 'GROUP_CLASS',
ADD COLUMN     "isAllDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onlineLink" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "session_calendars" ADD CONSTRAINT "session_calendars_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

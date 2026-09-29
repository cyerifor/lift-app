-- CreateEnum
CREATE TYPE "ExerciseMainLift" AS ENUM ('SQUAT', 'BENCH', 'DEADLIFT', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "ExerciseCapability" AS ENUM ('LOADED_REPS', 'BODYWEIGHT_REPS', 'WEIGHTED_BODYWEIGHT', 'TIME');

-- CreateEnum
CREATE TYPE "ExerciseMode" AS ENUM ('PERCENT_E1RM', 'REP_TARGET', 'DOUBLE_PROGRESSION');

-- CreateEnum
CREATE TYPE "ProgressionEligibility" AS ENUM ('YES', 'NO', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "ExerciseSource" AS ENUM ('SEEDED', 'CUSTOM', 'IMPORTED');

-- DropForeignKey
ALTER TABLE "ExerciseTemplate" DROP CONSTRAINT "ExerciseTemplate_coachId_fkey";

-- DropIndex
DROP INDEX "ExerciseTemplate_coachId_idx";

-- DropIndex
DROP INDEX "ExerciseTemplate_mainLift_category_idx";

-- AlterTable
ALTER TABLE "ExerciseTemplate" DROP COLUMN "coachId",
DROP COLUMN "isCustom",
DROP COLUMN "progEligible",
DROP COLUMN "roundingKg",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "athleteId" TEXT NOT NULL,
ADD COLUMN     "capability" "ExerciseCapability" NOT NULL,
ADD COLUMN     "defaultMode" "ExerciseMode" NOT NULL,
ADD COLUMN     "legacyId" TEXT,
ADD COLUMN     "loadStepKg" DOUBLE PRECISION,
ADD COLUMN     "normalizedName" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "parentLift" "ExerciseMainLift",
ADD COLUMN     "progressionEligibility" "ProgressionEligibility" NOT NULL DEFAULT 'NO',
ADD COLUMN     "restText" TEXT,
ADD COLUMN     "seedRatio" DOUBLE PRECISION,
ADD COLUMN     "source" "ExerciseSource" NOT NULL DEFAULT 'CUSTOM',
DROP COLUMN "mainLift",
ADD COLUMN     "mainLift" "ExerciseMainLift" NOT NULL,
ALTER COLUMN "progressionGroup" DROP NOT NULL;

-- Canonical library constraints not expressible in Prisma's schema DSL.
ALTER TABLE "ExerciseTemplate"
ADD CONSTRAINT "ExerciseTemplate_tier_check" CHECK ("tier" BETWEEN 1 AND 3),
ADD CONSTRAINT "ExerciseTemplate_loadStepKg_check" CHECK ("loadStepKg" IS NULL OR "loadStepKg" >= 0),
ADD CONSTRAINT "ExerciseTemplate_seedRatio_check" CHECK ("seedRatio" IS NULL OR "seedRatio" > 0),
ADD CONSTRAINT "ExerciseTemplate_normalizedName_check" CHECK (length("normalizedName") > 0);

-- CreateIndex
CREATE INDEX "Exercise_exerciseTemplateId_idx" ON "Exercise"("exerciseTemplateId");

-- CreateIndex
CREATE INDEX "ExerciseTemplate_athleteId_active_idx" ON "ExerciseTemplate"("athleteId", "active");

-- CreateIndex
CREATE INDEX "ExerciseTemplate_athleteId_mainLift_category_idx" ON "ExerciseTemplate"("athleteId", "mainLift", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseTemplate_athleteId_normalizedName_key" ON "ExerciseTemplate"("athleteId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseTemplate_athleteId_legacyId_key" ON "ExerciseTemplate"("athleteId", "legacyId");

-- AddForeignKey
ALTER TABLE "ExerciseTemplate" ADD CONSTRAINT "ExerciseTemplate_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

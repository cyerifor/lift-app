-- PowerCoach M2B: programme ownership, structured slots, and exact planned-set identity.
CREATE TYPE "PrescriptionMode" AS ENUM ('PERCENT_E1RM', 'PERCENT_RPE', 'RPE', 'DOUBLE_PROGRESSION', 'FIXED_LOAD', 'REP_TARGET', 'BODYWEIGHT', 'TIME', 'MANUAL');
CREATE TYPE "RepScheme" AS ENUM ('FIXED', 'RANGE', 'AMRAP');
CREATE TYPE "PlannedSetStatus" AS ENUM ('PLANNED');

ALTER TABLE "Block" ALTER COLUMN "coachId" DROP NOT NULL;
ALTER TABLE "Block" ADD COLUMN "deloadType" TEXT,
ADD COLUMN "intensityTrend" TEXT,
ADD COLUMN "volumeTrend" TEXT,
ADD COLUMN "applyProgression" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "frozenAt" TIMESTAMP(3);
ALTER TABLE "Block" DROP CONSTRAINT "Block_coachId_fkey";
ALTER TABLE "Block" ADD CONSTRAINT "Block_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Session" ADD COLUMN "sessionCode" TEXT, ADD COLUMN "trainingDay" TEXT;
UPDATE "Session" SET "sessionCode" = 'S' || "sessionNumber"::TEXT, "trainingDay" = "dayOfWeek";
ALTER TABLE "Session" ALTER COLUMN "sessionCode" SET NOT NULL;
ALTER TABLE "Session" ALTER COLUMN "sessionCode" SET DEFAULT 'S1';

ALTER TABLE "Exercise" ADD COLUMN "setType" TEXT NOT NULL DEFAULT 'Volume',
ADD COLUMN "prescriptionMode" "PrescriptionMode" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "repScheme" "RepScheme",
ADD COLUMN "repMin" INTEGER,
ADD COLUMN "repMax" INTEGER,
ADD COLUMN "rpeMin" DOUBLE PRECISION,
ADD COLUMN "rpeMax" DOUBLE PRECISION,
ADD COLUMN "rpeCap" DOUBLE PRECISION,
ADD COLUMN "pctMin" DOUBLE PRECISION,
ADD COLUMN "pctMax" DOUBLE PRECISION,
ADD COLUMN "setCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "fixedLoadKg" DOUBLE PRECISION,
ADD COLUMN "capabilityOverride" "ExerciseCapability",
ADD COLUMN "notes" TEXT,
ADD COLUMN "referenceE1rmKg" DOUBLE PRECISION,
ADD COLUMN "referenceSource" TEXT,
ADD COLUMN "variationRatioUsed" DOUBLE PRECISION,
ADD COLUMN "suggestedLoadMinKg" DOUBLE PRECISION,
ADD COLUMN "suggestedLoadMaxKg" DOUBLE PRECISION,
ADD COLUMN "suggestedLoadKg" DOUBLE PRECISION,
ADD COLUMN "loadReason" TEXT;
UPDATE "Exercise" SET "setCount" = GREATEST(COALESCE("targetSets", 1), 1), "setType" = COALESCE("exerciseType", 'Volume');
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_setCount_check" CHECK ("setCount" BETWEEN 1 AND 100),
ADD CONSTRAINT "Exercise_rep_range_check" CHECK ("repMin" IS NULL OR "repMax" IS NULL OR "repMin" <= "repMax"),
ADD CONSTRAINT "Exercise_rpe_range_check" CHECK ("rpeMin" IS NULL OR "rpeMax" IS NULL OR "rpeMin" <= "rpeMax"),
ADD CONSTRAINT "Exercise_pct_range_check" CHECK ("pctMin" IS NULL OR "pctMax" IS NULL OR "pctMin" <= "pctMax");

ALTER TABLE "SetPrescription" ADD COLUMN "status" "PlannedSetStatus" NOT NULL DEFAULT 'PLANNED';
-- Expand legacy aggregate prescriptions into one stable row per prescribed set.
INSERT INTO "SetPrescription" ("id", "exerciseId", "setNumber", "repsDisplay", "rpeDisplay", "suggestedLoKg", "suggestedHiKg", "reps", "targetRpe", "targetLoadKg", "targetPercent", "notes", "createdAt", "updatedAt", "status")
SELECT 'm2b_' || md5(e."id" || ':' || gs::TEXT), e."id", gs, e."repsDisplay", e."rpeDisplay", NULL, NULL, NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'PLANNED'
FROM "Exercise" e CROSS JOIN LATERAL generate_series(1, e."setCount") gs
WHERE NOT EXISTS (SELECT 1 FROM "SetPrescription" p WHERE p."exerciseId" = e."id" AND p."setNumber" = gs);

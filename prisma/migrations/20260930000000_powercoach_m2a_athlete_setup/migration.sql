-- Athlete setup preferences and explicit reference-lift selections.
ALTER TABLE "UserSettings"
ADD COLUMN "readinessEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sessionsPerWeek" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "trainingDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "prepFocusAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "prepBudgetMinutes" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "squatReferenceExerciseId" TEXT,
ADD COLUMN "benchReferenceExerciseId" TEXT,
ADD COLUMN "deadliftReferenceExerciseId" TEXT;

ALTER TABLE "UserSettings"
ADD CONSTRAINT "UserSettings_sessionsPerWeek_check" CHECK ("sessionsPerWeek" BETWEEN 1 AND 7),
ADD CONSTRAINT "UserSettings_prepBudgetMinutes_check" CHECK ("prepBudgetMinutes" BETWEEN 0 AND 120);

CREATE INDEX "UserSettings_squatReferenceExerciseId_idx" ON "UserSettings"("squatReferenceExerciseId");
CREATE INDEX "UserSettings_benchReferenceExerciseId_idx" ON "UserSettings"("benchReferenceExerciseId");
CREATE INDEX "UserSettings_deadliftReferenceExerciseId_idx" ON "UserSettings"("deadliftReferenceExerciseId");

ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_squatReferenceExerciseId_fkey" FOREIGN KEY ("squatReferenceExerciseId") REFERENCES "ExerciseTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_benchReferenceExerciseId_fkey" FOREIGN KEY ("benchReferenceExerciseId") REFERENCES "ExerciseTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_deadliftReferenceExerciseId_fkey" FOREIGN KEY ("deadliftReferenceExerciseId") REFERENCES "ExerciseTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StartingStrength" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "parentLift" "ExerciseMainLift" NOT NULL,
  "loadKg" DOUBLE PRECISION NOT NULL,
  "reps" INTEGER NOT NULL,
  "rpe" DOUBLE PRECISION NOT NULL,
  "calculatedE1rmKg" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StartingStrength_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StartingStrength_parentLift_check" CHECK ("parentLift" IN ('SQUAT', 'BENCH', 'DEADLIFT')),
  CONSTRAINT "StartingStrength_loadKg_check" CHECK ("loadKg" > 0),
  CONSTRAINT "StartingStrength_reps_check" CHECK ("reps" BETWEEN 1 AND 8),
  CONSTRAINT "StartingStrength_rpe_check" CHECK ("rpe" BETWEEN 7 AND 10 AND ("rpe" * 2) = floor("rpe" * 2)),
  CONSTRAINT "StartingStrength_calculatedE1rmKg_check" CHECK ("calculatedE1rmKg" > 0)
);
CREATE UNIQUE INDEX "StartingStrength_userId_parentLift_key" ON "StartingStrength"("userId", "parentLift");
CREATE INDEX "StartingStrength_userId_idx" ON "StartingStrength"("userId");
ALTER TABLE "StartingStrength" ADD CONSTRAINT "StartingStrength_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

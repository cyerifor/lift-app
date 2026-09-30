import type { ExerciseMainLift, Prisma, PrismaClient } from "@prisma/client";

import type { AthleteSettingsInput } from "@/lib/athlete-settings/schema";
import { seedAthleteExercises } from "@/lib/exercises/seed";
import { calculateE1rmKg } from "@/lib/strength/rpe-grid";

export class AthleteSettingsError extends Error {}

const liftConfig = {
  squat: { lift: "SQUAT", field: "squatReferenceExerciseId" },
  bench: { lift: "BENCH", field: "benchReferenceExerciseId" },
  deadlift: { lift: "DEADLIFT", field: "deadliftReferenceExerciseId" },
} as const;

export class AthleteSettingsService {
  constructor(private readonly database: PrismaClient) {}

  async get(userId: string, athleteId: string) {
    await this.database.$transaction((transaction) => seedAthleteExercises(transaction, athleteId));
    const [user, exercises] = await Promise.all([
      this.database.user.findUnique({
        where: { id: userId },
        include: { settings: true, startingStrengths: true },
      }),
      this.database.exercise.findMany({
        where: { athleteId, active: true, mainLift: { in: ["SQUAT", "BENCH", "DEADLIFT"] } },
        orderBy: [{ mainLift: "asc" }, { name: "asc" }],
        select: { id: true, name: true, mainLift: true, parentLift: true },
      }),
    ]);
    if (!user) throw new AthleteSettingsError("Athlete user not found");
    return { user: { name: user.name }, settings: user.settings, startingStrengths: user.startingStrengths, exercises };
  }

  async update(userId: string, athleteId: string, input: AthleteSettingsInput) {
    const selectedIds = Object.values(input.references).filter((id): id is string => id !== null);
    const selected = selectedIds.length
      ? await this.database.exercise.findMany({ where: { id: { in: selectedIds }, athleteId, active: true } })
      : [];
    const byId = new Map(selected.map((exercise) => [exercise.id, exercise]));
    for (const [key, config] of Object.entries(liftConfig) as [keyof typeof liftConfig, (typeof liftConfig)[keyof typeof liftConfig]][]) {
      const id = input.references[key];
      if (id && byId.get(id)?.mainLift !== config.lift) {
        throw new AthleteSettingsError(`Selected ${key} reference must be an active ${key} exercise owned by this athlete`);
      }
    }

    const strengthRows = (Object.entries(liftConfig) as [keyof typeof liftConfig, (typeof liftConfig)[keyof typeof liftConfig]][]).map(([key, config]) => {
      const value = input.startingStrengths[key];
      if (!value) return { lift: config.lift as ExerciseMainLift, value: null };
      const calculatedE1rmKg = calculateE1rmKg(value.loadKg, value.reps, value.rpe);
      if (calculatedE1rmKg === undefined) throw new AthleteSettingsError(`Unsupported ${key} starting strength`);
      return { lift: config.lift as ExerciseMainLift, value: { ...value, calculatedE1rmKg } };
    });

    return this.database.$transaction(async (transaction) => {
      await transaction.user.update({ where: { id: userId }, data: { name: input.displayName } });
      await transaction.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          ...this.settingsData(input),
        },
        update: this.settingsData(input),
      });
      for (const row of strengthRows) {
        if (!row.value) {
          await transaction.startingStrength.deleteMany({ where: { userId, parentLift: row.lift } });
        } else {
          await transaction.startingStrength.upsert({
            where: { userId_parentLift: { userId, parentLift: row.lift } },
            create: { userId, parentLift: row.lift, ...row.value },
            update: row.value,
          });
        }
      }
      return this.getWithTransaction(transaction, userId);
    });
  }

  private settingsData(input: AthleteSettingsInput) {
    return {
      displayName: input.displayName,
      displayUnits: input.displayUnits,
      bodyweightKg: input.bodyweightKg,
      defaultLoadStepKg: input.defaultLoadStepKg,
      readinessEnabled: input.readinessEnabled,
      sessionsPerWeek: input.sessionsPerWeek,
      trainingDays: input.trainingDays,
      prepFocusAreas: input.prepFocusAreas,
      prepBudgetMinutes: input.prepBudgetMinutes,
      squatReferenceExerciseId: input.references.squat,
      benchReferenceExerciseId: input.references.bench,
      deadliftReferenceExerciseId: input.references.deadlift,
    };
  }

  private getWithTransaction(transaction: Prisma.TransactionClient, userId: string) {
    return transaction.user.findUnique({ where: { id: userId }, include: { settings: true, startingStrengths: true } });
  }
}

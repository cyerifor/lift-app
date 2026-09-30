import assert from "node:assert/strict";
import test from "node:test";

const databaseUrl = process.env.TEST_DATABASE_URL;

test("athlete setup persists references and RPE-derived seed e1RMs on PostgreSQL", { skip: !databaseUrl, timeout: 30_000 }, async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = databaseUrl;
  const [{ db }, { AthleteSettingsService }, { athleteSettingsInputSchema }] = await Promise.all([
    import("../lib/db.ts"), import("../lib/athlete-settings/service.ts"), import("../lib/athlete-settings/schema.ts"),
  ]);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await db.user.create({ data: { email: `m2a-${suffix}@example.test`, name: "Before", role: "ATHLETE" } });
  try {
    const athlete = await db.athlete.create({ data: { userId: user.id } });
    const service = new AthleteSettingsService(db);
    const initial = await service.get(user.id, athlete.id);
    const squat = initial.exercises.find((exercise) => exercise.mainLift === "SQUAT");
    assert.ok(squat);
    const input = athleteSettingsInputSchema.parse({
      displayName: "Power Athlete", displayUnits: "IMPERIAL", bodyweightKg: 100, defaultLoadStepKg: 2.5,
      readinessEnabled: false, sessionsPerWeek: 3, trainingDays: ["MONDAY", "WEDNESDAY", "SATURDAY"],
      prepFocusAreas: ["Hips", "Bracing"], prepBudgetMinutes: 12,
      references: { squat: squat.id, bench: null, deadlift: null },
      startingStrengths: { squat: { loadKg: 257.5, reps: 1, rpe: 9 }, bench: { loadKg: 185, reps: 1, rpe: 9.5 }, deadlift: null },
    });
    await service.update(user.id, athlete.id, input);
    const persisted = await service.get(user.id, athlete.id);
    assert.equal(persisted.settings?.squatReferenceExerciseId, squat.id);
    assert.deepEqual(persisted.settings?.trainingDays, ["MONDAY", "WEDNESDAY", "SATURDAY"]);
    assert.equal(persisted.startingStrengths.length, 2);
    assert.ok(Math.abs((persisted.startingStrengths.find((row) => row.parentLift === "SQUAT")?.calculatedE1rmKg ?? 0) - 271.0526) < 0.0001);

    const otherUser = await db.user.create({ data: { email: `m2a-other-${suffix}@example.test`, name: "Other" } });
    try {
      const otherAthlete = await db.athlete.create({ data: { userId: otherUser.id } });
      const other = await service.get(otherUser.id, otherAthlete.id);
      const otherSquat = other.exercises.find((exercise) => exercise.mainLift === "SQUAT");
      assert.ok(otherSquat);
      await assert.rejects(service.update(user.id, athlete.id, { ...input, references: { ...input.references, squat: otherSquat.id } }), /owned by this athlete/);
    } finally { await db.user.delete({ where: { id: otherUser.id } }); }
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});

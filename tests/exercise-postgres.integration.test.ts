import assert from "node:assert/strict";
import test from "node:test";

const databaseUrl = process.env.TEST_DATABASE_URL;

test(
  "Exercise Library persists ownership, CRUD, seed idempotency, uniqueness, and slot references on PostgreSQL",
  { skip: !databaseUrl, timeout: 30_000 },
  async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.DIRECT_URL = databaseUrl;
    const [{ db }, { ExerciseService }, { exerciseInputSchema }] = await Promise.all([
      import("../lib/db.ts"),
      import("../lib/exercises/service.ts"),
      import("../lib/exercises/schema.ts"),
    ]);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const users: string[] = [];
    const service = new ExerciseService(db);

    try {
      const coachUser = await db.user.create({ data: { email: `library-coach-${suffix}@example.test`, name: "Coach", role: "COACH" } });
      users.push(coachUser.id);
      const coach = await db.coach.create({ data: { userId: coachUser.id } });
      const athleteUser = await db.user.create({ data: { email: `library-athlete-${suffix}@example.test`, name: "Athlete" } });
      users.push(athleteUser.id);
      const athlete = await db.athlete.create({ data: { userId: athleteUser.id, coachId: coach.id } });
      const otherUser = await db.user.create({ data: { email: `library-other-${suffix}@example.test`, name: "Other" } });
      users.push(otherUser.id);
      const otherAthlete = await db.athlete.create({ data: { userId: otherUser.id } });

      assert.deepEqual(await service.ensureInitialLibrary(athlete.id), { inserted: 117, expected: 117 });
      assert.deepEqual(await service.ensureInitialLibrary(athlete.id), { inserted: 0, expected: 117 });
      assert.deepEqual(await service.ensureInitialLibrary(otherAthlete.id), { inserted: 117, expected: 117 });
      assert.equal(await db.exercise.count({ where: { athleteId: athlete.id } }), 117);
      assert.equal(await db.exercise.count({ where: { athleteId: otherAthlete.id } }), 117);

      const input = exerciseInputSchema.parse({
        name: "  M1B   Custom Squat  ",
        mainLift: "SQUAT",
        category: "Variation",
        movementPattern: "Squat pattern",
        equipment: "Barbell",
        capability: "LOADED_REPS",
        defaultMode: "PERCENT_E1RM",
        parentLift: "SQUAT",
        progressionGroup: "Squat_Variation",
        progressionEligibility: "YES",
        loadStepKg: 2.5,
        tier: 2,
      });
      const created = await service.create(athlete.id, input);
      assert.equal(created.name, "M1B   Custom Squat");
      assert.equal(created.normalizedName, "m1b custom squat");
      await assert.rejects(service.create(athlete.id, { ...input, name: "m1b custom squat" }), /already exists/);
      const sameNameOtherAthlete = await service.create(otherAthlete.id, input);
      assert.notEqual(sameNameOtherAthlete.id, created.id);

      const updated = await service.update(athlete.id, created.id, { ...input, name: "Updated Custom Squat" });
      assert.equal(updated.id, created.id);
      const duplicate = await service.duplicate(athlete.id, created.id, "Updated Custom Squat Copy");
      assert.notEqual(duplicate.id, created.id);
      assert.equal(duplicate.source, "CUSTOM");

      const block = await db.block.create({
        data: {
          coachId: coach.id,
          athleteId: athlete.id,
          title: "Reference integrity",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-02-01"),
        },
      });
      const week = await db.week.create({
        data: { blockId: block.id, weekNumber: 1, startDate: block.startDate, endDate: block.endDate },
      });
      const session = await db.session.create({ data: { weekId: week.id, title: "Session", sessionNumber: 1 } });
      const slot = await db.exerciseSlot.create({
        data: { sessionId: session.id, exerciseId: created.id, name: created.name, orderIndex: 1 },
      });

      assert.equal((await service.archive(athlete.id, created.id)).active, false);
      await assert.rejects(service.create(athlete.id, { ...input, name: "updated custom squat" }), /already exists/);
      await service.update(athlete.id, created.id, { ...input, name: "Renamed After Programming" });
      assert.equal((await service.get(athlete.id, created.id)).id, created.id);
      const persistedSlot = await db.exerciseSlot.findUniqueOrThrow({ where: { id: slot.id }, include: { exercise: true } });
      assert.equal(persistedSlot.exercise?.id, created.id);
      assert.equal(persistedSlot.exercise?.active, false);
      assert.equal(persistedSlot.name, created.name);
      assert.equal((await service.restore(athlete.id, created.id)).active, true);
      await assert.rejects(service.get(otherAthlete.id, created.id), /not found/i);
    } finally {
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    }
  },
);

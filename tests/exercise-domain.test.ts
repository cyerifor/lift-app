import assert from "node:assert/strict";
import test from "node:test";

import { normalizeExerciseName } from "../lib/exercises/normalize-name.ts";
import { exerciseInputSchema } from "../lib/exercises/schema.ts";
import { loadExerciseSeed } from "../lib/exercises/seed.ts";

test("normalizes exercise names with NFKC, trimming, collapsed whitespace, and lowercase", () => {
  assert.equal(normalizeExerciseName("  Ｐａｕｓｅｄ\t  Squat  "), "paused squat");
  assert.equal(normalizeExerciseName("Cafe\u0301 Press"), normalizeExerciseName("Café Press"));
});

test("loads exactly 117 unique seed exercises while preserving known blank metadata", async () => {
  const rows = await loadExerciseSeed();
  assert.equal(rows.length, 117);
  assert.equal(new Set(rows.map((row) => normalizeExerciseName(row.name))).size, 117);
  assert.deepEqual(
    Object.fromEntries(
      ["Accessory", "Bench", "Squat", "Deadlift"].map((value) => [
        value,
        rows.filter((row) => row.mainLift === value).length,
      ]),
    ),
    { Accessory: 77, Bench: 15, Squat: 14, Deadlift: 11 },
  );
  assert.deepEqual(
    Object.fromEntries(
      ["LOADED_REPS", "BODYWEIGHT_REPS", "TIME", "WEIGHTED_BODYWEIGHT"].map((value) => [
        value,
        rows.filter((row) => row.capability === value).length,
      ]),
    ),
    { LOADED_REPS: 83, BODYWEIGHT_REPS: 21, TIME: 11, WEIGHTED_BODYWEIGHT: 2 },
  );
  assert.deepEqual(
    rows.filter((row) => !row.equipment && !row.movementPattern).map((row) => row.name),
    [
      "Paused Conventional Deadlift",
      "Competition Bench (Back-Off)",
      "DB Preacher Curl",
      "Single-Leg Leg Press",
      "Dead Bug",
    ],
  );
});

const validInput = {
  name: "Custom Squat",
  mainLift: "SQUAT" as const,
  category: "Variation",
  movementPattern: "Squat pattern",
  equipment: "Barbell",
  capability: "LOADED_REPS" as const,
  defaultMode: "PERCENT_E1RM" as const,
  parentLift: "SQUAT" as const,
  progressionGroup: "Squat_Variation",
  progressionEligibility: "YES" as const,
  loadStepKg: 2.5,
  tier: 2,
};

test("validates capability and mode combinations for custom exercises", () => {
  assert.equal(exerciseInputSchema.safeParse(validInput).success, true);
  assert.equal(
    exerciseInputSchema.safeParse({ ...validInput, capability: "TIME", defaultMode: "PERCENT_E1RM" }).success,
    false,
  );
  assert.equal(exerciseInputSchema.safeParse({ ...validInput, capability: "TIME", loadStepKg: null }).success, false);
  assert.equal(exerciseInputSchema.safeParse({ ...validInput, loadStepKg: 0 }).success, false);
});

import assert from "node:assert/strict";
import test from "node:test";

import { athleteSettingsInputSchema } from "../lib/athlete-settings/schema.ts";
import { calculateE1rmKg, kgToLb, lbToKg, rpePercentage } from "../lib/strength/rpe-grid.ts";

test("authoritative RPE grid calculates the documented starting e1RMs", () => {
  assert.equal(calculateE1rmKg(257.5, 1, 9), 257.5 / 0.95);
  assert.equal(calculateE1rmKg(185, 1, 9.5), 185 / 0.97);
  assert.ok(Math.abs((calculateE1rmKg(257.5, 1, 9) ?? 0) - 271.0526) < 0.0001);
});

test("RPE grid never extrapolates unsupported evidence", () => {
  assert.equal(rpePercentage(9, 8), undefined);
  assert.equal(rpePercentage(5, 6.5), undefined);
  assert.equal(calculateE1rmKg(100, 0, 8), undefined);
  assert.equal(calculateE1rmKg(0, 1, 10), undefined);
});

test("kg/lb boundaries round-trip without changing canonical kilograms", () => {
  assert.ok(Math.abs(lbToKg(kgToLb(137.5)) - 137.5) < 1e-9);
});

const valid = {
  displayName: "Sam Athlete",
  displayUnits: "METRIC" as const,
  bodyweightKg: 90,
  defaultLoadStepKg: 2.5,
  readinessEnabled: true,
  sessionsPerWeek: 3,
  trainingDays: ["MONDAY", "WEDNESDAY", "FRIDAY"] as const,
  prepFocusAreas: ["Hips", "Bracing"],
  prepBudgetMinutes: 10,
  references: { squat: "squat-id", bench: null, deadlift: null },
  startingStrengths: { squat: { loadKg: 200, reps: 3, rpe: 8 }, bench: null, deadlift: null },
};

test("athlete setup validates schedule and supported starting-strength inputs", () => {
  assert.equal(athleteSettingsInputSchema.safeParse(valid).success, true);
  assert.equal(athleteSettingsInputSchema.safeParse({ ...valid, sessionsPerWeek: 4 }).success, false);
  assert.equal(athleteSettingsInputSchema.safeParse({ ...valid, startingStrengths: { ...valid.startingStrengths, squat: { loadKg: 200, reps: 9, rpe: 8 } } }).success, false);
  assert.equal(athleteSettingsInputSchema.safeParse({ ...valid, startingStrengths: { ...valid.startingStrengths, squat: { loadKg: 200, reps: 3, rpe: 8.2 } } }).success, false);
});

import assert from "node:assert/strict"; import test from "node:test";
import { generateSessionOccurrences } from "../lib/programme/dates.ts"; import { exerciseSlotPrescriptionSchema } from "../lib/programme/schema.ts";
const base = { exerciseId: "exercise", setType: "Volume", setCount: 3 };
function valid(mode: string, extra: object = {}) { return exerciseSlotPrescriptionSchema.safeParse({ ...base, prescriptionMode: mode, ...extra }); }
test("structured programme modes enforce their required evidence", () => {
  assert.ok(valid("PERCENT_E1RM", { pctMin: .7, pctMax: .75 }).success); assert.equal(valid("PERCENT_E1RM").success, false);
  assert.ok(valid("PERCENT_RPE", { pctMin: .7, rpeMin: 7 }).success); assert.equal(valid("PERCENT_RPE", { pctMin: .7 }).success, false);
  assert.ok(valid("RPE", { repScheme: "FIXED", repMin: 4, repMax: 4, rpeMin: 7.5, rpeMax: 8 }).success);
  assert.ok(valid("DOUBLE_PROGRESSION", { repScheme: "RANGE", repMin: 8, repMax: 12, rpeCap: 8 }).success);
  assert.equal(valid("DOUBLE_PROGRESSION", { repScheme: "FIXED", repMin: 8, repMax: 8 }).success, false);
  assert.equal(valid("FIXED_LOAD").success, false); assert.ok(valid("FIXED_LOAD", { fixedLoadKg: 20 }).success);
  assert.ok(valid("BODYWEIGHT", { repScheme: "FIXED", repMin: 8, repMax: 8 }).success);
  assert.ok(valid("TIME").success); assert.equal(valid("TIME", { repMin: 30 }).success, false); assert.ok(valid("MANUAL").success);
});
test("rep, RPE, and percentage ranges reject inverted bounds", () => { assert.equal(valid("REP_TARGET", { repMin: 12, repMax: 8 }).success, false); assert.equal(valid("RPE", { rpeMin: 9, rpeMax: 7 }).success, false); assert.equal(valid("PERCENT_E1RM", { pctMin: .8, pctMax: .7 }).success, false); });
test("session generation is sequential, starts exactly on startDate, and groups programme weeks", () => { const start = new Date("2026-10-02T00:00:00.000Z"); const rows = generateSessionOccurrences({ startDate: start, trainingDays: ["MONDAY", "WEDNESDAY", "FRIDAY"], sessionsPerWeek: 3, weekCount: 6 }); assert.equal(rows.length, 18); assert.equal(rows[0].scheduledAt.toISOString(), start.toISOString()); assert.deepEqual(rows.slice(0, 6).map((r) => r.programmeWeek), [1,1,1,2,2,2]); assert.deepEqual(rows.slice(0,3).map((r) => r.sessionCode), ["S1","S2","S3"]); assert.ok(rows.every((row) => row.scheduledAt >= start)); });

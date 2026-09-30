import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ExerciseForm } from "@/components/exercises/ExerciseForm";
import { ExercisePicker, filterPickerExercises, nextPickerIndex, selectCreatedExercise } from "@/components/exercises/ExercisePicker";
import { duplicateExercise, listExercises, saveExercise, setExerciseArchived, validateExercise, type ExerciseRecord } from "@/lib/exercises/client";
import type { ExerciseInput, ExerciseUpdateInput } from "@/lib/exercises/schema";

const valid: ExerciseInput = {
  name: "  Cable Y-Raise  ", mainLift: "ACCESSORY", category: "Strength Accessory", movementPattern: "Scapular raise",
  equipment: "Cable", capability: "LOADED_REPS", defaultMode: "DOUBLE_PROGRESSION", progressionEligibility: "YES",
  parentLift: null, progressionGroup: "shoulders", loadStepKg: 1.25, tier: 2, restText: null, seedRatio: null, notes: null,
};

test("exercise form uses canonical validation and trims names", () => {
  const result = validateExercise(valid);
  assert.equal(result.data?.name, "Cable Y-Raise");
  assert.deepEqual(result.errors, {});
});

test("exercise form rejects missing required metadata and incompatible modes", () => {
  const missing = validateExercise({ ...valid, equipment: "", movementPattern: "" });
  assert.ok(missing.errors.equipment);
  assert.ok(missing.errors.movementPattern);
  const incompatible = validateExercise({ ...valid, capability: "TIME", defaultMode: "PERCENT_E1RM", loadStepKg: null });
  assert.match(incompatible.errors.defaultMode || "", /requires|must use/i);
});

test("legacy unknown metadata is valid only while editing and is clearly represented", () => {
  const legacy: ExerciseUpdateInput = { ...valid, movementPattern: null, equipment: null };
  assert.ok(validateExercise(legacy, true).data);
  assert.equal(validateExercise(legacy as ExerciseInput).data, null);
  const exercise = { ...legacy, name: "Legacy Drill", id: "legacy-1", athleteId: "athlete-1", normalizedName: "legacy drill", source: "SEEDED" as const, active: true, createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() };
  const markup = renderToStaticMarkup(<ExerciseForm exercise={exercise} onSaved={() => {}} onCancel={() => {}} />);
  assert.match(markup, /Movement pattern \(unknown\)/);
  assert.match(markup, /Equipment \(unknown\)/);
  assert.match(markup, /You may leave this unchanged/);
});

test("library API interactions load, create, edit, archive, restore, duplicate, and preserve coach selector", async (context) => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const record = { ...valid, name: "Cable Y-Raise", id: "canonical-1", athleteId: "athlete-7", normalizedName: "cable y-raise", source: "CUSTOM" as const, active: true, createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return Response.json(String(input).includes("/api/exercises?") && !init ? [record] : record);
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  assert.deepEqual(await listExercises("athlete-7"), [record]);
  assert.equal((await saveExercise(valid, "athlete-7")).id, "canonical-1");
  assert.equal((await saveExercise({ ...valid, notes: "Edited" }, "athlete-7", record.id)).id, record.id);
  await setExerciseArchived(record.id, true, "athlete-7");
  await setExerciseArchived(record.id, false, "athlete-7");
  await duplicateExercise(record.id, "Cable Y-Raise 2", "athlete-7");
  assert.ok(calls.every((call) => call.url.endsWith("?athleteId=athlete-7")));
  assert.deepEqual(calls.map((call) => call.init?.method), [undefined, "POST", "PATCH", "POST", "POST", "POST"]);
});

test("duplicate normalized-name failures are surfaced from the API", async (context) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: "An exercise with this normalized name already exists.", code: "DUPLICATE_NAME" }, { status: 409 });
  context.after(() => { globalThis.fetch = originalFetch; });
  await assert.rejects(duplicateExercise("canonical-1", " cable y-raise "), (error: { message?: string }) => error.message?.includes("normalized name") === true);
});

test("picker search, keyboard navigation, and inline create return the canonical ID", () => {
  const first = { ...valid, name: "Barbell Squat", id: "squat-id", athleteId: "athlete-1", normalizedName: "barbell squat", source: "SEEDED" as const, active: true, createdAt: "", updatedAt: "" } satisfies ExerciseRecord;
  const second = { ...first, name: "Cable Row", id: "row-id", normalizedName: "cable row", equipment: "Cable", mainLift: "ACCESSORY" as const };
  assert.deepEqual(filterPickerExercises([first, second], "row", "ACCESSORY", "Cable").map((exercise) => exercise.id), ["row-id"]);
  assert.equal(nextPickerIndex(0, "ArrowDown", 2), 1);
  assert.equal(nextPickerIndex(1, "ArrowUp", 2), 0);
  let selected: string | null = null;
  selectCreatedExercise(second, (id) => { selected = id; });
  assert.equal(selected, "row-id");
});

test("reusable form renders labelled canonical fields and history warning", () => {
  const createMarkup = renderToStaticMarkup(<ExerciseForm onSaved={() => {}} onCancel={() => {}} />);
  for (const label of ["Exercise name", "Main lift / family", "Movement pattern", "Equipment", "Capability", "Default mode"]) assert.match(createMarkup, new RegExp(label));
  const exercise = { ...valid, name: "Cable Y-Raise", id: "exercise-1", athleteId: "athlete-1", normalizedName: "cable y-raise", source: "CUSTOM" as const, active: true, createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() };
  assert.match(renderToStaticMarkup(<ExerciseForm exercise={exercise} onSaved={() => {}} onCancel={() => {}} />), /Existing exercise slots and training history keep their identity/);
});

test("picker exposes loading state, accessible search, and inline creation", () => {
  const markup = renderToStaticMarkup(<ExercisePicker onSelect={() => {}} />);
  assert.match(markup, /role="combobox"/);
  assert.match(markup, /Loading exercises/);
  assert.match(markup, /Create new exercise/);
});

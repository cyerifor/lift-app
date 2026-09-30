import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ExerciseForm } from "@/components/exercises/ExerciseForm";
import { ExercisePicker } from "@/components/exercises/ExercisePicker";
import { validateExercise } from "@/lib/exercises/client";
import type { ExerciseInput } from "@/lib/exercises/schema";

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
  assert.match(missing.errors.equipment || "", /at least 1 character/i);
  assert.match(missing.errors.movementPattern || "", /at least 1 character/i);
  const incompatible = validateExercise({ ...valid, capability: "TIME", defaultMode: "PERCENT_E1RM", loadStepKg: null });
  assert.match(incompatible.errors.defaultMode || "", /requires|must use/i);
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

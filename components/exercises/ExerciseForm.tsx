"use client";

import { useId, useState, type FormEvent } from "react";

import { saveExercise, validateExercise, type ExerciseFieldErrors, type ExerciseRecord } from "@/lib/exercises/client";
import type { ExerciseInput, ExerciseUpdateInput } from "@/lib/exercises/schema";

const initialExercise: ExerciseInput = {
  name: "", mainLift: "ACCESSORY", category: "Strength Accessory", movementPattern: "", equipment: "",
  capability: "LOADED_REPS", defaultMode: "DOUBLE_PROGRESSION", progressionEligibility: "NO",
  parentLift: null, progressionGroup: null, loadStepKg: 2.5, tier: 1, restText: null, seedRatio: null, notes: null,
};

const labels = { LOADED_REPS: "Loaded reps", BODYWEIGHT_REPS: "Bodyweight reps", WEIGHTED_BODYWEIGHT: "Weighted bodyweight", TIME: "Time" };
const modeLabels = { PERCENT_E1RM: "% e1RM", REP_TARGET: "Rep target", DOUBLE_PROGRESSION: "Double progression" };
const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25";

export function ExerciseForm({ exercise, athleteId, onSaved, onCancel }: { exercise?: ExerciseRecord; athleteId?: string; onSaved: (exercise: ExerciseRecord) => void; onCancel: () => void }) {
  const id = useId();
  const [value, setValue] = useState<ExerciseInput | ExerciseUpdateInput>(() => exercise ? {
    name: exercise.name, mainLift: exercise.mainLift, category: exercise.category, movementPattern: exercise.movementPattern,
    equipment: exercise.equipment, capability: exercise.capability, defaultMode: exercise.defaultMode, active: exercise.active,
    parentLift: exercise.parentLift, progressionGroup: exercise.progressionGroup, progressionEligibility: exercise.progressionEligibility,
    loadStepKg: exercise.loadStepKg, tier: exercise.tier, restText: exercise.restText, seedRatio: exercise.seedRatio, notes: exercise.notes,
  } : initialExercise);
  const [errors, setErrors] = useState<ExerciseFieldErrors>({});
  const [requestError, setRequestError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ExerciseUpdateInput>(key: K, next: ExerciseUpdateInput[K]) => setValue((current) => ({ ...current, [key]: next }));
  const error = (key: keyof ExerciseInput) => errors[key] ? <p id={`${id}-${key}-error`} className="mt-1 text-sm text-rose-300">{errors[key]}</p> : null;

  async function submit(event: FormEvent) {
    event.preventDefault(); setRequestError("");
    const result = validateExercise(value, !!exercise); setErrors(result.errors);
    if (!result.data) return;
    setSaving(true);
    try {
      onSaved(await saveExercise(result.data, athleteId, exercise?.id));
    } catch (error) {
      const apiError = error as { message?: string; fieldErrors?: ExerciseFieldErrors };
      setRequestError(apiError.message || "Network error. Check your connection and try again.");
      if (apiError.fieldErrors) setErrors(apiError.fieldErrors);
    }
    finally { setSaving(false); }
  }

  return <form onSubmit={submit} noValidate className="space-y-5">
    {requestError && <div role="alert" className="rounded-xl border border-rose-700 bg-rose-950/60 p-3 text-sm text-rose-200">{requestError}</div>}
    <div><label htmlFor={`${id}-name`} className="text-sm font-medium">Exercise name *</label><input id={`${id}-name`} autoFocus value={value.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id}-name-error` : undefined} className={fieldClass}/>{error("name")}</div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label htmlFor={`${id}-mainLift`} className="text-sm font-medium">Main lift / family *</label><select id={`${id}-mainLift`} value={value.mainLift} onChange={(e) => set("mainLift", e.target.value as ExerciseInput["mainLift"])} className={fieldClass}>{["SQUAT","BENCH","DEADLIFT","ACCESSORY"].map(x=><option key={x} value={x}>{x[0]+x.slice(1).toLowerCase()}</option>)}</select></div>
      <div><label htmlFor={`${id}-category`} className="text-sm font-medium">Category *</label><input id={`${id}-category`} value={value.category} onChange={(e)=>set("category",e.target.value)} className={fieldClass}/>{error("category")}</div>
      <div><label htmlFor={`${id}-movement`} className="text-sm font-medium">Movement pattern {exercise?.movementPattern === null ? "(unknown)" : "*"}</label><input id={`${id}-movement`} placeholder={exercise?.movementPattern === null ? "Unknown in legacy data" : undefined} value={value.movementPattern ?? ""} onChange={(e)=>set("movementPattern",e.target.value || (exercise?.movementPattern === null ? null : ""))} className={fieldClass}/>{exercise?.movementPattern === null && value.movementPattern === null && <p className="mt-1 text-xs text-amber-300">Unknown in the imported record. You may leave this unchanged.</p>}{error("movementPattern")}</div>
      <div><label htmlFor={`${id}-equipment`} className="text-sm font-medium">Equipment {exercise?.equipment === null ? "(unknown)" : "*"}</label><input id={`${id}-equipment`} placeholder={exercise?.equipment === null ? "Unknown in legacy data" : undefined} value={value.equipment ?? ""} onChange={(e)=>set("equipment",e.target.value || (exercise?.equipment === null ? null : ""))} className={fieldClass}/>{exercise?.equipment === null && value.equipment === null && <p className="mt-1 text-xs text-amber-300">Unknown in the imported record. You may leave this unchanged.</p>}{error("equipment")}</div>
      <div><label htmlFor={`${id}-capability`} className="text-sm font-medium">Capability *</label><select id={`${id}-capability`} value={value.capability} onChange={(e)=>set("capability",e.target.value as ExerciseInput["capability"])} className={fieldClass}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
      <div><label htmlFor={`${id}-mode`} className="text-sm font-medium">Default mode *</label><select id={`${id}-mode`} value={value.defaultMode} onChange={(e)=>set("defaultMode",e.target.value as ExerciseInput["defaultMode"])} className={fieldClass}>{Object.entries(modeLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>{error("defaultMode")}</div>
    </div>
    <details className="rounded-xl border border-slate-800 p-4"><summary className="cursor-pointer font-medium">Advanced metadata</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div><label htmlFor={`${id}-parent`} className="text-sm">Parent lift</label><select id={`${id}-parent`} value={value.parentLift ?? ""} onChange={(e)=>set("parentLift",(e.target.value || null) as ExerciseInput["parentLift"])} className={fieldClass}><option value="">None</option>{["SQUAT","BENCH","DEADLIFT"].map(x=><option key={x}>{x}</option>)}</select></div>
      <div><label htmlFor={`${id}-group`} className="text-sm">Progression group</label><input id={`${id}-group`} value={value.progressionGroup ?? ""} onChange={(e)=>set("progressionGroup",e.target.value || null)} className={fieldClass}/></div>
      <div><label htmlFor={`${id}-eligible`} className="text-sm">Progression eligibility</label><select id={`${id}-eligible`} value={value.progressionEligibility} onChange={(e)=>set("progressionEligibility",e.target.value as ExerciseInput["progressionEligibility"])} className={fieldClass}>{["YES","NO","OPTIONAL"].map(x=><option key={x}>{x}</option>)}</select></div>
      <div><label htmlFor={`${id}-step`} className="text-sm">Load step (kg)</label><input id={`${id}-step`} type="number" min="0" step="0.25" value={value.loadStepKg ?? ""} onChange={(e)=>set("loadStepKg",e.target.value === "" ? null : Number(e.target.value))} className={fieldClass}/>{error("loadStepKg")}</div>
      <div><label htmlFor={`${id}-tier`} className="text-sm">Tier</label><select id={`${id}-tier`} value={value.tier} onChange={(e)=>set("tier",Number(e.target.value))} className={fieldClass}>{[1,2,3].map(x=><option key={x}>{x}</option>)}</select></div>
      <div><label htmlFor={`${id}-ratio`} className="text-sm">Seed variation ratio</label><input id={`${id}-ratio`} type="number" min="0" step="0.01" value={value.seedRatio ?? ""} onChange={(e)=>set("seedRatio",e.target.value === "" ? null : Number(e.target.value))} className={fieldClass}/>{error("seedRatio")}</div>
      <div className="sm:col-span-2"><label htmlFor={`${id}-rest`} className="text-sm">Rest guidance</label><input id={`${id}-rest`} value={value.restText ?? ""} onChange={(e)=>set("restText",e.target.value || null)} className={fieldClass}/></div>
      <div className="sm:col-span-2"><label htmlFor={`${id}-notes`} className="text-sm">Notes</label><textarea id={`${id}-notes`} value={value.notes ?? ""} onChange={(e)=>set("notes",e.target.value || null)} className={fieldClass}/></div>
    </div></details>
    {exercise && <p className="rounded-lg bg-amber-950/40 p-3 text-sm text-amber-200">Changes affect future programming only. Existing exercise slots and training history keep their identity.</p>}
    <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-slate-700 px-4">Cancel</button><button disabled={saving} className="min-h-11 rounded-xl bg-cyan-400 px-5 font-semibold text-slate-950 disabled:opacity-50">{saving ? "Saving…" : "Save exercise"}</button></div>
  </form>;
}

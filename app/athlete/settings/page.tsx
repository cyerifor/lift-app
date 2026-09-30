"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { kgToLb, lbToKg } from "@/lib/strength/rpe-grid";

type Lift = "squat" | "bench" | "deadlift";
type Exercise = { id: string; name: string; mainLift: string };
type Strength = { loadKg: number; reps: number; rpe: number; calculatedE1rmKg?: number } | null;
type FormState = {
  displayName: string; displayUnits: "METRIC" | "IMPERIAL"; bodyweightKg: number | null; defaultLoadStepKg: number;
  readinessEnabled: boolean; sessionsPerWeek: number; trainingDays: string[]; prepFocusAreas: string[]; prepBudgetMinutes: number;
  references: Record<Lift, string | null>; startingStrengths: Record<Lift, Strength>;
};
type ResponseData = { user: { name: string }; settings: Partial<FormState> & { squatReferenceExerciseId?: string; benchReferenceExerciseId?: string; deadliftReferenceExerciseId?: string } | null; startingStrengths: Array<{ parentLift: string; loadKg: number; reps: number; rpe: number; calculatedE1rmKg: number }>; exercises: Exercise[] };

const lifts: Lift[] = ["squat", "bench", "deadlift"];
const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const inputClass = "mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25";

function SettingsContent() {
  const athleteId = useSearchParams().get("athleteId") || undefined;
  const [form, setForm] = useState<FormState | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [status, setStatus] = useState("Loading athlete setup…");
  const units = form?.displayUnits === "IMPERIAL" ? "lb" : "kg";
  const displayLoad = (kg: number) => form?.displayUnits === "IMPERIAL" ? kgToLb(kg) : kg;
  const canonicalLoad = (value: number) => form?.displayUnits === "IMPERIAL" ? lbToKg(value) : value;
  const url = `/api/athlete/settings${athleteId ? `?athleteId=${encodeURIComponent(athleteId)}` : ""}`;

  useEffect(() => { void (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error((await response.json()).error || "Unable to load settings");
      const data = await response.json() as ResponseData; const settings = data.settings;
      const strength = (lift: Lift) => data.startingStrengths.find((row) => row.parentLift === lift.toUpperCase()) ?? null;
      setExercises(data.exercises);
      setForm({ displayName: settings?.displayName || data.user.name, displayUnits: settings?.displayUnits || "METRIC", bodyweightKg: settings?.bodyweightKg ?? null, defaultLoadStepKg: settings?.defaultLoadStepKg ?? 2.5, readinessEnabled: settings?.readinessEnabled ?? true, sessionsPerWeek: settings?.sessionsPerWeek ?? 3, trainingDays: settings?.trainingDays ?? ["MONDAY", "WEDNESDAY", "FRIDAY"], prepFocusAreas: settings?.prepFocusAreas ?? [], prepBudgetMinutes: settings?.prepBudgetMinutes ?? 10, references: { squat: settings?.squatReferenceExerciseId ?? null, bench: settings?.benchReferenceExerciseId ?? null, deadlift: settings?.deadliftReferenceExerciseId ?? null }, startingStrengths: { squat: strength("squat"), bench: strength("bench"), deadlift: strength("deadlift") } });
      setStatus("");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to load settings"); }
  })(); }, [url]);

  const dayError = useMemo(() => form && form.trainingDays.length !== form.sessionsPerWeek, [form]);
  function patch(change: Partial<FormState>) { setForm((current) => current ? { ...current, ...change } : current); }
  function changeStrength(lift: Lift, key: "loadKg" | "reps" | "rpe", value: number) {
    if (!form) return; const current = form.startingStrengths[lift] || { loadKg: 20, reps: 1, rpe: 8 };
    patch({ startingStrengths: { ...form.startingStrengths, [lift]: { ...current, [key]: key === "loadKg" ? canonicalLoad(value) : value } } });
  }
  async function save() {
    if (!form || dayError) return; setStatus("Saving…");
    try { const response = await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to save settings"); setStatus("Settings saved."); } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to save settings"); }
  }

  if (!form) return <main className="min-h-screen bg-slate-950 p-8 text-slate-300"><p role="status">{status}</p></main>;
  return <main className="min-h-screen bg-slate-950 text-white"><header className="border-b border-slate-800 bg-slate-900/70"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"><Link href={athleteId ? "/dashboard" : "/athlete/home"} className="font-bold">POWER<span className="text-cyan-400">COACH</span></Link><Link href={`/exercises${athleteId ? `?athleteId=${athleteId}` : ""}`} className="text-sm text-cyan-300">Exercise library</Link></div></header>
  <div className="mx-auto max-w-5xl px-4 py-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Athlete setup</p><h1 className="mt-1 text-3xl font-bold">Profile & training foundation</h1><p className="mt-2 text-slate-400">Set preferences, choose the exact competition lifts used as references, and add evidence-based starting strength.</p>
  <section className="mt-7 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:grid-cols-2"><h2 className="text-xl font-semibold sm:col-span-2">Profile</h2><label className="text-sm text-slate-300">Display name<input className={inputClass} value={form.displayName} onChange={(e) => patch({ displayName: e.target.value })}/></label><label className="text-sm text-slate-300">Display units<select className={inputClass} value={form.displayUnits} onChange={(e) => patch({ displayUnits: e.target.value as FormState["displayUnits"] })}><option value="METRIC">Kilograms (kg)</option><option value="IMPERIAL">Pounds (lb)</option></select></label><label className="text-sm text-slate-300">Bodyweight ({units})<input type="number" min="1" step="0.1" className={inputClass} value={form.bodyweightKg === null ? "" : Number(displayLoad(form.bodyweightKg).toFixed(2))} onChange={(e) => patch({ bodyweightKg: e.target.value ? canonicalLoad(Number(e.target.value)) : null })}/></label><label className="text-sm text-slate-300">Default load step ({units})<input type="number" min="0.1" step="0.1" className={inputClass} value={Number(displayLoad(form.defaultLoadStepKg).toFixed(2))} onChange={(e) => patch({ defaultLoadStepKg: canonicalLoad(Number(e.target.value)) })}/></label></section>
  <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="text-xl font-semibold">Schedule & prep</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm text-slate-300">Sessions per week<input type="number" min="1" max="7" className={inputClass} value={form.sessionsPerWeek} onChange={(e) => patch({ sessionsPerWeek: Number(e.target.value) })}/></label><label className="flex min-h-12 items-center gap-3 self-end rounded-xl border border-slate-700 px-4"><input type="checkbox" checked={form.readinessEnabled} onChange={(e) => patch({ readinessEnabled: e.target.checked })}/> Track readiness before sessions</label></div><fieldset className="mt-4"><legend className="text-sm text-slate-300">Training days</legend><div className="mt-2 flex flex-wrap gap-2">{days.map((day) => <label key={day} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${form.trainingDays.includes(day) ? "border-cyan-400 bg-cyan-950 text-cyan-200" : "border-slate-700"}`}><input className="sr-only" type="checkbox" checked={form.trainingDays.includes(day)} onChange={(e) => patch({ trainingDays: e.target.checked ? [...form.trainingDays, day] : form.trainingDays.filter((value) => value !== day) })}/>{day.slice(0,3)}</label>)}</div>{dayError && <p className="mt-2 text-sm text-amber-300">Choose exactly {form.sessionsPerWeek} training days.</p>}</fieldset><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm text-slate-300">Prep focus areas (up to 3)<input className={inputClass} value={form.prepFocusAreas.join(", ")} placeholder="Shoulders, hips, bracing" onChange={(e) => patch({ prepFocusAreas: e.target.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0,3) })}/></label><label className="text-sm text-slate-300">Prep time budget (minutes)<input type="number" min="0" max="120" className={inputClass} value={form.prepBudgetMinutes} onChange={(e) => patch({ prepBudgetMinutes: Number(e.target.value) })}/></label></div></section>
  <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="text-xl font-semibold">Reference lifts & starting strength</h2><p className="mt-1 text-sm text-slate-400">Only active exercises in the matching lift family can be selected. Starting e1RM uses the exact RPE grid (1–8 reps, RPE 7–10).</p><div className="mt-5 grid gap-4 lg:grid-cols-3">{lifts.map((lift) => { const strength = form.startingStrengths[lift]; return <article key={lift} className="rounded-xl border border-slate-700 p-4"><h3 className="font-semibold capitalize">{lift}</h3><label className="mt-3 block text-sm text-slate-300">Reference exercise<select className={inputClass} value={form.references[lift] || ""} onChange={(e) => patch({ references: { ...form.references, [lift]: e.target.value || null } })}><option value="">Not selected</option>{exercises.filter((x) => x.mainLift === lift.toUpperCase()).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={strength !== null} onChange={(e) => patch({ startingStrengths: { ...form.startingStrengths, [lift]: e.target.checked ? { loadKg: 20, reps: 1, rpe: 8 } : null } })}/> Add starting strength</label>{strength && <div className="mt-3 grid grid-cols-3 gap-2"><label className="text-xs text-slate-400">Load ({units})<input type="number" min="0.1" step="0.1" className={inputClass} value={Number(displayLoad(strength.loadKg).toFixed(2))} onChange={(e) => changeStrength(lift, "loadKg", Number(e.target.value))}/></label><label className="text-xs text-slate-400">Reps<input type="number" min="1" max="8" className={inputClass} value={strength.reps} onChange={(e) => changeStrength(lift, "reps", Number(e.target.value))}/></label><label className="text-xs text-slate-400">RPE<select className={inputClass} value={strength.rpe} onChange={(e) => changeStrength(lift, "rpe", Number(e.target.value))}>{[7,7.5,8,8.5,9,9.5,10].map((x) => <option key={x}>{x}</option>)}</select></label>{strength.calculatedE1rmKg && <p className="col-span-3 text-sm text-cyan-300">Current seed e1RM: {displayLoad(strength.calculatedE1rmKg).toFixed(1)} {units}</p>}</div>}</article>; })}</div></section>
  <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-xl"><p role="status" aria-live="polite" className="text-sm text-slate-300">{status}</p><button disabled={Boolean(dayError) || !form.displayName.trim()} onClick={() => void save()} className="min-h-12 rounded-xl bg-cyan-400 px-6 font-semibold text-slate-950 disabled:opacity-50">Save setup</button></div></div></main>;
}

export default function AthleteSettingsPage() { return <Suspense fallback={<main className="min-h-screen bg-slate-950 p-8 text-slate-300">Loading athlete setup…</main>}><SettingsContent/></Suspense>; }

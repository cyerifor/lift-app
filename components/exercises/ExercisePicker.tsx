"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ExerciseForm } from "@/components/exercises/ExerciseForm";
import { readApiError, type ExerciseRecord } from "@/lib/exercises/client";

const lifts = ["ALL", "SQUAT", "BENCH", "DEADLIFT", "ACCESSORY"] as const;

export function ExercisePicker({ athleteId, onSelect, onClose, title = "Add exercise" }: { athleteId?: string; onSelect: (exerciseId: string, exercise: ExerciseRecord) => void; onClose?: () => void; title?: string }) {
  const listId = useId(); const searchRef = useRef<HTMLInputElement>(null);
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]); const [query, setQuery] = useState("");
  const [lift, setLift] = useState<(typeof lifts)[number]>("ALL"); const [equipment, setEquipment] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [creating, setCreating] = useState(false); const [active, setActive] = useState(0);
  const suffix = athleteId ? `?athleteId=${encodeURIComponent(athleteId)}` : "";
  useEffect(() => { searchRef.current?.focus(); void (async()=>{ try { const r=await fetch(`/api/exercises${suffix}`); if(!r.ok){setError((await readApiError(r)).message);return;} setExercises(await r.json() as ExerciseRecord[]); } catch { setError("Unable to load the exercise library."); } finally { setLoading(false); } })(); }, [suffix]);
  const equipmentOptions = useMemo(()=>Array.from(new Set(exercises.map(x=>x.equipment).filter(Boolean))).sort(),[exercises]);
  const filtered = useMemo(()=>exercises.filter(x => (lift === "ALL" || x.mainLift === lift) && (!equipment || x.equipment === equipment) && (!query.trim() || [x.name,x.movementPattern,x.equipment,x.progressionGroup].some(v=>v?.toLowerCase().includes(query.trim().toLowerCase())))),[equipment,exercises,lift,query]);
  useEffect(()=>setActive(0),[query,lift,equipment]);
  function choose(index:number){ const exercise=filtered[index]; if(exercise) onSelect(exercise.id, exercise); }
  if(creating) return <section aria-label="Create exercise inline"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">New exercise</h2><button onClick={()=>setCreating(false)} className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800">Back to results</button></div><ExerciseForm athleteId={athleteId} onCancel={()=>setCreating(false)} onSaved={(created)=>{setExercises((all)=>[...all,created]); onSelect(created.id,created);}}/></section>;
  return <section aria-label={title} className="flex max-h-[85vh] flex-col">
    <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Exercise library</p><h2 className="text-xl font-semibold">{title}</h2></div>{onClose&&<button aria-label="Close exercise picker" onClick={onClose} className="min-h-11 rounded-xl border border-slate-700 px-4">Close</button>}</div>
    <label htmlFor={`${listId}-search`} className="sr-only">Search exercises</label><input ref={searchRef} id={`${listId}-search`} role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={filtered[active] ? `${listId}-${filtered[active].id}` : undefined} placeholder="Search name, movement, group or equipment…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();setActive(i=>Math.min(i+1,filtered.length-1));}if(e.key==="ArrowUp"){e.preventDefault();setActive(i=>Math.max(i-1,0));}if(e.key==="Enter"){e.preventDefault();choose(active);}if(e.key==="Escape")onClose?.();}} className="min-h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"/>
    <div className="my-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filter by main lift">{lifts.map(x=><button key={x} aria-pressed={lift===x} onClick={()=>setLift(x)} className={`min-h-10 shrink-0 rounded-full border px-3 text-sm ${lift===x?"border-cyan-400 bg-cyan-400 text-slate-950":"border-slate-700"}`}>{x==="ALL"?"All":x[0]+x.slice(1).toLowerCase()}</button>)}</div>
    <label className="mb-3 text-sm text-slate-300">Equipment <select value={equipment} onChange={e=>setEquipment(e.target.value)} className="ml-2 min-h-10 rounded-lg border border-slate-700 bg-slate-950 px-2"><option value="">All equipment</option>{equipmentOptions.map(x=><option key={x}>{x}</option>)}</select></label>
    {error ? <div role="alert" className="rounded-xl border border-rose-800 p-4 text-rose-200">{error}</div> : loading ? <div role="status" className="space-y-2"><p>Loading exercises…</p><div className="h-16 animate-pulse rounded-xl bg-slate-800"/></div> : <div id={listId} role="listbox" aria-label="Exercises" className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{filtered.map((exercise,index)=><button id={`${listId}-${exercise.id}`} role="option" aria-selected={index===active} key={exercise.id} onMouseEnter={()=>setActive(index)} onClick={()=>choose(index)} className={`w-full rounded-xl border p-3 text-left outline-none ${index===active?"border-cyan-400 bg-slate-800":"border-slate-800 bg-slate-900 hover:border-slate-600"}`}><span className="font-medium">{exercise.name}</span><span className="mt-1 block text-sm text-slate-400">{exercise.mainLift} · {exercise.category} · {exercise.equipment || "Equipment not set"} · {exercise.capability.replaceAll("_"," ")}</span></button>)}{!filtered.length&&<div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">No matching exercises. Adjust the filters or create a new one.</div>}</div>}
    <button onClick={()=>setCreating(true)} className="mt-4 min-h-12 w-full rounded-xl border border-cyan-500 font-semibold text-cyan-300 hover:bg-cyan-950/40">+ Create new exercise</button>
  </section>;
}

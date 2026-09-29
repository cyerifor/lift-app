"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SetPrescription = {
  id: string;
  setNumber: number;
  reps: number | null;
  targetRpe: number | null;
  targetLoadKg: number | null;
  suggestedLoKg?: number | null;
  suggestedHiKg?: number | null;
};

type Exercise = {
  id: string;
  exerciseTemplateId?: string | null;
  name: string;
  exerciseType?: string | null;
  mainLift?: string | null;
  category?: string | null;
  progressionGroup?: string | null;
  targetSets?: number | null;
  repsDisplay?: string | null;
  rpeDisplay?: string | null;
  weeklyPercent?: number | null;
  roundingKg?: number | null;
  progEligible?: boolean;
  orderIndex: number;
  setPrescriptions: SetPrescription[];
};

type Session = {
  id: string;
  sessionNumber: number;
  dayOfWeek?: string | null;
  title: string;
  scheduledAt: string | null;
  exercises: Exercise[];
};

type Week = {
  id: string;
  weekNumber: number;
  sessions: Session[];
};

type BlockOutline = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  weeks: Week[];
};

type ExerciseTemplate = {
  id: string;
  name: string;
  mainLift: string;
  category: string;
  progressionGroup: string;
  roundingKg: number;
  progEligible: boolean;
};

export default function BlockBuilderPage() {
  const { blockId } = useParams<{ blockId: string }>();

  const [block, setBlock] = useState<BlockOutline | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseTemplate[]>([]);
  const [activeWeek, setActiveWeek] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBlockAndLibrary() {
      if (!blockId) return;

      setIsLoading(true);
      setError("");
      try {
        const [blockResponse, libraryResponse] = await Promise.all([
          fetch(`/api/coach/blocks/${blockId}`),
          fetch(`/api/coach/exercise-library?blockId=${encodeURIComponent(blockId)}`),
        ]);

        const data = (await blockResponse.json()) as BlockOutline & { error?: string };
        const libraryData = (await libraryResponse.json()) as ExerciseTemplate[];
        if (!blockResponse.ok) {
          setError(data.error || "Unable to load block outline.");
          setBlock(null);
          return;
        }
        setExerciseLibrary(Array.isArray(libraryData) ? libraryData : []);
        setBlock(data);
        setActiveWeek(1);
        const week1Session = data.weeks.find((week) => week.weekNumber === 1)?.sessions[0];
        if (week1Session) setSelectedSessionId(week1Session.id);
      } catch {
        setError("Network error while loading block.");
        setBlock(null);
      } finally {
        setIsLoading(false);
      }
    }

    void loadBlockAndLibrary();
  }, [blockId]);

  const totalSessions = useMemo(() => block?.weeks.reduce((sum, week) => sum + week.sessions.length, 0) ?? 0, [block]);
  const currentWeek = block?.weeks.find((week) => week.weekNumber === activeWeek) ?? null;

  function addExerciseToSession(sessionId: string, template: ExerciseTemplate) {
    if (!block) return;
    setBlock((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        weeks: prev.weeks.map((week) => ({
          ...week,
          sessions: week.sessions.map((session) => {
            if (session.id !== sessionId) return session;
            const nextOrder = session.exercises.length + 1;
            return {
              ...session,
              exercises: [
                ...session.exercises,
                {
                  id: `new-${session.id}-${template.id}-${nextOrder}`,
                  exerciseTemplateId: template.id,
                  name: template.name,
                  exerciseType: "Accessory",
                  mainLift: template.mainLift,
                  category: template.category,
                  progressionGroup: template.progressionGroup,
                  targetSets: 3,
                  repsDisplay: "8-12",
                  rpeDisplay: "7-8",
                  weeklyPercent: null,
                  roundingKg: template.roundingKg,
                  progEligible: template.progEligible,
                  orderIndex: nextOrder,
                  setPrescriptions: [],
                },
              ],
            };
          }),
        })),
      };
    });
  }

  async function saveWeek1() {
    if (!block) return;
    const week1 = block.weeks.find((week) => week.weekNumber === 1);
    if (!week1) return;

    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/coach/blocks/${blockId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekNumber: 1,
          sessions: week1.sessions.map((session) => ({
            sessionId: session.id,
            sessionNumber: session.sessionNumber,
            dayOfWeek: session.dayOfWeek,
            title: session.title,
            exercises: session.exercises.map((exercise) => ({
              id: exercise.id.startsWith("new-") ? undefined : exercise.id,
              exerciseTemplateId: exercise.exerciseTemplateId ?? null,
              name: exercise.name,
              exerciseType: exercise.exerciseType ?? "Accessory",
              mainLift: exercise.mainLift ?? "accessory",
              category: exercise.category ?? "Hypertrophy Accessory",
              progressionGroup: exercise.progressionGroup ?? "accessory",
              targetSets: exercise.targetSets ?? 3,
              repsDisplay: exercise.repsDisplay ?? "8-12",
              rpeDisplay: exercise.rpeDisplay ?? "7-8",
              weeklyPercent: exercise.weeklyPercent ?? null,
              roundingKg: exercise.roundingKg ?? null,
              progEligible: exercise.progEligible ?? true,
              orderIndex: exercise.orderIndex,
            })),
          })),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Unable to save Week 1.");
        return;
      }
    } catch {
      setError("Network error while saving Week 1.");
    } finally {
      setIsSaving(false);
    }
  }

  async function generateBlockWeeks() {
    setIsGenerating(true);
    setError("");
    try {
      const response = await fetch(`/api/coach/blocks/${blockId}`, {
        method: "POST",

      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Unable to generate weeks.");
        return;
      }
      const refreshed = await fetch(`/api/coach/blocks/${blockId}`);
      const refreshedData = (await refreshed.json()) as BlockOutline;
      if (refreshed.ok) setBlock(refreshedData);
    } catch {
      setError("Network error while generating weeks.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 p-8 text-slate-300">Loading block builder...</div>;
  }

  if (!block) {
    return <div className="min-h-screen bg-slate-950 p-8 text-red-300">{error || "Block not found."}</div>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Programme builder</p>
            <h1 className="text-2xl font-semibold">{block.title}</h1>
            <p className="text-sm text-slate-400">
              {new Date(block.startDate).toLocaleDateString()} – {new Date(block.endDate).toLocaleDateString()} · {totalSessions} sessions
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900">Dashboard</Link>
            <button onClick={saveWeek1} disabled={isSaving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50">
              {isSaving ? "Saving..." : "Save Week 1"}
            </button>
            <button onClick={generateBlockWeeks} disabled={isGenerating} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
              {isGenerating ? "Generating..." : "Generate Weeks"}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}

        <div className="mb-4 flex flex-wrap gap-2">
          {block.weeks.map((week) => (
            <button
              key={week.id}
              onClick={() => setActiveWeek(week.weekNumber)}
              className={`rounded-lg px-3 py-2 text-sm ${
                activeWeek === week.weekNumber ? "bg-blue-600" : "border border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              Week {week.weekNumber}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4">
            {currentWeek?.sessions.map((session) => (
              <article key={session.id} className={`rounded-2xl border p-4 ${selectedSessionId === session.id ? "border-blue-500 bg-slate-900" : "border-slate-800 bg-slate-900/60"}`}>
                <button className="mb-3 w-full text-left" onClick={() => setSelectedSessionId(session.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-medium">{session.title}</h2>
                    <span className="text-xs text-slate-400">{session.dayOfWeek || `Session ${session.sessionNumber}`}</span>
                  </div>
                </button>
                <div className="space-y-2">
                  {session.exercises.map((exercise) => (
                    <div key={exercise.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{exercise.name}</p>
                          <p className="text-xs text-slate-400">
                            {exercise.targetSets ?? 3} sets · {exercise.repsDisplay || "8-12"} reps · RPE {exercise.rpeDisplay || "7-8"}
                          </p>
                        </div>
                        <span className="text-xs uppercase text-slate-500">{exercise.mainLift || "Accessory"}</span>
                      </div>
                    </div>
                  ))}
                  {session.exercises.length === 0 && <p className="text-sm text-slate-500">No exercises yet.</p>}
                </div>
              </article>
            ))}
          </section>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 lg:sticky lg:top-4 lg:h-fit">
            <h2 className="mb-1 font-medium">Exercise library</h2>
            <p className="mb-3 text-xs text-slate-400">Add exercises into the selected session.</p>
            {!selectedSessionId && <p className="text-sm text-amber-300">Select a session first.</p>}
            <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
              {exerciseLibrary.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  disabled={!selectedSessionId || activeWeek !== 1}
                  onClick={() => addExerciseToSession(selectedSessionId, template)}
                  className="w-full rounded-lg border border-slate-800 px-3 py-2 text-left hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-slate-500">{template.mainLift} · {template.category}</p>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

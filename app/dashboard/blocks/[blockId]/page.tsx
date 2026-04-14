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

  const [coachId, setCoachId] = useState("");
  const [block, setBlock] = useState<BlockOutline | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseTemplate[]>([]);
  const [activeWeek, setActiveWeek] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedCoachId = localStorage.getItem("coach_id") || "";
    setCoachId(storedCoachId);
  }, []);

  useEffect(() => {
    async function loadBlockAndLibrary() {
      if (!coachId || !blockId) return;

      setIsLoading(true);
      setError("");
      try {
        const [blockResponse, libraryResponse] = await Promise.all([
          fetch(`/api/coach/blocks/${blockId}`, {
            headers: {
              "x-coach-id": coachId,
            },
          }),
          fetch("/api/coach/exercise-library", {
            headers: {
              "x-coach-id": coachId,
            },
          }),
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
  }, [coachId, blockId]);

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
    if (!block || !coachId) return;
    const week1 = block.weeks.find((week) => week.weekNumber === 1);
    if (!week1) return;

    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/coach/blocks/${blockId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-coach-id": coachId,
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
    if (!coachId) return;
    setIsGenerating(true);
    setError("");
    try {
      const response = await fetch(`/api/coach/blocks/${blockId}`, {
        method: "POST",
        headers: { "x-coach-id": coachId },
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Unable to generate weeks.");
        return;
      }
      const refreshed = await fetch(`/api/coach/blocks/${blockId}`, { headers: { "x-coach-id": coachId } });
      const refreshedData = (await refreshed.json()) as BlockOutline;
      if (refreshed.ok) setBlock(refreshedData);
    } catch {
      setError("Network error while generating weeks.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Block Builder</p>
            <h1 className="text-2xl font-semibold">{block?.title ?? "Loading block..."}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">
              Back to dashboard
            </Link>
            <button
              onClick={saveWeek1}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600"
            >
              {isSaving ? "Saving..." : "Save Week 1"}
            </button>
            <button
              onClick={generateBlockWeeks}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"
            >
              {isGenerating ? "Generating..." : "Generate Block"}
            </button>
          </div>
        </div>

        {!coachId && (
          <div className="mb-4 rounded-lg border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-300">
            Missing coach id in localStorage. Sign in again from `/auth/login`.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
            <p className="mt-1 text-lg font-semibold">{block?.status ?? "-"}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Date range</p>
            <p className="mt-1 text-lg font-semibold">
              {block ? `${new Date(block.startDate).toLocaleDateString()} - ${new Date(block.endDate).toLocaleDateString()}` : "-"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Sessions</p>
            <p className="mt-1 text-lg font-semibold">{totalSessions}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="mb-3 text-lg font-semibold">Exercise library</h2>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {exerciseLibrary.map((template) => (
                <div key={template.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-slate-400">
                    {template.mainLift} • {template.category}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {currentWeek?.sessions.map((session) => (
                      <button
                        key={`${template.id}-${session.id}`}
                        onClick={() => addExerciseToSession(session.id, template)}
                        className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                        title={`Add to ${session.title}`}
                      >
                        S{session.sessionNumber}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {block?.weeks.map((week) => (
                <button
                  key={week.id}
                  onClick={() => setActiveWeek(week.weekNumber)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    activeWeek === week.weekNumber ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Week {week.weekNumber}
                </button>
              ))}
            </div>

            {isLoading && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-slate-300">
                Loading block structure...
              </div>
            )}

            {!isLoading && currentWeek && (
              <div className="space-y-3">
                {currentWeek.sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-xl border ${selectedSessionId === session.id ? "border-blue-500" : "border-slate-800"} bg-slate-900/40`}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <div className="border-b border-slate-800 px-4 py-3">
                      <h3 className="font-semibold">
                        S{session.sessionNumber}: {session.title}
                      </h3>
                      <p className="text-xs text-slate-500">{session.dayOfWeek || "Unscheduled day"}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="text-slate-400">
                          <tr>
                            <th className="px-4 py-2">Exercise</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Sets</th>
                            <th className="px-4 py-2">Reps</th>
                            <th className="px-4 py-2">RPE</th>
                            <th className="px-4 py-2">Suggested Load</th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.exercises.length === 0 && (
                            <tr className="border-t border-slate-800">
                              <td colSpan={6} className="px-4 py-3 text-slate-400">
                                No exercises yet. Add from the library panel.
                              </td>
                            </tr>
                          )}
                          {session.exercises.map((exercise) => {
                            const typeColor =
                              exercise.exerciseType === "Top Set"
                                ? "text-amber-300"
                                : exercise.exerciseType === "Backdown"
                                  ? "text-blue-300"
                                  : "text-slate-300";
                            const loadRange = exercise.setPrescriptions[0]
                              ? `${exercise.setPrescriptions[0].suggestedLoKg ?? "-"} - ${exercise.setPrescriptions[0].suggestedHiKg ?? "-"}`
                              : "-";

                            return (
                              <tr key={exercise.id} className="border-t border-slate-800">
                                <td className="px-4 py-2">{exercise.name}</td>
                                <td className={`px-4 py-2 ${typeColor}`}>{exercise.exerciseType ?? "Accessory"}</td>
                                <td className="px-4 py-2">{exercise.targetSets ?? 3}</td>
                                <td className="px-4 py-2">{exercise.repsDisplay ?? "8-12"}</td>
                                <td className="px-4 py-2">{exercise.rpeDisplay ?? "7-8"}</td>
                                <td className="px-4 py-2 text-green-300">{loadRange}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

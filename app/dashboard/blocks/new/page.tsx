"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AthleteOption = { athleteId: string; personalName: string | null; email: string };

export default function NewBlockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [coachId, setCoachId] = useState("");
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const [athleteId, setAthleteId] = useState("");
  const [title, setTitle] = useState("Hypertrophy Block");
  const [phase, setPhase] = useState("Accumulation");
  const [weekCount, setWeekCount] = useState(6);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(4);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const [trainingMaxSquat, setTrainingMaxSquat] = useState(200);
  const [trainingMaxBench, setTrainingMaxBench] = useState(130);
  const [trainingMaxDeadlift, setTrainingMaxDeadlift] = useState(230);
  const [progressionMode, setProgressionMode] = useState<"% Only" | "RPE Only" | "% + RPE">("% + RPE");

  const sessions = useMemo(
    () =>
      Array.from({ length: sessionsPerWeek }).map((_, idx) => ({
        sessionNumber: idx + 1,
        day: ["Monday", "Wednesday", "Thursday", "Friday", "Saturday"][idx] ?? "Monday",
        name: `Session ${idx + 1}`,
        active: true,
      })),
    [sessionsPerWeek],
  );

  useEffect(() => {
    const storedCoachId = localStorage.getItem("coach_id") || "";
    setCoachId(storedCoachId);
  }, []);

  useEffect(() => {
    async function loadAthletes() {
      if (!coachId) return;
      setLoadingAthletes(true);
      try {
        const response = await fetch("/api/coach/athletes", {
          headers: { "x-coach-id": coachId },
        });
        const data = (await response.json()) as { athletes?: AthleteOption[]; error?: string };
        if (!response.ok) {
          setError(data.error || "Unable to load athletes.");
          return;
        }
        setAthletes(data.athletes || []);
        const queryAthleteId = searchParams.get("athleteId");
        if (queryAthleteId && data.athletes?.some((a) => a.athleteId === queryAthleteId)) {
          setAthleteId(queryAthleteId);
        } else if (data.athletes?.[0]) {
          setAthleteId(data.athletes[0].athleteId);
        }
      } catch {
        setError("Network error while loading athletes.");
      } finally {
        setLoadingAthletes(false);
      }
    }
    void loadAthletes();
  }, [coachId, searchParams]);

  async function createBlock() {
    if (!athleteId) {
      setError("Select an athlete first.");
      return;
    }

    setIsCreating(true);
    setError("");
    try {
      const response = await fetch("/api/coach/blocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coach-id": coachId,
        },
        body: JSON.stringify({
          athleteId,
          name: title,
          phase,
          weekCount,
          sessionsPerWeek,
          startDate,
          config: {
            weekCount,
            sessionsPerWeek,
            phase,
            trainingMaxes: { squat: trainingMaxSquat, bench: trainingMaxBench, deadlift: trainingMaxDeadlift },
            e1rms: { squat: 0, bench: 0, deadlift: 0 },
            slopes: { squat: -0.0735, bench: -0.0735, deadlift: -0.0735 },
            weeklyProgression: { squat: 0.025, bench: 0.015, deadlift: 0.02 },
            defaultRoundingKg: 2.5,
            progressionMode,
            intTrendMain: "Wave",
            volTrendMain: "Flat",
            rpeStepMain: 0.5,
            setStepMain: 0,
            rpeCapMain: 8,
            setCapMain: 5,
            waveLoading: true,
            intTrendVar: "Flat",
            volTrendVar: "Flat",
            rpeStepVar: 0.5,
            setStepVar: 0,
            rpeCapVar: 9,
            setCapVar: 4,
            applyProgVar: true,
            intTrendAcc: "Flat",
            volTrendAcc: "Flat",
            rpeStepAcc: 0,
            setStepAcc: 0,
            rpeCapAcc: 9,
            setCapAcc: 3,
            sessions,
          },
          sessions,
        }),
      });

      const data = (await response.json()) as { blockId?: string; error?: string };
      if (!response.ok || !data.blockId) {
        setError(data.error || "Unable to create block.");
        return;
      }
      router.push(`/dashboard/blocks/${data.blockId}`);
    } catch {
      setError("Network error while creating block.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold">Create new block</h1>
        <p className="mb-6 text-slate-300">Configure the block template and progression engine defaults.</p>

        {error && <div className="mb-4 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}

        <div className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Athlete</label>
              <select
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                disabled={loadingAthletes}
              >
                {athletes.map((athlete) => (
                  <option key={athlete.athleteId} value={athlete.athleteId}>
                    {athlete.personalName || athlete.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Block title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Phase</label>
              <input value={phase} onChange={(e) => setPhase(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Weeks</label>
              <input type="number" min={3} max={12} value={weekCount} onChange={(e) => setWeekCount(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Sessions per week</label>
              <input type="number" min={3} max={5} value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-slate-300">TM Squat</label>
              <input type="number" value={trainingMaxSquat} onChange={(e) => setTrainingMaxSquat(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">TM Bench</label>
              <input type="number" value={trainingMaxBench} onChange={(e) => setTrainingMaxBench(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">TM Deadlift</label>
              <input type="number" value={trainingMaxDeadlift} onChange={(e) => setTrainingMaxDeadlift(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Progression mode</label>
            <select value={progressionMode} onChange={(e) => setProgressionMode(e.target.value as "% Only" | "RPE Only" | "% + RPE")} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <option value="% + RPE">% + RPE</option>
              <option value="% Only">% Only</option>
              <option value="RPE Only">RPE Only</option>
            </select>
          </div>

          <button
            onClick={createBlock}
            disabled={isCreating || !coachId}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create block"}
          </button>
        </div>
      </div>
    </main>
  );
}

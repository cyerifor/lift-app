"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PrescribedSet = {
  setNumber: number;
  repsDisplay: string | null;
  rpeDisplay: string | null;
  suggestedLoKg: number | null;
  suggestedHiKg: number | null;
};

type Exercise = {
  id: string;
  name: string;
  exerciseType: string | null;
  setPrescriptions: PrescribedSet[];
  setLogs: Array<{
    sessionLogId: string;
    setNumber: number;
    loadKg: number | null;
    repsCompleted: number | null;
    rpe: number | null;
  }>;
};

type SessionResponse = {
  id: string;
  title: string;
  status: string;
  exercises: Exercise[];
};

type FormSet = { loadKg: string; repsCompleted: string; rpe: string };

function keyFor(sessionId: string) {
  return `session_draft:${sessionId}`;
}

export default function SessionLoggingPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;
  const [athleteId, setAthleteId] = useState("");
  const [sessionLogId, setSessionLogId] = useState("");
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [bodyweightKg, setBodyweightKg] = useState("");
  const [readiness, setReadiness] = useState("");
  const [sets, setSets] = useState<Record<string, FormSet>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [doneSummary, setDoneSummary] = useState<{ totalVolume: number; averageRpe: number | null } | null>(null);

  const elapsedSec = Math.floor((now - startedAt) / 1000);

  useEffect(() => {
    const id = localStorage.getItem("athlete_id") || "";
    setAthleteId(id);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sessionId || !athleteId) return;
    const draftRaw = localStorage.getItem(keyFor(sessionId));
    if (draftRaw) {
      try {
        const parsed = JSON.parse(draftRaw) as { sets?: Record<string, FormSet>; bodyweightKg?: string; readiness?: string };
        if (parsed.sets) setSets(parsed.sets);
        if (parsed.bodyweightKg) setBodyweightKg(parsed.bodyweightKg);
        if (parsed.readiness) setReadiness(parsed.readiness);
      } catch {
        // Ignore malformed drafts and continue.
      }
    }
  }, [sessionId, athleteId]);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem(keyFor(sessionId), JSON.stringify({ sets, bodyweightKg, readiness }));
  }, [sessionId, sets, bodyweightKg, readiness]);

  useEffect(() => {
    if (!sessionId || !athleteId) return;

    async function boot() {
      setIsLoading(true);
      setError("");
      try {
        const startRes = await fetch("/api/session-logs/start", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-athlete-id": athleteId },
          body: JSON.stringify({
            sessionId,
            bodyweightKg: bodyweightKg ? Number(bodyweightKg) : undefined,
            readinessScore: readiness ? Number(readiness) : undefined,
          }),
        });
        const startJson = (await startRes.json()) as { sessionLogId?: string; error?: string };
        if (!startRes.ok || !startJson.sessionLogId) {
          setError(startJson.error || "Could not start session");
          return;
        }
        setSessionLogId(startJson.sessionLogId);

        const detailRes = await fetch(`/api/athlete/sessions/${sessionId}`, {
          headers: { "x-athlete-id": athleteId },
        });
        const detailJson = (await detailRes.json()) as SessionResponse & { error?: string };
        if (!detailRes.ok) {
          setError(detailJson.error || "Could not load session");
          return;
        }
        setSessionData(detailJson);

        const nextSets: Record<string, FormSet> = {};
        for (const exercise of detailJson.exercises) {
          for (const prescribed of exercise.setPrescriptions) {
            const existing = exercise.setLogs.find((log) => log.setNumber === prescribed.setNumber);
            const inputKey = `${exercise.id}:${prescribed.setNumber}`;
            nextSets[inputKey] = {
              loadKg: existing?.loadKg?.toString() ?? sets[inputKey]?.loadKg ?? "",
              repsCompleted: existing?.repsCompleted?.toString() ?? sets[inputKey]?.repsCompleted ?? "",
              rpe: existing?.rpe?.toString() ?? sets[inputKey]?.rpe ?? "",
            };
          }
        }
        setSets((prev) => ({ ...nextSets, ...prev }));
      } catch {
        setError("Network error while loading session.");
      } finally {
        setIsLoading(false);
      }
    }

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, athleteId]);

  const preparedSets = useMemo(() => {
    if (!sessionData) return [];
    return sessionData.exercises.flatMap((exercise) =>
      exercise.setPrescriptions.map((prescribed) => {
        const form = sets[`${exercise.id}:${prescribed.setNumber}`] || { loadKg: "", repsCompleted: "", rpe: "" };
        return {
          exerciseId: exercise.id,
          setNumber: prescribed.setNumber,
          loadKg: form.loadKg ? Number(form.loadKg) : undefined,
          repsCompleted: form.repsCompleted ? Number(form.repsCompleted) : undefined,
          rpe: form.rpe ? Number(form.rpe) : undefined,
        };
      }),
    );
  }, [sessionData, sets]);

  async function finishSession() {
    if (!sessionLogId || !sessionId || !athleteId) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/session-logs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-athlete-id": athleteId },
        body: JSON.stringify({
          sessionLogId,
          sessionId,
          durationSeconds: elapsedSec,
          sets: preparedSets,
        }),
      });
      const json = (await response.json()) as {
        summary?: { totalVolume: number; averageRpe: number | null };
        error?: string;
      };
      if (!response.ok || !json.summary) {
        setError(json.error || "Could not finish session");
        return;
      }
      localStorage.removeItem(keyFor(sessionId));
      setDoneSummary(json.summary);
      setTimeout(() => router.push("/athlete/home"), 2200);
    } catch {
      setError("Network error while syncing logs.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-800 bg-slate-900/50 p-6">Loading session...</div>
      </main>
    );
  }

  if (doneSummary) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-2xl rounded-xl border border-green-900 bg-green-950/20 p-6">
          <h1 className="text-2xl font-semibold">Session completed</h1>
          <p className="mt-2 text-green-200">Great work. Your results were saved.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-900 p-3">Duration: {Math.floor(elapsedSec / 60)} min</div>
            <div className="rounded-lg bg-slate-900 p-3">Volume: {Math.round(doneSummary.totalVolume)} kg-reps</div>
            <div className="rounded-lg bg-slate-900 p-3">Avg RPE: {doneSummary.averageRpe ?? "-"}</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-white">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{sessionData?.title}</h1>
            <p className="text-xs text-slate-400">Timer: {Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s</p>
          </div>
          <button
            onClick={() => void finishSession()}
            disabled={isSaving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Finish"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        {error && <div className="rounded-lg border border-red-900 bg-red-950/20 p-3 text-sm text-red-300">{error}</div>}

        <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Bodyweight (kg)</span>
            <input
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={bodyweightKg}
              onChange={(e) => setBodyweightKg(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Readiness (1-10)</span>
            <input
              inputMode="numeric"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              value={readiness}
              onChange={(e) => setReadiness(e.target.value)}
            />
          </label>
        </section>

        {sessionData?.exercises.map((exercise) => (
          <section
            key={exercise.id}
            className={`rounded-xl border p-4 ${
              exercise.exerciseType === "Top Set"
                ? "border-amber-700 bg-amber-950/10"
                : exercise.exerciseType === "Backdown"
                  ? "border-blue-700 bg-blue-950/10"
                  : "border-slate-700 bg-slate-900/30"
            }`}
          >
            <h2 className="font-semibold">{exercise.name}</h2>
            <div className="mt-3 space-y-2">
              {exercise.setPrescriptions.map((set) => {
                const id = `${exercise.id}:${set.setNumber}`;
                const value = sets[id] || { loadKg: "", repsCompleted: "", rpe: "" };
                return (
                  <div key={id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-xs text-slate-400">
                      Set {set.setNumber} • {set.repsDisplay || "-"} @ {set.rpeDisplay || "-"} •{" "}
                      <span className="text-green-400">
                        {set.suggestedLoKg ?? "-"} - {set.suggestedHiKg ?? "-"} kg
                      </span>
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <input
                        inputMode="decimal"
                        className="rounded border border-blue-700 bg-blue-950/30 px-2 py-1 text-sm"
                        placeholder="kg"
                        value={value.loadKg}
                        onChange={(e) => setSets((prev) => ({ ...prev, [id]: { ...value, loadKg: e.target.value } }))}
                      />
                      <input
                        inputMode="numeric"
                        className="rounded border border-blue-700 bg-blue-950/30 px-2 py-1 text-sm"
                        placeholder="reps"
                        value={value.repsCompleted}
                        onChange={(e) =>
                          setSets((prev) => ({ ...prev, [id]: { ...value, repsCompleted: e.target.value } }))
                        }
                      />
                      <input
                        inputMode="decimal"
                        className="rounded border border-blue-700 bg-blue-950/30 px-2 py-1 text-sm"
                        placeholder="RPE"
                        value={value.rpe}
                        onChange={(e) => setSets((prev) => ({ ...prev, [id]: { ...value, rpe: e.target.value } }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <p className="text-sm text-slate-300">
            {Math.floor(elapsedSec / 60)}m elapsed
          </p>
          <button
            onClick={() => void finishSession()}
            disabled={isSaving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Finish session"}
          </button>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Point = { date: string; value: number };
type Data = {
  athlete: { id: string; name: string | null; email: string };
  e1rm: { squat: Point[]; bench: Point[]; deadlift: Point[] };
  volumeTimeline: Point[];
  rpeTimeline: Point[];
  weeklyAdherence: Array<{ week: number; completed: number; total: number; pct: number }>;
  exerciseBests: Array<{ exercise: string; best: number }>;
  summary: { sessionsCompleted: number; sessionsPlanned: number; estimatedTotal: number };
};

function Polyline({ data, color }: { data: Point[]; color: string }) {
  if (data.length === 0) return null;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const points = data
    .map((d, i) => {
      const x = data.length === 1 ? 0 : (i / (data.length - 1)) * 100;
      const y = max === min ? 50 : 100 - ((d.value - min) / (max - min)) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return <polyline fill="none" stroke={color} strokeWidth="2" points={points} />;
}

export default function AthleteAnalyticsPage() {
  const params = useParams<{ athleteId: string }>();
  const [coachId] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem("coach_id") || ""));
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!coachId || !params.athleteId) return;
    async function load() {
      const response = await fetch(`/api/coach/analytics/${params.athleteId}`, {
        headers: { "x-coach-id": coachId },
      });
      const json = (await response.json()) as Data & { error?: string };
      if (!response.ok) {
        setError(json.error || "Unable to load analytics");
        return;
      }
      setData(json);
    }
    void load();
  }, [coachId, params.athleteId]);

  const adherenceAvg = useMemo(() => {
    if (!data || data.weeklyAdherence.length === 0) return 0;
    return Math.round(data.weeklyAdherence.reduce((sum, w) => sum + w.pct, 0) / data.weeklyAdherence.length);
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
        {!data && !error && <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">Loading...</div>}
        {error && <div className="rounded-lg border border-red-900 bg-red-950/20 p-4">{error}</div>}
        {data && (
          <>
            <header className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h1 className="text-2xl font-semibold">{data.athlete.name || data.athlete.email} Analytics</h1>
              <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-slate-950 p-3">Completed: {data.summary.sessionsCompleted}</div>
                <div className="rounded-lg bg-slate-950 p-3">Planned: {data.summary.sessionsPlanned}</div>
                <div className="rounded-lg bg-slate-950 p-3">Estimated Total: {Math.round(data.summary.estimatedTotal)} kg</div>
              </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <h2 className="mb-2 font-medium">e1RM progression</h2>
                <svg viewBox="0 0 100 100" className="h-48 w-full rounded bg-slate-950 p-2">
                  <Polyline data={data.e1rm.squat} color="#f97316" />
                  <Polyline data={data.e1rm.bench} color="#22c55e" />
                  <Polyline data={data.e1rm.deadlift} color="#3b82f6" />
                </svg>
                <p className="mt-2 text-xs text-slate-400">Orange squat, green bench, blue deadlift.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <h2 className="mb-2 font-medium">Volume trend</h2>
                <svg viewBox="0 0 100 100" className="h-48 w-full rounded bg-slate-950 p-2">
                  <Polyline data={data.volumeTimeline} color="#a78bfa" />
                </svg>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <h2 className="mb-2 font-medium">RPE trend</h2>
                <svg viewBox="0 0 100 100" className="h-48 w-full rounded bg-slate-950 p-2">
                  <Polyline data={data.rpeTimeline} color="#f43f5e" />
                </svg>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <h2 className="mb-2 font-medium">Weekly adherence ({adherenceAvg}%)</h2>
                <div className="space-y-2">
                  {data.weeklyAdherence.map((w) => (
                    <div key={w.week}>
                      <p className="text-xs text-slate-400">Week {w.week}</p>
                      <div className="h-2 rounded bg-slate-800">
                        <div className="h-2 rounded bg-green-500" style={{ width: `${w.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <h2 className="mb-3 font-medium">Exercise bests</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="pb-2 text-left">Exercise</th>
                      <th className="pb-2 text-left">Best e1RM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.exerciseBests.map((row) => (
                      <tr key={row.exercise} className="border-t border-slate-800">
                        <td className="py-2">{row.exercise}</td>
                        <td className="py-2">{Math.round(row.best)} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

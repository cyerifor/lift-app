"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SessionItem = {
  id: string;
  sessionNumber: number;
  dayOfWeek: string | null;
  title: string;
  scheduledAt: string | null;
  completed: boolean;
};

type WeekItem = { id: string; weekNumber: number; sessions: SessionItem[] };
type ActiveBlockResponse = {
  activeBlock: {
    id: string;
    title: string;
    phase: string | null;
    weekCount: number;
    sessionsPerWeek: number;
    progress: { completed: number; total: number; percentage: number };
    nextSession: SessionItem | null;
    weeks: WeekItem[];
  } | null;
};

export default function AthleteHomePage() {
  const [athleteId, setAthleteId] = useState("");
  const [blockData, setBlockData] = useState<ActiveBlockResponse["activeBlock"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("athlete_id") || "";
    setAthleteId(stored);
  }, []);

  const totalSessions = useMemo(
    () => blockData?.weeks.reduce((sum, week) => sum + week.sessions.length, 0) ?? 0,
    [blockData],
  );

  async function loadActiveBlock() {
    if (!athleteId) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/athlete/blocks/active", {
        headers: { "x-athlete-id": athleteId },
      });
      const data = (await response.json()) as ActiveBlockResponse & { error?: string };
      if (!response.ok) {
        setError(data.error || "Unable to load active block.");
        return;
      }
      setBlockData(data.activeBlock);
    } catch {
      setError("Network error while loading athlete data.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Athlete Home</h1>
            <p className="text-sm text-slate-400">Track active block progress and launch your next session.</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <input
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm sm:w-72"
              placeholder="Athlete ID (dev)"
            />
            <button
              onClick={() => {
                localStorage.setItem("athlete_id", athleteId);
                void loadActiveBlock();
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
            >
              Load
            </button>
          </div>
        </header>

        {error && <div className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}

        {isLoading && <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-slate-300">Loading active block...</div>}

        {!isLoading && !blockData && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-slate-300">
            No active block found yet.
          </div>
        )}

        {blockData && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Active block</p>
                <p className="mt-1 text-lg font-semibold">{blockData.title}</p>
                <p className="text-sm text-slate-400">{blockData.phase || "Phase not set"}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Sessions</p>
                <p className="mt-1 text-lg font-semibold">{totalSessions}</p>
                <p className="text-sm text-slate-400">
                  {blockData.weekCount} weeks • {blockData.sessionsPerWeek}/week
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-400">Progress</p>
                <p className="mt-1 text-lg font-semibold">
                  {blockData.progress.completed}/{blockData.progress.total}
                </p>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{ width: `${blockData.progress.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {blockData.nextSession && (
              <div className="rounded-xl border border-blue-800 bg-blue-950/20 p-4">
                <p className="text-sm text-blue-300">Next session</p>
                <p className="mt-1 text-lg font-semibold">
                  {blockData.nextSession.dayOfWeek ? `${blockData.nextSession.dayOfWeek} • ` : ""}
                  {blockData.nextSession.title}
                </p>
                <Link
                  href={`/athlete/session/${blockData.nextSession.id}`}
                  className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
                >
                  Start training
                </Link>
              </div>
            )}

            <div className="space-y-3">
              {blockData.weeks.map((week) => (
                <div key={week.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h2 className="mb-3 font-semibold">Week {week.weekNumber}</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {week.sessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/athlete/session/${session.id}`}
                        className="rounded-lg border border-slate-700 bg-slate-950 p-3 transition hover:border-slate-500"
                      >
                        <p className="text-sm text-slate-400">
                          {session.dayOfWeek || "Day"} • S{session.sessionNumber}
                        </p>
                        <p className="font-medium">{session.title}</p>
                        <span
                          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                            session.completed ? "bg-green-900/50 text-green-300" : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {session.completed ? "Completed" : "Pending"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

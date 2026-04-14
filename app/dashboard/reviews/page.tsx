"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReviewItem = {
  logId: string;
  completedAt: string;
  athleteName: string | null;
  athleteEmail: string;
  sessionTitle: string;
  weekNumber: number;
  blockTitle: string;
  reviewed: boolean;
  hasFeedback: boolean;
  latestRating: number | null;
  volume: number | null;
  avgRpe: number | null;
};

export default function ReviewsPage() {
  const [coachId, setCoachId] = useState("");
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("coach_id") || "";
    setCoachId(stored);
  }, []);

  useEffect(() => {
    if (!coachId) return;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/coach/reviews?filter=${filter}`, {
          headers: { "x-coach-id": coachId },
        });
        const data = (await response.json()) as { items?: ReviewItem[]; error?: string };
        if (!response.ok) {
          setError(data.error || "Unable to load reviews");
          return;
        }
        setItems(data.items || []);
      } catch {
        setError("Network error");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [coachId, filter]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Review Queue</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("pending")}
              className={`rounded-lg px-3 py-1.5 text-sm ${filter === "pending" ? "bg-blue-600" : "bg-slate-800"}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-sm ${filter === "all" ? "bg-blue-600" : "bg-slate-800"}`}
            >
              All
            </button>
          </div>
        </header>

        {error && <div className="rounded-lg border border-red-900 bg-red-950/20 p-3 text-sm">{error}</div>}
        {isLoading && <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">Loading...</div>}

        {!isLoading && items.length === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-slate-300">No sessions to review.</div>
        )}

        <div className="grid gap-3">
          {items.map((item) => (
            <Link key={item.logId} href={`/dashboard/reviews/${item.logId}`} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{item.sessionTitle}</p>
                  <p className="text-sm text-slate-400">
                    {item.athleteName || item.athleteEmail} • {item.blockTitle} • Week {item.weekNumber}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${item.reviewed ? "bg-green-900/50 text-green-300" : "bg-amber-900/50 text-amber-300"}`}>
                  {item.reviewed ? "Reviewed" : "Pending"}
                </span>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-300">
                <span>Volume: {item.volume ? Math.round(item.volume) : "-"}</span>
                <span>Avg RPE: {item.avgRpe ?? "-"}</span>
                <span>Feedback: {item.hasFeedback ? `Yes${item.latestRating ? ` (${item.latestRating}★)` : ""}` : "No"}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

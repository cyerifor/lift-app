"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ReviewDetail = {
  logId: string;
  athlete: { id: string; name: string | null; email: string };
  session: { id: string; title: string; weekNumber: number; blockTitle: string };
  metrics: { volume: number | null; avgRpe: number | null };
  exercises: Array<{
    id: string;
    name: string;
    exerciseType: string | null;
    rows: Array<{
      setNumber: number;
      prescribed: { repsDisplay: string | null; rpeDisplay: string | null; suggestedLoKg: number | null; suggestedHiKg: number | null };
      actual: { repsCompleted: number | null; loadKg: number | null; rpe: number | null } | null;
    }>;
  }>;
  feedbackHistory: Array<{ id: string; rating: number | null; message: string; createdAt: string; coachName: string | null }>;
};

export default function ReviewDetailPage() {
  const params = useParams<{ logId: string }>();
  const [coachId] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem("coach_id") || ""));
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!coachId || !params.logId) return;
    async function load() {
      const response = await fetch(`/api/coach/reviews/${params.logId}`, {
        headers: { "x-coach-id": coachId },
      });
      const data = (await response.json()) as ReviewDetail & { error?: string };
      if (!response.ok) {
        setError(data.error || "Unable to load review");
        return;
      }
      setDetail(data);
    }
    void load();
  }, [coachId, params.logId]);

  async function submitFeedback() {
    if (!detail) return;
    setIsSubmitting(true);
    setError("");
    const response = await fetch("/api/coach/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-coach-id": coachId,
      },
      body: JSON.stringify({
        athleteId: detail.athlete.id,
        sessionLogId: detail.logId,
        sessionId: detail.session.id,
        rating,
        message,
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Unable to submit feedback");
      setIsSubmitting(false);
      return;
    }
    setMessage("");
    setIsSubmitting(false);
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
        {!detail && !error && <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">Loading...</div>}
        {error && <div className="rounded-lg border border-red-900 bg-red-950/20 p-3">{error}</div>}
        {detail && (
          <>
            <header className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h1 className="text-xl font-semibold">{detail.session.title}</h1>
              <p className="text-sm text-slate-400">
                {detail.athlete.name || detail.athlete.email} • {detail.session.blockTitle} • Week {detail.session.weekNumber}
              </p>
              <div className="mt-2 flex gap-4 text-sm">
                <span>Volume: {detail.metrics.volume ? Math.round(detail.metrics.volume) : "-"}</span>
                <span>Avg RPE: {detail.metrics.avgRpe ?? "-"}</span>
              </div>
            </header>

            <section className="space-y-4">
              {detail.exercises.map((exercise) => (
                <div key={exercise.id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                  <h2 className="font-medium">{exercise.name}</h2>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="pb-2 text-left">Set</th>
                          <th className="pb-2 text-left">Prescribed</th>
                          <th className="pb-2 text-left">Suggested</th>
                          <th className="pb-2 text-left">Actual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exercise.rows.map((row) => (
                          <tr key={`${exercise.id}:${row.setNumber}`} className="border-t border-slate-800">
                            <td className="py-2">#{row.setNumber}</td>
                            <td className="py-2">
                              {row.prescribed.repsDisplay || "-"} @ {row.prescribed.rpeDisplay || "-"}
                            </td>
                            <td className="py-2 text-green-400">
                              {row.prescribed.suggestedLoKg ?? "-"} - {row.prescribed.suggestedHiKg ?? "-"} kg
                            </td>
                            <td className="py-2">
                              {row.actual
                                ? `${row.actual.loadKg ?? "-"}kg x ${row.actual.repsCompleted ?? "-"} @ ${row.actual.rpe ?? "-"}`
                                : "Not logged"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h3 className="font-medium">Leave Feedback</h3>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`rounded px-2 py-1 text-sm ${rating >= n ? "bg-amber-500 text-black" : "bg-slate-800"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-3 h-28 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"
                placeholder="What went well? What to adjust next session?"
              />
              <button
                onClick={() => void submitFeedback()}
                disabled={isSubmitting || message.trim().length < 2}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Send feedback"}
              </button>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <h3 className="font-medium">Feedback history</h3>
              <div className="mt-2 space-y-2">
                {detail.feedbackHistory.length === 0 && <p className="text-sm text-slate-400">No feedback yet.</p>}
                {detail.feedbackHistory.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                    <p className="text-sm text-slate-300">{entry.message}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.rating ? `${entry.rating}★` : "No rating"} • {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

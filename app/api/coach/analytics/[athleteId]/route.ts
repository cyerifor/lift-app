import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCoach } from "@/lib/get-coach";

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET(request: Request, { params }: { params: Promise<{ athleteId: string }> }) {
  const coach = await requireCoach(request);
  if (!coach) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { athleteId } = await params;
  if (!athleteId) return NextResponse.json({ error: "athleteId is required" }, { status: 400 });

  const athlete = await db.athlete.findFirst({
    where: { id: athleteId, coachId: coach.id },
    include: { user: true },
  });
  if (!athlete) return NextResponse.json({ error: "Athlete not found" }, { status: 404 });

  try {
    const analytics = await db.analytics.findMany({
      where: { athleteId },
      orderBy: { recordedAt: "asc" },
    });

    const sessions = await db.session.findMany({
      where: {
        week: { block: { athleteId } },
      },
      select: { id: true, status: true, week: { select: { weekNumber: true } } },
    });

    const e1rmByLift = {
      squat: analytics.filter((a) => a.metricKey === "e1rm:lift:squat"),
      bench: analytics.filter((a) => a.metricKey === "e1rm:lift:bench"),
      deadlift: analytics.filter((a) => a.metricKey === "e1rm:lift:deadlift"),
    };

    const volumeTimeline = analytics.filter(
      (a) => a.metricKey === "session:volume" || a.metricKey === "session:volume_kg_reps",
    );
    const rpeTimeline = analytics.filter((a) => a.metricKey === "session:avgRpe" || a.metricKey === "session:avg_rpe");

    const exerciseBestsMap = new Map<string, number>();
    for (const row of analytics.filter((a) => a.metricKey.startsWith("e1rm:exercise:"))) {
      const name = row.metricKey.replace("e1rm:exercise:", "");
      const current = exerciseBestsMap.get(name) ?? 0;
      if (row.metricValue > current) exerciseBestsMap.set(name, row.metricValue);
    }
    const exerciseBests = Array.from(exerciseBestsMap.entries())
      .map(([exercise, best]) => ({ exercise, best }))
      .sort((a, b) => b.best - a.best)
      .slice(0, 12);

    const weeksMap = new Map<number, { total: number; completed: number }>();
    for (const session of sessions) {
      const week = session.week.weekNumber;
      const existing = weeksMap.get(week) ?? { total: 0, completed: 0 };
      existing.total += 1;
      if (session.status === "COMPLETED") existing.completed += 1;
      weeksMap.set(week, existing);
    }
    const weeklyAdherence = Array.from(weeksMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, stats]) => ({
        week,
        completed: stats.completed,
        total: stats.total,
        pct: stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100),
      }));

    const estimatedTotal =
      (e1rmByLift.squat.at(-1)?.metricValue ?? 0) +
      (e1rmByLift.bench.at(-1)?.metricValue ?? 0) +
      (e1rmByLift.deadlift.at(-1)?.metricValue ?? 0);

    return NextResponse.json(
      {
        athlete: {
          id: athlete.id,
          name: athlete.user.name,
          email: athlete.user.email,
        },
        e1rm: {
          squat: e1rmByLift.squat.map((x) => ({ date: dayKey(x.recordedAt), value: x.metricValue })),
          bench: e1rmByLift.bench.map((x) => ({ date: dayKey(x.recordedAt), value: x.metricValue })),
          deadlift: e1rmByLift.deadlift.map((x) => ({ date: dayKey(x.recordedAt), value: x.metricValue })),
        },
        volumeTimeline: volumeTimeline.map((x) => ({ date: dayKey(x.recordedAt), value: x.metricValue })),
        rpeTimeline: rpeTimeline.map((x) => ({ date: dayKey(x.recordedAt), value: x.metricValue })),
        weeklyAdherence,
        exerciseBests,
        summary: {
          sessionsCompleted: sessions.filter((s) => s.status === "COMPLETED").length,
          sessionsPlanned: sessions.length,
          estimatedTotal,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Unable to load analytics" }, { status: 500 });
  }
}

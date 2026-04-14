import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCoach } from "@/lib/get-coach";

export async function GET(request: Request, { params }: { params: Promise<{ logId: string }> }) {
  const coach = await requireCoach(request);
  if (!coach) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { logId } = await params;
  if (!logId) return NextResponse.json({ error: "logId is required" }, { status: 400 });

  try {
    const log = await db.sessionLog.findFirst({
      where: {
        id: logId,
        athlete: { coachId: coach.id },
      },
      include: {
        athlete: { include: { user: true } },
        session: {
          include: {
            week: { include: { block: true } },
            exercises: {
              orderBy: { orderIndex: "asc" },
              include: {
                setPrescriptions: { orderBy: { setNumber: "asc" } },
              },
            },
          },
        },
        setLogs: {
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
        analytics: true,
        feedbacks: {
          orderBy: { createdAt: "desc" },
          include: { coach: { include: { user: true } } },
        },
      },
    });

    if (!log) return NextResponse.json({ error: "Session log not found" }, { status: 404 });

    if (!log.coachReviewerId) {
      await db.sessionLog.update({
        where: { id: log.id },
        data: { coachReviewerId: coach.id },
      });
    }

    const setLogMap = new Map(log.setLogs.map((set) => [`${set.exerciseId}:${set.setNumber}`, set]));
    const exercises = log.session.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      exerciseType: exercise.exerciseType,
      rows: exercise.setPrescriptions.map((set) => {
        const actual = setLogMap.get(`${exercise.id}:${set.setNumber}`);
        return {
          setNumber: set.setNumber,
          prescribed: {
            repsDisplay: set.repsDisplay,
            rpeDisplay: set.rpeDisplay,
            suggestedLoKg: set.suggestedLoKg,
            suggestedHiKg: set.suggestedHiKg,
          },
          actual: actual
            ? {
                repsCompleted: actual.repsCompleted,
                loadKg: actual.loadKg,
                rpe: actual.rpe,
              }
            : null,
        };
      }),
    }));

    return NextResponse.json(
      {
        logId: log.id,
        completedAt: log.completedAt,
        athlete: {
          id: log.athlete.id,
          name: log.athlete.user.name,
          email: log.athlete.user.email,
        },
        session: {
          id: log.session.id,
          title: log.session.title,
          weekNumber: log.session.week.weekNumber,
          blockTitle: log.session.week.block.title,
        },
        metrics: {
          volume:
            log.analytics.find((a) => a.metricKey === "session:volume")?.metricValue ??
            log.analytics.find((a) => a.metricKey === "session:volume_kg_reps")?.metricValue ??
            null,
          avgRpe:
            log.analytics.find((a) => a.metricKey === "session:avgRpe")?.metricValue ??
            log.analytics.find((a) => a.metricKey === "session:avg_rpe")?.metricValue ??
            null,
        },
        exercises,
        feedbackHistory: log.feedbacks.map((feedback) => ({
          id: feedback.id,
          rating: feedback.rating,
          message: feedback.message,
          createdAt: feedback.createdAt,
          coachName: feedback.coach.user.name,
        })),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Unable to load review details" }, { status: 500 });
  }
}

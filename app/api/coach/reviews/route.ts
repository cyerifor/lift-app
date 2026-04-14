import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCoach } from "@/lib/get-coach";

export async function GET(request: Request) {
  const coach = await requireCoach(request);
  if (!coach) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") === "all" ? "all" : "pending";

  try {
    const logs = await db.sessionLog.findMany({
      where: {
        athlete: { coachId: coach.id },
        ...(filter === "pending" ? { coachReviewerId: null } : {}),
      },
      orderBy: { completedAt: "desc" },
      include: {
        athlete: { include: { user: true } },
        session: {
          include: {
            week: {
              include: {
                block: { select: { id: true, title: true, phase: true } },
              },
            },
          },
        },
        analytics: true,
        feedbacks: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, rating: true, createdAt: true },
        },
      },
    });

    return NextResponse.json(
      {
        items: logs.map((log) => {
          const volume =
            log.analytics.find((a) => a.metricKey === "session:volume")?.metricValue ??
            log.analytics.find((a) => a.metricKey === "session:volume_kg_reps")?.metricValue ??
            null;
          const avgRpe =
            log.analytics.find((a) => a.metricKey === "session:avgRpe")?.metricValue ??
            log.analytics.find((a) => a.metricKey === "session:avg_rpe")?.metricValue ??
            null;
          return {
            logId: log.id,
            completedAt: log.completedAt,
            athleteId: log.athleteId,
            athleteName: log.athlete.user.name,
            athleteEmail: log.athlete.user.email,
            sessionId: log.sessionId,
            sessionTitle: log.session.title,
            weekNumber: log.session.week.weekNumber,
            blockTitle: log.session.week.block.title,
            reviewed: Boolean(log.coachReviewerId),
            hasFeedback: log.feedbacks.length > 0,
            latestRating: log.feedbacks[0]?.rating ?? null,
            volume,
            avgRpe,
          };
        }),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Unable to load review queue" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAthlete } from "@/lib/get-athlete";

export async function GET(request: Request) {
  const athlete = await requireAthlete(request);
  if (!athlete) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const now = new Date();
    const block =
      (await db.block.findFirst({
        where: {
          athleteId: athlete.id,
          status: "ACTIVE",
          endDate: { gte: now },
        },
        orderBy: { startDate: "desc" },
        include: {
          weeks: {
            orderBy: { weekNumber: "asc" },
            include: {
              sessions: {
                orderBy: { sessionNumber: "asc" },
                include: {
                  logs: {
                    where: { athleteId: athlete.id },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      })) ??
      (await db.block.findFirst({
        where: {
          athleteId: athlete.id,
          status: "DRAFT",
        },
        orderBy: { createdAt: "desc" },
        include: {
          weeks: {
            orderBy: { weekNumber: "asc" },
            include: {
              sessions: {
                orderBy: { sessionNumber: "asc" },
                include: {
                  logs: {
                    where: { athleteId: athlete.id },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      }));

    if (!block) return NextResponse.json({ activeBlock: null }, { status: 200 });

    const sessions = block.weeks.flatMap((week) => week.sessions);
    const withStatus = sessions.map((session) => ({
      ...session,
      completed: session.logs.length > 0 || session.status === "COMPLETED",
    }));
    const nextSession = withStatus.find((session) => !session.completed) ?? null;
    const completedCount = withStatus.filter((session) => session.completed).length;

    return NextResponse.json(
      {
        activeBlock: {
          id: block.id,
          title: block.title,
          phase: block.phase,
          weekCount: block.weekCount,
          sessionsPerWeek: block.sessionsPerWeek,
          status: block.status,
          progress: {
            completed: completedCount,
            total: withStatus.length,
            percentage: withStatus.length === 0 ? 0 : Math.round((completedCount / withStatus.length) * 100),
          },
          nextSession,
          weeks: block.weeks.map((week) => ({
            ...week,
            sessions: week.sessions.map((session) => ({
              id: session.id,
              sessionNumber: session.sessionNumber,
              dayOfWeek: session.dayOfWeek,
              title: session.title,
              scheduledAt: session.scheduledAt,
              completed: session.logs.length > 0 || session.status === "COMPLETED",
            })),
          })),
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Unable to fetch active block" }, { status: 500 });
  }
}

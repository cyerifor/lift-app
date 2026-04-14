import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAthlete } from "@/lib/get-athlete";

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const athlete = await requireAthlete(request);
  if (!athlete) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  if (!sessionId) return NextResponse.json({ error: "sessionId is required" }, { status: 400 });

  try {
    const session = await db.session.findFirst({
      where: {
        id: sessionId,
        week: {
          block: {
            athleteId: athlete.id,
          },
        },
      },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            setPrescriptions: {
              orderBy: { setNumber: "asc" },
            },
            setLogs: {
              where: {
                sessionLog: {
                  athleteId: athlete.id,
                },
              },
              include: {
                sessionLog: {
                  select: {
                    id: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        week: {
          include: {
            block: {
              select: {
                id: true,
                title: true,
                phase: true,
                config: true,
              },
            },
          },
        },
      },
    });

    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const exercises = session.exercises.map((exercise) => {
      const latestBySet = new Map<number, (typeof exercise.setLogs)[number]>();
      for (const log of exercise.setLogs) {
        if (!latestBySet.has(log.setNumber)) latestBySet.set(log.setNumber, log);
      }
      return {
        ...exercise,
        setLogs: Array.from(latestBySet.values()).map((log) => ({
          id: log.id,
          sessionLogId: log.sessionLogId,
          setNumber: log.setNumber,
          loadKg: log.loadKg,
          repsCompleted: log.repsCompleted,
          rpe: log.rpe,
        })),
      };
    });

    return NextResponse.json(
      {
        id: session.id,
        title: session.title,
        sessionNumber: session.sessionNumber,
        dayOfWeek: session.dayOfWeek,
        scheduledAt: session.scheduledAt,
        status: session.status,
        block: session.week.block,
        exercises,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Unable to fetch session details" }, { status: 500 });
  }
}

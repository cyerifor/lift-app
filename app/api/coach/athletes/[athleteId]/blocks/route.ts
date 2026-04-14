import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCoach } from "@/lib/get-coach";

export async function GET(request: Request, { params }: { params: Promise<{ athleteId: string }> }) {
  const coach = await requireCoach(request);
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { athleteId } = await params;
  if (!athleteId) {
    return NextResponse.json({ error: "athleteId is required" }, { status: 400 });
  }

  try {
    const athlete = await db.athlete.findFirst({
      where: { id: athleteId, coachId: coach.id },
    });
    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found for this coach" }, { status: 404 });
    }

    const blocks = await db.block.findMany({
      where: {
        athleteId,
        coachId: coach.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        weeks: {
          include: {
            sessions: {
              include: {
                logs: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    const response = blocks.map((block) => {
      const sessions = block.weeks.flatMap((week) => week.sessions);
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter((session) => session.logs.length > 0).length;
      const progress = totalSessions === 0 ? 0 : Math.round((completedSessions / totalSessions) * 100);

      return {
        blockId: block.id,
        name: block.title,
        status: block.status,
        startDate: block.startDate,
        endDate: block.endDate,
        progress,
        completedSessions,
        totalSessions,
      };
    });

    return NextResponse.json(response, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unable to list blocks", message: "An unexpected error occurred while fetching athlete blocks." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAthlete } from "@/lib/get-athlete";

export async function GET(request: Request) {
  const athlete = await requireAthlete(request);
  if (!athlete) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const feedback = await db.feedback.findMany({
      where: { athleteId: athlete.id, type: "SESSION" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        coach: { include: { user: true } },
        session: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(
      {
        items: feedback.map((entry) => ({
          id: entry.id,
          message: entry.message,
          rating: entry.rating,
          createdAt: entry.createdAt,
          coachName: entry.coach.user.name,
          sessionId: entry.session?.id ?? null,
          sessionTitle: entry.session?.title ?? null,
        })),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Unable to load feedback" }, { status: 500 });
  }
}

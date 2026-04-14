import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAthlete } from "@/lib/get-athlete";

const startSchema = z.object({
  sessionId: z.string().min(1),
  bodyweightKg: z.number().positive().optional(),
  readinessScore: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  const athlete = await requireAthlete(request);
  if (!athlete) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof startSchema>;
  try {
    payload = startSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const session = await db.session.findFirst({
      where: { id: payload.sessionId, week: { block: { athleteId: athlete.id } } },
    });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const existing = await db.sessionLog.findFirst({
      where: {
        athleteId: athlete.id,
        sessionId: payload.sessionId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return NextResponse.json({ sessionLogId: existing.id, resumed: true }, { status: 200 });
    }

    const log = await db.sessionLog.create({
      data: {
        athleteId: athlete.id,
        sessionId: payload.sessionId,
        completedAt: new Date(),
        bodyweightKg: payload.bodyweightKg ?? null,
        readinessScore: payload.readinessScore ?? null,
      },
    });

    return NextResponse.json({ sessionLogId: log.id, resumed: false }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to start session log" }, { status: 500 });
  }
}

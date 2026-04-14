import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireCoach } from "@/lib/get-coach";

const bodySchema = z.object({
  athleteId: z.string().min(1),
  sessionLogId: z.string().min(1),
  sessionId: z.string().min(1),
  message: z.string().min(2).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
});

export async function POST(request: Request) {
  const coach = await requireCoach(request);
  if (!coach) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const sessionLog = await db.sessionLog.findFirst({
      where: {
        id: payload.sessionLogId,
        athleteId: payload.athleteId,
        sessionId: payload.sessionId,
        athlete: { coachId: coach.id },
      },
    });
    if (!sessionLog) return NextResponse.json({ error: "Session log not found" }, { status: 404 });

    const feedback = await db.feedback.create({
      data: {
        coachId: coach.id,
        athleteId: payload.athleteId,
        sessionId: payload.sessionId,
        sessionLogId: payload.sessionLogId,
        type: "SESSION",
        rating: payload.rating ?? null,
        message: payload.message,
      },
    });

    return NextResponse.json({ feedbackId: feedback.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create feedback" }, { status: 500 });
  }
}

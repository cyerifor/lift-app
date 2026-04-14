import { NextResponse } from "next/server";
import { z } from "zod";

import { averageRpe, bestE1RMFromSets, sessionVolume } from "@/lib/engine";
import { db } from "@/lib/db";
import { requireAthlete } from "@/lib/get-athlete";

const syncSchema = z.object({
  sessionLogId: z.string().min(1),
  sessionId: z.string().min(1),
  durationSeconds: z.number().int().min(0).optional(),
  sets: z.array(
    z.object({
      exerciseId: z.string().min(1),
      setNumber: z.number().int().min(1),
      loadKg: z.number().nonnegative().optional(),
      repsCompleted: z.number().int().nonnegative().optional(),
      rpe: z.number().min(1).max(10).optional(),
      notes: z.string().optional(),
    }),
  ),
});

export async function POST(request: Request) {
  const athlete = await requireAthlete(request);
  if (!athlete) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof syncSchema>;
  try {
    payload = syncSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    const sessionLog = await db.sessionLog.findFirst({
      where: { id: payload.sessionLogId, athleteId: athlete.id, sessionId: payload.sessionId },
      include: { session: true },
    });
    if (!sessionLog) return NextResponse.json({ error: "Session log not found" }, { status: 404 });

    const exercises = await db.exercise.findMany({
      where: { sessionId: payload.sessionId },
      select: { id: true, name: true, mainLift: true, roundingKg: true },
    });
    const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));

    await db.$transaction(async (tx) => {
      for (const set of payload.sets) {
        if (!exerciseMap.has(set.exerciseId)) continue;
        await tx.setLog.upsert({
          where: {
            sessionLogId_exerciseId_setNumber: {
              sessionLogId: payload.sessionLogId,
              exerciseId: set.exerciseId,
              setNumber: set.setNumber,
            },
          },
          update: {
            loadKg: set.loadKg ?? null,
            repsCompleted: set.repsCompleted ?? null,
            rpe: set.rpe ?? null,
            notes: set.notes ?? null,
          },
          create: {
            sessionLogId: payload.sessionLogId,
            exerciseId: set.exerciseId,
            setNumber: set.setNumber,
            loadKg: set.loadKg ?? null,
            repsCompleted: set.repsCompleted ?? null,
            rpe: set.rpe ?? null,
            notes: set.notes ?? null,
          },
        });
      }

      const grouped = new Map<string, typeof payload.sets>();
      for (const set of payload.sets) {
        const arr = grouped.get(set.exerciseId) ?? [];
        arr.push(set);
        grouped.set(set.exerciseId, arr);
      }

      const allSetsForSummary = payload.sets.map((set) => ({
        weightKg: set.loadKg ?? null,
        reps: set.repsCompleted ?? null,
        rpe: set.rpe ?? null,
      }));

      for (const [exerciseId, sets] of grouped.entries()) {
        const meta = exerciseMap.get(exerciseId);
        if (!meta) continue;
        const e1rm = bestE1RMFromSets(
          sets.map((set) => ({
            weightKg: set.loadKg ?? null,
            reps: set.repsCompleted ?? null,
            rpe: set.rpe ?? null,
          })),
          -0.0735,
          meta.roundingKg ?? 2.5,
        );
        if (e1rm) {
          await tx.analytics.create({
            data: {
              athleteId: athlete.id,
              sessionId: payload.sessionId,
              sessionLogId: payload.sessionLogId,
              metricKey: `e1rm:exercise:${meta.name}`,
              metricValue: e1rm,
            },
          });
          const lift = (meta.mainLift || "accessory").toLowerCase();
          if (lift === "squat" || lift === "bench" || lift === "deadlift") {
            await tx.analytics.create({
              data: {
                athleteId: athlete.id,
                sessionId: payload.sessionId,
                sessionLogId: payload.sessionLogId,
                metricKey: `e1rm:lift:${lift}`,
                metricValue: e1rm,
              },
            });
          }
        }
      }

      const totalVolume = sessionVolume(allSetsForSummary);
      const avgRpe = averageRpe(allSetsForSummary);

      await tx.analytics.createMany({
        data: [
          {
            athleteId: athlete.id,
            sessionId: payload.sessionId,
            sessionLogId: payload.sessionLogId,
            metricKey: "session:volume",
            metricValue: totalVolume,
          },
          {
            athleteId: athlete.id,
            sessionId: payload.sessionId,
            sessionLogId: payload.sessionLogId,
            metricKey: "session:volume_kg_reps",
            metricValue: totalVolume,
          },
          {
            athleteId: athlete.id,
            sessionId: payload.sessionId,
            sessionLogId: payload.sessionLogId,
            metricKey: "session:avgRpe",
            metricValue: avgRpe ?? 0,
          },
          {
            athleteId: athlete.id,
            sessionId: payload.sessionId,
            sessionLogId: payload.sessionLogId,
            metricKey: "session:avg_rpe",
            metricValue: avgRpe ?? 0,
          },
        ],
      });

      await tx.session.update({
        where: { id: payload.sessionId },
        data: { status: "COMPLETED" },
      });

      await tx.sessionLog.update({
        where: { id: payload.sessionLogId },
        data: {
          completedAt: new Date(),
          notes: payload.durationSeconds ? `durationSeconds:${payload.durationSeconds}` : null,
        },
      });
    });

    const totalVolume = sessionVolume(
      payload.sets.map((set) => ({ weightKg: set.loadKg ?? null, reps: set.repsCompleted ?? null })),
    );
    const avgRpe = averageRpe(payload.sets.map((set) => ({ rpe: set.rpe ?? null })));

    return NextResponse.json(
      {
        ok: true,
        summary: {
          totalVolume,
          averageRpe: avgRpe,
          durationSeconds: payload.durationSeconds ?? null,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Unable to sync session logs" }, { status: 500 });
  }
}

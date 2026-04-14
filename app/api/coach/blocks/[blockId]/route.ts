import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { EngineConfig, Week1ExerciseTemplate, generateWeekExercises } from "@/lib/engine";
import { requireCoach } from "@/lib/get-coach";

export async function GET(request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const coach = await requireCoach(request);
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { blockId } = await params;
  if (!blockId) {
    return NextResponse.json({ error: "blockId is required" }, { status: 400 });
  }

  try {
    const block = await db.block.findFirst({
      where: {
        id: blockId,
        coachId: coach.id,
      },
      include: {
        athlete: {
          include: {
            user: true,
          },
        },
        weeks: {
          orderBy: { weekNumber: "asc" },
          include: {
            sessions: {
              orderBy: { scheduledAt: "asc" },
              include: {
                exercises: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    setPrescriptions: {
                      orderBy: { setNumber: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    return NextResponse.json(block, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch block outline", message: "An unexpected error occurred while fetching the block." },
      { status: 500 },
    );
  }
}

const saveWeek1Schema = z.object({
  weekNumber: z.number().int().min(1).default(1),
  sessions: z.array(
    z.object({
      sessionId: z.string(),
      sessionNumber: z.number().int().min(1),
      dayOfWeek: z.string().optional(),
      title: z.string().optional(),
      exercises: z.array(
        z.object({
          id: z.string().optional(),
          exerciseTemplateId: z.string().optional().nullable(),
          name: z.string(),
          exerciseType: z.string().default("Accessory"),
          mainLift: z.string().default("accessory"),
          category: z.string().default("Hypertrophy Accessory"),
          progressionGroup: z.string().default("accessory"),
          targetSets: z.number().int().min(1).default(3),
          repsDisplay: z.string().default("8-12"),
          rpeDisplay: z.string().default("7-8"),
          weeklyPercent: z.number().nullable().optional(),
          roundingKg: z.number().nullable().optional(),
          progEligible: z.boolean().default(true),
          orderIndex: z.number().int().min(1),
        }),
      ),
    }),
  ),
});

export async function PUT(request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const coach = await requireCoach(request);
  if (!coach) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blockId } = await params;
  const block = await db.block.findFirst({
    where: { id: blockId, coachId: coach.id },
    include: { weeks: true },
  });
  if (!block) return NextResponse.json({ error: "Block not found" }, { status: 404 });

  let payload: z.infer<typeof saveWeek1Schema>;
  try {
    payload = saveWeek1Schema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const week = block.weeks.find((w) => w.weekNumber === payload.weekNumber);
  if (!week) return NextResponse.json({ error: "Week not found" }, { status: 404 });

  try {
    await db.$transaction(async (tx) => {
      for (const sessionInput of payload.sessions) {
        await tx.session.update({
          where: { id: sessionInput.sessionId },
          data: {
            title: sessionInput.title ?? `Session ${sessionInput.sessionNumber}`,
            dayOfWeek: sessionInput.dayOfWeek ?? null,
          },
        });

        const existing = await tx.exercise.findMany({
          where: { sessionId: sessionInput.sessionId },
          select: { id: true },
        });
        const keepIds = new Set(sessionInput.exercises.map((e) => e.id).filter(Boolean) as string[]);
        const deleteIds = existing.map((e) => e.id).filter((id) => !keepIds.has(id));
        if (deleteIds.length > 0) {
          await tx.exercise.deleteMany({ where: { id: { in: deleteIds } } });
        }

        for (const exercise of sessionInput.exercises) {
          const exerciseId =
            exercise.id ??
            (
              await tx.exercise.create({
                data: {
                  sessionId: sessionInput.sessionId,
                  name: exercise.name,
                  orderIndex: exercise.orderIndex,
                  exerciseTemplateId: exercise.exerciseTemplateId ?? null,
                  exerciseType: exercise.exerciseType,
                  mainLift: exercise.mainLift,
                  category: exercise.category,
                  progressionGroup: exercise.progressionGroup,
                  targetSets: exercise.targetSets,
                  repsDisplay: exercise.repsDisplay,
                  rpeDisplay: exercise.rpeDisplay,
                  weeklyPercent: exercise.weeklyPercent ?? null,
                  roundingKg: exercise.roundingKg ?? null,
                  progEligible: exercise.progEligible,
                },
              })
            ).id;

          await tx.exercise.update({
            where: { id: exerciseId },
            data: {
              name: exercise.name,
              orderIndex: exercise.orderIndex,
              exerciseTemplateId: exercise.exerciseTemplateId ?? null,
              exerciseType: exercise.exerciseType,
              mainLift: exercise.mainLift,
              category: exercise.category,
              progressionGroup: exercise.progressionGroup,
              targetSets: exercise.targetSets,
              repsDisplay: exercise.repsDisplay,
              rpeDisplay: exercise.rpeDisplay,
              weeklyPercent: exercise.weeklyPercent ?? null,
              roundingKg: exercise.roundingKg ?? null,
              progEligible: exercise.progEligible,
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unable to save Week 1 programming" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const coach = await requireCoach(request);
  if (!coach) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blockId } = await params;
  const block = await db.block.findFirst({
    where: { id: blockId, coachId: coach.id },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          sessions: {
            orderBy: { sessionNumber: "asc" },
            include: {
              exercises: {
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!block) return NextResponse.json({ error: "Block not found" }, { status: 404 });

  const week1 = block.weeks.find((w) => w.weekNumber === 1);
  if (!week1) return NextResponse.json({ error: "Week 1 template missing" }, { status: 400 });

  const parsedConfig = (block.config ? JSON.parse(block.config) : {}) as Partial<EngineConfig>;
  const config: EngineConfig = {
    progressionMode: "% + RPE",
    weeklyProgression: { squat: 0.025, bench: 0.015, deadlift: 0.02 },
    trainingMaxes: { squat: 200, bench: 130, deadlift: 230 },
    e1rms: { squat: 0, bench: 0, deadlift: 0 },
    slopes: { squat: -0.0735, bench: -0.0735, deadlift: -0.0735 },
    defaultRoundingKg: 2.5,
    intTrendMain: "Wave",
    volTrendMain: "Flat",
    rpeStepMain: 0.5,
    setStepMain: 0,
    rpeCapMain: 8,
    setCapMain: 5,
    intTrendVar: "Flat",
    volTrendVar: "Flat",
    rpeStepVar: 0.5,
    setStepVar: 0,
    rpeCapVar: 9,
    setCapVar: 4,
    intTrendAcc: "Flat",
    volTrendAcc: "Flat",
    rpeStepAcc: 0,
    setStepAcc: 0,
    rpeCapAcc: 9,
    setCapAcc: 3,
    waveLoading: true,
    applyProgVar: true,
    ...parsedConfig,
  };

  try {
    await db.$transaction(async (tx) => {
      for (const week of block.weeks) {
        if (week.weekNumber === 1) continue;

        for (const session of week.sessions) {
          await tx.exercise.deleteMany({ where: { sessionId: session.id } });
        }

        for (const templateSession of week1.sessions) {
          const targetSession = week.sessions.find((s) => s.sessionNumber === templateSession.sessionNumber);
          if (!targetSession) continue;

          const generated = generateWeekExercises(
            templateSession.exercises.map(
              (exercise) =>
                ({
                  exerciseTemplateId: exercise.exerciseTemplateId,
                  name: exercise.name,
                  mainLift: (exercise.mainLift ?? "accessory") as Week1ExerciseTemplate["mainLift"],
                  category: exercise.category ?? "Hypertrophy Accessory",
                  progressionGroup: (exercise.progressionGroup ?? "accessory") as Week1ExerciseTemplate["progressionGroup"],
                  exerciseType: (exercise.exerciseType ?? "Accessory") as Week1ExerciseTemplate["exerciseType"],
                  targetSets: exercise.targetSets ?? 3,
                  repsDisplay: exercise.repsDisplay ?? "8-12",
                  rpeDisplay: exercise.rpeDisplay ?? "7-8",
                  weeklyPercent: exercise.weeklyPercent ?? null,
                  roundingKg: exercise.roundingKg ?? null,
                  progEligible: exercise.progEligible,
                }) satisfies Week1ExerciseTemplate,
            ),
            week.weekNumber,
            config,
          );

          for (let idx = 0; idx < generated.length; idx++) {
            const exercise = generated[idx];
            const createdExercise = await tx.exercise.create({
              data: {
                sessionId: targetSession.id,
                name: exercise.name,
                orderIndex: idx + 1,
                exerciseTemplateId: exercise.exerciseTemplateId ?? null,
                exerciseType: exercise.exerciseType,
                mainLift: exercise.mainLift,
                category: exercise.category,
                progressionGroup: exercise.progressionGroup,
                targetSets: exercise.targetSets,
                repsDisplay: exercise.repsDisplay,
                rpeDisplay: exercise.rpeDisplay,
                weeklyPercent: exercise.weeklyPercent,
                roundingKg: exercise.roundingKg,
                progEligible: exercise.progEligible,
              },
            });

            await tx.setPrescription.create({
              data: {
                exerciseId: createdExercise.id,
                setNumber: 1,
                repsDisplay: exercise.repsDisplay,
                rpeDisplay: exercise.rpeDisplay,
                suggestedLoKg: exercise.suggestedLoKg,
                suggestedHiKg: exercise.suggestedHiKg,
                targetLoadKg: exercise.suggestedHiKg,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unable to generate weeks from Week 1 template" }, { status: 500 });
  }
}

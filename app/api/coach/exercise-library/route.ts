import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { EXERCISE_SEEDS } from "@/lib/exercise-seeds";
import { requireCoach } from "@/lib/get-coach";

const createCustomExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  mainLift: z.enum(["squat", "bench", "deadlift", "accessory"]),
  category: z.string().min(1).max(80),
  progressionGroup: z.enum(["main", "variation", "accessory"]),
  movementPattern: z.string().optional(),
  equipment: z.string().optional(),
  tier: z.number().int().min(1).max(3).optional(),
  roundingKg: z.number().positive().optional(),
  progEligible: z.boolean().optional(),
});

async function seedExerciseLibraryIfNeeded() {
  const existing = await db.exerciseTemplate.count({
    where: { isCustom: false },
  });
  if (existing > 0) return;

  await db.exerciseTemplate.createMany({
    data: EXERCISE_SEEDS.map((seed) => ({
      name: seed.name,
      mainLift: seed.mainLift,
      category: seed.category,
      progressionGroup: seed.progressionGroup,
      movementPattern: seed.movementPattern,
      equipment: seed.equipment,
      tier: seed.tier,
      roundingKg: seed.roundingKg,
      progEligible: seed.progEligible,
      isCustom: false,
    })),
  });
}

export async function GET(request: Request) {
  const coach = await requireCoach(request);
  if (!coach) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";
  const mainLift = searchParams.get("mainLift")?.trim();
  const category = searchParams.get("category")?.trim();

  try {
    await seedExerciseLibraryIfNeeded();

    const exercises = await db.exerciseTemplate.findMany({
      where: {
        AND: [
          {
            OR: [{ coachId: null }, { coachId: coach.id }],
          },
          query
            ? {
                name: {
                  contains: query,
                },
              }
            : {},
          mainLift ? { mainLift } : {},
          category ? { category } : {},
        ],
      },
      orderBy: [{ isCustom: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(exercises, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unable to fetch exercise library" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const coach = await requireCoach(request);
  if (!coach) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof createCustomExerciseSchema>;
  try {
    payload = createCustomExerciseSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request body. Expected JSON payload." }, { status: 400 });
  }

  try {
    const created = await db.exerciseTemplate.create({
      data: {
        coachId: coach.id,
        name: payload.name,
        mainLift: payload.mainLift,
        category: payload.category,
        progressionGroup: payload.progressionGroup,
        movementPattern: payload.movementPattern ?? null,
        equipment: payload.equipment ?? null,
        tier: payload.tier ?? 2,
        roundingKg: payload.roundingKg ?? 2.5,
        progEligible: payload.progEligible ?? true,
        isCustom: true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create custom exercise" }, { status: 500 });
  }
}

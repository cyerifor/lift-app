import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { resolveExerciseLibraryAthlete } from "@/lib/exercises/authorization";
import { exerciseErrorResponse } from "@/lib/exercises/http";
import { exerciseUpdateSchema } from "@/lib/exercises/schema";
import { ExerciseService } from "@/lib/exercises/service";

const service = new ExerciseService(db);

async function accessFor(request: Request) {
  return resolveExerciseLibraryAthlete(request, new URL(request.url).searchParams.get("athleteId") ?? undefined);
}

export async function GET(request: Request, context: { params: Promise<{ exerciseId: string }> }) {
  try {
    const access = await accessFor(request);
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
    const { exerciseId } = await context.params;
    return NextResponse.json(await service.get(access.athleteId, exerciseId));
  } catch (error) {
    return exerciseErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ exerciseId: string }> }) {
  try {
    const access = await accessFor(request);
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
    const { exerciseId } = await context.params;
    const input = exerciseUpdateSchema.parse(await request.json());
    return NextResponse.json(await service.update(access.athleteId, exerciseId, input));
  } catch (error) {
    return exerciseErrorResponse(error);
  }
}

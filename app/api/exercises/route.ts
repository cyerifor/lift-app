import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { resolveExerciseLibraryAthlete } from "@/lib/exercises/authorization";
import { exerciseErrorResponse } from "@/lib/exercises/http";
import { exerciseInputSchema, exerciseListQuerySchema } from "@/lib/exercises/schema";
import { ExerciseService } from "@/lib/exercises/service";

const service = new ExerciseService(db);

function queryObject(url: URL) {
  return Object.fromEntries(url.searchParams.entries());
}

export async function GET(request: Request) {
  try {
    const query = exerciseListQuerySchema.parse(queryObject(new URL(request.url)));
    const access = await resolveExerciseLibraryAthlete(request, query.athleteId);
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
    return NextResponse.json(await service.list(access.athleteId, query));
  } catch (error) {
    return exerciseErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const athleteId = new URL(request.url).searchParams.get("athleteId") ?? undefined;
    const access = await resolveExerciseLibraryAthlete(request, athleteId);
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
    const input = exerciseInputSchema.parse(await request.json());
    return NextResponse.json(await service.create(access.athleteId, input), { status: 201 });
  } catch (error) {
    return exerciseErrorResponse(error);
  }
}

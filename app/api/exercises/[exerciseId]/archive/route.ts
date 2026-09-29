import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { resolveExerciseLibraryAthlete } from "@/lib/exercises/authorization";
import { exerciseErrorResponse } from "@/lib/exercises/http";
import { ExerciseService } from "@/lib/exercises/service";

const service = new ExerciseService(db);

export async function POST(request: Request, context: { params: Promise<{ exerciseId: string }> }) {
  try {
    const access = await resolveExerciseLibraryAthlete(
      request,
      new URL(request.url).searchParams.get("athleteId") ?? undefined,
    );
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
    const { exerciseId } = await context.params;
    return NextResponse.json(await service.archive(access.athleteId, exerciseId));
  } catch (error) {
    return exerciseErrorResponse(error);
  }
}

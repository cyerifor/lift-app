import { NextResponse } from "next/server";
import { z } from "zod";

import { athleteSettingsInputSchema } from "@/lib/athlete-settings/schema";
import { AthleteSettingsError, AthleteSettingsService } from "@/lib/athlete-settings/service";
import { db } from "@/lib/db";
import { resolveExerciseLibraryAthlete } from "@/lib/exercises/authorization";

const service = new AthleteSettingsService(db);

async function access(request: Request) {
  const requestedAthleteId = new URL(request.url).searchParams.get("athleteId") ?? undefined;
  const result = await resolveExerciseLibraryAthlete(request, requestedAthleteId);
  if (!result.ok) return result;
  const athlete = await db.athlete.findUnique({ where: { id: result.athleteId }, select: { id: true, userId: true } });
  return athlete ? { ok: true as const, athlete } : { ok: false as const, status: 404, message: "Athlete not found" };
}

function errorResponse(error: unknown) {
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
  }
  if (error instanceof AthleteSettingsError) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ error: "Unable to process athlete settings" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const result = await access(request);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json(await service.get(result.athlete.userId, result.athlete.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const result = await access(request);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    const input = athleteSettingsInputSchema.parse(await request.json());
    return NextResponse.json(await service.update(result.athlete.userId, result.athlete.id, input));
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { exerciseListQuerySchema } from "@/lib/exercises/schema";
import { ExerciseService } from "@/lib/exercises/service";
import { requireCoach } from "@/lib/get-coach";

const service = new ExerciseService(db);

// Compatibility endpoint for the existing block builder. The block determines
// the athlete-owned library, so callers never choose an unrelated athlete ID.
// The response keeps the legacy builder field names until that UI is replaced.
export async function GET(request: Request) {
  const coach = await requireCoach(request);
  if (!coach) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blockId = new URL(request.url).searchParams.get("blockId");
  if (!blockId) return NextResponse.json({ error: "blockId is required" }, { status: 400 });

  const block = await db.block.findFirst({
    where: { id: blockId, coachId: coach.id },
    select: { athleteId: true },
  });
  if (!block) return NextResponse.json({ error: "Block not found" }, { status: 404 });

  const exercises = await service.list(block.athleteId, exerciseListQuerySchema.parse({}));
  return NextResponse.json(
    exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      mainLift: exercise.mainLift.toLowerCase(),
      category: exercise.category,
      progressionGroup: exercise.progressionGroup,
      roundingKg: exercise.loadStepKg,
      progEligible: exercise.progressionEligibility !== "NO",
    })),
  );
}

// Creation through the compatibility path remains backed by the canonical API
// and therefore still requires an authorised athleteId resource selector.
export { POST } from "@/app/api/exercises/route";

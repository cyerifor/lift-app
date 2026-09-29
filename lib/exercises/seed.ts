import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  ExerciseCapability,
  ExerciseMainLift,
  ExerciseMode,
  ProgressionEligibility,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { z } from "zod";

import { ExerciseLibraryError } from "./errors.ts";
import { normalizeExerciseName } from "./normalize-name.ts";

const manifestSchema = z.object({
  count: z.literal(117),
  parts: z.tuple([
    z.literal("exercises.part1.json"),
    z.literal("exercises.part2.json"),
    z.literal("exercises.part3.json"),
    z.literal("exercises.part4.json"),
  ]),
});

const seedRowSchema = z.object({
  legacyId: z.string(),
  name: z.string(),
  mainLift: z.enum(["Squat", "Bench", "Deadlift", "Accessory"]),
  category: z.string(),
  progressionGroup: z.string(),
  movementPattern: z.string().nullable(),
  equipment: z.string().nullable(),
  progressionEligible: z.enum(["Yes", "No", "Optional"]),
  loadStep: z.number().nullable(),
  tier: z.number().int().min(1).max(3),
  rest: z.string().nullable(),
  capability: z.enum(["LOADED_REPS", "BODYWEIGHT_REPS", "WEIGHTED_BODYWEIGHT", "TIME"]),
  defaultMode: z.enum(["% e1RM", "Rep Target", "Double Progression"]),
  parentLift: z.enum(["Squat", "Bench", "Deadlift"]).nullable(),
  defaultRatio: z.number().nullable(),
  active: z.boolean(),
});

type SeedRow = z.infer<typeof seedRowSchema>;
type DatabaseClient = PrismaClient | Prisma.TransactionClient;

const mainLiftMap: Record<SeedRow["mainLift"], ExerciseMainLift> = {
  Squat: "SQUAT",
  Bench: "BENCH",
  Deadlift: "DEADLIFT",
  Accessory: "ACCESSORY",
};
const modeMap: Record<SeedRow["defaultMode"], ExerciseMode> = {
  "% e1RM": "PERCENT_E1RM",
  "Rep Target": "REP_TARGET",
  "Double Progression": "DOUBLE_PROGRESSION",
};
const eligibilityMap: Record<SeedRow["progressionEligible"], ProgressionEligibility> = {
  Yes: "YES",
  No: "NO",
  Optional: "OPTIONAL",
};

export async function loadExerciseSeed() {
  const seedDirectory = path.join(process.cwd(), "data", "powercoach", "seed");
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(path.join(seedDirectory, "exercises.manifest.json"), "utf8")),
  );
  const parts = await Promise.all(
    manifest.parts.map(async (part) =>
      z.array(seedRowSchema).parse(JSON.parse(await readFile(path.join(seedDirectory, part), "utf8"))),
    ),
  );
  const rows = parts.flat();
  const names = rows.map((row) => normalizeExerciseName(row.name));
  if (rows.length !== manifest.count || new Set(names).size !== rows.length) {
    throw new ExerciseLibraryError("Exercise seed must contain exactly 117 unique normalized names.", "INVALID_SEED");
  }
  return rows;
}

export function mapSeedExercise(athleteId: string, row: SeedRow): Prisma.ExerciseCreateManyInput {
  return {
    athleteId,
    legacyId: row.legacyId,
    name: row.name,
    normalizedName: normalizeExerciseName(row.name),
    mainLift: mainLiftMap[row.mainLift],
    category: row.category,
    movementPattern: row.movementPattern || null,
    equipment: row.equipment || null,
    capability: row.capability as ExerciseCapability,
    defaultMode: modeMap[row.defaultMode],
    active: row.active,
    parentLift: row.parentLift ? mainLiftMap[row.parentLift] : null,
    progressionGroup: row.progressionGroup || null,
    progressionEligibility: eligibilityMap[row.progressionEligible],
    loadStepKg: row.loadStep,
    tier: row.tier,
    restText: row.rest || null,
    seedRatio: row.defaultRatio,
    source: "SEEDED",
  };
}

export async function seedAthleteExercises(database: DatabaseClient, athleteId: string) {
  const rows = await loadExerciseSeed();
  const result = await database.exercise.createMany({
    data: rows.map((row) => mapSeedExercise(athleteId, row)),
    skipDuplicates: true,
  });
  return { inserted: result.count, expected: rows.length };
}

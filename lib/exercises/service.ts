import { Prisma, type PrismaClient } from "@prisma/client";

import { ExerciseLibraryError } from "@/lib/exercises/errors";
import { normalizeExerciseName } from "@/lib/exercises/normalize-name";
import { ExerciseRepository } from "@/lib/exercises/repository";
import type { ExerciseInput, ExerciseListQuery, ExerciseUpdateInput } from "@/lib/exercises/schema";
import { seedAthleteExercises } from "@/lib/exercises/seed";

function translateDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ExerciseLibraryError(
      "An exercise with this normalized name already exists for the athlete, including archived exercises.",
      "DUPLICATE_NAME",
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    throw new ExerciseLibraryError("Exercise not found.", "NOT_FOUND");
  }
  throw error;
}

export class ExerciseService {
  private readonly repository: ExerciseRepository;
  private readonly database: PrismaClient;

  constructor(database: PrismaClient) {
    this.database = database;
    this.repository = new ExerciseRepository(database);
  }

  async ensureInitialLibrary(athleteId: string) {
    return this.database.$transaction((transaction) => seedAthleteExercises(transaction, athleteId));
  }

  async list(athleteId: string, query: ExerciseListQuery) {
    await this.ensureInitialLibrary(athleteId);
    return this.repository.list(athleteId, query);
  }

  async get(athleteId: string, exerciseId: string) {
    const exercise = await this.repository.findOwned(athleteId, exerciseId);
    if (!exercise) throw new ExerciseLibraryError("Exercise not found.", "NOT_FOUND");
    return exercise;
  }

  async create(athleteId: string, input: ExerciseInput) {
    await this.ensureInitialLibrary(athleteId);
    try {
      return await this.repository.create(athleteId, input, normalizeExerciseName(input.name));
    } catch (error) {
      translateDatabaseError(error);
    }
  }

  async update(athleteId: string, exerciseId: string, input: ExerciseUpdateInput) {
    const existing = await this.get(athleteId, exerciseId);
    if (existing.movementPattern !== null && input.movementPattern === null) {
      throw new ExerciseLibraryError("Movement pattern cannot be cleared once it is known.", "INVALID_INPUT");
    }
    if (existing.equipment !== null && input.equipment === null) {
      throw new ExerciseLibraryError("Equipment cannot be cleared once it is known.", "INVALID_INPUT");
    }
    try {
      return await this.repository.update(athleteId, exerciseId, input, normalizeExerciseName(input.name));
    } catch (error) {
      translateDatabaseError(error);
    }
  }

  async duplicate(athleteId: string, exerciseId: string, name: string) {
    const source = await this.get(athleteId, exerciseId);
    try {
      return await this.database.exercise.create({
        data: {
          athleteId,
          name: name.trim(),
          normalizedName: normalizeExerciseName(name),
          mainLift: source.mainLift,
          category: source.category,
          movementPattern: source.movementPattern,
          equipment: source.equipment,
          capability: source.capability,
          defaultMode: source.defaultMode,
          active: true,
          parentLift: source.parentLift,
          progressionGroup: source.progressionGroup,
          progressionEligibility: source.progressionEligibility,
          loadStepKg: source.loadStepKg,
          tier: source.tier,
          restText: source.restText,
          seedRatio: source.seedRatio,
          notes: source.notes,
          source: "CUSTOM",
        },
      });
    } catch (error) {
      translateDatabaseError(error);
    }
  }

  async archive(athleteId: string, exerciseId: string) {
    await this.get(athleteId, exerciseId);
    return this.repository.setActive(athleteId, exerciseId, false);
  }

  async restore(athleteId: string, exerciseId: string) {
    await this.get(athleteId, exerciseId);
    return this.repository.setActive(athleteId, exerciseId, true);
  }
}

import type { Prisma, PrismaClient } from "@prisma/client";

import type { ExerciseInput, ExerciseListQuery, ExerciseUpdateInput } from "@/lib/exercises/schema";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export class ExerciseRepository {
  private readonly database: DatabaseClient;

  constructor(database: DatabaseClient) {
    this.database = database;
  }

  list(athleteId: string, query: ExerciseListQuery) {
    const active = query.archived === "include" ? undefined : query.archived === "only" ? false : true;
    const orderBy: Prisma.ExerciseOrderByWithRelationInput[] =
      query.sort === "createdAt"
        ? [{ createdAt: "desc" }]
        : query.sort === "mainLift"
          ? [{ mainLift: "asc" }, { name: "asc" }]
          : query.sort === "category"
            ? [{ category: "asc" }, { name: "asc" }]
            : [{ name: "asc" }];
    return this.database.exercise.findMany({
      where: {
        athleteId,
        active,
        mainLift: query.mainLift,
        category: query.category,
        equipment: query.equipment,
        capability: query.capability,
        progressionEligibility: query.progressionEligibility,
        ...(query.q
          ? {
              OR: ["name", "movementPattern", "progressionGroup", "equipment"].map((field) => ({
                [field]: { contains: query.q, mode: "insensitive" as const },
              })),
            }
          : {}),
      },
      orderBy,
    });
  }

  findOwned(athleteId: string, exerciseId: string) {
    return this.database.exercise.findFirst({ where: { id: exerciseId, athleteId } });
  }

  create(athleteId: string, input: ExerciseInput, normalizedName: string) {
    return this.database.exercise.create({
      data: {
        athleteId,
        ...input,
        normalizedName,
        active: input.active ?? true,
        source: "CUSTOM",
      },
    });
  }

  update(athleteId: string, exerciseId: string, input: ExerciseUpdateInput, normalizedName: string) {
    return this.database.exercise.update({
      where: { id: exerciseId, athleteId },
      data: { ...input, normalizedName },
    });
  }

  setActive(athleteId: string, exerciseId: string, active: boolean) {
    return this.database.exercise.update({ where: { id: exerciseId, athleteId }, data: { active } });
  }
}

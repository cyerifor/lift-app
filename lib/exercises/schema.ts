import { z } from "zod";

export const exerciseMainLiftSchema = z.enum(["SQUAT", "BENCH", "DEADLIFT", "ACCESSORY"]);
export const exerciseCapabilitySchema = z.enum([
  "LOADED_REPS",
  "BODYWEIGHT_REPS",
  "WEIGHTED_BODYWEIGHT",
  "TIME",
]);
export const exerciseModeSchema = z.enum(["PERCENT_E1RM", "REP_TARGET", "DOUBLE_PROGRESSION"]);
export const progressionEligibilitySchema = z.enum(["YES", "NO", "OPTIONAL"]);

const exerciseFields = {
    name: z.string().trim().min(1).max(120),
    mainLift: exerciseMainLiftSchema,
    category: z.string().trim().min(1).max(120),
    movementPattern: z.string().trim().min(1).max(120),
    equipment: z.string().trim().min(1).max(120),
    capability: exerciseCapabilitySchema,
    defaultMode: exerciseModeSchema,
    active: z.boolean().optional(),
    parentLift: exerciseMainLiftSchema.exclude(["ACCESSORY"]).nullable().optional(),
    progressionGroup: z.string().trim().min(1).max(120).nullable().optional(),
    progressionEligibility: progressionEligibilitySchema,
    loadStepKg: z.number().nonnegative().nullable().optional(),
    tier: z.number().int().min(1).max(3),
    restText: z.string().trim().max(120).nullable().optional(),
    seedRatio: z.number().positive().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
};

function capabilityRules(
  value: { defaultMode: z.infer<typeof exerciseModeSchema>; capability: z.infer<typeof exerciseCapabilitySchema>; loadStepKg?: number | null },
  context: z.RefinementCtx,
) {
    if (value.defaultMode === "PERCENT_E1RM" && value.capability !== "LOADED_REPS") {
      context.addIssue({
        code: "custom",
        path: ["defaultMode"],
        message: "% e1RM mode requires the LOADED_REPS capability.",
      });
    }
    if (value.capability === "TIME" && value.defaultMode !== "REP_TARGET") {
      context.addIssue({
        code: "custom",
        path: ["defaultMode"],
        message: "New time-based exercises must use Rep Target mode.",
      });
    }
    if (
      (value.capability === "LOADED_REPS" || value.capability === "WEIGHTED_BODYWEIGHT") &&
      (value.loadStepKg === null || value.loadStepKg === undefined || value.loadStepKg <= 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["loadStepKg"],
        message: "Loaded exercises require a positive load step.",
      });
    }
}

export const exerciseInputSchema = z.object(exerciseFields).superRefine(capabilityRules);

// Null is accepted at the PATCH boundary only so the service can preserve the five
// intentionally unknown legacy values. The service rejects clearing known metadata.
export const exerciseUpdateSchema = z
  .object({
    ...exerciseFields,
    movementPattern: z.string().trim().min(1).max(120).nullable(),
    equipment: z.string().trim().min(1).max(120).nullable(),
  })
  .superRefine(capabilityRules);

export const exerciseListQuerySchema = z.object({
  athleteId: z.string().min(1).optional(),
  q: z.string().trim().optional(),
  mainLift: exerciseMainLiftSchema.optional(),
  category: z.string().trim().optional(),
  equipment: z.string().trim().optional(),
  capability: exerciseCapabilitySchema.optional(),
  progressionEligibility: progressionEligibilitySchema.optional(),
  archived: z.enum(["exclude", "only", "include"]).default("exclude"),
  sort: z.enum(["name", "mainLift", "category", "createdAt"]).default("name"),
});

export const duplicateExerciseSchema = z.object({ name: z.string().trim().min(1).max(120) });
export const athleteTargetSchema = z.object({ athleteId: z.string().min(1).optional() });

export type ExerciseInput = z.infer<typeof exerciseInputSchema>;
export type ExerciseUpdateInput = z.infer<typeof exerciseUpdateSchema>;
export type ExerciseListQuery = z.infer<typeof exerciseListQuerySchema>;

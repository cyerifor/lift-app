import { z } from "zod";

const nullableId = z.string().trim().min(1).nullable();
const strength = z.object({
  loadKg: z.number().positive().max(1000),
  reps: z.number().int().min(1).max(8),
  rpe: z.number().min(7).max(10).refine((value) => Number.isInteger(value * 2), "RPE must use 0.5 increments"),
}).nullable();

export const athleteSettingsInputSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  displayUnits: z.enum(["METRIC", "IMPERIAL"]),
  bodyweightKg: z.number().positive().max(500).nullable(),
  defaultLoadStepKg: z.number().positive().max(100),
  readinessEnabled: z.boolean(),
  sessionsPerWeek: z.number().int().min(1).max(7),
  trainingDays: z.array(z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])).max(7),
  prepFocusAreas: z.array(z.string().trim().min(1).max(60)).max(3),
  prepBudgetMinutes: z.number().int().min(0).max(120),
  references: z.object({ squat: nullableId, bench: nullableId, deadlift: nullableId }),
  startingStrengths: z.object({ squat: strength, bench: strength, deadlift: strength }),
}).superRefine((value, context) => {
  if (new Set(value.trainingDays).size !== value.trainingDays.length) {
    context.addIssue({ code: "custom", path: ["trainingDays"], message: "Training days must be unique" });
  }
  if (value.trainingDays.length !== value.sessionsPerWeek) {
    context.addIssue({ code: "custom", path: ["trainingDays"], message: "Select one training day for each weekly session" });
  }
});

export type AthleteSettingsInput = z.infer<typeof athleteSettingsInputSchema>;

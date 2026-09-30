import { z } from "zod";

export const prescriptionModes = ["PERCENT_E1RM", "PERCENT_RPE", "RPE", "DOUBLE_PROGRESSION", "FIXED_LOAD", "REP_TARGET", "BODYWEIGHT", "TIME", "MANUAL"] as const;
export const repSchemes = ["FIXED", "RANGE", "AMRAP"] as const;
const nullableNumber = z.number().finite().nonnegative().nullable().optional();

export const exerciseSlotPrescriptionSchema = z.object({
  exerciseId: z.string().min(1), setType: z.string().trim().min(1).max(80),
  prescriptionMode: z.enum(prescriptionModes), repScheme: z.enum(repSchemes).nullable().optional(),
  repMin: z.number().int().positive().nullable().optional(), repMax: z.number().int().positive().nullable().optional(),
  rpeMin: z.number().min(1).max(10).nullable().optional(), rpeMax: z.number().min(1).max(10).nullable().optional(),
  rpeCap: z.number().min(1).max(10).nullable().optional(), pctMin: z.number().positive().max(1.5).nullable().optional(),
  pctMax: z.number().positive().max(1.5).nullable().optional(), setCount: z.number().int().min(1).max(100),
  fixedLoadKg: nullableNumber, capabilityOverride: z.enum(["LOADED_REPS", "BODYWEIGHT_REPS", "WEIGHTED_BODYWEIGHT", "TIME"]).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  referenceE1rmKg: nullableNumber, referenceSource: z.string().nullable().optional(), variationRatioUsed: nullableNumber,
  suggestedLoadMinKg: nullableNumber, suggestedLoadMaxKg: nullableNumber, suggestedLoadKg: nullableNumber, loadReason: z.string().nullable().optional(),
}).superRefine((value, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (value.repMin != null && value.repMax != null && value.repMin > value.repMax) issue("repMin", "repMin must not exceed repMax");
  if (value.rpeMin != null && value.rpeMax != null && value.rpeMin > value.rpeMax) issue("rpeMin", "rpeMin must not exceed rpeMax");
  if (value.pctMin != null && value.pctMax != null && value.pctMin > value.pctMax) issue("pctMin", "pctMin must not exceed pctMax");
  const reps = value.repScheme === "AMRAP" || value.repMin != null || value.repMax != null;
  const rpe = value.rpeMin != null || value.rpeMax != null;
  const pct = value.pctMin != null || value.pctMax != null;
  if ((value.prescriptionMode === "PERCENT_E1RM" || value.prescriptionMode === "PERCENT_RPE") && !pct) issue("pctMin", "percentage prescription is required");
  if ((value.prescriptionMode === "RPE" || value.prescriptionMode === "PERCENT_RPE") && !rpe) issue("rpeMin", "RPE prescription is required");
  if (value.prescriptionMode === "DOUBLE_PROGRESSION" && !(value.repScheme === "RANGE" && value.repMin != null && value.repMax != null && value.repMin < value.repMax)) issue("repScheme", "Double Progression requires a proper rep range");
  if (value.prescriptionMode === "FIXED_LOAD" && value.fixedLoadKg == null) issue("fixedLoadKg", "Fixed Load requires fixedLoadKg");
  if (value.prescriptionMode === "REP_TARGET" && !reps) issue("repMin", "Rep Target requires a rep prescription");
  if (value.prescriptionMode === "TIME" && (reps || value.repScheme != null)) issue("repMin", "Time prescriptions must not prescribe reps");
});
export type ExerciseSlotPrescriptionInput = z.infer<typeof exerciseSlotPrescriptionSchema>;

export const createBlockSchema = z.object({ athleteId: z.string().min(1), name: z.string().trim().min(1).max(120), phase: z.string().trim().max(80).nullable().optional(), startDate: z.coerce.date(), weekCount: z.number().int().min(1).max(52), sessionsPerWeek: z.number().int().min(1).max(7), deloadType: z.string().nullable().optional(), intensityTrend: z.string().nullable().optional(), volumeTrend: z.string().nullable().optional(), applyProgression: z.boolean().default(false), notes: z.string().max(4000).nullable().optional() });
export const updateBlockSchema = createBlockSchema.pick({ name: true, phase: true, deloadType: true, intensityTrend: true, volumeTrend: true, applyProgression: true, notes: true }).partial();
export const updateSessionSchema = z.object({ title: z.string().trim().min(1).max(120).optional(), notes: z.string().max(2000).nullable().optional(), trainingDay: z.string().trim().min(1).optional(), scheduledAt: z.coerce.date().optional() });

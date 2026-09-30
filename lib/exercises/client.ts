import { exerciseInputSchema, type ExerciseInput } from "@/lib/exercises/schema";

export type ExerciseRecord = Omit<ExerciseInput, "movementPattern" | "equipment"> & {
  movementPattern: string | null;
  equipment: string | null;
  id: string;
  athleteId: string;
  normalizedName: string;
  source: "SEEDED" | "CUSTOM" | "IMPORTED";
  createdAt: string;
  updatedAt: string;
};

export type ExerciseFieldErrors = Partial<Record<keyof ExerciseInput, string>>;

export function validateExercise(input: ExerciseInput) {
  const parsed = exerciseInputSchema.safeParse(input);
  if (parsed.success) return { data: parsed.data, errors: {} as ExerciseFieldErrors };
  const errors: ExerciseFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof ExerciseInput;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { data: null, errors };
}

export async function readApiError(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { error?: string; details?: { path: string; message: string }[] }
    | null;
  return {
    message: body?.error || "Something went wrong. Please try again.",
    fieldErrors: Object.fromEntries((body?.details || []).map((detail) => [detail.path, detail.message])) as ExerciseFieldErrors,
  };
}

export function exerciseQuery(athleteId?: string) {
  return athleteId ? `?athleteId=${encodeURIComponent(athleteId)}` : "";
}

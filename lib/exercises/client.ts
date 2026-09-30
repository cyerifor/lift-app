import { exerciseInputSchema, exerciseUpdateSchema, type ExerciseInput, type ExerciseUpdateInput } from "@/lib/exercises/schema";

export type ExerciseRecord = Omit<ExerciseInput, "movementPattern" | "equipment" | "active"> & {
  movementPattern: string | null;
  equipment: string | null;
  active: boolean;
  id: string;
  athleteId: string;
  normalizedName: string;
  source: "SEEDED" | "CUSTOM" | "IMPORTED";
  createdAt: string;
  updatedAt: string;
};

export type ExerciseFieldErrors = Partial<Record<keyof ExerciseInput, string>>;

export function validateExercise(input: ExerciseInput | ExerciseUpdateInput, editing = false) {
  const parsed = (editing ? exerciseUpdateSchema : exerciseInputSchema).safeParse(input);
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

export async function exerciseRequest<T>(path: string, athleteId?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${path}${exerciseQuery(athleteId)}`, init);
  if (!response.ok) throw await readApiError(response);
  return response.json() as Promise<T>;
}

export function listExercises(athleteId?: string) {
  return exerciseRequest<ExerciseRecord[]>("/api/exercises", athleteId);
}

export function saveExercise(input: ExerciseInput | ExerciseUpdateInput, athleteId?: string, exerciseId?: string) {
  return exerciseRequest<ExerciseRecord>(exerciseId ? `/api/exercises/${exerciseId}` : "/api/exercises", athleteId, {
    method: exerciseId ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function setExerciseArchived(exerciseId: string, archived: boolean, athleteId?: string) {
  return exerciseRequest<ExerciseRecord>(`/api/exercises/${exerciseId}/${archived ? "archive" : "restore"}`, athleteId, { method: "POST" });
}

export function duplicateExercise(exerciseId: string, name: string, athleteId?: string) {
  return exerciseRequest<ExerciseRecord>(`/api/exercises/${exerciseId}/duplicate`, athleteId, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
  });
}

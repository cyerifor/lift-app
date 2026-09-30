import rpeGrid from "@/data/powercoach/seed/rpe-grid.json";

export const SUPPORTED_REPS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const SUPPORTED_RPES = [7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

const percentages = new Map(
  rpeGrid.flatMap(([rpe, ...values]) =>
    values.map((percentage, index) => [`${rpe}:${index + 1}`, percentage] as const),
  ),
);

/** Returns undefined rather than extrapolating beyond the authoritative grid. */
export function rpePercentage(reps: number, rpe: number): number | undefined {
  return percentages.get(`${rpe}:${reps}`);
}

/** Canonical values are kilograms; unit conversion belongs at the UI boundary. */
export function calculateE1rmKg(loadKg: number, reps: number, rpe: number): number | undefined {
  if (!Number.isFinite(loadKg) || loadKg <= 0) return undefined;
  const percentage = rpePercentage(reps, rpe);
  return percentage === undefined ? undefined : loadKg / percentage;
}

export function kgToLb(kg: number) {
  return kg * 2.2046226218;
}

export function lbToKg(lb: number) {
  return lb / 2.2046226218;
}

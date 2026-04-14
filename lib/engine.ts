export type ProgressionMode = "% Only" | "RPE Only" | "% + RPE";
export type Trend = "Linear Up" | "Linear Down" | "Wave" | "Flat";
export type MainLift = "squat" | "bench" | "deadlift";

export type EngineConfig = {
  progressionMode: ProgressionMode;
  weeklyProgression: Record<MainLift, number>;
  trainingMaxes: Record<MainLift, number>;
  e1rms: Record<MainLift, number>;
  slopes: Record<MainLift, number>;
  defaultRoundingKg: number;
  intTrendMain: Trend;
  volTrendMain: Trend;
  rpeStepMain: number;
  setStepMain: number;
  rpeCapMain: number;
  setCapMain: number;
  intTrendVar: Trend;
  volTrendVar: Trend;
  rpeStepVar: number;
  setStepVar: number;
  rpeCapVar: number;
  setCapVar: number;
  intTrendAcc: Trend;
  volTrendAcc: Trend;
  rpeStepAcc: number;
  setStepAcc: number;
  rpeCapAcc: number;
  setCapAcc: number;
  waveLoading: boolean;
  applyProgVar: boolean;
};

export type Week1ExerciseTemplate = {
  exerciseTemplateId?: string | null;
  name: string;
  mainLift: MainLift | "accessory";
  category: string;
  progressionGroup: "main" | "variation" | "accessory";
  exerciseType: "Top Set" | "Backdown" | "Accessory";
  targetSets: number;
  repsDisplay: string;
  rpeDisplay: string;
  weeklyPercent: number | null;
  roundingKg: number | null;
  progEligible: boolean;
};

export function roundToIncrement(value: number, increment = 2.5) {
  if (increment <= 0) return value;
  return Math.round(value / increment) * increment;
}

function parseRepRange(repsDisplay: string) {
  const cleaned = repsDisplay.trim();
  if (!cleaned) return { low: 1, high: 1 };
  if (cleaned.includes("-")) {
    const [a, b] = cleaned.split("-").map((v) => Number(v.trim()));
    if (Number.isFinite(a) && Number.isFinite(b)) return { low: a, high: b };
  }
  const single = Number(cleaned);
  if (Number.isFinite(single)) return { low: single, high: single };
  return { low: 1, high: 1 };
}

function parseRpeRange(rpeDisplay: string) {
  const cleaned = rpeDisplay.trim();
  if (!cleaned) return { low: 7, high: 7 };
  if (cleaned.includes("-")) {
    const [a, b] = cleaned.split("-").map((v) => Number(v.trim()));
    if (Number.isFinite(a) && Number.isFinite(b)) return { low: a, high: b };
  }
  const single = Number(cleaned);
  if (Number.isFinite(single)) return { low: single, high: single };
  return { low: 7, high: 7 };
}

export function rpeToPercentage(reps: number, rpe: number, slope = -0.0735) {
  const effectiveReps = Math.max(1, reps + (10 - rpe));
  const pct = 1 + slope * Math.log(effectiveReps);
  return Math.max(0.45, Math.min(1.05, pct));
}

export function calcE1RM(weight: number, reps: number, rpe: number, slope = -0.0735, rounding = 2.5) {
  const pct = rpeToPercentage(reps, rpe, slope);
  const raw = pct <= 0 ? weight : weight / pct;
  return roundToIncrement(raw, rounding);
}

export function suggestedLoad(base1RM: number, reps: number, rpe: number, slope = -0.0735, rounding = 2.5) {
  const pct = rpeToPercentage(reps, rpe, slope);
  return roundToIncrement(base1RM * pct, rounding);
}

export function applyIntensityTrend(trend: Trend, week: number, baseRpe: number, step: number, cap: number) {
  if (week <= 1 || trend === "Flat") return Math.min(baseRpe, cap);
  const idx = week - 1;
  let adjusted = baseRpe;

  if (trend === "Linear Up") adjusted = baseRpe + step * idx;
  if (trend === "Linear Down") adjusted = baseRpe - step * idx;
  if (trend === "Wave") {
    const waveStep = idx % 3 === 1 ? step : idx % 3 === 2 ? 0 : -step;
    adjusted = baseRpe + waveStep;
  }

  return Math.min(cap, Math.max(5, adjusted));
}

export function applyVolumeTrend(trend: Trend, week: number, baseSets: number, cap: number, step: number) {
  if (week <= 1 || trend === "Flat") return Math.min(baseSets, cap);
  const idx = week - 1;
  let adjusted = baseSets;

  if (trend === "Linear Up") adjusted = baseSets + step * idx;
  if (trend === "Linear Down") adjusted = baseSets - step * idx;
  if (trend === "Wave") {
    const waveStep = idx % 3 === 1 ? step : idx % 3 === 2 ? 0 : -step;
    adjusted = baseSets + waveStep;
  }

  return Math.max(1, Math.min(cap, Math.round(adjusted)));
}

export function calcSuggestedRange(
  mode: ProgressionMode,
  mainLift: MainLift,
  repsDisplay: string,
  rpeDisplay: string,
  config: EngineConfig,
  weekNumber: number,
  weeklyPercent: number | null,
  roundingKg: number | null,
) {
  const reps = parseRepRange(repsDisplay);
  const rpe = parseRpeRange(rpeDisplay);
  const rounding = roundingKg ?? config.defaultRoundingKg;
  const slope = config.slopes[mainLift];
  const baseTm = config.trainingMaxes[mainLift];
  const baseE1rm = config.e1rms[mainLift] > 0 ? config.e1rms[mainLift] : baseTm;
  const progression = 1 + config.weeklyProgression[mainLift] * (weekNumber - 1);
  const explicitPercent = weeklyPercent ?? 1;

  const percentOnlyLow = roundToIncrement(baseTm * progression * explicitPercent * 0.97, rounding);
  const percentOnlyHigh = roundToIncrement(baseTm * progression * explicitPercent * 1.03, rounding);

  const rpeOnlyLow = suggestedLoad(baseE1rm * progression, reps.high, rpe.low, slope, rounding);
  const rpeOnlyHigh = suggestedLoad(baseE1rm * progression, reps.low, rpe.high, slope, rounding);

  if (mode === "% Only") return { lo: percentOnlyLow, hi: percentOnlyHigh };
  if (mode === "RPE Only") return { lo: Math.min(rpeOnlyLow, rpeOnlyHigh), hi: Math.max(rpeOnlyLow, rpeOnlyHigh) };

  const combinedLow = roundToIncrement(percentOnlyLow * rpeToPercentage(reps.high, rpe.low, slope), rounding);
  const combinedHigh = roundToIncrement(percentOnlyHigh * rpeToPercentage(reps.low, rpe.high, slope), rounding);
  return { lo: Math.min(combinedLow, combinedHigh), hi: Math.max(combinedLow, combinedHigh) };
}

export function calibrateSlope(knownMax: number, refWeight: number, refReps: number, refRpe: number) {
  if (knownMax <= 0 || refWeight <= 0) return -0.0735;
  const effectiveReps = Math.max(1, refReps + (10 - refRpe));
  const ratio = refWeight / knownMax;
  if (ratio <= 0) return -0.0735;
  return (ratio - 1) / Math.log(effectiveReps);
}

export function buildRpeTable(slope = -0.0735) {
  const rows: Array<{ reps: number; values: Record<string, number> }> = [];
  for (let reps = 1; reps <= 12; reps++) {
    const values: Record<string, number> = {};
    for (const rpe of [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]) {
      values[String(rpe)] = Number((rpeToPercentage(reps, rpe, slope) * 100).toFixed(2));
    }
    rows.push({ reps, values });
  }
  return rows;
}

export function generateWeekExercises(
  week1Template: Week1ExerciseTemplate[],
  weekNumber: number,
  config: EngineConfig,
) {
  return week1Template.map((exercise) => {
    const rpeRange = parseRpeRange(exercise.rpeDisplay);
    const group = exercise.progressionGroup;

    const intTrend = group === "main" ? config.intTrendMain : group === "variation" ? config.intTrendVar : config.intTrendAcc;
    const volTrend = group === "main" ? config.volTrendMain : group === "variation" ? config.volTrendVar : config.volTrendAcc;
    const rpeStep = group === "main" ? config.rpeStepMain : group === "variation" ? config.rpeStepVar : config.rpeStepAcc;
    const setStep = group === "main" ? config.setStepMain : group === "variation" ? config.setStepVar : config.setStepAcc;
    const rpeCap = group === "main" ? config.rpeCapMain : group === "variation" ? config.rpeCapVar : config.rpeCapAcc;
    const setCap = group === "main" ? config.setCapMain : group === "variation" ? config.setCapVar : config.setCapAcc;

    const rpeLow = applyIntensityTrend(intTrend, weekNumber, rpeRange.low, rpeStep, rpeCap);
    const rpeHigh = applyIntensityTrend(intTrend, weekNumber, rpeRange.high, rpeStep, rpeCap);
    const targetSets = applyVolumeTrend(volTrend, weekNumber, exercise.targetSets, setCap, setStep);
    const rpeDisplay = Number.isInteger(rpeLow) && Number.isInteger(rpeHigh)
      ? `${rpeLow}-${rpeHigh}`
      : `${rpeLow.toFixed(1)}-${rpeHigh.toFixed(1)}`;

    let suggested: { lo: number; hi: number } | null = null;
    if (exercise.mainLift !== "accessory" && exercise.progEligible) {
      suggested = calcSuggestedRange(
        config.progressionMode,
        exercise.mainLift,
        exercise.repsDisplay,
        rpeDisplay,
        config,
        weekNumber,
        exercise.weeklyPercent,
        exercise.roundingKg,
      );
    }

    return {
      ...exercise,
      targetSets,
      rpeDisplay,
      suggestedLoKg: suggested?.lo ?? null,
      suggestedHiKg: suggested?.hi ?? null,
    };
  });
}

import { loadExerciseSeed } from "../lib/exercises/seed.ts";

const rows = await loadExerciseSeed();
const count = (key: "mainLift" | "capability" | "defaultMode" | "progressionEligible", value: string) =>
  rows.filter((row) => row[key] === value).length;

const expected = {
  total: 117,
  accessory: 77,
  bench: 15,
  squat: 14,
  deadlift: 11,
  loadedReps: 83,
  bodyweightReps: 21,
  weightedBodyweight: 2,
  time: 11,
  percentE1rm: 30,
  repTarget: 60,
  doubleProgression: 27,
  eligibleYes: 57,
  eligibleNo: 57,
  eligibleOptional: 3,
};

const actual = {
  total: rows.length,
  accessory: count("mainLift", "Accessory"),
  bench: count("mainLift", "Bench"),
  squat: count("mainLift", "Squat"),
  deadlift: count("mainLift", "Deadlift"),
  loadedReps: count("capability", "LOADED_REPS"),
  bodyweightReps: count("capability", "BODYWEIGHT_REPS"),
  weightedBodyweight: count("capability", "WEIGHTED_BODYWEIGHT"),
  time: count("capability", "TIME"),
  percentE1rm: count("defaultMode", "% e1RM"),
  repTarget: count("defaultMode", "Rep Target"),
  doubleProgression: count("defaultMode", "Double Progression"),
  eligibleYes: count("progressionEligible", "Yes"),
  eligibleNo: count("progressionEligible", "No"),
  eligibleOptional: count("progressionEligible", "Optional"),
};

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error("PowerCoach exercise seed audit failed", { expected, actual });
  process.exit(1);
}

console.log(`Validated ${rows.length} PowerCoach exercise seed rows.`);

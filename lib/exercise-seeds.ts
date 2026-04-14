export type ExerciseSeed = {
  name: string;
  mainLift: "squat" | "bench" | "deadlift" | "accessory";
  category: string;
  progressionGroup: "main" | "variation" | "accessory";
  movementPattern: string;
  equipment: string;
  tier: 1 | 2 | 3;
  roundingKg: number;
  progEligible: boolean;
};

export const EXERCISE_SEEDS: ExerciseSeed[] = [
  { name: "Competition Squat", mainLift: "squat", category: "Primary Variation", progressionGroup: "main", movementPattern: "Squat", equipment: "Barbell", tier: 1, roundingKg: 2.5, progEligible: true },
  { name: "Paused Squat", mainLift: "squat", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Squat", equipment: "Barbell", tier: 1, roundingKg: 2.5, progEligible: true },
  { name: "Tempo Squat", mainLift: "squat", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Squat", equipment: "Barbell", tier: 2, roundingKg: 2.5, progEligible: true },
  { name: "Front Squat", mainLift: "squat", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Squat", equipment: "Barbell", tier: 2, roundingKg: 2.5, progEligible: true },
  { name: "High Bar Squat", mainLift: "squat", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Squat", equipment: "Barbell", tier: 2, roundingKg: 2.5, progEligible: true },
  { name: "Pin Squat", mainLift: "squat", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Squat", equipment: "Barbell", tier: 3, roundingKg: 2.5, progEligible: true },
  { name: "Competition Bench", mainLift: "bench", category: "Primary Variation", progressionGroup: "main", movementPattern: "Horizontal Press", equipment: "Barbell", tier: 1, roundingKg: 2.5, progEligible: true },
  { name: "Paused Bench", mainLift: "bench", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Horizontal Press", equipment: "Barbell", tier: 1, roundingKg: 2.5, progEligible: true },
  { name: "Spoto Press", mainLift: "bench", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Horizontal Press", equipment: "Barbell", tier: 2, roundingKg: 2.5, progEligible: true },
  { name: "Close Grip Bench", mainLift: "bench", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Horizontal Press", equipment: "Barbell", tier: 2, roundingKg: 2.5, progEligible: true },
  { name: "Incline Bench", mainLift: "bench", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Horizontal Press", equipment: "Barbell", tier: 2, roundingKg: 2.5, progEligible: false },
  { name: "Larsen Press", mainLift: "bench", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Horizontal Press", equipment: "Barbell", tier: 3, roundingKg: 2.5, progEligible: true },
  { name: "Competition Deadlift", mainLift: "deadlift", category: "Primary Variation", progressionGroup: "main", movementPattern: "Hinge", equipment: "Barbell", tier: 1, roundingKg: 2.5, progEligible: true },
  { name: "Paused Deadlift", mainLift: "deadlift", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Hinge", equipment: "Barbell", tier: 1, roundingKg: 2.5, progEligible: true },
  { name: "Deficit Deadlift", mainLift: "deadlift", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Hinge", equipment: "Barbell", tier: 2, roundingKg: 2.5, progEligible: true },
  { name: "Block Pull", mainLift: "deadlift", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Hinge", equipment: "Barbell", tier: 2, roundingKg: 2.5, progEligible: true },
  { name: "Romanian Deadlift", mainLift: "deadlift", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Hinge", equipment: "Barbell", tier: 2, roundingKg: 2.5, progEligible: false },
  { name: "Snatch Grip Deadlift", mainLift: "deadlift", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Hinge", equipment: "Barbell", tier: 3, roundingKg: 2.5, progEligible: true },
  { name: "Leg Press", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Squat", equipment: "Machine", tier: 1, roundingKg: 5, progEligible: false },
  { name: "Bulgarian Split Squat", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Squat", equipment: "Dumbbell", tier: 1, roundingKg: 2.5, progEligible: false },
  { name: "Hack Squat", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Squat", equipment: "Machine", tier: 2, roundingKg: 5, progEligible: false },
  { name: "Walking Lunge", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Squat", equipment: "Dumbbell", tier: 2, roundingKg: 2.5, progEligible: false },
  { name: "Leg Extension", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Knee Extension", equipment: "Machine", tier: 1, roundingKg: 5, progEligible: false },
  { name: "Lying Leg Curl", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Knee Flexion", equipment: "Machine", tier: 1, roundingKg: 5, progEligible: false },
  { name: "Chest Supported Row", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Horizontal Pull", equipment: "Machine", tier: 1, roundingKg: 2.5, progEligible: false },
  { name: "Barbell Row", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Horizontal Pull", equipment: "Barbell", tier: 2, roundingKg: 2.5, progEligible: false },
  { name: "Lat Pulldown", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Vertical Pull", equipment: "Cable", tier: 1, roundingKg: 2.5, progEligible: false },
  { name: "Pull-Up", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Vertical Pull", equipment: "Bodyweight", tier: 2, roundingKg: 2.5, progEligible: false },
  { name: "Seated Cable Row", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Horizontal Pull", equipment: "Cable", tier: 1, roundingKg: 2.5, progEligible: false },
  { name: "Dumbbell Fly", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Chest Isolation", equipment: "Dumbbell", tier: 2, roundingKg: 2.5, progEligible: false },
  { name: "Cable Fly", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Chest Isolation", equipment: "Cable", tier: 2, roundingKg: 2.5, progEligible: false },
  { name: "DB Shoulder Press", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Vertical Press", equipment: "Dumbbell", tier: 1, roundingKg: 2.5, progEligible: false },
  { name: "Lateral Raise", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Shoulder Isolation", equipment: "Dumbbell", tier: 1, roundingKg: 1, progEligible: false },
  { name: "Rear Delt Fly", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Shoulder Isolation", equipment: "Machine", tier: 1, roundingKg: 1, progEligible: false },
  { name: "Triceps Pushdown", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Elbow Extension", equipment: "Cable", tier: 1, roundingKg: 1, progEligible: false },
  { name: "Skull Crushers", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Elbow Extension", equipment: "EZ Bar", tier: 2, roundingKg: 1, progEligible: false },
  { name: "EZ Bar Curl", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Elbow Flexion", equipment: "EZ Bar", tier: 1, roundingKg: 1, progEligible: false },
  { name: "Hammer Curl", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Elbow Flexion", equipment: "Dumbbell", tier: 1, roundingKg: 1, progEligible: false },
  { name: "Calf Raise", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Plantar Flexion", equipment: "Machine", tier: 1, roundingKg: 2.5, progEligible: false },
  { name: "Plank", mainLift: "accessory", category: "Core", progressionGroup: "accessory", movementPattern: "Anti-Extension", equipment: "Bodyweight", tier: 1, roundingKg: 1, progEligible: false },
  { name: "Hanging Leg Raise", mainLift: "accessory", category: "Core", progressionGroup: "accessory", movementPattern: "Trunk Flexion", equipment: "Bodyweight", tier: 2, roundingKg: 1, progEligible: false },
  { name: "Cable Crunch", mainLift: "accessory", category: "Core", progressionGroup: "accessory", movementPattern: "Trunk Flexion", equipment: "Cable", tier: 1, roundingKg: 2.5, progEligible: false },
  { name: "Pallof Press", mainLift: "accessory", category: "Core", progressionGroup: "accessory", movementPattern: "Anti-Rotation", equipment: "Cable", tier: 2, roundingKg: 1, progEligible: false },
  { name: "Back Extension", mainLift: "accessory", category: "Rehab", progressionGroup: "accessory", movementPattern: "Spinal Extension", equipment: "Bodyweight", tier: 1, roundingKg: 2.5, progEligible: false },
  { name: "Nordic Curl", mainLift: "accessory", category: "Rehab", progressionGroup: "accessory", movementPattern: "Hamstring", equipment: "Bodyweight", tier: 2, roundingKg: 1, progEligible: false },
  { name: "Copenhagen Plank", mainLift: "accessory", category: "Rehab", progressionGroup: "accessory", movementPattern: "Adductor", equipment: "Bodyweight", tier: 2, roundingKg: 1, progEligible: false },
  { name: "Banded Face Pull", mainLift: "accessory", category: "Rehab", progressionGroup: "accessory", movementPattern: "Scapular Retraction", equipment: "Band", tier: 1, roundingKg: 1, progEligible: false },
  { name: "Single-Leg RDL", mainLift: "accessory", category: "Rehab", progressionGroup: "accessory", movementPattern: "Hinge", equipment: "Dumbbell", tier: 2, roundingKg: 1, progEligible: false },
  { name: "Goblet Squat", mainLift: "accessory", category: "Rehab", progressionGroup: "accessory", movementPattern: "Squat", equipment: "Dumbbell", tier: 1, roundingKg: 1, progEligible: false },
  { name: "DB Bench", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Horizontal Press", equipment: "Dumbbell", tier: 1, roundingKg: 2.5, progEligible: false },
  { name: "Machine Chest Press", mainLift: "accessory", category: "Hypertrophy Accessory", progressionGroup: "accessory", movementPattern: "Horizontal Press", equipment: "Machine", tier: 1, roundingKg: 2.5, progEligible: false },
  { name: "Good Morning", mainLift: "accessory", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Hinge", equipment: "Barbell", tier: 3, roundingKg: 2.5, progEligible: true },
  { name: "Pin Bench", mainLift: "bench", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Horizontal Press", equipment: "Barbell", tier: 3, roundingKg: 2.5, progEligible: true },
  { name: "Anderson Squat", mainLift: "squat", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Squat", equipment: "Barbell", tier: 3, roundingKg: 2.5, progEligible: true },
  { name: "Trap Bar Deadlift", mainLift: "deadlift", category: "Secondary Variation", progressionGroup: "variation", movementPattern: "Hinge", equipment: "Trap Bar", tier: 2, roundingKg: 2.5, progEligible: true },
];

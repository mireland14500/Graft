// Single source of truth for what each sport asks the athlete and what it can project.
// Shared by the onboarding wizard (client), the matcher and the progress page (server).

export const SPORTS = ["POWERLIFTING", "HYROX", "CROSSFIT", "BODYBUILDING", "RUNNING", "YOGA", "PILATES"] as const;
export type Sport = (typeof SPORTS)[number];

export const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export type Level = (typeof LEVELS)[number];

/** How a benchmark tends to improve with training — selects the rate table in projections.ts. */
export type ProgressModel = "strength" | "endurance" | "hyrox" | "metcon" | "bodyweight";

export interface BenchmarkDef {
  key: string;
  label: string;
  /** kg → stored in kg; time → stored in seconds */
  unit: "kg" | "time";
  better: "higher" | "lower";
  model: ProgressModel;
  /** Lift-specific multiplier on the base rate (bench and Olympic lifts progress slower). */
  rateFactor?: number;
  optional?: boolean;
  placeholder: string;
}

export interface SportDef {
  id: Sport;
  name: string;
  tagline: string;
  goals: { id: string; label: string }[];
  benchmarks: BenchmarkDef[];
}

const squat: BenchmarkDef = { key: "squat_1rm", label: "Squat 1RM", unit: "kg", better: "higher", model: "strength", placeholder: "140" };
const bench: BenchmarkDef = { key: "bench_1rm", label: "Bench press 1RM", unit: "kg", better: "higher", model: "strength", rateFactor: 0.8, placeholder: "100" };
const deadlift: BenchmarkDef = { key: "deadlift_1rm", label: "Deadlift 1RM", unit: "kg", better: "higher", model: "strength", placeholder: "180" };
const run5k: BenchmarkDef = { key: "run_5k", label: "5k time", unit: "time", better: "lower", model: "endurance", placeholder: "25:00" };

export const SPORT_DEFS: Record<Sport, SportDef> = {
  POWERLIFTING: {
    id: "POWERLIFTING",
    name: "Powerlifting",
    tagline: "Build a bigger squat, bench and deadlift.",
    goals: [
      { id: "increase_total", label: "Increase my total" },
      { id: "meet_prep", label: "Peak for a meet" },
      { id: "weak_point", label: "Bring up a weak lift" },
    ],
    benchmarks: [squat, bench, deadlift],
  },
  HYROX: {
    id: "HYROX",
    name: "Hyrox",
    tagline: "8 × 1km runs, 8 stations, one finish time.",
    goals: [
      { id: "first_race", label: "Finish my first race" },
      { id: "pb", label: "Set a new PB" },
      { id: "doubles", label: "Train for doubles / relay" },
    ],
    benchmarks: [
      { key: "hyrox_time", label: "Hyrox finish time", unit: "time", better: "lower", model: "hyrox", optional: true, placeholder: "1:25:00" },
      { ...run5k, optional: true },
      { key: "row_1k", label: "1000m row", unit: "time", better: "lower", model: "endurance", optional: true, placeholder: "3:50" },
    ],
  },
  CROSSFIT: {
    id: "CROSSFIT",
    name: "CrossFit",
    tagline: "Strength, gymnastics and engine in one plan.",
    goals: [
      { id: "general_fitness", label: "Get fitter all round" },
      { id: "open_prep", label: "Prepare for the Open" },
      { id: "strength_bias", label: "Get stronger for WODs" },
    ],
    benchmarks: [
      { ...squat, key: "back_squat_1rm", label: "Back squat 1RM" },
      { key: "clean_jerk_1rm", label: "Clean & jerk 1RM", unit: "kg", better: "higher", model: "strength", rateFactor: 0.9, placeholder: "90" },
      { key: "fran", label: "Fran time", unit: "time", better: "lower", model: "metcon", optional: true, placeholder: "6:30" },
      { key: "row_2k", label: "2000m row", unit: "time", better: "lower", model: "endurance", optional: true, placeholder: "7:45" },
    ],
  },
  BODYBUILDING: {
    id: "BODYBUILDING",
    name: "Bodybuilding",
    tagline: "Hypertrophy-focused splits for size and shape.",
    goals: [
      { id: "build_muscle", label: "Build muscle (lean bulk)" },
      { id: "recomp", label: "Recomposition" },
      { id: "cut", label: "Get lean (cut)" },
    ],
    benchmarks: [
      { key: "bodyweight", label: "Bodyweight", unit: "kg", better: "higher", model: "bodyweight", placeholder: "80" },
      { ...bench, optional: true },
      { ...squat, optional: true },
    ],
  },
  RUNNING: {
    id: "RUNNING",
    name: "Running",
    tagline: "From first 5k to marathon PB.",
    goals: [
      { id: "faster_5k", label: "Run a faster 5k" },
      { id: "first_half", label: "Run a half marathon" },
      { id: "marathon", label: "Run a marathon" },
    ],
    benchmarks: [
      run5k,
      { key: "run_10k", label: "10k time", unit: "time", better: "lower", model: "endurance", optional: true, placeholder: "52:00" },
    ],
  },
  // Yoga and Pilates are tracked by consistency rather than a number, so they have no benchmarks.
  YOGA: {
    id: "YOGA",
    name: "Yoga",
    tagline: "Mobility, recovery and calm — on its own or alongside your main plan.",
    goals: [
      { id: "mobility", label: "Move better and loosen up" },
      { id: "recovery", label: "Recover from hard training" },
      { id: "mindfulness", label: "De-stress and breathe" },
    ],
    benchmarks: [],
  },
  PILATES: {
    id: "PILATES",
    name: "Pilates",
    tagline: "Core strength, control and posture that carry over to every sport.",
    goals: [
      { id: "core_strength", label: "Build core strength" },
      { id: "posture", label: "Improve posture and control" },
      { id: "injury_prevention", label: "Bulletproof my body" },
    ],
    benchmarks: [],
  },
};

export const EQUIPMENT = [
  { id: "full_gym", label: "Full commercial gym" },
  { id: "barbell", label: "Barbell & plates" },
  { id: "rack", label: "Squat rack" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "machines", label: "Machines & cables" },
  { id: "rower", label: "Rower" },
  { id: "skierg", label: "SkiErg" },
  { id: "sled", label: "Sled" },
  { id: "wall_ball", label: "Wall ball" },
  { id: "pullup_bar", label: "Pull-up bar" },
  { id: "mat", label: "Exercise mat" },
  { id: "reformer", label: "Pilates reformer" },
] as const;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function benchmarkDef(key: string): BenchmarkDef | undefined {
  for (const s of Object.values(SPORT_DEFS)) {
    const b = s.benchmarks.find((b) => b.key === key);
    if (b) return b;
  }
  return undefined;
}

import type { BenchmarkDef, Level, ProgressModel } from "../sports";

/**
 * "What your numbers could look like."
 *
 * A deliberately simple, explainable model:
 *   - a base monthly improvement rate by progress model × training age
 *   - scaled by training frequency and adherence
 *   - with diminishing returns week-on-week inside a block
 *   - and a low/high band (0.5× / 1.5× the rate) so we never show one magic number.
 *
 * Once the athlete has logged data, `observedWeeklyRate` blends their real trend in,
 * so the curve becomes personal over time. Treat the rates as tunable
 * product constants — refine them with real cohort data once you have it.
 */

const WEEKS_PER_MONTH = 4.345;
const WEEKLY_DECAY = 0.985;
const BAND = { low: 0.5, high: 1.5 } as const;

/** Expected improvement per month (fractional). */
const MONTHLY_RATE: Record<Exclude<ProgressModel, "bodyweight">, Record<Level, number>> = {
  strength: { BEGINNER: 0.04, INTERMEDIATE: 0.015, ADVANCED: 0.006 },
  endurance: { BEGINNER: 0.03, INTERMEDIATE: 0.015, ADVANCED: 0.006 },
  hyrox: { BEGINNER: 0.045, INTERMEDIATE: 0.02, ADVANCED: 0.008 },
  metcon: { BEGINNER: 0.05, INTERMEDIATE: 0.025, ADVANCED: 0.01 },
};

/** Bodyweight change per month by goal, as a fraction of bodyweight (sign = direction). */
const BODYWEIGHT_MONTHLY: Record<string, Record<Level, number>> = {
  // Lean-mass gain rates in the spirit of the Aragon model
  build_muscle: { BEGINNER: 0.01, INTERMEDIATE: 0.005, ADVANCED: 0.0025 },
  recomp: { BEGINNER: 0, INTERMEDIATE: 0, ADVANCED: 0 },
  // ~0.4–0.6% of bodyweight per week
  cut: { BEGINNER: -0.026, INTERMEDIATE: -0.022, ADVANCED: -0.017 },
};

export function frequencyFactor(daysPerWeek: number): number {
  if (daysPerWeek <= 2) return 0.75;
  if (daysPerWeek === 3) return 0.9;
  if (daysPerWeek === 4) return 1;
  if (daysPerWeek === 5) return 1.05;
  return 1.1;
}

export interface ProjectionInput {
  def: BenchmarkDef;
  current: number;
  level: Level;
  weeks: number;
  daysPerWeek: number;
  goal?: string;
  /** 0–1, share of scheduled sessions completed so far. Defaults to a realistic 0.9. */
  adherence?: number;
  /** Athlete's real improvement per week (fraction, positive = better), from `observedWeeklyRate`. */
  observedWeeklyRate?: number | null;
}

export interface ProjectionPoint {
  week: number;
  low: number;
  expected: number;
  high: number;
}

function baseWeeklyRate(input: ProjectionInput): number {
  const { def, level, goal } = input;
  // For bodyweight the sign is the direction of change; for everything else, positive = better.
  const monthly =
    def.model === "bodyweight"
      ? (BODYWEIGHT_MONTHLY[goal ?? "build_muscle"] ?? BODYWEIGHT_MONTHLY.build_muscle)[level]
      : MONTHLY_RATE[def.model][level] * (def.rateFactor ?? 1);
  return Math.sign(monthly) * ((1 + Math.abs(monthly)) ** (1 / WEEKS_PER_MONTH) - 1);
}

export function projectBenchmark(input: ProjectionInput): ProjectionPoint[] {
  const { def, current, weeks, daysPerWeek } = input;
  const adherence = Math.min(Math.max(input.adherence ?? 0.9, 0.3), 1);

  let rate = baseWeeklyRate(input);
  if (input.observedWeeklyRate != null && def.model !== "bodyweight") {
    const observed = Math.min(Math.max(input.observedWeeklyRate, 0), rate * 3);
    rate = 0.5 * rate + 0.5 * observed;
  }
  const scaled = rate * frequencyFactor(daysPerWeek) * adherence;

  const points: ProjectionPoint[] = [{ week: 0, low: current, expected: current, high: current }];
  const growth = { low: 1, expected: 1, high: 1 };
  for (let w = 1; w <= weeks; w++) {
    const r = scaled * WEEKLY_DECAY ** (w - 1);
    growth.low *= 1 + r * BAND.low;
    growth.expected *= 1 + r;
    growth.high *= 1 + r * BAND.high;
    // Bodyweight moves directly; "higher is better" values grow; times shrink as speed grows.
    const apply = (g: number) => (def.better === "lower" ? current / g : current * g);
    points.push({ week: w, low: apply(growth.low), expected: apply(growth.expected), high: apply(growth.high) });
  }
  return points;
}

/** Sum several projections point-wise, e.g. squat + bench + deadlift → total. */
export function sumProjections(series: ProjectionPoint[][]): ProjectionPoint[] {
  if (series.length === 0) return [];
  return series[0].map((_, i) => ({
    week: i,
    low: series.reduce((s, p) => s + p[i].low, 0),
    expected: series.reduce((s, p) => s + p[i].expected, 0),
    high: series.reduce((s, p) => s + p[i].high, 0),
  }));
}

/**
 * Improvement per week (fraction, positive = better) from logged entries via least squares.
 * Needs ≥3 entries spanning ≥2 weeks, otherwise returns null and the model rate is used alone.
 */
export function observedWeeklyRate(
  entries: { week: number; value: number }[],
  better: "higher" | "lower",
): number | null {
  if (entries.length < 3) return null;
  const weeks = entries.map((e) => e.week);
  if (Math.max(...weeks) - Math.min(...weeks) < 2) return null;

  const n = entries.length;
  const mx = weeks.reduce((a, b) => a + b, 0) / n;
  const my = entries.reduce((a, e) => a + e.value, 0) / n;
  let num = 0;
  let den = 0;
  for (const e of entries) {
    num += (e.week - mx) * (e.value - my);
    den += (e.week - mx) ** 2;
  }
  const slope = num / den;
  const rel = slope / my;
  return better === "higher" ? rel : -rel;
}

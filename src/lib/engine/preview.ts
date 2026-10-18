import { SPORT_DEFS, type Level, type Sport } from "../sports";
import { levelFrom5k, levelFromHyrox } from "./running";
import { levelFromTotal } from "./strength";
import { projectBenchmark, sumProjections, type ProjectionPoint } from "./projections";

export interface ProjectedMetric {
  key: string;
  label: string;
  unit: "kg" | "time";
  better: "higher" | "lower";
  current: number;
  points: ProjectionPoint[];
}

/** Best guess at training age from the numbers given, for athletes who pick "not sure". */
export function suggestLevel(
  sport: Sport,
  benchmarks: Record<string, number>,
  profile: { sex?: "male" | "female"; bodyweightKg?: number },
): Level {
  const { squat_1rm, bench_1rm, deadlift_1rm, run_5k, hyrox_time } = benchmarks;
  if (sport === "POWERLIFTING" && squat_1rm && bench_1rm && deadlift_1rm && profile.bodyweightKg) {
    return levelFromTotal(squat_1rm + bench_1rm + deadlift_1rm, profile.bodyweightKg, profile.sex ?? "male");
  }
  if (sport === "HYROX" && hyrox_time) return levelFromHyrox(hyrox_time);
  if ((sport === "RUNNING" || sport === "HYROX") && run_5k) return levelFrom5k(run_5k);
  return "BEGINNER";
}

/**
 * Projections for every benchmark the athlete entered, plus derived headline
 * metrics (e.g. the powerlifting total). Used by the onboarding preview and the progress page.
 */
export function projectAll(opts: {
  sport: Sport;
  goal: string;
  level: Level;
  weeks: number;
  daysPerWeek: number;
  benchmarks: Record<string, number>;
  adherence?: number;
  observedRates?: Record<string, number | null>;
}): ProjectedMetric[] {
  const sport = SPORT_DEFS[opts.sport];
  const metrics: ProjectedMetric[] = [];

  for (const def of sport.benchmarks) {
    const current = opts.benchmarks[def.key];
    if (!current) continue;
    metrics.push({
      key: def.key,
      label: def.label,
      unit: def.unit,
      better: def.better,
      current,
      points: projectBenchmark({
        def,
        current,
        level: opts.level,
        weeks: opts.weeks,
        daysPerWeek: opts.daysPerWeek,
        goal: opts.goal,
        adherence: opts.adherence,
        observedWeeklyRate: opts.observedRates?.[def.key],
      }),
    });
  }

  if (opts.sport === "POWERLIFTING") {
    const lifts = metrics.filter((m) => ["squat_1rm", "bench_1rm", "deadlift_1rm"].includes(m.key));
    if (lifts.length === 3) {
      const points = sumProjections(lifts.map((l) => l.points));
      metrics.unshift({ key: "total", label: "Powerlifting total", unit: "kg", better: "higher", current: points[0].expected, points });
    }
  }
  return metrics;
}

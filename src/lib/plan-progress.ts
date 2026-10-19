import { prisma } from "./db";
import { projectAll, type ProjectedMetric } from "./engine/preview";
import { observedWeeklyRate } from "./engine/projections";
import { adherence, weeksBetween, type ActiveEnrollment } from "./enrollment";
import { SPORT_DEFS } from "./sports";

export interface PlanProgress {
  metrics: ProjectedMetric[];
  /** Best logged result per plan week, per benchmark key */
  actual: Record<string, { week: number; value: number }[]>;
  rate: number;
  done: number;
  due: number;
  weeks: number;
}

/** Projections for one enrolment: starts from the sign-up numbers, adjusts for adherence and the athlete's own trend. */
export async function planProgress(userId: string, enrollment: ActiveEnrollment): Promise<PlanProgress> {
  const request = enrollment.request;
  const weeks = enrollment.plan.durationWeeks;
  const { rate, done, due } = await adherence(enrollment.id);
  if (!request) return { metrics: [], actual: {}, rate, done, due, weeks };

  const sport = SPORT_DEFS[request.sport];
  const start = enrollment.startDate;
  const baseline = request.benchmarks as Record<string, number>;
  const entries = await prisma.benchmarkEntry.findMany({
    where: { userId, key: { in: sport.benchmarks.map((b) => b.key) }, recordedAt: { gte: enrollment.createdAt } },
    orderBy: { recordedAt: "asc" },
  });

  const actual: PlanProgress["actual"] = {};
  for (const b of sport.benchmarks) {
    const byWeek = new Map<number, number>();
    for (const e of entries.filter((e) => e.key === b.key)) {
      const w = Math.min(Math.max(weeksBetween(start, e.recordedAt), 0), weeks);
      const prev = byWeek.get(w);
      byWeek.set(w, prev == null ? e.value : b.better === "higher" ? Math.max(prev, e.value) : Math.min(prev, e.value));
    }
    actual[b.key] = [...byWeek.entries()].map(([week, value]) => ({ week, value }));
  }

  const metrics = projectAll({
    sport: request.sport,
    goal: request.goal,
    level: request.level,
    weeks,
    daysPerWeek: enrollment.variant.daysPerWeek,
    benchmarks: baseline,
    adherence: rate,
    observedRates: Object.fromEntries(
      sport.benchmarks.map((b) => [
        b.key,
        observedWeeklyRate([{ week: 0, value: baseline[b.key] ?? 0 }, ...actual[b.key]].filter((p) => p.value > 0), b.better),
      ]),
    ),
  });
  return { metrics, actual, rate, done, due, weeks };
}

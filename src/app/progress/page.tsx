import { ProjectionChart } from "@/components/ProjectionChart";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { projectAll } from "@/lib/engine/preview";
import { observedWeeklyRate } from "@/lib/engine/projections";
import { formatBenchmark } from "@/lib/engine/units";
import { activeEnrollment, adherence, weeksBetween } from "@/lib/enrollment";
import { requireUser } from "@/lib/session";
import { SPORT_DEFS } from "@/lib/sports";

export default async function ProgressPage() {
  const user = await requireUser("/progress");
  const enrollment = await activeEnrollment(user.id);
  const request = enrollment?.request;

  if (!enrollment || !request) {
    return (
      <Card className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Nothing to project yet</h1>
        <p className="text-muted">Start a plan and we&apos;ll chart where your numbers are heading.</p>
        <LinkButton href="/onboarding" variant="brand">Build my plan</LinkButton>
      </Card>
    );
  }

  const sport = SPORT_DEFS[request.sport];
  const weeks = enrollment.plan.durationWeeks;
  const start = enrollment.startDate;
  const entries = await prisma.benchmarkEntry.findMany({
    where: { userId: user.id, key: { in: sport.benchmarks.map((b) => b.key) }, recordedAt: { gte: enrollment.createdAt } },
    orderBy: { recordedAt: "asc" },
  });

  // Best result per benchmark per plan week → dots on the chart and the athlete's observed trend
  const actual: Record<string, { week: number; value: number }[]> = {};
  for (const b of sport.benchmarks) {
    const byWeek = new Map<number, number>();
    for (const e of entries.filter((e) => e.key === b.key)) {
      const w = Math.min(Math.max(weeksBetween(start, e.recordedAt), 0), weeks);
      const prev = byWeek.get(w);
      byWeek.set(w, prev == null ? e.value : b.better === "higher" ? Math.max(prev, e.value) : Math.min(prev, e.value));
    }
    actual[b.key] = [...byWeek.entries()].map(([week, value]) => ({ week, value }));
  }

  const { rate, due } = await adherence(enrollment.id);
  const metrics = projectAll({
    sport: request.sport,
    goal: request.goal,
    level: request.level,
    weeks,
    daysPerWeek: enrollment.variant.daysPerWeek,
    benchmarks: request.benchmarks as Record<string, number>,
    adherence: rate,
    observedRates: Object.fromEntries(
      sport.benchmarks.map((b) => [b.key, observedWeeklyRate([{ week: 0, value: (request.benchmarks as Record<string, number>)[b.key] ?? 0 }, ...actual[b.key]].filter((p) => p.value > 0), b.better)]),
    ),
  });

  return (
    <>
      <PageHeader
        title="Progress & projections"
        subtitle={`${enrollment.plan.title} · ${due === 0 ? "plan not started yet" : `${Math.round(rate * 100)}% of sessions completed`}`}
      />
      <div className="grid gap-6 md:grid-cols-2">
        {metrics.map((m) => {
          const end = m.points[m.points.length - 1];
          const latest = actual[m.key]?.at(-1)?.value;
          return (
            <Card key={m.key}>
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">{m.label}</p>
                <p className="text-sm text-muted">
                  Start {formatBenchmark(m.unit, m.current)}
                  {latest != null && <> · Now <b className="text-ink">{formatBenchmark(m.unit, latest)}</b></>}
                </p>
              </div>
              <p className="mt-1 text-sm">
                Week {weeks} projection: <span className="bg-brand px-1 font-bold">{formatBenchmark(m.unit, end.expected)}</span>
              </p>
              <ProjectionChart points={m.points} unit={m.unit} better={m.better} actual={actual[m.key]} height={220} />
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-muted">
        Projections start from the numbers you entered at sign-up, adjust for how consistently you train, and blend in your own
        trend once you have three or more results logged.
      </p>
    </>
  );
}

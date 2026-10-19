import { ProjectionChart } from "@/components/ProjectionChart";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { formatBenchmark } from "@/lib/engine/units";
import { activeEnrollments } from "@/lib/enrollment";
import { planProgress } from "@/lib/plan-progress";
import { requireUser } from "@/lib/session";

export default async function ProgressPage() {
  const user = await requireUser("/progress");
  const enrollments = await activeEnrollments(user.id);

  if (enrollments.length === 0) {
    return (
      <Card className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Nothing to project yet</h1>
        <p className="text-muted">Start a plan and we&apos;ll chart where your numbers are heading.</p>
        <LinkButton href="/onboarding" variant="brand">Build my plan</LinkButton>
      </Card>
    );
  }

  const progress = await Promise.all(enrollments.map((e) => planProgress(user.id, e)));

  return (
    <>
      <PageHeader title="Progress & projections" subtitle={enrollments.map((e) => e.plan.title).join(" + ")} />
      <div className="space-y-12">
        {enrollments.map((e, i) => {
          const p = progress[i];
          return (
            <section key={e.id}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold">{e.plan.title}</h2>
                <p className="text-sm text-muted">
                  {p.due === 0 ? "Plan not started yet" : `${p.done} of ${p.due} sessions done (${Math.round(p.rate * 100)}%)`}
                </p>
              </div>
              {p.metrics.length === 0 ? (
                <Card>
                  <p className="font-semibold">Consistency is the goal here</p>
                  <p className="mt-1 text-sm text-muted">
                    {e.plan.title} doesn&apos;t have a number to project — progress is showing up. Keep your streak going on the calendar.
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-paper">
                    <div className="h-2 rounded-full bg-ink" style={{ width: `${p.due ? Math.round(p.rate * 100) : 0}%` }} />
                  </div>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {p.metrics.map((m) => {
                    const end = m.points[m.points.length - 1];
                    const latest = p.actual[m.key]?.at(-1)?.value;
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
                          Week {p.weeks} projection: <span className="bg-brand px-1 font-bold">{formatBenchmark(m.unit, end.expected)}</span>
                        </p>
                        <ProjectionChart points={m.points} unit={m.unit} better={m.better} actual={p.actual[m.key]} height={220} />
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-8 text-xs text-muted">
        Projections start from the numbers you entered at sign-up, adjust for how consistently you train, and blend in your own
        trend once you have three or more results logged.
      </p>
    </>
  );
}

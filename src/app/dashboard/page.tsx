import Link from "next/link";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { activeEnrollment, adherence, weeksBetween } from "@/lib/enrollment";
import { requireUser } from "@/lib/session";

const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser("/dashboard");
  const { welcome } = await searchParams;
  const enrollment = await activeEnrollment(user.id);

  if (!enrollment) {
    return (
      <Card className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold">No active plan yet</h1>
        <p className="text-muted">Answer a few questions and we&apos;ll match you to a plan.</p>
        <LinkButton href="/onboarding" variant="brand">Build my plan</LinkButton>
      </Card>
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const currentWeek = Math.min(Math.max(weeksBetween(enrollment.startDate, today) + 1, 1), enrollment.plan.durationWeeks);

  const [week, next, stats] = await Promise.all([
    prisma.scheduledWorkout.findMany({
      where: { enrollmentId: enrollment.id, weekNumber: currentWeek },
      include: { planSession: true },
      orderBy: { date: "asc" },
    }),
    prisma.scheduledWorkout.findFirst({
      where: { enrollmentId: enrollment.id, completed: false, date: { gte: today } },
      include: { planSession: true },
      orderBy: { date: "asc" },
    }),
    adherence(enrollment.id),
  ]);

  return (
    <>
      {welcome && (
        <Card tone="brand" className="mb-6">
          You&apos;re in! Your plan starts {dayFmt.format(enrollment.startDate)}. Every session is personalised to your numbers.
        </Card>
      )}
      <PageHeader
        title={enrollment.plan.title}
        subtitle={`Week ${currentWeek} of ${enrollment.plan.durationWeeks} · ${enrollment.variant.daysPerWeek} days/week`}
        action={<LinkButton href="/progress" variant="ghost">View progress</LinkButton>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {next && (
            <Card tone="dark">
              <p className="text-sm text-white/60">{next.date.getTime() === today.getTime() ? "Today" : `Next · ${dayFmt.format(next.date)}`}</p>
              <p className="mt-1 text-2xl font-bold">{next.planSession.title}</p>
              <p className="mt-1 text-sm text-white/60">~{next.planSession.estMinutes} min</p>
              <LinkButton href={`/workout/${next.id}`} variant="brand" className="mt-4">Start workout</LinkButton>
            </Card>
          )}
          <div>
            <h2 className="mb-3 font-bold">This week</h2>
            <div className="space-y-2">
              {week.map((w) => (
                <Link key={w.id} href={`/workout/${w.id}`}>
                  <Card className="mb-2 flex items-center justify-between py-3 hover:border-ink">
                    <div>
                      <p className="text-sm text-muted">{dayFmt.format(w.date)}</p>
                      <p className="font-semibold">{w.planSession.title}</p>
                    </div>
                    {w.completed ? <Badge tone="good">Done</Badge> : w.date < today ? <Badge tone="warn">Missed</Badge> : null}
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <p className="text-sm text-muted">Sessions completed</p>
            {stats.due === 0 ? (
              <p className="mt-1 font-semibold">Your first session is {dayFmt.format(enrollment.startDate)}</p>
            ) : (
              <>
                <p className="text-3xl font-bold">{stats.done}<span className="text-lg text-muted">/{stats.due}</span></p>
                <div className="mt-3 h-2 rounded-full bg-paper">
                  <div className="h-2 rounded-full bg-ink" style={{ width: `${Math.round(stats.rate * 100)}%` }} />
                </div>
              </>
            )}
            <p className="mt-2 text-xs text-muted">Consistency feeds your projections — the more you log, the sharper they get.</p>
          </Card>
        </aside>
      </div>
    </>
  );
}

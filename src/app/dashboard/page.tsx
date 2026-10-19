import Link from "next/link";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { MAX_ACTIVE_PLANS, MONTHLY_PRICE_PENCE, formatPence, subscriptionPricePence } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { activeEnrollments, adherence, weeksBetween } from "@/lib/enrollment";
import { requireUser } from "@/lib/session";
import { SESSION_KINDS } from "@/lib/session-kinds";
import { endPlanAction } from "../plans/actions";

const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser("/dashboard");
  const { welcome } = await searchParams;
  const enrollments = await activeEnrollments(user.id);

  if (enrollments.length === 0) {
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
  const weekStart = new Date(today);
  weekStart.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
  const ids = enrollments.map((e) => e.id);
  const planTitle = new Map(enrollments.map((e) => [e.id, e.plan.title]));
  const multi = enrollments.length > 1;

  const [week, next, stats] = await Promise.all([
    prisma.scheduledWorkout.findMany({
      where: { enrollmentId: { in: ids }, date: { gte: weekStart, lt: weekEnd } },
      include: { planSession: true },
      orderBy: { date: "asc" },
    }),
    prisma.scheduledWorkout.findFirst({
      where: { enrollmentId: { in: ids }, completed: false, date: { gte: today } },
      include: { planSession: true },
      orderBy: { date: "asc" },
    }),
    Promise.all(enrollments.map((e) => adherence(e.id))),
  ]);

  return (
    <>
      {welcome && (
        <Card tone="brand" className="mb-6">
          You&apos;re in! {multi ? "Both plans are on your calendar" : `Your plan starts ${dayFmt.format(enrollments[0].startDate)}`}. Every session is personalised to your numbers.
        </Card>
      )}
      <PageHeader
        title={multi ? "Your training" : enrollments[0].plan.title}
        subtitle={multi ? enrollments.map((e) => e.plan.title).join(" + ") : `${enrollments[0].variant.daysPerWeek} days/week`}
        action={
          <div className="flex gap-2">
            <LinkButton href="/calendar" variant="ghost">Calendar</LinkButton>
            <LinkButton href="/progress" variant="ghost">Progress</LinkButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {next && (
            <Card tone="dark">
              <p className="text-sm text-white/60">
                {next.date.getTime() === today.getTime() ? "Today" : `Next · ${dayFmt.format(next.date)}`}
                {multi && ` · ${planTitle.get(next.enrollmentId)}`}
              </p>
              <p className="mt-1 text-2xl font-bold">{next.planSession.title}</p>
              <p className="mt-1 text-sm text-white/60">{SESSION_KINDS[next.planSession.kind].label} · ~{next.planSession.estMinutes} min</p>
              <LinkButton href={`/workout/${next.id}`} variant="brand" className="mt-4">Start workout</LinkButton>
            </Card>
          )}
          <div>
            <h2 className="mb-3 font-bold">This week</h2>
            {week.length === 0 && <p className="text-sm text-muted">Nothing scheduled this week — your plan starts {dayFmt.format(enrollments[0].startDate)}.</p>}
            <div className="space-y-2">
              {week.map((w) => (
                <Link key={w.id} href={`/workout/${w.id}`}>
                  <Card className="mb-2 flex items-center gap-3 py-3 hover:border-ink">
                    <span className={`w-1.5 self-stretch rounded-full ${SESSION_KINDS[w.planSession.kind].bar}`} />
                    <div className="flex-1">
                      <p className="text-sm text-muted">{dayFmt.format(w.date)}{multi && ` · ${planTitle.get(w.enrollmentId)}`}</p>
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
          {enrollments.map((e, i) => {
            const s = stats[i];
            const week = Math.min(Math.max(weeksBetween(e.startDate, today) + 1, 1), e.plan.durationWeeks);
            return (
              <Card key={e.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{i === 0 ? "Main plan" : "Second plan"}</p>
                <p className="mt-1 font-bold">{e.plan.title}</p>
                <p className="text-sm text-muted">Week {week} of {e.plan.durationWeeks} · {e.variant.daysPerWeek} days/week</p>
                {s.due === 0 ? (
                  <p className="mt-3 text-sm">First session {dayFmt.format(e.startDate)}</p>
                ) : (
                  <>
                    <div className="mt-3 h-2 rounded-full bg-paper">
                      <div className="h-2 rounded-full bg-ink" style={{ width: `${Math.round(s.rate * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted">{s.done} of {s.due} sessions done</p>
                  </>
                )}
                <form action={endPlanAction} className="mt-3">
                  <input type="hidden" name="enrollmentId" value={e.id} />
                  <SubmitButton variant="ghost" className="w-full px-3 py-1.5 text-xs" pendingText="Ending…">End this plan</SubmitButton>
                </form>
              </Card>
            );
          })}
          {enrollments.length < MAX_ACTIVE_PLANS && (
            <Card tone="brand">
              <p className="font-bold">Add a second plan</p>
              <p className="mt-1 text-sm">
                Pair your training with yoga, Pilates or another sport. +{formatPence(MONTHLY_PRICE_PENCE)}/month
                ({formatPence(subscriptionPricePence(2))} total).
              </p>
              <LinkButton href="/onboarding" variant="primary" className="mt-3 w-full">Find a second plan</LinkButton>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

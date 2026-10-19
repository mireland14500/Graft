import Link from "next/link";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { latestBenchmarks } from "@/lib/benchmarks";
import { buildPlanWeeks, dayKey, monthGrid } from "@/lib/calendar";
import { activeEnrollments, weeksBetween } from "@/lib/enrollment";
import { requireUser } from "@/lib/session";
import { SESSION_KINDS } from "@/lib/session-kinds";
import { SPORT_DEFS, WEEKDAYS } from "@/lib/sports";
import { loadWorkoutDetails, type WorkoutDetail } from "@/lib/workout-details";
import { WeekCarousel, type CarouselWeek } from "./WeekCarousel";

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; month?: string }> }) {
  const user = await requireUser("/calendar");
  const { view = "weeks", month } = await searchParams;
  const enrollments = await activeEnrollments(user.id);

  if (enrollments.length === 0) {
    return (
      <Card className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold">No plan on your calendar yet</h1>
        <p className="text-muted">Pick a plan and your sessions will appear here on the days you train.</p>
        <LinkButton href="/onboarding" variant="brand">Build my plan</LinkButton>
      </Card>
    );
  }

  const workouts = await loadWorkoutDetails(enrollments.map((e) => e.id), await latestBenchmarks(user.id));
  const multi = enrollments.length > 1;

  // With two plans the calendar spans both: from the earliest start to the latest finish.
  const start = new Date(Math.min(...enrollments.map((e) => e.startDate.getTime())));
  const end = new Date(Math.max(...enrollments.map((e) => e.endDate.getTime())));
  const totalWeeks = weeksBetween(start, end) + 1;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const weeks: CarouselWeek[] = buildPlanWeeks(start, totalWeeks, workouts).map((w) => {
    const planWeeks = enrollments
      .map((e) => ({ e, n: weeksBetween(e.startDate, w.start) + 1 }))
      .filter(({ e, n }) => n >= 1 && n <= e.plan.durationWeeks);
    const label = multi
      ? planWeeks.map(({ e, n }) => `${SPORT_DEFS[e.plan.sport].name} W${n}`).join(" · ") || "Off week"
      : `Week ${planWeeks[0]?.n ?? w.weekNumber}`;
    return { start: w.start, end: w.end, label, days: w.days, done: w.done, total: w.total, minutes: w.minutes, runMetres: w.runMetres };
  });
  const currentIndex = Math.min(Math.max(weeksBetween(start, today), 0), totalWeeks - 1);
  const done = workouts.filter((w) => w.completed).length;
  const kindsInPlan = [...new Set(workouts.map((w) => w.kind))];

  return (
    <>
      <PageHeader
        title={multi ? "Your calendar" : enrollments[0].plan.title}
        subtitle={multi ? enrollments.map((e) => e.plan.title).join(" + ") : `${enrollments[0].plan.durationWeeks} weeks · ${enrollments[0].variant.daysPerWeek} days/week`}
        action={
          <div className="flex rounded-full border border-line bg-white p-1 text-sm font-semibold">
            <ViewTab href="/calendar?view=weeks" active={view !== "month"}>Week</ViewTab>
            <ViewTab href="/calendar?view=month" active={view === "month"}>Month</ViewTab>
          </div>
        }
      />

      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="h-2 flex-1 rounded-full bg-line">
            <div className="h-2 rounded-full bg-ink" style={{ width: `${workouts.length ? (done / workouts.length) * 100 : 0}%` }} />
          </div>
          <span className="text-muted">{done} of {workouts.length} sessions done</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {kindsInPlan.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${SESSION_KINDS[k].dot}`} /> {SESSION_KINDS[k].label}
            </span>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <MonthView workouts={workouts} today={today} month={month} planStart={start} planEnd={end} />
      ) : (
        <div className="mx-auto max-w-2xl">
          <WeekCarousel weeks={weeks} initialIndex={currentIndex} today={today} showPlan={multi} />
          <p className="mt-3 text-center text-xs text-muted">Swipe or use ‹ › to move between weeks · tap a session for its breakdown</p>
        </div>
      )}
    </>
  );
}

function ViewTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded-full px-4 py-1.5 ${active ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
      {children}
    </Link>
  );
}

function MonthView({ workouts, today, month, planStart, planEnd }: {
  workouts: WorkoutDetail[]; today: Date; month?: string; planStart: Date; planEnd: Date;
}) {
  // Default to the current month while the plan is running, otherwise the month it starts in.
  const fallback = today >= planStart && today <= planEnd ? today : planStart;
  const [y, m] = /^\d{4}-\d{2}$/.test(month ?? "")
    ? month!.split("-").map(Number)
    : [fallback.getUTCFullYear(), fallback.getUTCMonth() + 1];
  const shown = new Date(Date.UTC(y, m - 1, 1));
  const param = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(Date.UTC(y, m - 2, 1));
  const next = new Date(Date.UTC(y, m, 1));

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <Link href={`/calendar?view=month&month=${param(prev)}`} className="rounded-full px-3 py-1 hover:bg-paper" aria-label="Previous month">‹</Link>
        <p className="font-bold">{monthYear.format(shown)}</p>
        <Link href={`/calendar?view=month&month=${param(next)}`} className="rounded-full px-3 py-1 hover:bg-paper" aria-label="Next month">›</Link>
      </div>
      <div className="grid grid-cols-7 border-b border-line text-center text-xs font-medium uppercase text-muted">
        {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      {monthGrid(y, m - 1, workouts).map((row) => (
        <div key={dayKey(row[0].date)} className="grid grid-cols-7 border-b border-line last:border-b-0">
          {row.map((day) => {
            const inMonth = day.date.getUTCMonth() === m - 1;
            const inPlan = day.date >= planStart && day.date <= planEnd;
            const isToday = day.date.getTime() === today.getTime();
            return (
              <div key={dayKey(day.date)} className={`min-h-20 border-r border-line/60 p-1.5 last:border-r-0 sm:min-h-28 ${inMonth ? "" : "bg-paper/60"}`}>
                <p className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${isToday ? "bg-ink text-white" : inMonth ? (inPlan ? "" : "text-muted") : "text-muted/50"}`}>
                  {day.date.getUTCDate()}
                </p>
                {/* Phones get coloured dots; wider screens get labelled chips */}
                <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                  {day.workouts.map((w) => (
                    <Link key={w.id} href={`/workout/${w.id}`} aria-label={w.title} className={`h-2.5 w-2.5 rounded-full ${SESSION_KINDS[w.kind].dot} ${w.completed ? "opacity-40" : ""}`} />
                  ))}
                </div>
                <div className="mt-1 hidden space-y-1 sm:block">
                  {day.workouts.map((w) => (
                    <Link key={w.id} href={`/workout/${w.id}`} className={`block truncate rounded-md px-1.5 py-0.5 text-xs font-medium ${SESSION_KINDS[w.kind].chip} ${w.completed ? "opacity-50" : ""}`}>
                      {w.completed && "✓ "}{w.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

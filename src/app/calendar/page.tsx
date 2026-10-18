import Link from "next/link";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import {
  buildPlanWeeks, dayKey, formatKm, formatMinutes, monthGrid, runDistanceM, utcDay,
  type CalendarWeek, type CalendarWorkout,
} from "@/lib/calendar";
import { prisma } from "@/lib/db";
import { activeEnrollment, weeksBetween } from "@/lib/enrollment";
import { requireUser } from "@/lib/session";
import { SESSION_KINDS } from "@/lib/session-kinds";
import { WEEKDAYS } from "@/lib/sports";
import { ScrollIntoView } from "./ScrollIntoView";

type Workout = CalendarWorkout & { kind: keyof typeof SESSION_KINDS };

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; month?: string }> }) {
  const user = await requireUser("/calendar");
  const { view = "weeks", month } = await searchParams;
  const enrollment = await activeEnrollment(user.id);

  if (!enrollment) {
    return (
      <Card className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <h1 className="text-2xl font-bold">No plan on your calendar yet</h1>
        <p className="text-muted">Pick a plan and your sessions will appear here on the days you train.</p>
        <LinkButton href="/onboarding" variant="brand">Build my plan</LinkButton>
      </Card>
    );
  }

  const rows = await prisma.scheduledWorkout.findMany({
    where: { enrollmentId: enrollment.id },
    orderBy: { date: "asc" },
    include: {
      planSession: {
        include: {
          week: { select: { weekNumber: true, focus: true, isDeload: true } },
          items: { select: { distanceM: true, sets: true, exercise: { select: { category: true } } } },
        },
      },
    },
  });

  const workouts: Workout[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    weekNumber: r.weekNumber,
    completed: r.completed,
    title: r.planSession.title,
    kind: r.planSession.kind,
    estMinutes: r.planSession.estMinutes,
    runMetres: runDistanceM(r.planSession.items.map((i) => ({ ...i, category: i.exercise.category }))),
  }));
  const weekInfo = new Map(rows.map((r) => [r.weekNumber, r.planSession.week]));

  const today = utcDay(new Date());
  const totalWeeks = enrollment.plan.durationWeeks;
  const currentWeek = Math.min(Math.max(weeksBetween(enrollment.startDate, today) + 1, 1), totalWeeks);
  const done = workouts.filter((w) => w.completed).length;
  const kindsInPlan = [...new Set(workouts.map((w) => w.kind))];

  return (
    <>
      <PageHeader
        title={enrollment.plan.title}
        subtitle={`Week ${currentWeek} of ${totalWeeks} · ${dayMonth.format(enrollment.startDate)} – ${dayMonth.format(enrollment.endDate)}`}
        action={
          <div className="flex rounded-full border border-line bg-white p-1 text-sm font-semibold">
            <ViewTab href="/calendar?view=weeks" active={view !== "month"}>Weeks</ViewTab>
            <ViewTab href="/calendar?view=month" active={view === "month"}>Month</ViewTab>
          </div>
        }
      />

      <div className="mb-6 space-y-3">
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
        <MonthView workouts={workouts} today={today} month={month} planStart={enrollment.startDate} planEnd={enrollment.endDate} />
      ) : (
        <div className="space-y-3">
          {buildPlanWeeks(enrollment.startDate, totalWeeks, workouts).map((week) => (
            <WeekCard
              key={week.weekNumber}
              week={week}
              today={today}
              isCurrent={week.weekNumber === currentWeek}
              isPast={week.weekNumber < currentWeek}
              focus={weekInfo.get(week.weekNumber)?.focus ?? null}
              isDeload={weekInfo.get(week.weekNumber)?.isDeload ?? false}
            />
          ))}
          <ScrollIntoView id={`week-${currentWeek}`} />
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

function WeekCard({ week, today, isCurrent, isPast, focus, isDeload }: {
  week: CalendarWeek<Workout>; today: Date; isCurrent: boolean; isPast: boolean; focus: string | null; isDeload: boolean;
}) {
  const complete = week.total > 0 && week.done === week.total;
  return (
    // Past weeks start collapsed, like Runna: the plan opens on where you are now.
    <details id={`week-${week.weekNumber}`} open={!isPast} className={`scroll-mt-4 rounded-2xl border bg-white ${isCurrent ? "border-ink" : "border-line"}`}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 p-4 [&::-webkit-details-marker]:hidden">
        <span className="font-bold">Week {week.weekNumber}</span>
        {isCurrent && <Badge tone="good">This week</Badge>}
        {focus && <Badge tone={isDeload ? "warn" : "neutral"}>{focus}</Badge>}
        <span className="text-sm text-muted">{dayMonth.format(week.start)} – {dayMonth.format(week.end)}</span>
        <span className="ml-auto flex items-center gap-3 text-sm text-muted">
          <span className={complete ? "font-semibold text-ink" : ""}>{complete ? "✓ " : ""}{week.done}/{week.total} sessions</span>
          <span>{formatMinutes(week.minutes)}</span>
          {week.runMetres > 0 && <span>{formatKm(week.runMetres)}</span>}
        </span>
      </summary>

      <div className="border-t border-line px-4">
        {week.days.map((day, i) => {
          const isToday = day.date.getTime() === today.getTime();
          return (
            <div key={dayKey(day.date)} className={`flex gap-4 py-3 ${i > 0 ? "border-t border-line/60" : ""}`}>
              <div className="w-11 shrink-0 text-center">
                <p className={`text-xs uppercase ${isToday ? "font-bold text-ink" : "text-muted"}`}>{WEEKDAYS[i]}</p>
                <p className={`mx-auto mt-0.5 grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${isToday ? "bg-ink text-white" : ""}`}>
                  {day.date.getUTCDate()}
                </p>
              </div>
              <div className="flex-1 space-y-2 self-center">
                {day.workouts.length === 0 && <p className="text-sm text-muted">Rest day</p>}
                {day.workouts.map((w) => <WorkoutRow key={w.id} workout={w} missed={!w.completed && day.date < today} />)}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function WorkoutRow({ workout: w, missed }: { workout: Workout; missed: boolean }) {
  const style = SESSION_KINDS[w.kind];
  return (
    <Link href={`/workout/${w.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-ink">
      <span className={`w-1.5 self-stretch rounded-full ${style.bar}`} />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${w.completed ? "text-muted line-through decoration-1" : ""}`}>{w.title}</p>
        <p className="text-xs text-muted">
          {style.label} · {w.estMinutes} min{w.runMetres > 0 && ` · ${formatKm(w.runMetres)}`}
        </p>
      </div>
      {w.completed ? (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-brand-ink" aria-label="Completed">✓</span>
      ) : missed ? (
        <Badge tone="warn">Missed</Badge>
      ) : (
        <span className="text-muted" aria-hidden>›</span>
      )}
    </Link>
  );
}

function MonthView({ workouts, today, month, planStart, planEnd }: {
  workouts: Workout[]; today: Date; month?: string; planStart: Date; planEnd: Date;
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

/**
 * Pure helpers that lay scheduled workouts out as plan weeks (Runna-style list)
 * or as a month grid. All dates are UTC midnights, matching the @db.Date columns.
 */

const DAY_MS = 86_400_000;

export const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export interface CalendarWorkout {
  id: string;
  date: Date;
  weekNumber: number;
  completed: boolean;
  title: string;
  kind: string;
  estMinutes: number;
  /** Total running distance in the session, in metres (0 if none) */
  runMetres: number;
}

/** Running distance of a session: distance × sets for every "run" item. */
export function runDistanceM(items: { distanceM: number | null; sets: number | null; category: string }[]): number {
  return items.reduce((sum, i) => (i.category === "run" && i.distanceM ? sum + i.distanceM * (i.sets ?? 1) : sum), 0);
}

export interface CalendarDay<W extends CalendarWorkout> {
  date: Date;
  workouts: W[];
}

export interface CalendarWeek<W extends CalendarWorkout> {
  weekNumber: number;
  start: Date;
  end: Date;
  days: CalendarDay<W>[];
  done: number;
  total: number;
  minutes: number;
  runMetres: number;
}

function groupByDay<W extends CalendarWorkout>(workouts: W[]): Map<string, W[]> {
  const byDay = new Map<string, W[]>();
  for (const w of workouts) {
    const key = dayKey(w.date);
    byDay.set(key, [...(byDay.get(key) ?? []), w]);
  }
  return byDay;
}

/** One entry per plan week, each with 7 days starting on the plan's start weekday (a Monday). */
export function buildPlanWeeks<W extends CalendarWorkout>(startDate: Date, weeks: number, workouts: W[]): CalendarWeek<W>[] {
  const start = utcDay(startDate);
  const byDay = groupByDay(workouts);

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(start, i * 7);
    const days = Array.from({ length: 7 }, (_, d) => {
      const date = addDays(weekStart, d);
      return { date, workouts: byDay.get(dayKey(date)) ?? [] };
    });
    const all = days.flatMap((d) => d.workouts);
    return {
      weekNumber: i + 1,
      start: weekStart,
      end: addDays(weekStart, 6),
      days,
      done: all.filter((w) => w.completed).length,
      total: all.length,
      minutes: all.reduce((s, w) => s + w.estMinutes, 0),
      runMetres: all.reduce((s, w) => s + w.runMetres, 0),
    };
  });
}

/** Monday-first grid covering a whole month: full weeks, padded with days from the neighbouring months. */
export function monthGrid<W extends CalendarWorkout>(year: number, month: number, workouts: W[]): CalendarDay<W>[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  const gridStart = addDays(first, -((first.getUTCDay() + 6) % 7));
  const gridEnd = addDays(last, 6 - ((last.getUTCDay() + 6) % 7));
  const byDay = groupByDay(workouts);

  const rows: CalendarDay<W>[][] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 7)) {
    rows.push(Array.from({ length: 7 }, (_, i) => {
      const date = addDays(d, i);
      return { date, workouts: byDay.get(dayKey(date)) ?? [] };
    }));
  }
  return rows;
}

export function formatKm(metres: number): string {
  const km = metres / 1000;
  return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

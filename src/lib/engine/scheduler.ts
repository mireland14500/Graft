/**
 * Turns a plan variant (weeks → ordered sessions) plus the athlete's available
 * weekdays into concrete calendar dates. Weekdays are 0 = Monday … 6 = Sunday.
 */

export interface ScheduleWeek {
  weekNumber: number;
  sessions: { id: string; order: number }[];
}

export interface ScheduledItem {
  planSessionId: string;
  weekNumber: number;
  date: Date;
}

function combinations(items: number[], k: number): number[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, k - 1).map((c) => [first, ...c]), ...combinations(rest, k)];
}

/** Gaps between consecutive training days, wrapping round the week. */
function gaps(days: number[]): number[] {
  return days.map((d, i) => (i === days.length - 1 ? days[0] + 7 - d : days[i + 1] - d));
}

/**
 * When the athlete has more available days than the plan needs, pick the subset
 * that spreads sessions out most (maximise the smallest gap, then the evenness).
 */
export function pickTrainingDays(available: number[], sessionsPerWeek: number): number[] {
  const days = [...new Set(available)].sort((a, b) => a - b);
  if (sessionsPerWeek >= days.length) return days;
  if (sessionsPerWeek <= 1) return days.slice(0, 1);

  let best = days.slice(0, sessionsPerWeek);
  let bestKey = [-1, -Infinity];
  for (const combo of combinations(days, sessionsPerWeek)) {
    const g = gaps(combo);
    const key = [Math.min(...g), -Math.max(...g)];
    if (key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) {
      best = combo;
      bestKey = key;
    }
  }
  return best;
}

/** Monday on or after the given date (plans start at the beginning of a training week). */
export function nextMonday(from: Date): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const weekday = (d.getUTCDay() + 6) % 7;
  if (weekday !== 0) d.setUTCDate(d.getUTCDate() + (7 - weekday));
  return d;
}

export function buildSchedule(opts: {
  startDate: Date;
  availableDays: number[];
  weeks: ScheduleWeek[];
}): ScheduledItem[] {
  const start = nextMonday(opts.startDate);
  const out: ScheduledItem[] = [];

  for (const week of [...opts.weeks].sort((a, b) => a.weekNumber - b.weekNumber)) {
    const sessions = [...week.sessions].sort((a, b) => a.order - b.order);
    const days = pickTrainingDays(opts.availableDays, sessions.length);
    sessions.forEach((s, i) => {
      // If a coach wrote more sessions than available days, double up on the last day.
      const weekday = days[Math.min(i, days.length - 1)];
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + (week.weekNumber - 1) * 7 + weekday);
      out.push({ planSessionId: s.id, weekNumber: week.weekNumber, date });
    });
  }
  return out;
}

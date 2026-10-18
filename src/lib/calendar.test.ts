import { describe, expect, it } from "vitest";
import { buildPlanWeeks, dayKey, formatKm, formatMinutes, monthGrid, runDistanceM, type CalendarWorkout } from "./calendar";

const w = (id: string, date: string, o: Partial<CalendarWorkout> = {}): CalendarWorkout => ({
  id, date: new Date(`${date}T00:00:00Z`), weekNumber: 1, completed: false, title: id, kind: "RUN_EASY", estMinutes: 45, runMetres: 0, ...o,
});

describe("calendar", () => {
  it("adds up running distance across sets", () => {
    expect(runDistanceM([
      { category: "run", distanceM: 800, sets: 6 },
      { category: "run", distanceM: 2000, sets: null },
      { category: "erg", distanceM: 1000, sets: 1 },
    ])).toBe(6800);
  });

  it("lays a plan out as Monday–Sunday weeks with totals", () => {
    const weeks = buildPlanWeeks(new Date("2026-10-19T00:00:00Z"), 2, [
      w("a", "2026-10-19", { completed: true, runMetres: 5000 }),
      w("b", "2026-10-21", { estMinutes: 60, runMetres: 8000 }),
      w("c", "2026-10-26"),
    ]);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].days.map((d) => dayKey(d.date))[6]).toBe("2026-10-25");
    expect(weeks[0]).toMatchObject({ done: 1, total: 2, minutes: 105, runMetres: 13000 });
    expect(weeks[1].days[0].workouts.map((x) => x.id)).toEqual(["c"]);
  });

  it("builds a Monday-first month grid padded to full weeks", () => {
    const grid = monthGrid(2026, 9, [w("x", "2026-10-31")]); // October 2026
    expect(dayKey(grid[0][0].date)).toBe("2026-09-28");
    expect(dayKey(grid.at(-1)!.at(-1)!.date)).toBe("2026-11-01");
    expect(grid.flat().find((d) => dayKey(d.date) === "2026-10-31")!.workouts).toHaveLength(1);
  });

  it("formats totals", () => {
    expect(formatKm(13000)).toBe("13 km");
    expect(formatKm(6800)).toBe("6.8 km");
    expect(formatMinutes(105)).toBe("1h 45m");
    expect(formatMinutes(45)).toBe("45m");
  });
});

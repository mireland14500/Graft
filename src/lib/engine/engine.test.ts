import { describe, expect, it } from "vitest";
import { SPORT_DEFS, benchmarkDef } from "../sports";
import { rankPlans, type PlanCandidate } from "./matching";
import { resolvePrescription } from "./prescription";
import { observedWeeklyRate, projectBenchmark, sumProjections } from "./projections";
import { levelFrom5k, riegel } from "./running";
import { buildSchedule, nextMonday, pickTrainingDays } from "./scheduler";
import { dotsScore, estimate1RM, percentOf1RM } from "./strength";
import { formatTime, parseTime } from "./units";

describe("units", () => {
  it("round-trips times", () => {
    expect(parseTime("25:00")).toBe(1500);
    expect(parseTime("1:25:00")).toBe(5100);
    expect(parseTime("abc")).toBeNull();
    expect(formatTime(5100)).toBe("1:25:00");
    expect(formatTime(1500)).toBe("25:00");
  });
});

describe("strength", () => {
  it("estimates 1RM", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 5)).toBeCloseTo(114.9, 0);
  });
  it("rounds working weights to 2.5kg", () => {
    expect(percentOf1RM(143, 75)).toBe(107.5);
  });
  it("computes a plausible DOTS score", () => {
    const dots = dotsScore(600, 90, "male");
    expect(dots).toBeGreaterThan(380);
    expect(dots).toBeLessThan(410);
  });
});

describe("running", () => {
  it("predicts 10k from 5k with Riegel", () => {
    expect(riegel(1500, 5000, 10000)).toBeCloseTo(3127, -1);
    expect(levelFrom5k(30 * 60)).toBe("BEGINNER");
  });
});

describe("projections", () => {
  const squat = benchmarkDef("squat_1rm")!;
  const fiveK = benchmarkDef("run_5k")!;

  it("beginners improve faster than advanced lifters", () => {
    const base = { def: squat, current: 100, weeks: 12, daysPerWeek: 4 };
    const beginner = projectBenchmark({ ...base, level: "BEGINNER" }).at(-1)!;
    const advanced = projectBenchmark({ ...base, level: "ADVANCED" }).at(-1)!;
    expect(beginner.expected).toBeGreaterThan(108);
    expect(beginner.expected).toBeLessThan(115);
    expect(advanced.expected).toBeLessThan(103);
  });

  it("orders the band and makes times go down", () => {
    const p = projectBenchmark({ def: fiveK, current: 1500, weeks: 10, daysPerWeek: 4, level: "INTERMEDIATE" }).at(-1)!;
    expect(p.high).toBeLessThan(p.expected); // faster = lower time
    expect(p.expected).toBeLessThan(p.low);
    expect(p.low).toBeLessThan(1500);
  });

  it("cuts reduce bodyweight", () => {
    const bw = SPORT_DEFS.BODYBUILDING.benchmarks[0];
    const p = projectBenchmark({ def: bw, current: 90, weeks: 8, daysPerWeek: 5, level: "INTERMEDIATE", goal: "cut" }).at(-1)!;
    expect(p.expected).toBeLessThan(87);
    expect(p.expected).toBeGreaterThan(84);
  });

  it("sums lifts into a total", () => {
    const opts = { weeks: 4, daysPerWeek: 4, level: "BEGINNER" as const };
    const total = sumProjections([
      projectBenchmark({ ...opts, def: squat, current: 100 }),
      projectBenchmark({ ...opts, def: squat, current: 150 }),
    ]);
    expect(total[0].expected).toBe(250);
    expect(total).toHaveLength(5);
  });

  it("derives an observed rate from logs", () => {
    const rate = observedWeeklyRate(
      [{ week: 0, value: 100 }, { week: 2, value: 102 }, { week: 4, value: 104 }],
      "higher",
    );
    expect(rate).toBeCloseTo(0.0098, 3);
    expect(observedWeeklyRate([{ week: 0, value: 100 }], "higher")).toBeNull();
  });
});

describe("matching", () => {
  const plan = (o: Partial<PlanCandidate>): PlanCandidate => ({
    id: "p", sport: "POWERLIFTING", levels: ["INTERMEDIATE"], goals: ["increase_total"], equipment: ["barbell", "rack"],
    durationWeeks: 12, sessionMinutes: 75, variantDays: [3, 4], ratingAvg: 4.6, ratingCount: 50, completionRate: 0.6, ...o,
  });
  const req = {
    sport: "POWERLIFTING" as const, goal: "increase_total", level: "INTERMEDIATE" as const,
    daysPerWeek: 4, sessionMinutes: 75, durationWeeks: 12, equipment: ["full_gym"],
  };

  it("ranks the best fit first and explains why", () => {
    const ranked = rankPlans(req, [
      plan({ id: "meh", levels: ["BEGINNER"], goals: ["meet_prep"], durationWeeks: 6 }),
      plan({ id: "best" }),
    ]);
    expect(ranked[0].plan.id).toBe("best");
    expect(ranked[0].reasons).toContain("Fits your 4 training days");
  });

  it("filters out wrong sport, missing kit and too many days", () => {
    const ranked = rankPlans({ ...req, equipment: ["dumbbells"] }, [
      plan({ id: "kit" }),
      plan({ id: "sport", sport: "RUNNING", equipment: [] }),
      plan({ id: "days", equipment: [], variantDays: [5, 6] }),
      plan({ id: "ok", equipment: ["dumbbells"], variantDays: [3] }),
    ]);
    expect(ranked.map((r) => r.plan.id)).toEqual(["ok"]);
    expect(ranked[0].daysPerWeek).toBe(3);
  });
});

describe("scheduler", () => {
  it("spreads 3 sessions across 5 available days", () => {
    expect(pickTrainingDays([0, 1, 2, 3, 4], 3)).toEqual([0, 2, 4]);
  });

  it("starts on the next Monday and lays out weeks", () => {
    const saturday = new Date(Date.UTC(2026, 9, 17));
    expect(nextMonday(saturday).toISOString().slice(0, 10)).toBe("2026-10-19");

    const items = buildSchedule({
      startDate: saturday,
      availableDays: [0, 3],
      weeks: [
        { weekNumber: 1, sessions: [{ id: "a", order: 1 }, { id: "b", order: 2 }] },
        { weekNumber: 2, sessions: [{ id: "c", order: 1 }] },
      ],
    });
    expect(items.map((i) => i.date.toISOString().slice(0, 10))).toEqual(["2026-10-19", "2026-10-22", "2026-10-26"]);
  });
});

describe("prescription", () => {
  const base = { sets: 4, reps: "5", durationSec: null, distanceM: null, restSec: 180 };

  it("turns %1RM into kilos for this athlete", () => {
    const r = resolvePrescription(
      { ...base, exerciseName: "Squat", benchmarkKey: "squat_1rm", intensityType: "PERCENT_1RM", intensityValue: 75 },
      { squat_1rm: 140 },
    );
    expect(r.targetKg).toBe(105);
    expect(r.label).toBe("4 × 5 @ 105 kg (75%) · rest 3:00");
  });

  it("turns pace zones into a pace", () => {
    const r = resolvePrescription(
      { ...base, sets: null, reps: null, restSec: null, distanceM: 6000, exerciseName: "Run", benchmarkKey: "run_5k", intensityType: "PACE_ZONE", intensityValue: 1 },
      { run_5k: 1500 },
    );
    expect(r.label).toBe("6km @ 6:30/km (Easy)");
  });
});

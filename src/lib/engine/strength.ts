import type { Level } from "../sports";

/**
 * Estimated 1RM from a set. Average of Epley and Brzycki, which agree well at
 * low reps; beyond 10 reps estimates get unreliable so we cap there.
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  const r = Math.min(reps, 10);
  const epley = weightKg * (1 + r / 30);
  const brzycki = weightKg * (36 / (37 - r));
  return (epley + brzycki) / 2;
}

/** Load to put on the bar, rounded to the nearest 2.5kg. */
export function percentOf1RM(oneRmKg: number, percent: number): number {
  return Math.round((oneRmKg * percent) / 100 / 2.5) * 2.5;
}

// DOTS coefficients (IPF-style bodyweight-adjusted score).
const DOTS = {
  male: [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093],
  female: [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706],
} as const;

export function dotsScore(totalKg: number, bodyweightKg: number, sex: "male" | "female"): number {
  const bw = Math.min(Math.max(bodyweightKg, 40), sex === "male" ? 210 : 150);
  const [a, b, c, d, e] = DOTS[sex];
  const denom = a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4;
  return (totalKg * 500) / denom;
}

/** Rough training-age classification from a powerlifting total (used when the athlete is unsure). */
export function levelFromTotal(totalKg: number, bodyweightKg: number, sex: "male" | "female"): Level {
  const ratio = totalKg / bodyweightKg / (sex === "female" ? 0.7 : 1);
  if (ratio < 4) return "BEGINNER";
  if (ratio < 6) return "INTERMEDIATE";
  return "ADVANCED";
}

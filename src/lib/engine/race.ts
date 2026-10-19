import { riegel } from "./running";

export const RACE_DISTANCES = [
  { label: "5k", metres: 5000 },
  { label: "10k", metres: 10000 },
  { label: "Half marathon", metres: 21097.5 },
  { label: "Marathon", metres: 42195 },
] as const;

/** Race-time predictions for standard distances from a 5k time (Riegel). */
export function racePredictions(fiveKSec: number): { label: string; seconds: number }[] {
  return RACE_DISTANCES.map((d) => ({ label: d.label, seconds: riegel(fiveKSec, 5000, d.metres) }));
}

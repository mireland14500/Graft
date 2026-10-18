import type { Level } from "../sports";

/** Riegel's formula: predict a time over distance d2 from a performance over d1. */
export function riegel(timeSec: number, d1Metres: number, d2Metres: number, exponent = 1.06): number {
  return timeSec * (d2Metres / d1Metres) ** exponent;
}

/**
 * Training pace zones derived from a 5k time, in seconds per km.
 * Zone numbers match SessionItem.intensityValue when intensityType = PACE_ZONE.
 */
export const PACE_ZONES = {
  1: { name: "Easy", factor: 1.3 },
  2: { name: "Steady", factor: 1.18 },
  3: { name: "Tempo", factor: 1.08 },
  4: { name: "Threshold", factor: 1.04 },
  5: { name: "Interval", factor: 0.97 },
} as const;
export type PaceZone = keyof typeof PACE_ZONES;

export function paceForZone(fiveKSec: number, zone: PaceZone): number {
  return (fiveKSec / 5) * PACE_ZONES[zone].factor;
}

export function levelFrom5k(fiveKSec: number): Level {
  if (fiveKSec > 28 * 60) return "BEGINNER";
  if (fiveKSec > 20 * 60) return "INTERMEDIATE";
  return "ADVANCED";
}

export function levelFromHyrox(finishSec: number): Level {
  if (finishSec > 90 * 60) return "BEGINNER";
  if (finishSec > 70 * 60) return "INTERMEDIATE";
  return "ADVANCED";
}

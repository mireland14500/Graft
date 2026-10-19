import { PACE_ZONES, paceForZone, type PaceZone } from "./running";
import { percentOf1RM } from "./strength";
import { formatPace, formatTime } from "./units";

/**
 * Coaches write plans relative to the athlete ("4 × 5 @ 75%", "6 × 800m @ zone 5").
 * This resolves those into concrete numbers for one athlete, so a single plan
 * template is personalised for everyone who follows it.
 */

export interface PrescriptionItem {
  exerciseName: string;
  benchmarkKey: string | null;
  sets: number | null;
  reps: string | null;
  intensityType: "PERCENT_1RM" | "RPE" | "FIXED_KG" | "BODYWEIGHT" | "PACE_ZONE" | null;
  intensityValue: number | null;
  durationSec: number | null;
  distanceM: number | null;
  restSec: number | null;
}

export interface ResolvedPrescription {
  label: string;
  targetKg?: number;
  targetPaceSecPerKm?: number;
}

/** benchmarks: latest value per key, e.g. { squat_1rm: 140, run_5k: 1500 } */
export function resolvePrescription(item: PrescriptionItem, benchmarks: Record<string, number>): ResolvedPrescription {
  const volume = [
    item.sets && item.reps ? `${item.sets} × ${item.reps}` : item.sets ? `${item.sets} sets` : null,
    item.distanceM ? (item.distanceM >= 1000 ? `${item.distanceM / 1000}km` : `${item.distanceM}m`) : null,
    item.durationSec ? (item.durationSec % 60 === 0 ? `${item.durationSec / 60} min` : formatTime(item.durationSec)) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const rest = item.restSec ? ` · rest ${formatTime(item.restSec)}` : "";
  const oneRm = item.benchmarkKey ? benchmarks[item.benchmarkKey] : undefined;
  const v = item.intensityValue;

  switch (item.intensityType) {
    case "PERCENT_1RM":
      if (v != null && oneRm) {
        const kg = percentOf1RM(oneRm, v);
        return { label: `${volume} @ ${kg} kg (${v}%)${rest}`, targetKg: kg };
      }
      return { label: `${volume} @ ${v}% 1RM${rest}` };
    case "FIXED_KG":
      return { label: `${volume} @ ${v} kg${rest}`, targetKg: v ?? undefined };
    case "RPE":
      return { label: `${volume} @ RPE ${v}${rest}` };
    case "PACE_ZONE": {
      const zone = (v ?? 1) as PaceZone;
      const fiveK = benchmarks.run_5k;
      if (fiveK && PACE_ZONES[zone]) {
        const pace = paceForZone(fiveK, zone);
        return { label: `${volume} @ ${formatPace(pace)} (${PACE_ZONES[zone].name})${rest}`, targetPaceSecPerKm: pace };
      }
      return { label: `${volume} @ ${PACE_ZONES[zone]?.name ?? "easy"} effort${rest}` };
    }
    default:
      return { label: `${volume}${rest}` };
  }
}

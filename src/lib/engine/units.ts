/** "25:00" → 1500, "1:25:00" → 5100. Returns null for anything unparseable. */
export function parseTime(input: string): number | null {
  const parts = input.trim().split(":");
  if (parts.length < 1 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.reduce((total, p) => total * 60 + Number(p), 0);
}

/** 1500 → "25:00", 5100 → "1:25:00" */
export function formatTime(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** Seconds per km → "4:52/km" */
export function formatPace(secPerKm: number): string {
  return `${formatTime(secPerKm)}/km`;
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function formatBenchmark(unit: "kg" | "time", value: number): string {
  return unit === "time" ? formatTime(value) : `${roundTo(value, 0.5)} kg`;
}

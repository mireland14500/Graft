/**
 * Most PTs already have their programmes in a spreadsheet. Rather than forcing
 * them through a drag-and-drop builder first, they can export a CSV in this
 * shape and upload it. One row per exercise:
 *
 *   days_per_week,week,session,session_title,kind,est_minutes,exercise,sets,reps,intensity_type,intensity_value,distance_m,duration_sec,rest_sec,notes
 *   4,1,1,Heavy squat,STRENGTH,75,back-squat,4,5,PERCENT_1RM,75,,,180,
 *   4,1,2,Easy run,RUN_EASY,40,run,,,PACE_ZONE,1,6000,,,Conversational
 */

const SESSION_KINDS = [
  "STRENGTH", "HYPERTROPHY", "RUN_EASY", "RUN_TEMPO", "RUN_INTERVALS", "RUN_LONG",
  "CONDITIONING", "HYROX_SIM", "METCON", "SKILL", "RECOVERY", "YOGA", "PILATES", "MOBILITY",
] as const;
const INTENSITY_TYPES = ["PERCENT_1RM", "RPE", "FIXED_KG", "BODYWEIGHT", "PACE_ZONE"] as const;

export type SessionKind = (typeof SESSION_KINDS)[number];
export type IntensityType = (typeof INTENSITY_TYPES)[number];

export interface ImportedItem {
  order: number;
  exerciseSlug: string;
  sets: number | null;
  reps: string | null;
  intensityType: IntensityType | null;
  intensityValue: number | null;
  distanceM: number | null;
  durationSec: number | null;
  restSec: number | null;
  notes: string | null;
}
export interface ImportedSession { order: number; title: string; kind: SessionKind; estMinutes: number; items: ImportedItem[] }
export interface ImportedWeek { weekNumber: number; sessions: ImportedSession[] }
export interface ImportedVariant { daysPerWeek: number; weeks: ImportedWeek[] }

export interface ImportResult {
  variants: ImportedVariant[];
  errors: string[];
}

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const REQUIRED = ["days_per_week", "week", "session", "session_title", "kind", "exercise"] as const;

export function importPlanCsv(text: string): ImportResult {
  const [header, ...rows] = parseCsv(text);
  const errors: string[] = [];
  if (!header) return { variants: [], errors: ["The file is empty"] };

  const col = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
  const missing = REQUIRED.filter((r) => col[r] === undefined);
  if (missing.length) return { variants: [], errors: [`Missing columns: ${missing.join(", ")}`] };

  const get = (r: string[], name: string) => (col[name] === undefined ? "" : (r[col[name]] ?? "").trim());
  const int = (s: string) => (s === "" ? null : Number.parseInt(s, 10));
  const num = (s: string) => (s === "" ? null : Number(s));

  const variants = new Map<number, Map<number, Map<number, ImportedSession>>>();

  rows.forEach((r, idx) => {
    const line = idx + 2;
    const days = int(get(r, "days_per_week"));
    const week = int(get(r, "week"));
    const sessionNo = int(get(r, "session"));
    const kind = get(r, "kind").toUpperCase() as SessionKind;
    const intensity = get(r, "intensity_type").toUpperCase();

    if (!days || days < 1 || days > 7) return errors.push(`Line ${line}: days_per_week must be 1–7`);
    if (!week || week < 1) return errors.push(`Line ${line}: week must be a positive number`);
    if (!sessionNo || sessionNo < 1) return errors.push(`Line ${line}: session must be a positive number`);
    if (!SESSION_KINDS.includes(kind)) return errors.push(`Line ${line}: unknown kind "${get(r, "kind")}"`);
    if (intensity && !INTENSITY_TYPES.includes(intensity as IntensityType))
      return errors.push(`Line ${line}: unknown intensity_type "${intensity}"`);

    const weeks = variants.get(days) ?? new Map();
    variants.set(days, weeks);
    const sessions = weeks.get(week) ?? new Map();
    weeks.set(week, sessions);
    const session: ImportedSession = sessions.get(sessionNo) ?? {
      order: sessionNo,
      title: get(r, "session_title"),
      kind,
      estMinutes: int(get(r, "est_minutes")) ?? 60,
      items: [],
    };
    sessions.set(sessionNo, session);

    session.items.push({
      order: session.items.length + 1,
      exerciseSlug: get(r, "exercise").toLowerCase(),
      sets: int(get(r, "sets")),
      reps: get(r, "reps") || null,
      intensityType: (intensity || null) as IntensityType | null,
      intensityValue: num(get(r, "intensity_value")),
      distanceM: int(get(r, "distance_m")),
      durationSec: int(get(r, "duration_sec")),
      restSec: int(get(r, "rest_sec")),
      notes: get(r, "notes") || null,
    });
  });

  const result: ImportedVariant[] = [...variants.entries()]
    .sort(([a], [b]) => a - b)
    .map(([daysPerWeek, weeks]) => ({
      daysPerWeek,
      weeks: [...weeks.entries()]
        .sort(([a], [b]) => a - b)
        .map(([weekNumber, sessions]) => ({
          weekNumber,
          sessions: [...sessions.values()].sort((a, b) => a.order - b.order),
        })),
    }));

  for (const v of result) {
    const expected = v.weeks.length;
    const last = v.weeks[v.weeks.length - 1]?.weekNumber;
    if (last !== expected) errors.push(`${v.daysPerWeek}-day version: weeks should run 1–${last} with no gaps`);
  }

  return { variants: result, errors };
}

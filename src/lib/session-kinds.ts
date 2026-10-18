import type { SessionKind } from "@prisma/client";

/**
 * Colour-coding for each type of session, used by the calendar.
 * Class names are written out in full so Tailwind can find them.
 */
export const SESSION_KINDS: Record<SessionKind, { label: string; bar: string; chip: string; dot: string }> = {
  STRENGTH: { label: "Strength", bar: "bg-indigo-500", chip: "bg-indigo-100 text-indigo-900", dot: "bg-indigo-500" },
  HYPERTROPHY: { label: "Hypertrophy", bar: "bg-violet-500", chip: "bg-violet-100 text-violet-900", dot: "bg-violet-500" },
  RUN_EASY: { label: "Easy run", bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-900", dot: "bg-emerald-500" },
  RUN_TEMPO: { label: "Tempo", bar: "bg-amber-500", chip: "bg-amber-100 text-amber-900", dot: "bg-amber-500" },
  RUN_INTERVALS: { label: "Intervals", bar: "bg-orange-500", chip: "bg-orange-100 text-orange-900", dot: "bg-orange-500" },
  RUN_LONG: { label: "Long run", bar: "bg-sky-500", chip: "bg-sky-100 text-sky-900", dot: "bg-sky-500" },
  CONDITIONING: { label: "Conditioning", bar: "bg-rose-500", chip: "bg-rose-100 text-rose-900", dot: "bg-rose-500" },
  HYROX_SIM: { label: "Hyrox sim", bar: "bg-lime-500", chip: "bg-lime-100 text-lime-900", dot: "bg-lime-500" },
  METCON: { label: "Metcon", bar: "bg-pink-500", chip: "bg-pink-100 text-pink-900", dot: "bg-pink-500" },
  SKILL: { label: "Skill", bar: "bg-teal-500", chip: "bg-teal-100 text-teal-900", dot: "bg-teal-500" },
  RECOVERY: { label: "Recovery", bar: "bg-slate-400", chip: "bg-slate-100 text-slate-800", dot: "bg-slate-400" },
};

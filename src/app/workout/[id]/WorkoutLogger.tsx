"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatPace } from "@/lib/engine/units";
import { logWorkoutAction, type LogInput } from "./actions";

export interface LoggerItem {
  exerciseId: string;
  name: string;
  prescription: string;
  notes: string | null;
  /** sets = weight × reps rows · cardio = distance + time · check = tick off (yoga, Pilates, stations) */
  kind: "sets" | "cardio" | "check";
  sets: number;
  targetReps?: number;
  targetKg?: number;
  targetDistanceM?: number;
  targetPaceSecPerKm?: number;
  lastTime?: string;
  /** What the athlete logged before, when re-opening a completed session */
  logged?: { sets?: { reps: number; kg?: number }[]; cardio?: { distanceM?: number; durationSec: number } };
}

type SetRow = { kg: string; reps: string; done: boolean };
type CardioRow = { km: string; min: string; sec: string; done: boolean };

const RPE = [
  { max: 3, label: "Easy", tone: "bg-emerald-500" },
  { max: 6, label: "Moderate", tone: "bg-amber-400" },
  { max: 8, label: "Hard", tone: "bg-orange-500" },
  { max: 10, label: "Max effort", tone: "bg-rose-600" },
];
const rpeInfo = (n: number) => RPE.find((r) => n <= r.max)!;

export function WorkoutLogger({ scheduledWorkoutId, items, alreadyLogged, initialRpe, initialNotes }: {
  scheduledWorkoutId: string; items: LoggerItem[]; alreadyLogged: boolean; initialRpe?: number; initialNotes: string;
}) {
  // Pre-fill from the previous log, or from the prescription so a session that went to plan is one tap per set.
  const [sets, setSets] = useState<SetRow[][]>(() =>
    items.map((it) => {
      if (it.kind === "cardio") return [];
      if (it.logged?.sets) return it.logged.sets.map((s) => ({ kg: s.kg != null ? String(s.kg) : "", reps: String(s.reps), done: true }));
      return Array.from({ length: it.sets }, () => ({
        kg: it.targetKg != null ? String(it.targetKg) : "",
        reps: it.targetReps != null ? String(it.targetReps) : "",
        done: alreadyLogged && it.kind === "check",
      }));
    }),
  );
  const [cardio, setCardio] = useState<CardioRow[]>(() =>
    items.map((it) => {
      const c = it.logged?.cardio;
      const metres = c?.distanceM ?? it.targetDistanceM;
      return {
        km: metres ? String(metres / 1000) : "",
        min: c ? String(Math.floor(c.durationSec / 60)) : "",
        sec: c ? String(c.durationSec % 60).padStart(2, "0") : "",
        done: !!c,
      };
    }),
  );
  const [rpe, setRpe] = useState(initialRpe ?? 7);
  const [notes, setNotes] = useState(initialNotes);
  const [result, setResult] = useState<{ newBests: string[] } | null>(null);
  const [pending, startTransition] = useTransition();

  const updateSet = (i: number, j: number, patch: Partial<SetRow>) =>
    setSets((all) => all.map((rows, a) => (a === i ? rows.map((r, b) => (b === j ? { ...r, ...patch } : r)) : rows)));
  const updateCardio = (i: number, patch: Partial<CardioRow>) =>
    setCardio((all) => all.map((c, a) => (a === i ? { ...c, ...patch } : c)));
  const addSet = (i: number) =>
    setSets((all) => all.map((rows, a) => (a === i ? [...rows, { ...(rows.at(-1) ?? { kg: "", reps: "" }), done: false }] : rows)));

  const seconds = (c: CardioRow) => (Number(c.min) || 0) * 60 + (Number(c.sec) || 0);
  const totalUnits = items.reduce((n, it, i) => n + (it.kind === "cardio" ? 1 : sets[i].length), 0);
  const doneUnits = items.reduce((n, it, i) => n + (it.kind === "cardio" ? (cardio[i].done ? 1 : 0) : sets[i].filter((r) => r.done).length), 0);

  function submit() {
    const payload: LogInput = {
      scheduledWorkoutId,
      rpe,
      notes: notes || undefined,
      sets: items.flatMap((it, i) =>
        it.kind !== "sets" ? [] : sets[i].filter((r) => r.done).map((r, j) => ({
          exerciseId: it.exerciseId, setNumber: j + 1, reps: Number(r.reps) || 0, weightKg: Number(r.kg) || undefined,
        })),
      ),
      cardio: items.flatMap((it, i) => {
        const c = cardio[i];
        const s = seconds(c);
        return it.kind === "cardio" && c.done && s > 0
          ? [{ exerciseId: it.exerciseId, durationSec: s, distanceM: Math.round((Number(c.km) || 0) * 1000) || undefined }]
          : [];
      }),
    };
    startTransition(async () => setResult(await logWorkoutAction(payload)));
  }

  if (result) {
    return (
      <div className="rounded-3xl border border-line bg-white p-8 text-center animate-[pop-in_0.4s_ease-out]">
        <p className="text-5xl">💪</p>
        <h2 className="mt-3 text-2xl font-black">Session logged</h2>
        {result.newBests.length > 0 && (
          <p className="mt-4 inline-block rounded-full bg-brand px-4 py-1.5 font-semibold">New best: {result.newBests.join(", ")}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/calendar" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Back to calendar</Link>
          <Link href="/progress" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">See progress</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {items.map((it, i) => (
          <section key={`${it.exerciseId}-${i}`} className="rounded-3xl border border-line bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-muted">{i + 1} of {items.length}</p>
                <h3 className="text-lg font-bold">{it.name}</h3>
                <p className="mt-0.5 inline-block rounded-lg bg-paper px-2 py-0.5 text-sm font-semibold">{it.prescription}</p>
              </div>
              {it.lastTime && <p className="shrink-0 text-right text-xs text-muted">Last time<br /><b className="text-ink">{it.lastTime}</b></p>}
            </div>
            {it.notes && <p className="mt-2 text-sm text-muted">{it.notes}</p>}

            {it.kind === "sets" && (
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  <span>Set</span><span className="text-center">kg</span><span className="text-center">Reps</span><span />
                </div>
                {sets[i].map((row, j) => (
                  <div key={j} className={`grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 rounded-2xl p-1 transition ${row.done ? "bg-emerald-50" : ""}`}>
                    <span className="text-center text-sm font-bold text-muted">{j + 1}</span>
                    <Stepper value={row.kg} step={2.5} label={`Set ${j + 1} kilograms`} onChange={(kg) => updateSet(i, j, { kg })} />
                    <Stepper value={row.reps} step={1} label={`Set ${j + 1} reps`} onChange={(reps) => updateSet(i, j, { reps })} />
                    <DoneToggle done={row.done} label={`Set ${j + 1}`} onClick={() => updateSet(i, j, { done: !row.done })} />
                  </div>
                ))}
                <button onClick={() => addSet(i)} className="w-full rounded-xl border border-dashed border-line py-2 text-sm font-semibold text-muted hover:border-ink hover:text-ink">
                  + Add set
                </button>
              </div>
            )}

            {it.kind === "check" && (
              <div className="mt-4 flex flex-wrap gap-2">
                {sets[i].map((row, j) => (
                  <button key={j} onClick={() => updateSet(i, j, { done: !row.done })} aria-pressed={row.done}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${row.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line hover:border-ink"}`}>
                    {row.done ? "✓" : "○"} {sets[i].length > 1 ? `Round ${j + 1}` : "Done"}
                  </button>
                ))}
              </div>
            )}

            {it.kind === "cardio" && (() => {
              const c = cardio[i];
              const km = Number(c.km) || 0;
              const s = seconds(c);
              const pace = km > 0 && s > 0 ? s / km : null;
              return (
                <div className={`mt-4 rounded-2xl p-3 transition ${c.done ? "bg-emerald-50" : "bg-paper"}`}>
                  <div className="grid grid-cols-[1fr_1fr_2.75rem] items-end gap-3">
                    <Field label="Distance (km)">
                      <input value={c.km} onChange={(e) => updateCardio(i, { km: e.target.value })} inputMode="decimal" placeholder="5"
                        className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-center text-lg font-bold" />
                    </Field>
                    <Field label="Time (min : sec)">
                      <div className="flex items-center gap-1">
                        <input value={c.min} onChange={(e) => updateCardio(i, { min: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="25" aria-label="Minutes"
                          className="w-full rounded-xl border border-line bg-white px-2 py-2.5 text-center text-lg font-bold" />
                        <span className="font-bold">:</span>
                        <input value={c.sec} onChange={(e) => updateCardio(i, { sec: e.target.value.replace(/\D/g, "").slice(0, 2) })} inputMode="numeric" placeholder="00" aria-label="Seconds"
                          className="w-full rounded-xl border border-line bg-white px-2 py-2.5 text-center text-lg font-bold" />
                      </div>
                    </Field>
                    <DoneToggle done={c.done} label={it.name} onClick={() => updateCardio(i, { done: !c.done })} />
                  </div>
                  <p className="mt-2 text-sm">
                    {pace ? <>Pace <b>{formatPace(pace)}</b></> : <span className="text-muted">Enter distance and time to see your pace</span>}
                    {it.targetPaceSecPerKm && <span className="text-muted"> · target {formatPace(it.targetPaceSecPerKm)}</span>}
                  </p>
                </div>
              );
            })()}
          </section>
        ))}

        <section className="rounded-3xl border border-line bg-white p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold">How hard was it?</h3>
            <p className="text-sm"><b>RPE {rpe}</b> · {rpeInfo(rpe).label}</p>
          </div>
          <div className="mt-3 grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => (
              <button key={n} onClick={() => setRpe(n)} aria-pressed={rpe === n}
                className={`rounded-lg py-2.5 text-sm font-bold transition ${n <= rpe ? `${rpeInfo(n).tone} text-white` : "bg-paper text-muted"} ${n === rpe ? "ring-2 ring-ink ring-offset-1" : ""}`}>
                {n}
              </button>
            ))}
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel? Anything to remember next time?"
            className="mt-4 w-full rounded-2xl border border-line px-4 py-3 text-sm" rows={2} />
        </section>
      </div>

      {/* Sticky finish bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted">{doneUnits} of {totalUnits} done</p>
            <div className="mt-1 h-1.5 rounded-full bg-line">
              <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${totalUnits ? (doneUnits / totalUnits) * 100 : 0}%` }} />
            </div>
          </div>
          <button onClick={submit} disabled={pending}
            className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-bold text-brand-ink transition hover:brightness-95 disabled:opacity-60">
            {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {pending ? "Saving…" : alreadyLogged ? "Update log" : "Finish workout"}
          </button>
        </div>
      </div>
    </>
  );
}

function Stepper({ value, step, label, onChange }: { value: string; step: number; label: string; onChange: (v: string) => void }) {
  const bump = (dir: 1 | -1) => onChange(String(Math.max(0, Math.round(((Number(value) || 0) + dir * step) * 10) / 10)));
  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-line bg-white">
      <button type="button" onClick={() => bump(-1)} aria-label={`Decrease ${label}`} className="px-2.5 py-2 text-lg font-bold text-muted hover:bg-paper">−</button>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" aria-label={label}
        className="w-full min-w-0 bg-transparent py-2 text-center text-base font-bold outline-none" />
      <button type="button" onClick={() => bump(1)} aria-label={`Increase ${label}`} className="px-2.5 py-2 text-lg font-bold text-muted hover:bg-paper">+</button>
    </div>
  );
}

function DoneToggle({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={done} aria-label={`Mark ${label} done`}
      className={`grid h-11 w-11 place-items-center rounded-full text-lg font-bold transition ${done ? "bg-emerald-500 text-white scale-105" : "border-2 border-line text-line hover:border-ink hover:text-ink"}`}>
      ✓
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

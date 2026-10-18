"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { parseTime } from "@/lib/engine/units";
import { logWorkoutAction, type LogInput } from "./actions";

export interface LoggerItem {
  exerciseId: string;
  name: string;
  prescription: string;
  notes: string | null;
  kind: "sets" | "cardio";
  sets: number;
  targetReps?: number;
  targetKg?: number;
  targetDistanceM?: number;
}

type SetRow = { reps: string; kg: string; done: boolean };
type CardioRow = { distance: string; time: string };

export function WorkoutLogger({ scheduledWorkoutId, items }: { scheduledWorkoutId: string; items: LoggerItem[] }) {
  // Pre-fill with the prescription so a session that went to plan is one tap per set.
  const [sets, setSets] = useState<SetRow[][]>(() =>
    items.map((it) =>
      it.kind === "sets"
        ? Array.from({ length: it.sets }, () => ({ reps: String(it.targetReps ?? ""), kg: String(it.targetKg ?? ""), done: false }))
        : [],
    ),
  );
  const [cardio, setCardio] = useState<CardioRow[]>(() => items.map((it) => ({ distance: String(it.targetDistanceM ?? ""), time: "" })));
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<{ newBests: string[] } | null>(null);
  const [pending, startTransition] = useTransition();

  const updateSet = (i: number, j: number, patch: Partial<SetRow>) =>
    setSets(sets.map((rows, a) => (a === i ? rows.map((r, b) => (b === j ? { ...r, ...patch } : r)) : rows)));

  function submit() {
    const payload: LogInput = {
      scheduledWorkoutId,
      rpe,
      notes: notes || undefined,
      sets: items.flatMap((it, i) =>
        sets[i]
          .filter((r) => r.done)
          .map((r, j) => ({ exerciseId: it.exerciseId, setNumber: j + 1, reps: Number(r.reps) || 0, weightKg: Number(r.kg) || undefined })),
      ),
      cardio: items.flatMap((it, i) => {
        const seconds = it.kind === "cardio" ? parseTime(cardio[i].time) : null;
        return seconds ? [{ exerciseId: it.exerciseId, durationSec: seconds, distanceM: Number(cardio[i].distance) || undefined }] : [];
      }),
    };
    startTransition(async () => setResult(await logWorkoutAction(payload)));
  }

  if (result) {
    return (
      <Card className="space-y-4 p-8 text-center">
        <p className="text-4xl">💪</p>
        <h2 className="text-2xl font-bold">Session logged</h2>
        {result.newBests.length > 0 && (
          <p className="inline-block rounded-full bg-brand px-4 py-1.5 font-semibold">New best: {result.newBests.join(", ")}</p>
        )}
        <div className="flex justify-center gap-3">
          <Link href="/dashboard" className="font-semibold underline">Back to plan</Link>
          <Link href="/progress" className="font-semibold underline">See progress</Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((it, i) => (
        <Card key={`${it.exerciseId}-${i}`}>
          <p className="font-semibold">{it.name}</p>
          <p className="text-sm text-muted">{it.prescription}</p>
          {it.notes && <p className="mt-1 text-xs text-muted">{it.notes}</p>}

          {it.kind === "sets" ? (
            <div className="mt-3 space-y-2">
              {sets[i].map((row, j) => (
                <div key={j} className="flex items-center gap-2 text-sm">
                  <span className="w-10 text-muted">Set {j + 1}</span>
                  <input value={row.kg} onChange={(e) => updateSet(i, j, { kg: e.target.value })} inputMode="decimal" className="w-20 rounded-lg border border-line px-2 py-1.5" aria-label="kg" />
                  <span className="text-muted">kg ×</span>
                  <input value={row.reps} onChange={(e) => updateSet(i, j, { reps: e.target.value })} inputMode="numeric" className="w-16 rounded-lg border border-line px-2 py-1.5" aria-label="reps" />
                  <button
                    onClick={() => updateSet(i, j, { done: !row.done })}
                    className={`ml-auto h-8 w-8 rounded-full ${row.done ? "bg-brand text-brand-ink" : "border border-line"}`}
                    aria-label={`Mark set ${j + 1} done`}
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <input value={cardio[i].distance} onChange={(e) => setCardio(cardio.map((c, a) => (a === i ? { ...c, distance: e.target.value } : c)))} inputMode="numeric" placeholder="5000" className="w-24 rounded-lg border border-line px-2 py-1.5" />
              <span className="text-muted">metres in</span>
              <input value={cardio[i].time} onChange={(e) => setCardio(cardio.map((c, a) => (a === i ? { ...c, time: e.target.value } : c)))} placeholder="25:00" className="w-24 rounded-lg border border-line px-2 py-1.5" />
            </div>
          )}
        </Card>
      ))}

      <Card className="space-y-3">
        <label className="block text-sm font-medium">
          How hard was it overall? <b>RPE {rpe}</b>
          <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="mt-2 w-full accent-black" />
        </label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full rounded-xl border border-line px-3 py-2 text-sm" rows={2} />
      </Card>

      <Button variant="brand" className="w-full" onClick={submit} disabled={pending}>{pending ? "Saving…" : "Finish & log session"}</Button>
    </div>
  );
}

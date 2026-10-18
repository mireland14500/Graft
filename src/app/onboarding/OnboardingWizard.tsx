"use client";

import { useMemo, useState, useTransition } from "react";
import { ProjectionChart } from "@/components/ProjectionChart";
import { Badge, Button, Card } from "@/components/ui";
import { projectAll, suggestLevel } from "@/lib/engine/preview";
import { dotsScore } from "@/lib/engine/strength";
import { formatBenchmark, parseTime } from "@/lib/engine/units";
import { EQUIPMENT, LEVELS, SPORT_DEFS, WEEKDAYS, type Level, type Sport } from "@/lib/sports";
import { submitPlanRequest } from "./actions";

const STEPS = ["Sport", "Goal", "Your numbers", "Experience", "Schedule", "Plan length", "Preview"] as const;

const LEVEL_COPY: Record<Level, string> = {
  BEGINNER: "Under a year of structured training",
  INTERMEDIATE: "1–3 years, progress is slowing",
  ADVANCED: "3+ years, competing or close to it",
};

export function OnboardingWizard({ initialSport }: { initialSport?: Sport }) {
  const [step, setStep] = useState(initialSport ? 1 : 0);
  const [sport, setSport] = useState<Sport | null>(initialSport ?? null);
  const [goal, setGoal] = useState("");
  const [rawBenchmarks, setRawBenchmarks] = useState<Record<string, string>>({});
  const [sex, setSex] = useState<"male" | "female">("male");
  const [bodyweight, setBodyweight] = useState("");
  const [level, setLevel] = useState<Level | "UNSURE">("UNSURE");
  const [days, setDays] = useState<number[]>([0, 2, 4]);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [weeks, setWeeks] = useState(12);
  const [equipment, setEquipment] = useState<string[]>(["full_gym"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const def = sport ? SPORT_DEFS[sport] : null;

  // Convert "25:00" / "140" strings to stored units (seconds / kg)
  const benchmarks = useMemo(() => {
    const out: Record<string, number> = {};
    for (const b of def?.benchmarks ?? []) {
      const raw = rawBenchmarks[b.key]?.trim();
      if (!raw) continue;
      const v = b.unit === "time" ? parseTime(raw) : Number(raw);
      if (v && v > 0) out[b.key] = v;
    }
    return out;
  }, [def, rawBenchmarks]);

  const bodyweightKg = Number(bodyweight) || undefined;
  const resolvedLevel: Level =
    level === "UNSURE" && sport ? suggestLevel(sport, benchmarks, { sex, bodyweightKg }) : (level as Level);

  const projections = useMemo(
    () =>
      sport && step === STEPS.length - 1
        ? projectAll({ sport, goal, level: resolvedLevel, weeks, daysPerWeek: days.length, benchmarks })
        : [],
    [sport, goal, resolvedLevel, weeks, days.length, benchmarks, step],
  );

  const canContinue = [
    !!sport,
    !!goal,
    def?.benchmarks.every((b) => b.optional || benchmarks[b.key]) ?? false,
    true,
    days.length > 0,
    equipment.length > 0,
    true,
  ][step];

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function submit() {
    if (!sport) return;
    setError(null);
    startTransition(async () => {
      const res = await submitPlanRequest({
        sport, goal, level: resolvedLevel, availableDays: [...days].sort((a, b) => a - b), sessionMinutes,
        durationWeeks: weeks, equipment, benchmarks, sex, bodyweightKg,
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-ink" : "bg-line"}`} />
        ))}
      </div>
      <p className="text-sm font-medium text-muted">Step {step + 1} of {STEPS.length}</p>
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{STEPS[step]}</h1>

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.values(SPORT_DEFS).map((s) => (
            <Choice key={s.id} selected={sport === s.id} onClick={() => { setSport(s.id); setGoal(""); }} title={s.name} body={s.tagline} />
          ))}
        </div>
      )}

      {step === 1 && def && (
        <div className="grid gap-3">
          {def.goals.map((g) => (
            <Choice key={g.id} selected={goal === g.id} onClick={() => setGoal(g.id)} title={g.label} />
          ))}
        </div>
      )}

      {step === 2 && def && (
        <Card className="space-y-4">
          {def.benchmarks.map((b) => (
            <label key={b.key} className="block">
              <span className="text-sm font-medium">
                {b.label} {b.optional && <span className="text-muted">(optional)</span>}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  inputMode={b.unit === "kg" ? "decimal" : "text"}
                  placeholder={b.placeholder}
                  value={rawBenchmarks[b.key] ?? ""}
                  onChange={(e) => setRawBenchmarks({ ...rawBenchmarks, [b.key]: e.target.value })}
                  className="w-40 rounded-xl border border-line px-3 py-2"
                />
                <span className="text-sm text-muted">{b.unit === "kg" ? "kg" : "mm:ss or h:mm:ss"}</span>
              </div>
            </label>
          ))}
          <div className="flex gap-4 border-t border-line pt-4">
            <label className="block">
              <span className="text-sm font-medium">Bodyweight</span>
              <input value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} placeholder="80" inputMode="decimal" className="mt-1 block w-28 rounded-xl border border-line px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Sex</span>
              <select value={sex} onChange={(e) => setSex(e.target.value as "male" | "female")} className="mt-1 block rounded-xl border border-line px-3 py-2">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-muted">Used to personalise weights and paces. Don&apos;t know a 1RM? Use a recent heavy single or your best guess.</p>
        </Card>
      )}

      {step === 3 && (
        <div className="grid gap-3">
          <Choice
            selected={level === "UNSURE"}
            onClick={() => setLevel("UNSURE")}
            title="Not sure — estimate it for me"
            body={sport ? `From your numbers we'd say: ${suggestLevel(sport, benchmarks, { sex, bodyweightKg }).toLowerCase()}` : undefined}
          />
          {LEVELS.map((l) => (
            <Choice key={l} selected={level === l} onClick={() => setLevel(l)} title={l[0] + l.slice(1).toLowerCase()} body={LEVEL_COPY[l]} />
          ))}
        </div>
      )}

      {step === 4 && (
        <Card className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">Which days can you train?</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setDays(toggle(days, i))}
                  className={`h-12 w-12 rounded-full text-sm font-semibold ${days.includes(i) ? "bg-ink text-white" : "border border-line bg-white"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted">{days.length} days per week</p>
          </div>
          <label className="block">
            <span className="text-sm font-medium">How long can each session be? <b>{sessionMinutes} min</b></span>
            <input type="range" min={30} max={120} step={15} value={sessionMinutes} onChange={(e) => setSessionMinutes(Number(e.target.value))} className="mt-2 w-full accent-black" />
          </label>
        </Card>
      )}

      {step === 5 && (
        <Card className="space-y-6">
          <label className="block">
            <span className="text-sm font-medium">Plan length: <b>{weeks} weeks</b></span>
            <input type="range" min={4} max={24} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="mt-2 w-full accent-black" />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">What equipment do you have?</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEquipment(toggle(equipment, e.id))}
                  className={`rounded-full px-3 py-1.5 text-sm ${equipment.includes(e.id) ? "bg-ink text-white" : "border border-line bg-white"}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {step === 6 && def && (
        <div className="space-y-4">
          <p className="text-muted">
            What your numbers could look like after <b>{weeks} weeks</b> training <b>{days.length}×/week</b> as{" "}
            {resolvedLevel === "INTERMEDIATE" ? "an" : "a"} <b>{resolvedLevel.toLowerCase()}</b>.
          </p>
          {projections.length === 0 && <Card>Add at least one number in “Your numbers” to see a projection.</Card>}
          {projections[0] && (
            <Card>
              <p className="font-semibold">{projections[0].label}</p>
              <ProjectionChart points={projections[0].points} unit={projections[0].unit} better={projections[0].better} />
            </Card>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {projections.map((p) => {
              const end = p.points[p.points.length - 1];
              const [lo, hi] = p.better === "lower" ? [end.high, end.low] : [end.low, end.high];
              return (
                <Card key={p.key}>
                  <p className="text-sm text-muted">{p.label}</p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatBenchmark(p.unit, p.current)} → <span className="bg-brand px-1">{formatBenchmark(p.unit, end.expected)}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">Likely range {formatBenchmark(p.unit, lo)} – {formatBenchmark(p.unit, hi)}</p>
                  {p.key === "total" && bodyweightKg && (
                    <Badge>DOTS {dotsScore(p.current, bodyweightKg, sex).toFixed(0)} → {dotsScore(end.expected, bodyweightKg, sex).toFixed(0)}</Badge>
                  )}
                </Card>
              );
            })}
          </div>
          <p className="text-xs text-muted">
            Estimates based on typical progress for your level, frequency and ~90% session adherence. They update as you log training.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>Back</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>Continue</Button>
        ) : (
          <Button variant="brand" onClick={submit} disabled={pending}>{pending ? "Finding plans…" : "Find my plan"}</Button>
        )}
      </div>
    </div>
  );
}

function Choice({ selected, onClick, title, body }: { selected: boolean; onClick: () => void; title: string; body?: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${selected ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}
    >
      <p className="font-semibold">{title}</p>
      {body && <p className={`mt-1 text-sm ${selected ? "text-white/70" : "text-muted"}`}>{body}</p>}
    </button>
  );
}

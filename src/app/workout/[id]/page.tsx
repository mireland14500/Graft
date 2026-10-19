import Link from "next/link";
import { notFound } from "next/navigation";
import { latestBenchmarks } from "@/lib/benchmarks";
import { formatKm } from "@/lib/calendar";
import { prisma } from "@/lib/db";
import { resolvePrescription } from "@/lib/engine/prescription";
import { racePredictions } from "@/lib/engine/race";
import { formatBenchmark, formatTime } from "@/lib/engine/units";
import { activeEnrollments } from "@/lib/enrollment";
import { planProgress } from "@/lib/plan-progress";
import { requireUser } from "@/lib/session";
import { SESSION_KINDS } from "@/lib/session-kinds";
import { benchmarkDef } from "@/lib/sports";
import { KIND_GUIDANCE } from "@/lib/workout-details";
import { WorkoutLogger, type LoggerItem } from "./WorkoutLogger";

const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/workout/${id}`);

  const workout = await prisma.scheduledWorkout.findFirst({
    where: { id, enrollment: { userId: user.id } },
    include: {
      enrollment: { include: { plan: true } },
      log: { include: { sets: { orderBy: { setNumber: "asc" } }, cardio: true } },
      planSession: { include: { items: { include: { exercise: true }, orderBy: { order: "asc" } } } },
    },
  });
  if (!workout) notFound();

  const session = workout.planSession;
  const style = SESSION_KINDS[session.kind];
  const benchmarks = await latestBenchmarks(user.id);

  // "Last time" hints: the athlete's most recent sets of each lift outside this session
  const exerciseIds = session.items.map((i) => i.exerciseId);
  const previous = await prisma.setLog.findMany({
    where: { exerciseId: { in: exerciseIds }, log: { userId: user.id, NOT: { scheduledWorkoutId: workout.id } } },
    orderBy: [{ log: { performedAt: "desc" } }, { weightKg: "desc" }],
    take: 100,
  });
  const lastTime = new Map<string, string>();
  const lastKg = new Map<string, number>();
  for (const s of previous) {
    if (lastTime.has(s.exerciseId)) continue;
    lastTime.set(s.exerciseId, s.weightKg ? `${s.weightKg} kg × ${s.reps}` : `${s.reps} reps`);
    if (s.weightKg) lastKg.set(s.exerciseId, s.weightKg);
  }

  const items: LoggerItem[] = session.items.map((item) => {
    const resolved = resolvePrescription({ ...item, exerciseName: item.exercise.name, benchmarkKey: item.exercise.benchmarkKey }, benchmarks);
    const category = item.exercise.category;
    const kind = ["run", "erg"].includes(category) ? "cardio" : ["flow", "station"].includes(category) ? "check" : "sets";
    const loggedSets = workout.log?.sets.filter((s) => s.exerciseId === item.exerciseId) ?? [];
    const loggedCardio = workout.log?.cardio.find((c) => c.exerciseId === item.exerciseId);
    return {
      exerciseId: item.exerciseId,
      name: item.exercise.name,
      prescription: resolved.label,
      notes: item.notes,
      kind,
      sets: Math.max(item.sets ?? 1, loggedSets.length),
      targetReps: Number.parseInt(item.reps ?? "", 10) || undefined,
      // RPE-based lifts have no set load, so start from what they lifted last time
      targetKg: resolved.targetKg ?? lastKg.get(item.exerciseId),
      // Interval reps are logged as one block, so pre-fill the session total (e.g. 5 × 1km = 5km)
      targetDistanceM: item.distanceM ? item.distanceM * (kind === "cardio" ? item.sets ?? 1 : 1) : undefined,
      targetPaceSecPerKm: resolved.targetPaceSecPerKm,
      lastTime: lastTime.get(item.exerciseId),
      logged: loggedSets.length
        ? { sets: loggedSets.map((s) => ({ reps: s.reps, kg: s.weightKg ?? undefined })) }
        : loggedCardio
          ? { cardio: { distanceM: loggedCardio.distanceM ?? undefined, durationSec: loggedCardio.durationSec } }
          : undefined,
    };
  });

  const totalSets = session.items.reduce((s, i) => s + (i.sets ?? 0), 0);
  const runMetres = session.items.reduce((s, i) => (i.exercise.category === "run" && i.distanceM ? s + i.distanceM * (i.sets ?? 1) : s), 0);

  // Estimates for the bottom of the page, from the plan this session belongs to
  const enrollment = (await activeEnrollments(user.id)).find((e) => e.id === workout.enrollmentId);
  const progress = enrollment ? await planProgress(user.id, enrollment) : null;

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <Link href="/calendar" className="text-sm font-semibold text-muted hover:text-ink">← Calendar</Link>

      <header className={`mt-3 overflow-hidden rounded-3xl p-6 ${style.chip}`}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
          {longDate.format(workout.date)} · {workout.enrollment.plan.title} · Week {workout.weekNumber}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{session.title}</h1>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Type" value={style.label} />
          <Stat label="Time" value={`~${session.estMinutes} min`} />
          <Stat label={runMetres ? "Distance" : "Sets"} value={runMetres ? formatKm(runMetres) : String(totalSets || session.items.length)} />
        </div>
      </header>

      <section className="mt-6 rounded-3xl border border-line bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">What to do</p>
        <p className="mt-2 leading-relaxed">{KIND_GUIDANCE[session.kind]}</p>
        {session.notes && <p className="mt-2 text-sm text-muted">{session.notes}</p>}
      </section>

      <div className="mt-6">
        <WorkoutLogger scheduledWorkoutId={workout.id} items={items} alreadyLogged={workout.completed} initialRpe={workout.log?.rpe ?? undefined} initialNotes={workout.log?.notes ?? ""} />
      </div>

      {progress && <Estimates benchmarks={benchmarks} progress={progress} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-2 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">{label}</p>
      <p className="truncate font-bold">{value}</p>
    </div>
  );
}

/** Estimated race times (or maxes) now, and where the plan could take them. */
function Estimates({ benchmarks, progress }: { benchmarks: Record<string, number>; progress: NonNullable<Awaited<ReturnType<typeof planProgress>>> }) {
  const projected = (key: string) => progress.metrics.find((m) => m.key === key)?.points.at(-1)?.expected;
  const rows: { label: string; now: string; then?: string }[] = [];

  if (benchmarks.run_5k) {
    const later = projected("run_5k");
    const laterRaces = later ? racePredictions(later) : [];
    racePredictions(benchmarks.run_5k).forEach((r, i) =>
      rows.push({ label: r.label, now: formatTime(r.seconds), then: laterRaces[i] && formatTime(laterRaces[i].seconds) }),
    );
  }
  if (benchmarks.hyrox_time) {
    const later = projected("hyrox_time");
    rows.push({ label: "Hyrox", now: formatTime(benchmarks.hyrox_time), then: later ? formatTime(later) : undefined });
  }
  const isRace = rows.length > 0;
  if (!isRace) {
    for (const key of ["squat_1rm", "back_squat_1rm", "bench_1rm", "deadlift_1rm", "clean_jerk_1rm"]) {
      const def = benchmarkDef(key);
      if (!def || !benchmarks[key]) continue;
      const later = projected(key);
      rows.push({ label: def.label.replace(" 1RM", ""), now: formatBenchmark("kg", benchmarks[key]), then: later ? formatBenchmark("kg", later) : undefined });
    }
  }
  if (rows.length === 0) return null;

  return (
    <section className="mt-10 rounded-3xl bg-ink p-6 text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-brand">{isRace ? "Estimated race times" : "Estimated maxes"}</p>
      <p className="mt-1 text-sm text-white/60">Based on your latest logged numbers, and where this plan could take you by week {progress.weeks}.</p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-3 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          <span>{isRace ? "Race" : "Lift"}</span><span className="text-right">Now</span><span className="text-right">End of plan</span>
        </div>
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-3 border-t border-white/10 px-4 py-3">
            <span className="font-semibold">{r.label}</span>
            <span className="text-right tabular-nums">{r.now}</span>
            <span className="text-right font-bold tabular-nums text-brand">{r.then ?? "—"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

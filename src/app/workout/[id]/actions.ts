"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordIfBetter } from "@/lib/benchmarks";
import { prisma } from "@/lib/db";
import { riegel } from "@/lib/engine/running";
import { estimate1RM } from "@/lib/engine/strength";
import { requireUser } from "@/lib/session";
import { benchmarkDef } from "@/lib/sports";

const logSchema = z.object({
  scheduledWorkoutId: z.string(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
  sets: z.array(z.object({
    exerciseId: z.string(),
    setNumber: z.number().int().min(1),
    reps: z.number().int().min(0).max(100),
    weightKg: z.number().min(0).max(600).optional(),
  })),
  cardio: z.array(z.object({
    exerciseId: z.string(),
    distanceM: z.number().int().min(0).optional(),
    durationSec: z.number().int().min(1),
  })),
});
export type LogInput = z.infer<typeof logSchema>;

/** Benchmarks we can read directly off a logged distance. */
const BENCHMARK_DISTANCE: Record<string, number> = { run_5k: 5000, run_10k: 10000, row_1k: 1000, row_2k: 2000 };

export async function logWorkoutAction(raw: LogInput): Promise<{ newBests: string[] }> {
  const user = await requireUser();
  const input = logSchema.parse(raw);

  const scheduled = await prisma.scheduledWorkout.findFirstOrThrow({
    where: { id: input.scheduledWorkoutId, enrollment: { userId: user.id } },
  });

  await prisma.$transaction([
    prisma.workoutLog.upsert({
      where: { scheduledWorkoutId: scheduled.id },
      // Re-logging replaces the previous entry
      update: {
        rpe: input.rpe, notes: input.notes,
        sets: { deleteMany: {}, create: input.sets },
        cardio: { deleteMany: {}, create: input.cardio },
      },
      create: {
        userId: user.id, scheduledWorkoutId: scheduled.id, rpe: input.rpe, notes: input.notes,
        sets: { create: input.sets },
        cardio: { create: input.cardio },
      },
    }),
    prisma.scheduledWorkout.update({ where: { id: scheduled.id }, data: { completed: true } }),
  ]);

  // Turn the session into benchmark updates so projections and %1RM prescriptions stay current.
  const exerciseIds = [...new Set([...input.sets, ...input.cardio].map((x) => x.exerciseId))];
  const exercises = await prisma.exercise.findMany({ where: { id: { in: exerciseIds } } });
  const keyOf = new Map(exercises.map((e) => [e.id, e.benchmarkKey]));
  const newBests: string[] = [];

  const bestE1rm = new Map<string, number>();
  for (const s of input.sets) {
    const key = keyOf.get(s.exerciseId);
    if (!key || !s.weightKg || s.reps < 1 || s.reps > 10) continue;
    bestE1rm.set(key, Math.max(bestE1rm.get(key) ?? 0, estimate1RM(s.weightKg, s.reps)));
  }
  for (const [key, value] of bestE1rm) {
    if (await recordIfBetter(user.id, key, Math.round(value * 2) / 2, "higher")) newBests.push(benchmarkDef(key)?.label ?? key);
  }

  for (const c of input.cardio) {
    const key = keyOf.get(c.exerciseId);
    const target = key ? BENCHMARK_DISTANCE[key] : undefined;
    if (!key || !target || !c.distanceM) continue;
    let equivalent: number | null = null;
    if (c.distanceM === target) equivalent = c.durationSec;
    // A hard effort over a nearby distance is a fair predictor (easy runs are not).
    else if ((input.rpe ?? 0) >= 8 && c.distanceM >= target * 0.6 && c.distanceM <= target * 4)
      equivalent = riegel(c.durationSec, c.distanceM, target);
    if (equivalent && (await recordIfBetter(user.id, key, Math.round(equivalent), "lower")))
      newBests.push(benchmarkDef(key)?.label ?? key);
  }

  revalidatePath("/dashboard");
  revalidatePath("/progress");
  return { newBests };
}

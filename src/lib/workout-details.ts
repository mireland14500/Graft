import type { SessionKind } from "@prisma/client";
import { runDistanceM } from "./calendar";
import { prisma } from "./db";
import { resolvePrescription } from "./engine/prescription";

/** Plain-English "what you're doing today" for each type of session. */
export const KIND_GUIDANCE: Record<SessionKind, string> = {
  STRENGTH: "Heavy, low-rep work on the main lifts. Warm up with a few lighter sets, then hit the working sets with full rest between them. Quality over speed.",
  HYPERTROPHY: "Moderate weights for more reps to build muscle. Control the lowering phase and finish each set 1–2 reps short of failure.",
  RUN_EASY: "Conversational pace — you should be able to talk in full sentences. This builds your aerobic engine without adding fatigue.",
  RUN_TEMPO: "Comfortably hard: a pace you could hold for about an hour. Warm up easy, settle into tempo pace, then cool down.",
  RUN_INTERVALS: "Fast repeats with easy jogging between. Warm up for 10 minutes first. Hit the target pace on every rep rather than going out too hard.",
  RUN_LONG: "Your longest run of the week, at easy pace. Fuel and hydrate if it's over an hour. Finishing strong matters more than speed.",
  CONDITIONING: "Engine work on the ergs. Hold a steady, repeatable pace across every interval and keep the rests honest.",
  HYROX_SIM: "Race rehearsal: run, then station, then run. Practise your race pace and smooth transitions — it's meant to feel like race day.",
  METCON: "High-intensity mixed work. Scale weights and movements so you can keep moving, then push the pace in the final third.",
  SKILL: "Technique-focused work. Stay fresh, keep sets short and stop a set as soon as form slips.",
  RECOVERY: "Easy movement to help you recover. Keep it light — you should finish feeling better than you started.",
  YOGA: "Flow with your breath. Move slowly into each shape, never force a stretch, and ease off anything that pinches.",
  PILATES: "Slow, controlled reps with your core switched on. Keep your ribs down and breathe out on the effort.",
  MOBILITY: "Long, relaxed holds to restore range of motion. Breathe deeply and let each position open up over time.",
};

export interface WorkoutStep {
  name: string;
  prescription: string;
  notes: string | null;
  category: string;
}

export interface WorkoutDetail {
  id: string;
  date: Date;
  weekNumber: number;
  completed: boolean;
  title: string;
  kind: SessionKind;
  estMinutes: number;
  runMetres: number;
  notes: string | null;
  guidance: string;
  planTitle: string;
  enrollmentId: string;
  steps: WorkoutStep[];
}

/**
 * Every scheduled session across the given enrolments, with each step's prescription
 * personalised to the athlete's latest numbers (kilos from 1RMs, paces from their 5k).
 */
export async function loadWorkoutDetails(enrollmentIds: string[], benchmarks: Record<string, number>): Promise<WorkoutDetail[]> {
  const rows = await prisma.scheduledWorkout.findMany({
    where: { enrollmentId: { in: enrollmentIds } },
    orderBy: [{ date: "asc" }],
    include: {
      enrollment: { select: { plan: { select: { title: true } } } },
      planSession: { include: { items: { include: { exercise: true }, orderBy: { order: "asc" } } } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    weekNumber: r.weekNumber,
    completed: r.completed,
    title: r.planSession.title,
    kind: r.planSession.kind,
    estMinutes: r.planSession.estMinutes,
    runMetres: runDistanceM(r.planSession.items.map((i) => ({ ...i, category: i.exercise.category }))),
    notes: r.planSession.notes,
    guidance: KIND_GUIDANCE[r.planSession.kind],
    planTitle: r.enrollment.plan.title,
    enrollmentId: r.enrollmentId,
    steps: r.planSession.items.map((i) => ({
      name: i.exercise.name,
      prescription: resolvePrescription({ ...i, exerciseName: i.exercise.name, benchmarkKey: i.exercise.benchmarkKey }, benchmarks).label,
      notes: i.notes,
      category: i.exercise.category,
    })),
  }));
}

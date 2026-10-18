import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { latestBenchmarks } from "@/lib/benchmarks";
import { prisma } from "@/lib/db";
import { resolvePrescription } from "@/lib/engine/prescription";
import { requireUser } from "@/lib/session";
import { WorkoutLogger, type LoggerItem } from "./WorkoutLogger";

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/workout/${id}`);

  const workout = await prisma.scheduledWorkout.findFirst({
    where: { id, enrollment: { userId: user.id } },
    include: {
      log: { include: { sets: true, cardio: true } },
      planSession: { include: { items: { include: { exercise: true }, orderBy: { order: "asc" } } } },
    },
  });
  if (!workout) notFound();

  const benchmarks = await latestBenchmarks(user.id);
  const items: LoggerItem[] = workout.planSession.items.map((item) => {
    const resolved = resolvePrescription({ ...item, exerciseName: item.exercise.name, benchmarkKey: item.exercise.benchmarkKey }, benchmarks);
    const cardio = ["run", "erg"].includes(item.exercise.category);
    return {
      exerciseId: item.exerciseId,
      name: item.exercise.name,
      prescription: resolved.label,
      notes: item.notes,
      kind: cardio ? "cardio" : "sets",
      sets: item.sets ?? 1,
      targetReps: Number.parseInt(item.reps ?? "", 10) || undefined,
      targetKg: resolved.targetKg,
      targetDistanceM: item.distanceM ?? undefined,
    };
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={workout.planSession.title}
        subtitle={`Week ${workout.weekNumber} · ~${workout.planSession.estMinutes} min${workout.completed ? " · logged" : ""}`}
      />
      {workout.planSession.notes && <p className="mb-6 text-muted">{workout.planSession.notes}</p>}
      <WorkoutLogger scheduledWorkoutId={workout.id} items={items} />
    </div>
  );
}

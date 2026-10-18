import { prisma } from "./db";

/** Latest value per benchmark key, e.g. { squat_1rm: 142.5, run_5k: 1460 }. */
export async function latestBenchmarks(userId: string): Promise<Record<string, number>> {
  const rows = await prisma.benchmarkEntry.findMany({
    where: { userId },
    orderBy: { recordedAt: "asc" },
    select: { key: true, value: true },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Record a benchmark only if it beats the athlete's current best. */
export async function recordIfBetter(
  userId: string,
  key: string,
  value: number,
  better: "higher" | "lower",
  source: "LOGGED" | "TEST" = "LOGGED",
) {
  const latest = await prisma.benchmarkEntry.findFirst({ where: { userId, key }, orderBy: { recordedAt: "desc" } });
  const improved = !latest || (better === "higher" ? value > latest.value : value < latest.value);
  if (improved) await prisma.benchmarkEntry.create({ data: { userId, key, value, source } });
  return improved;
}

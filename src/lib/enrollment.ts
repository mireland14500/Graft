import { prisma } from "./db";

export async function activeEnrollment(userId: string) {
  return prisma.enrollment.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { plan: true, variant: true, request: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Share of sessions scheduled up to today that were completed. */
export async function adherence(enrollmentId: string): Promise<{ done: number; due: number; rate: number }> {
  const today = new Date();
  const [done, due] = await Promise.all([
    prisma.scheduledWorkout.count({ where: { enrollmentId, date: { lte: today }, completed: true } }),
    prisma.scheduledWorkout.count({ where: { enrollmentId, date: { lte: today } } }),
  ]);
  return { done, due, rate: due === 0 ? 1 : done / due };
}

export const weeksBetween = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / (7 * 86_400_000));

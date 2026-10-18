import { prisma } from "./db";
import { buildSchedule } from "./engine/scheduler";

/** Enrol an athlete in a plan variant and lay its sessions onto their calendar. */
export async function enrollInPlan(opts: {
  userId: string;
  planId: string;
  daysPerWeek: number;
  availableDays: number[];
  requestId?: string;
  startDate?: Date;
}) {
  const variant = await prisma.planVariant.findUniqueOrThrow({
    where: { planId_daysPerWeek: { planId: opts.planId, daysPerWeek: opts.daysPerWeek } },
    include: { weeks: { include: { sessions: { select: { id: true, order: true } } } } },
  });

  const schedule = buildSchedule({
    startDate: opts.startDate ?? new Date(),
    availableDays: opts.availableDays,
    weeks: variant.weeks,
  });
  const dates = schedule.map((s) => s.date.getTime());

  return prisma.$transaction(async (tx) => {
    // One active plan at a time keeps the dashboard simple; revisit for hybrid athletes.
    await tx.enrollment.updateMany({
      where: { userId: opts.userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    const enrollment = await tx.enrollment.create({
      data: {
        userId: opts.userId,
        planId: opts.planId,
        variantId: variant.id,
        requestId: opts.requestId,
        availableDays: opts.availableDays,
        startDate: new Date(Math.min(...dates)),
        endDate: new Date(Math.max(...dates)),
        workouts: { create: schedule },
      },
    });
    await tx.planTemplate.update({ where: { id: opts.planId }, data: { enrollmentCount: { increment: 1 } } });
    return enrollment;
  });
}

import { MAX_ACTIVE_PLANS } from "./brand";
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
  /** Swap out one of the athlete's current plans instead of adding alongside it. */
  replaceEnrollmentId?: string;
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
    if (opts.replaceEnrollmentId) {
      await tx.enrollment.updateMany({
        where: { id: opts.replaceEnrollmentId, userId: opts.userId, status: "ACTIVE" },
        data: { status: "CANCELLED" },
      });
    }
    const active = await tx.enrollment.findMany({ where: { userId: opts.userId, status: "ACTIVE" }, select: { planId: true } });
    if (active.some((e) => e.planId === opts.planId)) throw new EnrollmentError("already_on_plan");
    if (active.length >= MAX_ACTIVE_PLANS) throw new EnrollmentError("plan_limit");

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

export class EnrollmentError extends Error {
  constructor(public code: "plan_limit" | "already_on_plan") {
    super(code);
  }
}

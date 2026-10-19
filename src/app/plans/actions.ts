"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { planAccess } from "@/lib/access";
import { syncSubscriptionQuantity } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { EnrollmentError, enrollInPlan } from "@/lib/enroll";
import { requireUser } from "@/lib/session";

const enrollSchema = z.object({
  planId: z.string(),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  requestId: z.string().optional(),
  /** Set when the athlete chose to swap this plan in for one they're already on */
  replaceEnrollmentId: z.string().optional(),
});

export async function enrollAction(formData: FormData) {
  const user = await requireUser("/plans");
  const input = enrollSchema.parse(Object.fromEntries(formData));

  const plan = await prisma.planTemplate.findFirstOrThrow({ where: { id: input.planId, status: "PUBLISHED" } });
  const request = input.requestId
    ? await prisma.planRequest.findFirst({ where: { id: input.requestId, userId: user.id } })
    : await prisma.planRequest.findFirst({ where: { userId: user.id, sport: plan.sport }, orderBy: { createdAt: "desc" } });

  // No onboarding answers yet (came straight from the marketplace) → ask first.
  if (!request) redirect(`/onboarding?sport=${plan.sport}`);

  const access = await planAccess(user.id, plan);
  if (!access.ok) {
    const params = new URLSearchParams({ kind: access.need, planId: plan.id, request: request.id });
    redirect(`/api/checkout?${params}`);
  }

  try {
    await enrollInPlan({
      userId: user.id,
      planId: plan.id,
      daysPerWeek: input.daysPerWeek,
      availableDays: request.availableDays,
      requestId: request.id,
      replaceEnrollmentId: input.replaceEnrollmentId,
    });
  } catch (e) {
    if (e instanceof EnrollmentError) redirect(`/plans/recommended?request=${request.id}&error=${e.code}`);
    throw e;
  }
  await syncSubscriptionQuantity(user.id);
  redirect("/dashboard?welcome=1");
}

/** Stop following a plan. Its logged history is kept; the subscription drops back a plan. */
export async function endPlanAction(formData: FormData) {
  const user = await requireUser("/dashboard");
  const id = z.string().parse(formData.get("enrollmentId"));
  await prisma.enrollment.updateMany({ where: { id, userId: user.id, status: "ACTIVE" }, data: { status: "CANCELLED" } });
  await syncSubscriptionQuantity(user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

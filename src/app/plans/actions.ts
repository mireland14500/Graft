"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { planAccess } from "@/lib/access";
import { prisma } from "@/lib/db";
import { enrollInPlan } from "@/lib/enroll";
import { requireUser } from "@/lib/session";

const enrollSchema = z.object({
  planId: z.string(),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  requestId: z.string().optional(),
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

  await enrollInPlan({
    userId: user.id,
    planId: plan.id,
    daysPerWeek: input.daysPerWeek,
    availableDays: request.availableDays,
    requestId: request.id,
  });
  redirect("/dashboard?welcome=1");
}

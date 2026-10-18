"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PENDING_REQUEST_COOKIE, REF_COOKIE } from "@/lib/cookies";
import { savePlanRequest } from "@/lib/plan-requests";
import { planRequestSchema, type PlanRequestData } from "@/lib/validation";

/**
 * Signed in → save and go to recommendations.
 * Signed out → park the answers in a cookie, sign in, then /onboarding/complete saves them.
 */
export async function submitPlanRequest(raw: PlanRequestData): Promise<{ error: string } | void> {
  const parsed = planRequestSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your answers" };

  const session = await auth();
  const jar = await cookies();
  if (!session?.user?.id) {
    jar.set(PENDING_REQUEST_COOKIE, JSON.stringify(parsed.data), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 });
    redirect(`/sign-in?callbackUrl=${encodeURIComponent("/onboarding/complete")}`);
  }

  const request = await savePlanRequest(session.user.id, parsed.data, jar.get(REF_COOKIE)?.value);
  redirect(`/plans/recommended?request=${request.id}`);
}

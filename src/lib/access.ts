import { prisma } from "./db";

export const paymentsEnabled = () => !!process.env.STRIPE_SECRET_KEY;

/**
 * INCLUDED plans need an active subscription, PREMIUM plans also need a purchase.
 * Payments are skipped entirely until Stripe keys are configured, so local dev just works.
 */
export async function planAccess(userId: string, plan: { id: string; access: "INCLUDED" | "PREMIUM" }) {
  if (!paymentsEnabled()) return { ok: true as const };

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || !["active", "trialing"].includes(sub.status)) return { ok: false as const, need: "subscription" as const };

  if (plan.access === "PREMIUM") {
    const bought = await prisma.purchase.findUnique({ where: { userId_planId: { userId, planId: plan.id } } });
    if (!bought) return { ok: false as const, need: "purchase" as const };
  }
  return { ok: true as const };
}

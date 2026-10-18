import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      const userId = s.metadata?.userId;
      if (!userId) break;
      if (s.mode === "payment" && s.metadata?.planId) {
        await prisma.purchase.upsert({
          where: { stripeCheckoutId: s.id },
          update: {},
          create: { userId, planId: s.metadata.planId, amountCents: s.amount_total ?? 0, stripeCheckoutId: s.id },
        });
      }
      if (s.mode === "subscription" && typeof s.customer === "string") {
        await prisma.subscription.upsert({
          where: { userId },
          update: { stripeCustomerId: s.customer, stripeSubscriptionId: String(s.subscription), status: "trialing" },
          create: { userId, stripeCustomerId: s.customer, stripeSubscriptionId: String(s.subscription), status: "trialing" },
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const periodEnd = sub.items.data[0]?.current_period_end;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: sub.status, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null },
      });
      break;
    }
    case "account.updated": {
      // Coach finished Stripe Connect onboarding
      const account = event.data.object;
      if (account.payouts_enabled) {
        await prisma.coachProfile.updateMany({ where: { stripeAccountId: account.id }, data: { verified: true } });
      }
      break;
    }
  }
  return new Response("ok");
}

import { paymentsEnabled } from "./access";
import { prisma } from "./db";
import { stripe } from "./stripe";

/**
 * The subscription is priced per plan: its Stripe quantity is the number of
 * active plans (1 plan = £9.99, 2 plans = £19.98). Call after a plan starts or ends;
 * Stripe prorates the change onto the next invoice.
 */
export async function syncSubscriptionQuantity(userId: string) {
  if (!paymentsEnabled()) return;
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeSubscriptionId) return;

  const plans = await prisma.enrollment.count({ where: { userId, status: "ACTIVE" } });
  const remote = await stripe().subscriptions.retrieve(sub.stripeSubscriptionId);
  const item = remote.items.data[0];
  const quantity = Math.max(plans, 1);
  if (item && item.quantity !== quantity) {
    await stripe().subscriptionItems.update(item.id, { quantity, proration_behavior: "create_prorations" });
  }
}

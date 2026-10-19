/**
 * Monthly creator payout run. Schedule on the 3rd of each month (after Stripe
 * invoices settle), e.g. a Vercel Cron hitting an API route that calls `runPayouts`.
 *
 *   npx tsx scripts/monthly-payouts.ts 2026-09
 */
import { MAX_ACTIVE_PLANS } from "../src/lib/brand";
import { prisma } from "../src/lib/db";
import { computeCreatorPayouts, type SubscriberMonth } from "../src/lib/payouts";
import { stripe } from "../src/lib/stripe";

/** Per plan: £9.99 less 20% VAT (£8.33) less Stripe fees (~£0.33) ≈ £8.00. Replace with real figures from Stripe balance transactions. */
const NET_MONTHLY_CENTS = Number(process.env.NET_MONTHLY_CENTS ?? 800);
const DAY = 86_400_000;

export async function runPayouts(periodStart: Date) {
  const periodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));

  const enrolments = await prisma.enrollment.findMany({
    where: {
      startDate: { lt: periodEnd },
      endDate: { gte: periodStart },
      user: { subscription: { status: { in: ["active", "past_due"] } } },
      // Anti-gaming: only enrolments the athlete actually trained on this month
      workouts: { some: { completed: true, date: { gte: periodStart, lt: periodEnd } } },
    },
    include: { plan: { select: { coachId: true } }, user: { select: { referredByCoachId: true } } },
  });

  const subscribers = new Map<string, SubscriberMonth>();
  for (const e of enrolments) {
    const from = Math.max(e.startDate.getTime(), periodStart.getTime());
    const to = Math.min(e.endDate.getTime() + DAY, periodEnd.getTime());
    const sub = subscribers.get(e.userId) ?? {
      userId: e.userId,
      netRevenueCents: 0,
      referredByCoachId: e.user.referredByCoachId,
      enrolments: [],
    };
    sub.enrolments.push({ planId: e.planId, coachId: e.plan.coachId, activeDays: Math.round((to - from) / DAY) });
    subscribers.set(e.userId, sub);
  }
  // The subscription is priced per plan, so a subscriber on two plans brings in twice the revenue.
  for (const sub of subscribers.values()) {
    sub.netRevenueCents = NET_MONTHLY_CENTS * Math.min(sub.enrolments.length, MAX_ACTIVE_PLANS);
  }

  const sales = await prisma.purchase.findMany({
    where: { createdAt: { gte: periodStart, lt: periodEnd } },
    include: { plan: { select: { coachId: true } } },
  });
  const coaches = await prisma.coachProfile.findMany({ select: { id: true, revenueShareBps: true, stripeAccountId: true } });

  const payouts = computeCreatorPayouts({
    subscribers: [...subscribers.values()],
    premiumSales: sales.map((s) => ({ planId: s.planId, coachId: s.plan.coachId, amountCents: s.amountCents })),
    coachShareBps: Object.fromEntries(coaches.map((c) => [c.id, c.revenueShareBps])),
  });

  for (const p of payouts) {
    if (p.totalCents === 0) continue;
    const coach = coaches.find((c) => c.id === p.coachId);
    const record = await prisma.payout.upsert({
      where: { coachId_periodStart: { coachId: p.coachId, periodStart } },
      update: {},
      create: { coachId: p.coachId, periodStart, periodEnd, amountCents: p.totalCents, breakdown: p.byPlan },
    });
    if (record.status === "PAID" || !coach?.stripeAccountId) continue;
    const transfer = await stripe().transfers.create(
      { amount: p.totalCents, currency: "gbp", destination: coach.stripeAccountId, metadata: { payoutId: record.id } },
      { idempotencyKey: `payout-${record.id}` },
    );
    await prisma.payout.update({ where: { id: record.id }, data: { status: "PAID", stripeTransferId: transfer.id } });
  }
  return payouts;
}

if (process.argv[1]?.endsWith("monthly-payouts.ts")) {
  const [y, m] = (process.argv[2] ?? "").split("-").map(Number);
  if (!y || !m) throw new Error("Usage: tsx scripts/monthly-payouts.ts YYYY-MM");
  runPayouts(new Date(Date.UTC(y, m - 1, 1))).then((p) => console.log(JSON.stringify(p, null, 2)));
}

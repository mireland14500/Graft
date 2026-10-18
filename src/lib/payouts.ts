/**
 * Creator revenue share.
 *
 * INCLUDED plans: coaches earn `revenueShareBps` (10% by default) of each
 * subscriber's net monthly revenue (after Stripe fees, VAT and refunds) for
 * every month that subscriber trains on their plan. If the subscriber followed
 * more than one plan that month, the 10% is split pro-rata by active days.
 * A coach who referred the subscriber earns a bonus on top.
 *
 * PREMIUM plans: one-off purchases pay the coach a flat 70%.
 *
 * Only count an enrolment's days if the athlete actually logged a workout in
 * that period, so idle enrolments can't farm payouts. The monthly job that
 * builds `SubscriberMonth[]` from the DB applies that filter.
 */

export const REFERRAL_BONUS_BPS = 1000;
export const PREMIUM_SHARE_BPS = 7000;

export interface SubscriberMonth {
  userId: string;
  netRevenueCents: number;
  referredByCoachId?: string | null;
  enrolments: { planId: string; coachId: string; activeDays: number }[];
}

export interface PremiumSale {
  planId: string;
  coachId: string;
  amountCents: number;
}

export interface CoachPayout {
  coachId: string;
  totalCents: number;
  byPlan: Record<string, number>;
}

export function computeCreatorPayouts(input: {
  subscribers: SubscriberMonth[];
  premiumSales: PremiumSale[];
  /** coachId → revenueShareBps */
  coachShareBps: Record<string, number>;
}): CoachPayout[] {
  // Accumulate in fractional cents and floor once per plan, so rounding never over-pays.
  const raw = new Map<string, Map<string, number>>();
  const add = (coachId: string, planId: string, cents: number) => {
    const plans = raw.get(coachId) ?? new Map<string, number>();
    plans.set(planId, (plans.get(planId) ?? 0) + cents);
    raw.set(coachId, plans);
  };

  for (const sub of input.subscribers) {
    const totalDays = sub.enrolments.reduce((s, e) => s + e.activeDays, 0);
    if (totalDays === 0 || sub.netRevenueCents <= 0) continue;
    for (const e of sub.enrolments) {
      const bps =
        (input.coachShareBps[e.coachId] ?? 0) + (sub.referredByCoachId === e.coachId ? REFERRAL_BONUS_BPS : 0);
      add(e.coachId, e.planId, (sub.netRevenueCents * (e.activeDays / totalDays) * bps) / 10_000);
    }
  }

  for (const sale of input.premiumSales) {
    add(sale.coachId, sale.planId, (sale.amountCents * PREMIUM_SHARE_BPS) / 10_000);
  }

  return [...raw.entries()].map(([coachId, plans]) => {
    const byPlan = Object.fromEntries([...plans.entries()].map(([planId, c]) => [planId, Math.floor(c)]));
    return { coachId, byPlan, totalCents: Object.values(byPlan).reduce((a, b) => a + b, 0) };
  });
}

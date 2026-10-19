import { notFound } from "next/navigation";
import { PlanCard } from "@/components/PlanCard";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { MAX_ACTIVE_PLANS, MONTHLY_PRICE_PENCE, formatPence, subscriptionPricePence } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { rankPlans } from "@/lib/engine/matching";
import { activeEnrollments } from "@/lib/enrollment";
import { requireUser } from "@/lib/session";
import { SPORT_DEFS } from "@/lib/sports";
import { enrollAction } from "../actions";

const ERRORS: Record<string, string> = {
  plan_limit: `You can follow up to ${MAX_ACTIVE_PLANS} plans at once — replace one of your current plans instead.`,
  already_on_plan: "You're already following that plan.",
};

export default async function RecommendedPage({ searchParams }: { searchParams: Promise<{ request?: string; error?: string }> }) {
  const user = await requireUser("/plans/recommended");
  const { request: requestId, error } = await searchParams;
  const current = await activeEnrollments(user.id);
  const canAdd = current.length < MAX_ACTIVE_PLANS;

  const request = await prisma.planRequest.findFirst({
    where: { userId: user.id, ...(requestId && { id: requestId }) },
    orderBy: { createdAt: "desc" },
  });
  if (!request) notFound();

  const plans = await prisma.planTemplate.findMany({
    where: { status: "PUBLISHED", sport: request.sport },
    include: { coach: { select: { displayName: true, gymName: true } }, variants: { select: { daysPerWeek: true } } },
  });

  const ranked = rankPlans(
    {
      sport: request.sport,
      goal: request.goal,
      level: request.level,
      daysPerWeek: request.availableDays.length,
      sessionMinutes: request.sessionMinutes,
      durationWeeks: request.durationWeeks,
      equipment: request.equipment,
    },
    plans.map((p) => ({ ...p, variantDays: p.variants.map((v) => v.daysPerWeek) })),
  ).slice(0, 6);

  return (
    <>
      <PageHeader
        title="Your best-fit plans"
        subtitle={`${SPORT_DEFS[request.sport].name} · ${request.availableDays.length} days/week · ${request.durationWeeks} weeks · ${request.level.toLowerCase()}`}
        action={<LinkButton href="/onboarding" variant="ghost">Change answers</LinkButton>}
      />
      {error && ERRORS[error] && <Card tone="error" className="mb-6 text-sm">{ERRORS[error]}</Card>}
      {current.length > 0 && (
        <Card className="mb-6 text-sm">
          You&apos;re following <b>{current.map((c) => c.plan.title).join(" and ")}</b>.{" "}
          {canAdd
            ? `Add one of these alongside it for +${formatPence(MONTHLY_PRICE_PENCE)}/month (${formatPence(subscriptionPricePence(current.length + 1))} total), or swap your plan out.`
            : `That's the maximum of ${MAX_ACTIVE_PLANS} — choose which plan to replace.`}
        </Card>
      )}
      {ranked.length === 0 && (
        <p className="text-muted">No plans fit those answers yet — try more training days or different equipment.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ranked.map((r, i) => (
          <PlanCard key={r.plan.id} plan={r.plan}>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {i === 0 && <Badge tone="good">Best match · {r.score}%</Badge>}
              {r.reasons.map((x) => <Badge key={x}>{x}</Badge>)}
              {r.warnings.map((x) => <Badge key={x} tone="warn">{x}</Badge>)}
            </div>
            <div className="space-y-2">
              {(current.length === 0 || canAdd) && (
                <form action={enrollAction}>
                  <input type="hidden" name="planId" value={r.plan.id} />
                  <input type="hidden" name="daysPerWeek" value={r.daysPerWeek} />
                  <input type="hidden" name="requestId" value={request.id} />
                  <SubmitButton variant={i === 0 ? "brand" : "ghost"} className="w-full" pendingText="Building your calendar…">
                    {current.length === 0 ? "Start this plan" : `Add as 2nd plan · +${formatPence(MONTHLY_PRICE_PENCE)}/mo`}
                  </SubmitButton>
                </form>
              )}
              {current.map((c) => (
                <form key={c.id} action={enrollAction}>
                  <input type="hidden" name="planId" value={r.plan.id} />
                  <input type="hidden" name="daysPerWeek" value={r.daysPerWeek} />
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="replaceEnrollmentId" value={c.id} />
                  <SubmitButton variant="ghost" className="w-full text-xs" pendingText="Swapping plans…">Replace {c.plan.title}</SubmitButton>
                </form>
              ))}
            </div>
          </PlanCard>
        ))}
      </div>
    </>
  );
}

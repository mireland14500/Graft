import { notFound } from "next/navigation";
import { PlanCard } from "@/components/PlanCard";
import { Badge, Button, LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { rankPlans } from "@/lib/engine/matching";
import { requireUser } from "@/lib/session";
import { SPORT_DEFS } from "@/lib/sports";
import { enrollAction } from "../actions";

export default async function RecommendedPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const user = await requireUser("/plans/recommended");
  const { request: requestId } = await searchParams;

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
            <form action={enrollAction}>
              <input type="hidden" name="planId" value={r.plan.id} />
              <input type="hidden" name="daysPerWeek" value={r.daysPerWeek} />
              <input type="hidden" name="requestId" value={request.id} />
              <Button variant={i === 0 ? "brand" : "ghost"} className="w-full">Start this plan</Button>
            </form>
          </PlanCard>
        ))}
      </div>
    </>
  );
}

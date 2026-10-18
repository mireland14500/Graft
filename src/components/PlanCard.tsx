import Link from "next/link";
import { Badge, Card } from "./ui";

export interface PlanCardData {
  slug: string;
  title: string;
  summary: string;
  durationWeeks: number;
  sessionMinutes: number;
  access: "INCLUDED" | "PREMIUM";
  priceCents: number | null;
  ratingAvg: number;
  ratingCount: number;
  coach: { displayName: string; gymName: string | null };
}

export function PlanCard({ plan, children }: { plan: PlanCardData; children?: React.ReactNode }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/plans/${plan.slug}`} className="text-lg font-bold hover:underline">{plan.title}</Link>
        {plan.access === "PREMIUM" ? <Badge tone="warn">£{((plan.priceCents ?? 0) / 100).toFixed(0)}</Badge> : <Badge>Included</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted">
        by {plan.coach.displayName}{plan.coach.gymName ? ` · ${plan.coach.gymName}` : ""}
      </p>
      <p className="mt-3 text-sm">{plan.summary}</p>
      <p className="mt-3 text-xs text-muted">
        {plan.durationWeeks} weeks · ~{plan.sessionMinutes} min sessions
        {plan.ratingCount > 0 && ` · ${plan.ratingAvg.toFixed(1)}★ (${plan.ratingCount})`}
      </p>
      {children && <div className="mt-auto pt-4">{children}</div>}
    </Card>
  );
}

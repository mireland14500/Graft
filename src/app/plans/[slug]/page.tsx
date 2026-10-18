import { notFound } from "next/navigation";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { SPORT_DEFS } from "@/lib/sports";

export default async function PlanDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = await prisma.planTemplate.findUnique({
    where: { slug },
    include: {
      coach: true,
      reviews: { orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } } } },
      variants: {
        orderBy: { daysPerWeek: "asc" },
        include: { weeks: { orderBy: { weekNumber: "asc" }, include: { sessions: { orderBy: { order: "asc" } } } } },
      },
    },
  });
  if (!plan || plan.status !== "PUBLISHED") notFound();

  const preview = plan.variants[plan.variants.length - 1];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <PageHeader title={plan.title} subtitle={`${SPORT_DEFS[plan.sport].name} · by ${plan.coach.displayName}`} />
        <p className="whitespace-pre-line">{plan.description}</p>

        <h2 className="mt-10 mb-4 text-xl font-bold">Week by week ({preview?.daysPerWeek}-day version)</h2>
        <div className="space-y-3">
          {preview?.weeks.map((w) => (
            <Card key={w.id}>
              <div className="flex items-center gap-2">
                <p className="font-semibold">Week {w.weekNumber}</p>
                {w.focus && <span className="text-sm text-muted">· {w.focus}</span>}
                {w.isDeload && <Badge>Deload</Badge>}
              </div>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                {w.sessions.map((s) => <li key={s.id} className="rounded-lg bg-paper px-2.5 py-1">{s.title}</li>)}
              </ul>
            </Card>
          ))}
        </div>

        {plan.reviews.length > 0 && (
          <>
            <h2 className="mt-10 mb-4 text-xl font-bold">Reviews</h2>
            {plan.reviews.map((r) => (
              <Card key={r.id} className="mb-3">
                <p className="font-semibold">{"★".repeat(r.rating)} <span className="text-sm font-normal text-muted">{r.user.name}</span></p>
                {r.text && <p className="mt-1 text-sm">{r.text}</p>}
              </Card>
            ))}
          </>
        )}
      </div>

      <aside className="space-y-4">
        <Card className="space-y-3">
          <p className="text-sm text-muted">{plan.durationWeeks} weeks · ~{plan.sessionMinutes} min</p>
          <p className="text-sm">Available for {plan.variants.map((v) => v.daysPerWeek).join(", ")} days per week</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.levels.map((l) => <Badge key={l}>{l.toLowerCase()}</Badge>)}
          </div>
          <LinkButton href={`/onboarding?sport=${plan.sport}`} variant="brand" className="w-full">Check if it fits me</LinkButton>
        </Card>
        <Card>
          <p className="font-semibold">{plan.coach.displayName}</p>
          {plan.coach.gymName && <p className="text-sm text-muted">{plan.coach.gymName}</p>}
          {plan.coach.bio && <p className="mt-2 text-sm">{plan.coach.bio}</p>}
        </Card>
      </aside>
    </div>
  );
}

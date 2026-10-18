import Link from "next/link";
import { PlanCard } from "@/components/PlanCard";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { SPORT_DEFS, SPORTS, type Sport } from "@/lib/sports";

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const { sport } = await searchParams;
  const filter = SPORTS.includes(sport as Sport) ? (sport as Sport) : undefined;

  const plans = await prisma.planTemplate.findMany({
    where: { status: "PUBLISHED", ...(filter && { sport: filter }) },
    include: { coach: { select: { displayName: true, gymName: true } } },
    orderBy: [{ enrollmentCount: "desc" }],
    take: 60,
  });

  return (
    <>
      <PageHeader title="Training plans" subtitle="Programmes from coaches, PTs and gyms." />
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/plans" className={`rounded-full px-3 py-1.5 ${!filter ? "bg-ink text-white" : "border border-line bg-white"}`}>All</Link>
        {SPORTS.map((s) => (
          <Link key={s} href={`/plans?sport=${s}`} className={`rounded-full px-3 py-1.5 ${filter === s ? "bg-ink text-white" : "border border-line bg-white"}`}>
            {SPORT_DEFS[s].name}
          </Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => <PlanCard key={p.id} plan={p} />)}
      </div>
      {plans.length === 0 && <p className="text-muted">No plans here yet.</p>}
    </>
  );
}

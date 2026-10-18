import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { auth } from "@/auth";
import { APP_NAME, COACH_SHARE_BPS, MONTHLY_PRICE_PENCE, formatPence, percent } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { PREMIUM_SHARE_BPS, REFERRAL_BONUS_BPS } from "@/lib/payouts";
import { SPORT_DEFS } from "@/lib/sports";

const money = (cents: number) => `£${(cents / 100).toFixed(2)}`;

export default async function CoachPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const session = await auth();
  const coach = session?.user
    ? await prisma.coachProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          plans: { orderBy: { updatedAt: "desc" }, include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } } },
          payouts: { orderBy: { periodStart: "desc" }, take: 6 },
          _count: { select: { referrals: true } },
        },
      })
    : null;

  if (!coach) return <CreatorPitch signedIn={!!session?.user} />;

  const { submitted } = await searchParams;
  const activeAthletes = coach.plans.reduce((s, p) => s + p._count.enrollments, 0);
  const lifetime = coach.payouts.reduce((s, p) => s + p.amountCents, 0);

  return (
    <>
      {submitted && <Card tone="brand" className="mb-6">Plan submitted — we review new plans within 48 hours.</Card>}
      <PageHeader
        title={`Hi, ${coach.displayName}`}
        subtitle="Your plans, athletes and earnings"
        action={<LinkButton href="/coach/plans/new" variant="brand">Upload a plan</LinkButton>}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Athletes training on your plans" value={String(activeAthletes)} />
        <Stat label="Members referred via your link" value={String(coach._count.referrals)} />
        <Stat label="Paid out (last 6 months)" value={money(lifetime)} />
      </div>

      {!coach.stripeAccountId && (
        <Card className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p>Connect a bank account to get paid.</p>
          {/* Plain <a>: a prefetched <Link> would hit the Stripe route on render */}
          <a href="/api/coach/connect" className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold hover:bg-paper">Set up payouts</a>
        </Card>
      )}

      <h2 className="mb-3 font-bold">Your plans</h2>
      <div className="space-y-2">
        {coach.plans.map((p) => (
          <Card key={p.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold">{p.title}</p>
              <p className="text-sm text-muted">{SPORT_DEFS[p.sport].name} · {p.durationWeeks} weeks · {p._count.enrollments} active</p>
            </div>
            <Badge tone={p.status === "PUBLISHED" ? "good" : p.status === "IN_REVIEW" ? "warn" : "neutral"}>{p.status.replace("_", " ").toLowerCase()}</Badge>
          </Card>
        ))}
        {coach.plans.length === 0 && <p className="text-muted">No plans yet — upload your first one.</p>}
      </div>

      <p className="mt-8 text-sm text-muted">
        Your referral link: <code className="rounded bg-white px-2 py-1">{process.env.APP_URL}/?ref={coach.slug}</code> — members who join through it
        earn you an extra {percent(REFERRAL_BONUS_BPS)}.
      </p>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </Card>
  );
}

function CreatorPitch({ signedIn }: { signedIn: boolean }) {
  const points = [
    ["Reach beyond your gym", "Your programmes get matched to athletes whose schedule, level and goals fit them."],
    ["Earn every month they train", `${percent(COACH_SHARE_BPS)} of every subscriber's monthly fee (${formatPence(MONTHLY_PRICE_PENCE)}, after VAT and card fees), for each month they train on your plan. ${percent(PREMIUM_SHARE_BPS)} of premium plan sales.`],
    ["Bring your members", `Gyms earn an extra ${percent(REFERRAL_BONUS_BPS)} on members who join through their link.`],
    ["Use your spreadsheets", "Upload the CSV you already have. Write in %1RM and pace zones — we personalise it for every athlete."],
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Coach on ${APP_NAME}`} subtitle="For PTs, coaches and gyms." />
      <div className="grid gap-4 sm:grid-cols-2">
        {points.map(([t, b]) => (
          <Card key={t}>
            <p className="font-semibold">{t}</p>
            <p className="mt-1 text-sm text-muted">{b}</p>
          </Card>
        ))}
      </div>
      <LinkButton href={signedIn ? "/coach/apply" : "/sign-in?callbackUrl=/coach/apply"} variant="brand" className="mt-8">
        Apply as a creator
      </LinkButton>
    </div>
  );
}

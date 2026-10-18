import { Card, LinkButton } from "@/components/ui";
import { MONTHLY_PRICE_PENCE, TRIAL_DAYS, formatPence } from "@/lib/brand";
import { SPORT_DEFS } from "@/lib/sports";

const steps = [
  { title: "Tell us about you", body: "Pick your sport, goal, current numbers and the days you can train." },
  { title: "Get matched", body: "We rank plans from top coaches and gyms against your schedule, level and kit." },
  { title: "Train & log", body: "Every session is personalised — weights from your 1RMs, paces from your 5k." },
  { title: "Watch it move", body: "See where your numbers could be by the end, and how you're tracking against it." },
];

export default function Home() {
  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 pt-6 md:grid-cols-2">
        <div>
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
            The training plan built around <span className="bg-brand px-2">your week</span>.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            Hyrox, CrossFit, powerlifting, bodybuilding and running plans from real coaches —
            fitted to your schedule and personalised to your numbers.
          </p>
          <div className="mt-8 flex gap-3">
            <LinkButton href="/onboarding" variant="brand">Build my plan</LinkButton>
            <LinkButton href="/plans" variant="ghost">Browse plans</LinkButton>
          </div>
          <p className="mt-4 text-sm text-muted">
            Every plan for {formatPence(MONTHLY_PRICE_PENCE)}/month · {TRIAL_DAYS}-day free trial · cancel anytime
          </p>
        </div>
        <Card tone="dark">
          <p className="text-sm text-white/60">Projected in 12 weeks</p>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            {[["Squat", "140", "152.5"], ["Bench", "100", "107.5"], ["Deadlift", "180", "197.5"]].map(([lift, now, then]) => (
              <div key={lift}>
                <p className="text-xs uppercase tracking-wide text-white/50">{lift}</p>
                <p className="text-sm text-white/50 line-through">{now}kg</p>
                <p className="text-2xl font-bold text-brand">{then}kg</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-white/40">Example projection for a beginner lifter training 4×/week.</p>
        </Card>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold">Pick your sport</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.values(SPORT_DEFS).map((s) => (
            <a key={s.id} href={`/onboarding?sport=${s.id}`} className="group">
              <Card className="h-full transition group-hover:border-ink">
                <p className="font-bold">{s.name}</p>
                <p className="mt-1 text-sm text-muted">{s.tagline}</p>
              </Card>
            </a>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold">How it works</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <Card key={s.title}>
              <p className="text-sm font-bold text-muted">0{i + 1}</p>
              <p className="mt-2 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Card tone="brand" className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold">Coach or gym owner?</h2>
            <p className="mt-1 max-w-xl text-muted">
              Upload your programmes, reach athletes beyond your four walls, and earn a share of every
              subscriber who trains on your plan — more when they joined through your gym.
            </p>
          </div>
          <LinkButton href="/coach">Become a creator</LinkButton>
        </Card>
      </section>
    </div>
  );
}

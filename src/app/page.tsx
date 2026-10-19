import Link from "next/link";
import { auth } from "@/auth";
import { LinkButton } from "@/components/ui";
import { CountUp } from "@/components/home/CountUp";
import { HeroSlideshow } from "@/components/home/HeroSlideshow";
import { Reveal } from "@/components/home/Reveal";
import { RotatingWord } from "@/components/home/RotatingWord";
import { SportPhoto } from "@/components/home/SportPhoto";
import { APP_NAME, COACH_SHARE_BPS, MONTHLY_PRICE_PENCE, TRIAL_DAYS, formatPence, percent } from "@/lib/brand";
import { homePhotos } from "@/lib/home-photos";
import { REFERRAL_BONUS_BPS } from "@/lib/payouts";
import { SESSION_KINDS } from "@/lib/session-kinds";
import { SPORT_DEFS, SPORTS } from "@/lib/sports";

const MARQUEE = [
  "Hyrox", "Weights from your 1RM", "CrossFit", "Paces from your 5k", "Powerlifting",
  "Built around your week", "Running", "Plans from real coaches", "Bodybuilding", "Log every set", "Yoga", "Two plans, one calendar", "Pilates",
];

const ATHLETE_STEPS = [
  { title: "Tell us about you", body: "Your sport, goal, current numbers and the days you can actually train." },
  { title: "Get matched", body: "We rank plans from coaches and gyms against your schedule, level and kit." },
  { title: "Train & log", body: "Every session is personalised — kilos from your maxes, paces from your 5k." },
  { title: "Watch it move", body: "See where your numbers are heading, and how you're tracking week to week." },
];

const DEMO_WEEK = [
  { day: "Mon", title: "Run intervals", kind: "RUN_INTERVALS", meta: "6 × 800m @ 4:51/km", done: true },
  { day: "Tue", title: "Squat focus", kind: "STRENGTH", meta: "4 × 5 @ 105 kg", done: true },
  { day: "Thu", title: "Hyrox simulation", kind: "HYROX_SIM", meta: "4 stations · 70 min", done: false },
  { day: "Sat", title: "Long run", kind: "RUN_LONG", meta: "12 km @ 6:30/km", done: false },
] as const;

const LIFTS = [
  { lift: "Squat", from: 140, to: 152.5 },
  { lift: "Bench", from: 100, to: 107.5 },
  { lift: "Deadlift", from: 180, to: 197.5 },
];

export default async function Home() {
  const session = await auth();
  const photos = homePhotos();
  const signedIn = !!session?.user;

  return (
    <div className="-mt-10 space-y-28 pb-10">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="full-bleed relative isolate flex min-h-[86vh] items-center overflow-hidden bg-ink text-white">
        <HeroSlideshow
          slides={[
            { slot: "hyrox", src: photos.hyrox, label: "Hyrox" },
            { slot: "crossfit", src: photos.crossfit, label: "CrossFit" },
            { slot: "powerlifting", src: photos.powerlifting, label: "Powerlifting" },
          ]}
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-24">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/80 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" /> Hyrox · CrossFit · Powerlifting · Running · Bodybuilding · Yoga · Pilates
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
            Your centralised hub for <span className="text-brand">coaching.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/75 md:text-xl">
            Plans from real coaches for{" "}
            <RotatingWord words={["Hyrox", "CrossFit", "powerlifting", "running", "bodybuilding", "yoga", "Pilates"]} className="font-bold text-white" />
            {" "}— built around your week and personalised to your numbers.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {signedIn ? (
              <LinkButton href="/dashboard" variant="brand" className="px-7 py-3.5 text-base">Go to my training</LinkButton>
            ) : (
              <LinkButton href="/onboarding" variant="brand" className="px-7 py-3.5 text-base">Find my plan — free for {TRIAL_DAYS} days</LinkButton>
            )}
            <Link href="/plans" className="rounded-full border border-white/30 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10">
              Browse plans
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/50">{formatPence(MONTHLY_PRICE_PENCE)}/month after your trial · every plan included · cancel anytime</p>
        </div>
      </section>

      {/* ── Marquee ──────────────────────────────────────────── */}
      <div className="full-bleed -mt-28 overflow-hidden border-y border-ink bg-brand py-4 text-brand-ink">
        <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-10 whitespace-nowrap text-lg font-black uppercase tracking-tight">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="flex items-center gap-10">{m}<span aria-hidden>✦</span></span>
          ))}
        </div>
      </div>

      {/* ── Sports ───────────────────────────────────────────── */}
      <section>
        <Reveal>
          <h2 className="text-3xl font-black tracking-tight md:text-5xl">Pick your sport.</h2>
          <p className="mt-2 max-w-xl text-muted">Answer a few questions and we&apos;ll match you to the plan that fits your week.</p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {SPORTS.map((id, i) => {
            const sport = SPORT_DEFS[id];
            const slot = id.toLowerCase() as keyof typeof photos;
            // Powerlifting, Hyrox and CrossFit lead in a row of three; the other four sit two by two
            const big = i < 3;
            return (
              <Reveal key={id} delay={i * 80} className={big ? "lg:col-span-2" : "lg:col-span-3"}>
                <Link href={`/onboarding?sport=${id}`} className="group relative block h-80 overflow-hidden rounded-3xl bg-ink">
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
                    <SportPhoto slot={slot} src={photos[slot]} label={sport.name} sizes="(min-width: 1024px) 33vw, 100vw" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <p className="text-2xl font-black">{sport.name}</p>
                    <p className="mt-1 text-sm text-white/75">{sport.tagline}</p>
                    <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand">
                      Find my plan <span className="transition-transform group-hover:translate-x-1">→</span>
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── How it works + live week ─────────────────────────── */}
      <section className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <Reveal>
            <h2 className="text-3xl font-black tracking-tight md:text-5xl">Built around your week.</h2>
            <p className="mt-3 max-w-md text-muted">Tell us the days you can train. Your plan lands on your calendar, and every session uses your numbers.</p>
          </Reveal>
          <ol className="mt-10 space-y-6">
            {ATHLETE_STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <li className="flex gap-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-sm font-black text-brand">0{i + 1}</span>
                  <div>
                    <p className="font-bold">{s.title}</p>
                    <p className="text-sm text-muted">{s.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal delay={150}>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-10 -z-10 rounded-full bg-brand/40 blur-3xl animate-[drift_12s_ease-in-out_infinite]" />
            <div className="rounded-[2.5rem] border-[10px] border-ink bg-white p-5 shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Week 3 · Build</p>
              <p className="text-xl font-black">Hyrox: PB Hunter</p>
              <div className="mt-4 space-y-2.5">
                {DEMO_WEEK.map((w, i) => (
                  <div
                    key={w.day}
                    className="flex items-center gap-3 rounded-2xl border border-line p-3 opacity-0 animate-[pop-in_0.6s_ease-out_forwards]"
                    style={{ animationDelay: `${600 + i * 250}ms` }}
                  >
                    <span className="w-8 text-xs font-bold uppercase text-muted">{w.day}</span>
                    <span className={`w-1.5 self-stretch rounded-full ${SESSION_KINDS[w.kind].bar}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-bold ${w.done ? "text-muted line-through" : ""}`}>{w.title}</p>
                      <p className="truncate text-xs text-muted">{w.meta}</p>
                    </div>
                    {w.done && <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-xs font-bold text-brand-ink">✓</span>}
                  </div>
                ))}
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full w-1/2 origin-left rounded-full bg-ink animate-[grow-x_1.2s_ease-out_1.8s_both]" />
              </div>
              <p className="mt-2 text-xs text-muted">2 of 4 sessions done this week</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Projections ──────────────────────────────────────── */}
      <section className="full-bleed bg-ink py-24 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">Before you even sign up</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">See what your numbers could look like.</h2>
            <p className="mt-4 max-w-md text-white/70">
              Enter your current lifts, 5k or Hyrox time and we project where a plan could take you — as an honest range,
              updated as you log your training.
            </p>
            <LinkButton href="/onboarding" variant="brand" className="mt-8">Get my projection</LinkButton>
          </Reveal>
          <Reveal delay={150}>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-sm text-white/60">12 weeks · 4 days a week · beginner</p>
              <div className="mt-6 space-y-6">
                {LIFTS.map((l, i) => (
                  <div key={l.lift}>
                    <div className="flex items-baseline justify-between">
                      <p className="font-semibold">{l.lift}</p>
                      <p className="text-sm text-white/50">
                        {l.from} kg → <span className="text-2xl font-black text-brand"><CountUp from={l.from} to={l.to} step={2.5} suffix=" kg" /></span>
                      </p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full origin-left rounded-full bg-brand animate-[grow-x_1.6s_ease-out_both]"
                        style={{ width: `${(l.to / 200) * 100}%`, animationDelay: `${300 + i * 200}ms` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-white/40">Example estimate. Your projection uses your own numbers, level and schedule.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section>
        <Reveal>
          <div className="mx-auto max-w-3xl rounded-[2rem] border-2 border-ink bg-white p-8 text-center md:p-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted">One simple price</p>
            <p className="mt-4 text-6xl font-black tracking-tight md:text-7xl">
              {formatPence(MONTHLY_PRICE_PENCE)}<span className="text-2xl font-bold text-muted">/month</span>
            </p>
            <p className="mt-2 text-muted">per plan · want two? Add a second plan for another {formatPence(MONTHLY_PRICE_PENCE)}</p>
            <ul className="mx-auto mt-8 grid max-w-xl gap-3 text-left sm:grid-cols-2">
              {["Any included plan, any sport", "Run two plans side by side", "Sessions personalised to your numbers", "Progress tracking & projections"].map((f) => (
                <li key={f} className="flex items-center gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold">✓</span>{f}</li>
              ))}
            </ul>
            <LinkButton href={signedIn ? "/dashboard" : "/onboarding"} variant="primary" className="mt-10 px-8 py-3.5 text-base">
              {signedIn ? "Go to my training" : `Start your ${TRIAL_DAYS}-day free trial`}
            </LinkButton>
          </div>
        </Reveal>
      </section>

      {/* ── For coaches ──────────────────────────────────────── */}
      <section id="coaches" className="full-bleed relative isolate overflow-hidden bg-ink py-24 text-white">
        <div className="absolute -right-40 top-10 -z-10 h-[30rem] w-[30rem] rounded-full bg-brand/20 blur-3xl animate-[drift_14s_ease-in-out_infinite]" />
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand">For coaches, PTs &amp; gyms</p>
              <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight md:text-6xl">Your programming. More athletes.</h2>
              <p className="mt-5 max-w-lg text-lg text-white/70">
                Put your plans in front of athletes looking for exactly what you coach. {APP_NAME} matches them to your programme,
                personalises every session, and pays you every month they train with you.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href="/coach" variant="brand">Become a {APP_NAME} coach</LinkButton>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="relative h-80 overflow-hidden rounded-3xl md:h-[26rem]">
                <SportPhoto slot="coach" src={photos.coach} label="Coach" sizes="(min-width: 1024px) 50vw, 100vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
              </div>
            </Reveal>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: percent(COACH_SHARE_BPS), t: "Monthly commission", b: "On every subscriber training on your plan, every month they stay with it." },
              { k: `+${percent(REFERRAL_BONUS_BPS)}`, t: "For your members", b: "Bring your gym's members with your referral link and earn more on each." },
              { k: "CSV", t: "Use your spreadsheets", b: "Upload the programmes you already have. Write in %1RM and pace zones." },
              { k: "Stripe", t: "Paid automatically", b: "Monthly payouts straight to your bank through Stripe Connect." },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 100}>
                <div className="h-full rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-brand/60">
                  <p className="text-4xl font-black text-brand">{f.k}</p>
                  <p className="mt-4 font-bold">{f.t}</p>
                  <p className="mt-1 text-sm text-white/60">{f.b}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <ol className="mt-16 grid gap-6 border-t border-white/10 pt-10 md:grid-cols-4">
              {["Apply with your coaching profile", "Upload your plan as a CSV", "We review and publish it", "Athletes train, you get paid"].map((s, i) => (
                <li key={s} className="flex items-start gap-4">
                  <span className="text-3xl font-black text-white/20">0{i + 1}</span>
                  <span className="pt-1.5 font-semibold">{s}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-brand px-8 py-14 text-center text-brand-ink md:py-20">
            <h2 className="text-4xl font-black tracking-tight md:text-6xl">Your next block starts Monday.</h2>
            <p className="mx-auto mt-4 max-w-lg text-lg">Two minutes of questions. A plan that fits your week. Numbers that move.</p>
            <LinkButton href={signedIn ? "/dashboard" : "/onboarding"} variant="primary" className="mt-8 px-8 py-3.5 text-base">
              {signedIn ? "Go to my training" : "Find my plan"}
            </LinkButton>
          </div>
        </Reveal>
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8 text-sm text-muted">
          <p className="font-black text-ink">{APP_NAME.toUpperCase()}.</p>
          <div className="flex gap-6">
            <Link href="/plans" className="hover:text-ink">Plans</Link>
            <Link href="/coach" className="hover:text-ink">For coaches</Link>
            <Link href="/sign-in" className="hover:text-ink">Sign in</Link>
          </div>
        </footer>
      </section>
    </div>
  );
}

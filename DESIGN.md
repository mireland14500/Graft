# Graft — product & technical design

> Name set in `src/lib/brand.ts`. A Runna-style plan app for strength and hybrid sports, with a creator marketplace.

## 1. The product in one paragraph

An athlete picks a sport (Hyrox, CrossFit, powerlifting, bodybuilding, running) and answers a short questionnaire:
goal, current numbers, experience, the days they can train, session length, plan length and equipment.
Before they even sign up, they see **"what your numbers could look like"**. After signing up, the app ranks
plans written by PTs, coaches and gyms against those answers. The athlete enrols, sessions land on their
calendar on their chosen days, and every session is **personalised**: coaches write "4 × 5 @ 75%" or "6 × 800m @ zone 5",
and each athlete sees their own kilos and paces. Logging a session updates their benchmarks, which re-sharpens
both future prescriptions and the projection curve. Creators earn a 10% monthly commission on every subscriber training on their plan.

## 2. Core loops

```
 Athlete                                              Creator (PT / gym)
 ───────                                              ──────────────────
 Onboarding wizard ──► live projection preview        Apply ──► Upload plan (CSV) ──► Review ──► Published
        │                                                                                        │
        ▼                                                                                        ▼
 Sign in ──► PlanRequest saved ──► rankPlans() ◄──────────── published PlanTemplates ◄──────────┘
                                         │
                                         ▼
                        Enrol ──► buildSchedule() ──► ScheduledWorkouts on chosen weekdays
                                         │
                                         ▼
       Workout page: resolvePrescription() (%1RM → kg, zone → pace) ──► Log sets / runs
                                         │
                                         ▼
       estimate1RM / Riegel ──► BenchmarkEntry (if new best) ──► Progress page (actual vs projection)
                                         │
                                         ▼
                     Monthly payout job ──► computeCreatorPayouts() ──► Stripe Connect transfer
```

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | One codebase for marketing pages, app UI and API. Server components keep DB access server-side; server actions remove most API boilerplate. |
| Styling | **Tailwind CSS v4** | Fast to iterate. Add shadcn/ui when the UI grows. |
| Database | **PostgreSQL** (Neon or Supabase) | Relational data (plans → weeks → sessions → items, logs, money). Native arrays for weekdays and equipment. |
| ORM | **Prisma 6** | Typed queries, migrations, nested creates for plan import. |
| Auth | **Auth.js v5** (Google + email magic link via Resend) | Free, self-hosted, Prisma adapter. Clerk is a fine paid alternative. |
| Payments | **Stripe Billing** (athlete subscription) + **Stripe Connect Express** (creator payouts) | Connect handles KYC, tax forms and bank payouts for creators, so you never hold their money manually. |
| Charts | **Recharts** | Projection band + line + logged dots in a few lines. |
| Validation | **Zod** | Shared schemas for the wizard, server actions and the CSV import. |
| Tests | **Vitest** | The engine is pure functions and is fully unit-tested. |
| Hosting | **Vercel** + Neon | Zero-ops; Vercel Cron for the monthly payout job. |
| Later | **Expo (React Native)** | Runna is mobile-first. `src/lib/engine` and `src/lib/sports.ts` have no React or DB imports, so they can move into a shared package as-is. |

## 4. Pages

| Route | Who | Purpose |
|---|---|---|
| `/` | everyone | Landing page: hero, sport picker, how it works, creator call to action |
| `/onboarding` | everyone | 7-step wizard → live projection preview → "Find my plan" |
| `/onboarding/complete` | (route) | After sign-in, saves the answers parked in a cookie |
| `/sign-in` | everyone | Google or email magic link |
| `/plans` | everyone | Marketplace, filterable by sport |
| `/plans/[slug]` | everyone | Plan detail: week-by-week outline, coach, reviews |
| `/plans/recommended` | athlete | Ranked matches with reasons and warnings → "Start this plan" |
| `/dashboard` | athlete | Next workout, this week, consistency |
| `/calendar` | athlete | Runna-style calendar across all active plans: one week at a time (swipe / arrows / week chips), compact colour-tinted session blocks, tap a block for a breakdown sheet (what to do + personalised steps); plus a month grid |
| `/workout/[id]` | athlete | Personalised prescription + set/run logger, flags new bests |
| `/progress` | athlete | Per-benchmark projection band with logged results overlaid |
| `/coach` | creator | Pitch page for non-creators. For creators: active athletes, referrals, payouts, plans, referral link |
| `/coach/apply` | user | Create a creator profile |
| `/coach/plans/new` | creator | Plan details form + CSV upload with line-level validation |
| `/api/checkout` | athlete | Stripe Checkout (subscription with 7-day trial, or premium plan) |
| `/api/stripe/webhook` | Stripe | Syncs subscriptions, purchases, Connect onboarding |
| `/api/coach/connect` | creator | Stripe Connect Express onboarding |

**Still to build:** `/settings` (profile, units, Stripe billing portal), `/admin/review` (approve or reject IN_REVIEW plans),
a drag-and-drop plan builder, reviews/ratings UI, and plan "swap a session" / "move a day".

## 5. Data model (prisma/schema.prisma)

```
User ─┬─ AthleteProfile (sex, bodyweight, equipment)
      ├─ PlanRequest[]       ← onboarding answers + benchmark snapshot
      ├─ BenchmarkEntry[]    ← time series per key (squat_1rm, run_5k, hyrox_time…), MANUAL | LOGGED | TEST
      ├─ Enrollment[] ──► ScheduledWorkout[] ──► WorkoutLog ─┬─ SetLog[]    (exercise, reps, kg)
      │                                                       └─ CardioLog[] (distance, time)
      ├─ Subscription / Purchase[]
      └─ CoachProfile ──► PlanTemplate[] ──► PlanVariant[] (one per days/week)
                                                 └─► PlanWeek[] ──► PlanSession[] ──► SessionItem[] ──► Exercise
                       └─► Payout[]
```

Key design decisions:
- **Variants per days/week.** A coach writes, say, a 3-day and a 4-day version. The matcher picks the largest variant that fits the athlete's available days. This is what makes "tell us your days" meaningful.
- **Relative prescriptions.** `SessionItem.intensityType` is `PERCENT_1RM | RPE | FIXED_KG | BODYWEIGHT | PACE_ZONE`. `Exercise.benchmarkKey` links an exercise to the athlete's benchmark, so one template serves every athlete.
- **Benchmarks as a time series**, not columns on the user. This is what powers progress charts, and what lets new sports add new metrics without migrations.
- **PlanRequest is kept**, so you can re-match later ("your plan ends in 2 weeks, here's what's next") and measure which answers convert.

## 6. The engine (`src/lib/engine`, pure TypeScript, unit-tested)

### Matching — `matching.ts`
Hard filters: sport, a variant that fits within the athlete's available days, and equipment (`full_gym` satisfies everything).
Then a weighted 0–100 score: level 25, goal 20, days fit 15, duration closeness 15, session length 10, and quality 15
(a Bayesian-averaged rating plus completion rate, so one 5★ review can't beat 400 4.8★ reviews). Every component that fires
adds a human-readable reason or warning, which the UI shows as badges.

### Scheduling — `scheduler.ts`
The plan starts on the next Monday. If the athlete has more days than the variant needs, it picks the subset that
**maximises the smallest gap** between sessions (Mon/Wed/Fri rather than Mon/Tue/Wed).

### Prescriptions — `prescription.ts`
`%1RM × benchmark`, rounded to 2.5 kg. Pace zones come from 5k pace (easy 1.3×, steady 1.18×, tempo 1.08×, threshold 1.04×, interval 0.97×).

### Projections — `projections.ts` (the "what your numbers could look like" feature)
- Base monthly improvement by **progress model × training age**:

  | model | beginner | intermediate | advanced |
  |---|---|---|---|
  | strength (1RM) | 4% | 1.5% | 0.6% |
  | endurance (5k, rows) | 3% | 1.5% | 0.6% |
  | hyrox finish | 4.5% | 2% | 0.8% |
  | metcon (Fran) | 5% | 2.5% | 1% |
  | bodyweight, `build_muscle` | +1% BW | +0.5% | +0.25% |
  | bodyweight, `cut` | −2.6% BW | −2.2% | −1.7% |

  Per-lift factors: bench 0.8×, clean & jerk 0.9×.
- × **frequency factor** (2 days 0.75 … 6+ days 1.1) × **adherence** (0.9 by default, real completion rate once training starts).
- **Diminishing returns**: the weekly rate decays by 1.5% each week inside a block.
- **Range, not a promise**: low and high bands at 0.5× and 1.5× the rate.
- **Personalisation over time**: once there are ≥3 results over ≥2 weeks, a least-squares trend of the athlete's own logs is blended 50/50 with the model.
- Time-based metrics improve by speed (`time / growth`), and their charts flip the y-axis so "up" always means better.
- Level is **auto-estimated** if the athlete picks "not sure": powerlifting total ÷ bodyweight, 5k time or Hyrox time.

These rates are product constants. Tune them with real cohort data once you have it; that data eventually becomes a moat.

### Learning from logs — `workout/[id]/actions.ts`
Sets of 1–10 reps → estimated 1RM (average of Epley and Brzycki). A new best becomes a `LOGGED` benchmark. Runs at the exact benchmark distance
count directly. Hard efforts (RPE ≥ 8) over nearby distances are converted with Riegel's formula.

## 7. Monetisation (`src/lib/payouts.ts`, `scripts/monthly-payouts.ts`)

**Athletes:** one subscription — **£9.99/month**, 7-day free trial — unlocks every INCLUDED plan.
Creators can also list **PREMIUM** plans for a one-off price.

**Creators:**
- **Included plans: 10% commission per month** on each subscriber training on the coach's plan. It's taken from net revenue (£9.99 less VAT and Stripe fees ≈ £8.00), so about **80p per subscriber per month**. If someone follows two plans in a month, the 10% is split by days.
- **+10% referral bonus** when the athlete signed up through the creator's `?ref=` link. This is the gym hook: gyms bring their members, and their members pay you.
- **Premium plans: 70%** of the sale.
- Anti-gaming: an enrolment only earns for a month in which the athlete **completed at least one workout**.
- Paid monthly via Stripe Connect transfers, with idempotency keys so reruns never double-pay.

Why a revenue share instead of per-plan commission: athletes pay once and never hesitate to try a plan, and creators
are rewarded for plans people actually *keep training on*, not plans they click on.

## 8. Risks and things to decide

- **Projection claims.** Always show a range and the "estimate" wording. Never guarantee results. Add a health disclaimer and PAR-Q style screening at onboarding.
- **Plan quality.** Review every plan before publishing (the admin page is still to build), verify creator qualifications, and show completion rates publicly.
- **Cold start.** Seed the marketplace with 2–3 partner gyms per sport before launch; the referral bonus is the recruiting pitch.
- **Adaptive plans.** Runna adjusts plans automatically. Phase 2: if an athlete misses sessions or logs RPE well off target, nudge the next week's %1RM up or down.
- **Integrations.** Strava, Garmin, Apple Health and Concept2 imports for runs and rows would remove most manual logging.
- **Units.** Stored in metric. Add a lb display preference.
- **Up to two plans at once** (`MAX_ACTIVE_PLANS`). The subscription is priced per plan: its Stripe quantity equals the number of active plans (`syncSubscriptionQuantity`), so a second plan doubles the price to £19.98. Payouts treat each plan as bringing in its own £9.99.

## 9. Suggested roadmap

1. **MVP (this repo):** onboarding → match → enrol → log → progress; CSV plan upload; Stripe subscription and Connect.
2. **Launch:** admin review queue, settings and billing portal, transactional email (plan start, weekly summary), PWA install, analytics (PostHog).
3. **Retention:** adaptive load adjustments, swap or move sessions, streaks, end-of-plan retest flow that feeds the next PlanRequest.
4. **Mobile:** Expo app reusing `src/lib/engine`, offline logging, wearable sync.
5. **Creator growth:** visual plan builder, creator analytics (drop-off by week), gym white-label pages.

# Graft

Personalised training plans for Hyrox, CrossFit, powerlifting, bodybuilding and running, with a marketplace where PTs and gyms
earn a revenue share. See **[DESIGN.md](DESIGN.md)** for the product and technical design, and `docs/screenshots/` for a walkthrough.

## Run it locally

```bash
cp .env.example .env            # set DATABASE_URL and AUTH_SECRET (npx auth secret)
npm install
npm run db:push                 # create tables
npm run db:seed                 # exercise library + 8 sample plans across all sports
npm run dev
```

- Sign-in needs Google OAuth keys (`AUTH_GOOGLE_*`) or a Resend key (`AUTH_RESEND_KEY`).
- Payments are **off** until `STRIPE_SECRET_KEY` is set. Until then every plan is free to enrol, so the app works end to end without Stripe.
- `npm test` runs the engine tests (matching, scheduling, prescriptions, projections, payouts, CSV import).

## Layout

```
prisma/schema.prisma        data model
prisma/seed.ts              sample plans generated from session "pools"
scripts/monthly-payouts.ts  creator payout run (Stripe Connect transfers)
src/lib/sports.ts           sports, goals, benchmarks, equipment
src/lib/engine/             pure TS: matching, scheduler, prescription, projections, strength/running maths
src/lib/payouts.ts          revenue-share calculation
src/lib/plan-import.ts      CSV → plan variants/weeks/sessions/items
src/app/                    pages (see DESIGN.md §4)
```

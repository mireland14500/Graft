/**
 * Seeds the exercise library and a handful of sample plans across every sport.
 * Plans are generated from small "session pools": a variant with N days per week
 * takes the N highest-priority sessions, so 3/4/5-day versions stay coherent.
 *
 *   npm run db:push && npm run db:seed
 */
import { PrismaClient, type IntensityType, type Level, type SessionKind, type Sport } from "@prisma/client";

const prisma = new PrismaClient();

const EXERCISES: [slug: string, name: string, category: string, benchmarkKey?: string][] = [
  ["back-squat", "Back squat", "lift", "squat_1rm"],
  ["bench-press", "Bench press", "lift", "bench_1rm"],
  ["deadlift", "Deadlift", "lift", "deadlift_1rm"],
  ["clean-and-jerk", "Clean & jerk", "lift", "clean_jerk_1rm"],
  ["front-squat", "Front squat", "lift"],
  ["overhead-press", "Overhead press", "lift"],
  ["romanian-deadlift", "Romanian deadlift", "lift"],
  ["barbell-row", "Barbell row", "lift"],
  ["thruster", "Thruster", "lift"],
  ["leg-press", "Leg press", "accessory"],
  ["dumbbell-press", "Incline dumbbell press", "accessory"],
  ["lat-pulldown", "Lat pulldown", "accessory"],
  ["cable-row", "Seated cable row", "accessory"],
  ["lateral-raise", "Lateral raise", "accessory"],
  ["leg-curl", "Leg curl", "accessory"],
  ["bicep-curl", "Bicep curl", "accessory"],
  ["tricep-pushdown", "Tricep pushdown", "accessory"],
  ["walking-lunge", "Walking lunge", "accessory"],
  ["pull-up", "Pull-up", "gymnastics"],
  ["toes-to-bar", "Toes-to-bar", "gymnastics"],
  ["double-under", "Double-under", "gymnastics"],
  ["box-jump", "Box jump", "gymnastics"],
  ["run", "Run", "run", "run_5k"],
  ["row", "Row", "erg", "row_1k"],
  ["skierg", "SkiErg", "erg"],
  ["sled-push", "Sled push", "station"],
  ["sled-pull", "Sled pull", "station"],
  ["burpee-broad-jump", "Burpee broad jump", "station"],
  ["farmers-carry", "Farmers carry", "station"],
  ["sandbag-lunge", "Sandbag lunge", "station"],
  ["wall-ball", "Wall ball", "station"],
];

type Item = {
  ex: string; sets?: number; reps?: string; type?: IntensityType; value?: number;
  distanceM?: number; durationSec?: number; restSec?: number; notes?: string;
};
type Session = { title: string; kind: SessionKind; minutes: number; items: Item[] };
/** Sessions in priority order; `slot` is where it sits in the week once selected. */
type Pool = (week: number, weeks: number) => { slot: number; session: Session }[];

interface PlanSeed {
  coach: string; slug: string; title: string; summary: string; description: string;
  sport: Sport; levels: Level[]; goals: string[]; equipment: string[];
  weeks: number; minutes: number; days: number[]; deloads?: number[];
  access?: "PREMIUM"; priceCents?: number; rating: [avg: number, count: number]; completion: number;
  pool: Pool;
}

const pct = (ex: string, sets: number, reps: string, value: number, restSec = 180): Item => ({ ex, sets, reps, type: "PERCENT_1RM", value, restSec });
const rpe = (ex: string, sets: number, reps: string, value: number, restSec = 90): Item => ({ ex, sets, reps, type: "RPE", value, restSec });
const run = (distanceM: number, zone: number, notes?: string, sets?: number): Item => ({ ex: "run", distanceM, type: "PACE_ZONE", value: zone, notes, sets });

/** Linear-ish wave: +2.5% per week, back off on deloads, cap at 90%. */
const wave = (week: number, base: number, deloads: number[] = []) =>
  deloads.includes(week) ? base - 10 : Math.min(base + (week - 1) * 2.5, 90);

const strengthPool = (deloads: number[]): Pool => (w, weeks) => {
  const top = w === weeks ? 95 : wave(w, 70, deloads);
  const reps = top >= 85 ? "3" : top >= 77.5 ? "4" : "5";
  return [
    { slot: 1, session: { title: "Squat focus", kind: "STRENGTH", minutes: 75, items: [pct("back-squat", 4, reps, top), pct("bench-press", 3, "6", top - 10), rpe("leg-press", 3, "10", 8)] } },
    { slot: 3, session: { title: "Bench focus", kind: "STRENGTH", minutes: 70, items: [pct("bench-press", 4, reps, top), rpe("barbell-row", 4, "8", 8), rpe("dumbbell-press", 3, "10", 8)] } },
    { slot: 5, session: { title: "Deadlift focus", kind: "STRENGTH", minutes: 75, items: [pct("deadlift", 3, reps, top), pct("back-squat", 3, "5", top - 15), rpe("pull-up", 3, "8", 8)] } },
    { slot: 6, session: { title: "Volume & weak points", kind: "HYPERTROPHY", minutes: 60, items: [pct("bench-press", 4, "8", 65), rpe("romanian-deadlift", 3, "8", 7), rpe("lat-pulldown", 3, "12", 8)] } },
    { slot: 4, session: { title: "Upper accessories", kind: "HYPERTROPHY", minutes: 45, items: [rpe("overhead-press", 3, "8", 8), rpe("cable-row", 3, "12", 8), rpe("tricep-pushdown", 3, "15", 9)] } },
  ];
};

const hyroxPool = (stationReps: (w: number) => number): Pool => (w) => [
  { slot: 1, session: { title: "Run intervals", kind: "RUN_INTERVALS", minutes: 50, items: [run(1000, 5, "Equal time jog recovery", 4 + Math.min(w, 4))] } },
  { slot: 3, session: { title: "Station strength", kind: "STRENGTH", minutes: 60, items: [rpe("front-squat", 4, "6", 8), { ex: "sled-push", sets: 4, distanceM: 25, restSec: 90 }, { ex: "sandbag-lunge", sets: 3, distanceM: 50 }, { ex: "farmers-carry", sets: 3, distanceM: 100 }] } },
  { slot: 6, session: { title: "Hyrox simulation", kind: "HYROX_SIM", minutes: 70, items: [run(1000, 3, "Race pace", stationReps(w)), { ex: "skierg", distanceM: 1000 }, { ex: "row", distanceM: 1000 }, { ex: "wall-ball", sets: 1, reps: String(25 * stationReps(w)) }, { ex: "burpee-broad-jump", distanceM: 20 * stationReps(w) }] } },
  { slot: 5, session: { title: "Easy aerobic run", kind: "RUN_EASY", minutes: 45, items: [run(6000 + w * 500, 1, "Conversational")] } },
  { slot: 2, session: { title: "Engine erg", kind: "CONDITIONING", minutes: 40, items: [{ ex: "row", sets: 5, distanceM: 500, restSec: 90 }, { ex: "skierg", sets: 5, distanceM: 500, restSec: 90 }] } },
];

const runningPool = (longBase: number, longStep: number): Pool => (w, weeks) => {
  const taper = w === weeks;
  return [
    { slot: 6, session: { title: "Long run", kind: "RUN_LONG", minutes: 75, items: [run(taper ? longBase : longBase + (w - 1) * longStep, 1)] } },
    { slot: 1, session: { title: "Intervals", kind: "RUN_INTERVALS", minutes: 45, items: [run(800, 5, "90s jog between", taper ? 3 : 4 + Math.min(w, 4))] } },
    { slot: 3, session: { title: "Tempo run", kind: "RUN_TEMPO", minutes: 45, items: [run(2000, 1, "Warm-up"), run(taper ? 2000 : 3000 + w * 250, 3), run(1500, 1, "Cool-down")] } },
    { slot: 4, session: { title: "Easy run", kind: "RUN_EASY", minutes: 35, items: [run(5000, 1)] } },
    { slot: 2, session: { title: "Strength for runners", kind: "STRENGTH", minutes: 40, items: [rpe("back-squat", 3, "6", 7), rpe("romanian-deadlift", 3, "8", 7), rpe("walking-lunge", 3, "10", 7)] } },
  ];
};

const crossfitPool: Pool = (w) => [
  { slot: 1, session: { title: "Strength + short metcon", kind: "METCON", minutes: 60, items: [pct("back-squat", 5, "3", wave(w, 75)), { ex: "thruster", sets: 3, reps: "21-15-9", notes: "With pull-ups, for time" }, { ex: "pull-up", reps: "21-15-9" }] } },
  { slot: 2, session: { title: "Olympic lifting", kind: "SKILL", minutes: 60, items: [pct("clean-and-jerk", 6, "2", wave(w, 70)), { ex: "double-under", sets: 5, reps: "50" }] } },
  { slot: 4, session: { title: "Engine", kind: "CONDITIONING", minutes: 50, items: [{ ex: "row", sets: 5, distanceM: 500, restSec: 120 }, run(400, 5, undefined, 4)] } },
  { slot: 5, session: { title: "Gymnastics + chipper", kind: "METCON", minutes: 60, items: [{ ex: "toes-to-bar", sets: 5, reps: "10" }, { ex: "wall-ball", reps: "50" }, { ex: "box-jump", reps: "40" }, { ex: "burpee-broad-jump", distanceM: 30 }] } },
  { slot: 6, session: { title: "Long partner-style grind", kind: "CONDITIONING", minutes: 70, items: [{ ex: "row", distanceM: 2000 }, run(1600, 2), { ex: "farmers-carry", sets: 4, distanceM: 50 }] } },
];

const hypertrophyPool: Pool = (w) => {
  const sets = w <= 3 ? 3 : w <= 7 ? 4 : 5;
  return [
    { slot: 1, session: { title: "Push", kind: "HYPERTROPHY", minutes: 65, items: [rpe("bench-press", sets, "8-10", 8), rpe("dumbbell-press", sets, "10-12", 8), rpe("lateral-raise", sets, "15", 9), rpe("tricep-pushdown", 3, "12-15", 9)] } },
    { slot: 3, session: { title: "Pull", kind: "HYPERTROPHY", minutes: 60, items: [rpe("lat-pulldown", sets, "10-12", 8), rpe("barbell-row", sets, "8-10", 8), rpe("cable-row", 3, "12", 9), rpe("bicep-curl", 3, "12-15", 9)] } },
    { slot: 5, session: { title: "Legs", kind: "HYPERTROPHY", minutes: 70, items: [rpe("back-squat", sets, "6-8", 8), rpe("romanian-deadlift", sets, "8-10", 8), rpe("leg-press", 3, "12-15", 9), rpe("leg-curl", 3, "12-15", 9)] } },
    { slot: 6, session: { title: "Upper (arms & delts)", kind: "HYPERTROPHY", minutes: 55, items: [rpe("overhead-press", sets, "8-10", 8), rpe("lateral-raise", 4, "15-20", 9), rpe("bicep-curl", 3, "10-12", 9), rpe("tricep-pushdown", 3, "10-12", 9)] } },
    { slot: 4, session: { title: "Lower (posterior chain)", kind: "HYPERTROPHY", minutes: 55, items: [rpe("deadlift", 3, "5", 7), rpe("walking-lunge", 3, "12", 8), rpe("leg-curl", 4, "12", 9)] } },
  ];
};

const PLANS: PlanSeed[] = [
  {
    coach: "iron-lab", slug: "strength-foundations-12", title: "Strength Foundations", sport: "POWERLIFTING",
    summary: "Twelve weeks of squat, bench and deadlift built on simple, proven progression.",
    description: "A percentage-based block for lifters who want a bigger total without guesswork.\nDeloads in weeks 4 and 8, heavy singles to finish.",
    levels: ["BEGINNER", "INTERMEDIATE"], goals: ["increase_total", "weak_point"], equipment: ["barbell", "rack"],
    weeks: 12, minutes: 75, days: [3, 4], deloads: [4, 8], rating: [4.7, 212], completion: 0.64, pool: strengthPool([4, 8]),
  },
  {
    coach: "iron-lab", slug: "meet-peak-10", title: "Meet Peak", sport: "POWERLIFTING",
    summary: "A ten-week peaking block that brings you to the platform fresh and heavy.",
    description: "For lifters with a meet on the calendar. Builds intensity, cuts volume, and tapers in the final week.",
    levels: ["INTERMEDIATE", "ADVANCED"], goals: ["meet_prep", "increase_total"], equipment: ["barbell", "rack"],
    weeks: 10, minutes: 90, days: [4, 5], deloads: [5], access: "PREMIUM", priceCents: 3900, rating: [4.9, 58], completion: 0.71, pool: strengthPool([5]),
  },
  {
    coach: "hyrox-hq", slug: "hyrox-first-race-10", title: "Hyrox: First Race", sport: "HYROX",
    summary: "Get from gym-goer to finish line, with every station rehearsed.",
    description: "Builds your running base and station strength together, with weekly simulations that grow toward race distance.",
    levels: ["BEGINNER", "INTERMEDIATE"], goals: ["first_race", "doubles"], equipment: ["rower", "skierg", "sled", "wall_ball"],
    weeks: 10, minutes: 60, days: [3, 4], rating: [4.6, 131], completion: 0.58, pool: hyroxPool((w) => Math.min(2 + Math.floor(w / 2), 6)),
  },
  {
    coach: "hyrox-hq", slug: "hyrox-pb-12", title: "Hyrox: PB Hunter", sport: "HYROX",
    summary: "Higher-volume running and compromised-running work for a faster finish.",
    description: "For athletes who have raced before. Five-day option adds an extra erg engine session.",
    levels: ["INTERMEDIATE", "ADVANCED"], goals: ["pb"], equipment: ["rower", "skierg", "sled", "wall_ball"],
    weeks: 12, minutes: 70, days: [4, 5], rating: [4.8, 77], completion: 0.62, pool: hyroxPool((w) => Math.min(4 + Math.floor(w / 3), 8)),
  },
  {
    coach: "sam-rivers", slug: "faster-5k-8", title: "Faster 5k", sport: "RUNNING",
    summary: "Eight weeks of intervals, tempo and easy miles to take minutes off your 5k.",
    description: "Every pace is set from your current 5k, so the plan adjusts as you get quicker.",
    levels: ["BEGINNER", "INTERMEDIATE"], goals: ["faster_5k"], equipment: [],
    weeks: 8, minutes: 45, days: [3, 4], rating: [4.7, 340], completion: 0.69, pool: runningPool(7000, 500),
  },
  {
    coach: "sam-rivers", slug: "half-marathon-12", title: "Half Marathon Build", sport: "RUNNING",
    summary: "From 10k fitness to a confident half marathon in twelve weeks.",
    description: "Long runs build to 19km before a one-week taper.",
    levels: ["BEGINNER", "INTERMEDIATE", "ADVANCED"], goals: ["first_half"], equipment: [],
    weeks: 12, minutes: 60, days: [3, 4, 5], rating: [4.6, 190], completion: 0.55, pool: runningPool(9000, 1000),
  },
  {
    coach: "iron-lab", slug: "crossfit-engine-strength-8", title: "Engine & Strength", sport: "CROSSFIT",
    summary: "Balanced CrossFit programming: barbell strength, gymnastics and a bigger engine.",
    description: "Built for affiliate members who want structure around (or instead of) class.",
    levels: ["BEGINNER", "INTERMEDIATE", "ADVANCED"], goals: ["general_fitness", "open_prep", "strength_bias"], equipment: ["barbell", "rack", "rower", "pullup_bar", "wall_ball"],
    weeks: 8, minutes: 60, days: [3, 4, 5], rating: [4.5, 96], completion: 0.6, pool: crossfitPool,
  },
  {
    coach: "sam-rivers", slug: "hypertrophy-split-10", title: "Hypertrophy Split", sport: "BODYBUILDING",
    summary: "Push / pull / legs that grows into a five-day split, with weekly volume ramps.",
    description: "Sets climb from 3 to 5 per exercise across the block. Pair with a small surplus for a lean bulk.",
    levels: ["BEGINNER", "INTERMEDIATE"], goals: ["build_muscle", "recomp"], equipment: ["barbell", "dumbbells", "machines"],
    weeks: 10, minutes: 65, days: [3, 4, 5], rating: [4.6, 268], completion: 0.66, pool: hypertrophyPool,
  },
];

const COACHES = [
  { slug: "iron-lab", displayName: "Iron Lab Coaching", gymName: "Iron Lab Barbell Club", bio: "Strength coaches with 15 years of meet experience." },
  { slug: "hyrox-hq", displayName: "Race Ready Coaching", gymName: "Race Ready Fitness", bio: "Hyrox specialists. 400+ athletes over the line." },
  { slug: "sam-rivers", displayName: "Sam Rivers", gymName: null, bio: "Run coach and hybrid athlete, UKA qualified." },
];

async function main() {
  for (const [slug, name, category, benchmarkKey] of EXERCISES) {
    await prisma.exercise.upsert({ where: { slug }, update: { name, category, benchmarkKey }, create: { slug, name, category, benchmarkKey } });
  }
  const exerciseId = new Map((await prisma.exercise.findMany()).map((e) => [e.slug, e.id]));

  const coachId = new Map<string, string>();
  for (const c of COACHES) {
    const user = await prisma.user.upsert({
      where: { email: `${c.slug}@example.com` },
      update: {},
      create: { email: `${c.slug}@example.com`, name: c.displayName, role: "COACH" },
    });
    const coach = await prisma.coachProfile.upsert({ where: { slug: c.slug }, update: c, create: { ...c, userId: user.id, verified: true } });
    coachId.set(c.slug, coach.id);
  }

  for (const p of PLANS) {
    await prisma.planTemplate.deleteMany({ where: { slug: p.slug } });
    await prisma.planTemplate.create({
      data: {
        coachId: coachId.get(p.coach)!, slug: p.slug, title: p.title, summary: p.summary, description: p.description,
        sport: p.sport, levels: p.levels, goals: p.goals, equipment: p.equipment, durationWeeks: p.weeks,
        sessionMinutes: p.minutes, access: p.access ?? "INCLUDED", priceCents: p.priceCents, status: "PUBLISHED",
        ratingAvg: p.rating[0], ratingCount: p.rating[1], completionRate: p.completion,
        variants: {
          create: p.days.map((daysPerWeek) => ({
            daysPerWeek,
            weeks: {
              create: Array.from({ length: p.weeks }, (_, i) => {
                const week = i + 1;
                const chosen = p.pool(week, p.weeks).slice(0, daysPerWeek).sort((a, b) => a.slot - b.slot);
                return {
                  weekNumber: week,
                  isDeload: p.deloads?.includes(week) ?? false,
                  focus: week === p.weeks ? "Test / taper week" : p.deloads?.includes(week) ? "Deload" : undefined,
                  sessions: {
                    create: chosen.map(({ session }, order) => ({
                      order: order + 1, title: session.title, kind: session.kind, estMinutes: session.minutes,
                      items: {
                        create: session.items.map((it, j) => ({
                          order: j + 1, exerciseId: exerciseId.get(it.ex)!, sets: it.sets, reps: it.reps,
                          intensityType: it.type, intensityValue: it.value, distanceM: it.distanceM,
                          durationSec: it.durationSec, restSec: it.restSec, notes: it.notes,
                        })),
                      },
                    })),
                  },
                };
              }),
            },
          })),
        },
      },
    });
  }
  console.log(`Seeded ${EXERCISES.length} exercises, ${COACHES.length} coaches, ${PLANS.length} plans`);
}

main().finally(() => prisma.$disconnect());

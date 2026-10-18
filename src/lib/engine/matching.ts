import type { Level, Sport } from "../sports";

/** What the athlete told us in onboarding. */
export interface PlanRequestInput {
  sport: Sport;
  goal: string;
  level: Level;
  daysPerWeek: number;
  sessionMinutes: number;
  durationWeeks: number;
  equipment: string[];
}

/** The subset of a published PlanTemplate the matcher needs. */
export interface PlanCandidate {
  id: string;
  sport: Sport;
  levels: Level[];
  goals: string[];
  equipment: string[];
  durationWeeks: number;
  sessionMinutes: number;
  /** daysPerWeek of each authored PlanVariant */
  variantDays: number[];
  ratingAvg: number;
  ratingCount: number;
  completionRate: number;
}

export interface RankedPlan<P extends PlanCandidate = PlanCandidate> {
  plan: P;
  score: number;
  /** Which PlanVariant to enrol into */
  daysPerWeek: number;
  reasons: string[];
  warnings: string[];
}

const LEVEL_ORDER: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const WEIGHTS = { level: 25, goal: 20, days: 15, duration: 15, sessionLength: 10, quality: 15 } as const;

export function hasEquipment(userEquipment: string[], required: string[]): boolean {
  if (userEquipment.includes("full_gym")) return true;
  return required.every((r) => userEquipment.includes(r));
}

/** Bayesian average so a plan with one 5★ review doesn't beat one with 400 4.8★ reviews. */
function qualityScore(p: PlanCandidate): number {
  const prior = 4;
  const priorWeight = 10;
  const rating = (prior * priorWeight + p.ratingAvg * p.ratingCount) / (priorWeight + p.ratingCount);
  const ratingPart = Math.min(Math.max((rating - 3) / 2, 0), 1); // 3★ → 0, 5★ → 1
  return 0.7 * ratingPart + 0.3 * p.completionRate;
}

/**
 * Hard filters: sport, a variant that fits in the athlete's available days, equipment.
 * Everything else is a weighted 0–100 score, with human-readable reasons for the UI.
 */
export function rankPlans<P extends PlanCandidate>(req: PlanRequestInput, plans: P[]): RankedPlan<P>[] {
  const ranked: RankedPlan<P>[] = [];

  for (const plan of plans) {
    if (plan.sport !== req.sport) continue;
    if (!hasEquipment(req.equipment, plan.equipment)) continue;
    const fitting = plan.variantDays.filter((d) => d <= req.daysPerWeek);
    if (fitting.length === 0) continue;
    const daysPerWeek = Math.max(...fitting);

    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    if (plan.levels.includes(req.level)) {
      score += WEIGHTS.level;
      reasons.push(`Built for ${req.level.toLowerCase()} athletes`);
    } else {
      const distance = Math.min(
        ...plan.levels.map((l) => Math.abs(LEVEL_ORDER.indexOf(l) - LEVEL_ORDER.indexOf(req.level))),
      );
      if (distance === 1) {
        score += WEIGHTS.level * 0.4;
        warnings.push(`Aimed at ${plan.levels.map((l) => l.toLowerCase()).join("/")} athletes`);
      }
    }

    if (plan.goals.includes(req.goal)) {
      score += WEIGHTS.goal;
      reasons.push("Matches your goal");
    }

    if (daysPerWeek === req.daysPerWeek) {
      score += WEIGHTS.days;
      reasons.push(`Fits your ${req.daysPerWeek} training days`);
    } else {
      score += WEIGHTS.days * 0.5;
      warnings.push(`Uses ${daysPerWeek} of your ${req.daysPerWeek} days — the rest are recovery`);
    }

    const durationFit = Math.max(0, 1 - Math.abs(plan.durationWeeks - req.durationWeeks) / req.durationWeeks);
    score += WEIGHTS.duration * durationFit;
    if (plan.durationWeeks === req.durationWeeks) reasons.push(`Exactly ${req.durationWeeks} weeks`);
    else if (durationFit < 0.75) warnings.push(`${plan.durationWeeks} weeks long (you asked for ${req.durationWeeks})`);

    const overrun = plan.sessionMinutes - req.sessionMinutes;
    score += WEIGHTS.sessionLength * (overrun <= 0 ? 1 : Math.max(0, 1 - overrun / 30));
    if (overrun > 10) warnings.push(`Sessions run ~${plan.sessionMinutes} min`);

    score += WEIGHTS.quality * qualityScore(plan);
    if (plan.ratingCount >= 20 && plan.ratingAvg >= 4.5) reasons.push(`Rated ${plan.ratingAvg.toFixed(1)}★`);

    ranked.push({ plan, score: Math.round(score), daysPerWeek, reasons, warnings });
  }

  return ranked.sort((a, b) => b.score - a.score);
}

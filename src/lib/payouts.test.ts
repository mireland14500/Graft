import { describe, expect, it } from "vitest";
import { computeCreatorPayouts } from "./payouts";
import { importPlanCsv } from "./plan-import";

describe("payouts", () => {
  it("splits a subscriber pro-rata and adds the referral bonus", () => {
    const payouts = computeCreatorPayouts({
      coachShareBps: { gym: 1000, pt: 1000 },
      premiumSales: [{ planId: "premium", coachId: "pt", amountCents: 2000 }],
      subscribers: [
        {
          userId: "u1",
          netRevenueCents: 1000,
          referredByCoachId: "gym",
          enrolments: [
            { planId: "hyrox", coachId: "gym", activeDays: 20 },
            { planId: "strength", coachId: "pt", activeDays: 10 },
          ],
        },
        { userId: "idle", netRevenueCents: 1000, enrolments: [] },
      ],
    });
    const gym = payouts.find((p) => p.coachId === "gym")!;
    const pt = payouts.find((p) => p.coachId === "pt")!;
    expect(gym.totalCents).toBe(133); // 1000 × 2/3 × (10% + 10% referral)
    expect(pt.byPlan).toEqual({ strength: 33, premium: 1400 }); // 1000 × 1/3 × 10%
  });
});

describe("plan import", () => {
  it("builds variants → weeks → sessions → items", () => {
    const csv = [
      "days_per_week,week,session,session_title,kind,est_minutes,exercise,sets,reps,intensity_type,intensity_value,distance_m,duration_sec,rest_sec,notes",
      "3,1,1,Heavy squat,STRENGTH,70,back-squat,4,5,PERCENT_1RM,75,,,180,",
      '3,1,1,Heavy squat,STRENGTH,70,leg-press,3,10,RPE,8,,,90,"Controlled, slow eccentric"',
      "3,1,2,Easy run,RUN_EASY,40,run,,,PACE_ZONE,1,6000,,,",
      "3,2,1,Heavy squat,STRENGTH,70,back-squat,4,4,PERCENT_1RM,80,,,180,",
    ].join("\n");
    const { variants, errors } = importPlanCsv(csv);
    expect(errors).toEqual([]);
    expect(variants).toHaveLength(1);
    expect(variants[0].weeks[0].sessions[0].items[1].notes).toBe("Controlled, slow eccentric");
    expect(variants[0].weeks[0].sessions[1].items[0].distanceM).toBe(6000);
  });

  it("reports bad rows with line numbers", () => {
    const { errors } = importPlanCsv("days_per_week,week,session,session_title,kind,exercise\n3,1,1,X,ZUMBA,run");
    expect(errors[0]).toContain("Line 2");
  });
});

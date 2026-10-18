import { prisma } from "./db";
import type { PlanRequestData } from "./validation";

// Server-only helpers. Keep these out of "use server" files: every export there is a public endpoint.

export async function savePlanRequest(userId: string, data: PlanRequestData, refSlug?: string) {
  if (refSlug) {
    // First referral wins; coaches can't refer themselves.
    const coach = await prisma.coachProfile.findUnique({ where: { slug: refSlug } });
    if (coach && coach.userId !== userId) {
      await prisma.user.updateMany({ where: { id: userId, referredByCoachId: null }, data: { referredByCoachId: coach.id } });
    }
  }
  await prisma.athleteProfile.upsert({
    where: { userId },
    create: { userId, sex: data.sex, bodyweightKg: data.bodyweightKg, equipment: data.equipment },
    update: { sex: data.sex, bodyweightKg: data.bodyweightKg, equipment: data.equipment },
  });
  if (Object.keys(data.benchmarks).length) {
    await prisma.benchmarkEntry.createMany({
      data: Object.entries(data.benchmarks).map(([key, value]) => ({ userId, key, value, source: "MANUAL" as const })),
    });
  }
  return prisma.planRequest.create({
    data: {
      userId,
      sport: data.sport,
      goal: data.goal,
      level: data.level,
      availableDays: data.availableDays,
      sessionMinutes: data.sessionMinutes,
      durationWeeks: data.durationWeeks,
      equipment: data.equipment,
      benchmarks: data.benchmarks,
    },
  });
}

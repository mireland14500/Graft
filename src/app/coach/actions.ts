"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { importPlanCsv } from "@/lib/plan-import";
import { requireCoach, requireUser } from "@/lib/session";
import { LEVELS, SPORTS } from "@/lib/sports";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function applyAsCoachAction(formData: FormData) {
  const user = await requireUser("/coach/apply");
  const data = z
    .object({ displayName: z.string().min(2).max(80), gymName: z.string().max(80).optional(), bio: z.string().max(1000).optional() })
    .parse(Object.fromEntries(formData));

  await prisma.$transaction([
    prisma.coachProfile.create({
      data: { userId: user.id, ...data, slug: `${slugify(data.displayName)}-${user.id.slice(-5)}` },
    }),
    prisma.user.update({ where: { id: user.id }, data: { role: "COACH" } }),
  ]);
  redirect("/coach");
}

const planMetaSchema = z.object({
  title: z.string().min(3).max(100),
  summary: z.string().min(10).max(200),
  description: z.string().min(10).max(5000),
  sport: z.enum(SPORTS),
  levels: z.array(z.enum(LEVELS)).min(1),
  goals: z.array(z.string()).min(1),
  equipment: z.array(z.string()),
  sessionMinutes: z.coerce.number().int().min(15).max(180),
  access: z.enum(["INCLUDED", "PREMIUM"]),
  priceCents: z.coerce.number().int().min(0).optional(),
});

export async function createPlanFromCsvAction(_prev: { errors: string[] }, formData: FormData): Promise<{ errors: string[] }> {
  const user = await requireCoach();
  const coach = await prisma.coachProfile.findUniqueOrThrow({ where: { userId: user.id } });

  const meta = planMetaSchema.safeParse({
    ...Object.fromEntries(formData),
    levels: formData.getAll("levels"),
    goals: formData.getAll("goals"),
    equipment: formData.getAll("equipment"),
    priceCents: formData.get("price") ? Math.round(Number(formData.get("price")) * 100) : undefined,
  });
  if (!meta.success) return { errors: meta.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) return { errors: ["Attach a CSV file"] };
  const { variants, errors } = importPlanCsv(await file.text());
  if (errors.length) return { errors };
  if (variants.length === 0) return { errors: ["The CSV has no sessions"] };

  const slugs = [...new Set(variants.flatMap((v) => v.weeks.flatMap((w) => w.sessions.flatMap((s) => s.items.map((i) => i.exerciseSlug)))))];
  const exercises = await prisma.exercise.findMany({ where: { slug: { in: slugs } } });
  const idBySlug = new Map(exercises.map((e) => [e.slug, e.id]));
  const unknown = slugs.filter((s) => !idBySlug.has(s));
  if (unknown.length) return { errors: [`Unknown exercises: ${unknown.join(", ")} — use slugs from the exercise library`] };

  await prisma.planTemplate.create({
    data: {
      ...meta.data,
      coachId: coach.id,
      slug: `${slugify(meta.data.title)}-${Date.now().toString(36)}`,
      durationWeeks: Math.max(...variants.map((v) => v.weeks.length)),
      status: "IN_REVIEW",
      variants: {
        create: variants.map((v) => ({
          daysPerWeek: v.daysPerWeek,
          weeks: {
            create: v.weeks.map((w) => ({
              weekNumber: w.weekNumber,
              sessions: {
                create: w.sessions.map(({ items, ...s }) => ({
                  ...s,
                  items: { create: items.map(({ exerciseSlug, ...i }) => ({ ...i, exerciseId: idBySlug.get(exerciseSlug)! })) },
                })),
              },
            })),
          },
        })),
      },
    },
  });
  redirect("/coach?submitted=1");
}

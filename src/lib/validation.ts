import { z } from "zod";
import { LEVELS, SPORTS } from "./sports";

export const planRequestSchema = z.object({
  sport: z.enum(SPORTS),
  goal: z.string().min(1),
  level: z.enum(LEVELS),
  availableDays: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one day").max(7),
  sessionMinutes: z.number().int().min(20).max(180),
  durationWeeks: z.number().int().min(4).max(26),
  equipment: z.array(z.string()),
  /** Seconds for times, kg for loads */
  benchmarks: z.record(z.string(), z.number().positive()),
  sex: z.enum(["male", "female"]).optional(),
  bodyweightKg: z.number().positive().optional(),
});

export type PlanRequestData = z.infer<typeof planRequestSchema>;

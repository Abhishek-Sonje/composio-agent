import { z } from "zod";

export const researchTargetSchema = z.object({
  name: z.string().trim().min(1),
  website: z.url().optional(),
  websiteHint: z.string().trim().min(1).optional(),
  expectedCategory: z.string().trim().min(1).optional(),
});

export type ResearchTarget = z.infer<typeof researchTargetSchema>;

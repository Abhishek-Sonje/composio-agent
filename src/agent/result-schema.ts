import { z } from "zod";

export const researchFieldSchema = z.enum([
  "app",
  "category",
  "description",
  "authMethods",
  "accessModel",
  "apiSurface.rest",
  "apiSurface.graphql",
  "apiSurface.other",
  "mcp",
  "buildability",
  "blocker",
]);

const evidenceSchema = z.object({
  title: z.string().trim().min(1),
  url: z.url().refine((url) => /^https?:\/\//.test(url), {
    message: "Evidence URL must use HTTP or HTTPS",
  }),
  sourceType: z.enum(["official", "third_party"]),
  supports: z.array(researchFieldSchema).min(1),
});

export const appResearchResultSchema = z
  .object({
    app: z.string().trim().min(1),
    category: z.string().trim().min(1),
    description: z.string().trim().min(1),
    authMethods: z.array(z.string().trim().min(1)),
    accessModel: z.enum([
      "self_serve_free",
      "self_serve_trial",
      "self_serve_paid",
      "admin_approval",
      "enterprise_only",
      "partnership_required",
      "contact_sales",
      "unknown",
    ]),
    apiSurface: z.object({
      rest: z.boolean().nullable(),
      graphql: z.boolean().nullable(),
      other: z.array(z.string().trim().min(1)),
      summary: z.string().trim().min(1),
    }),
    mcp: z.object({
      status: z.enum(["available", "not_found", "unknown"]),
      notes: z.string().trim().min(1).optional(),
    }),
    buildability: z.enum([
      "buildable",
      "partially_buildable",
      "blocked",
      "unknown",
    ]),
    blocker: z.string().trim().min(1).nullable(),
    confidence: z.enum(["high", "medium", "low"]),
    unknownFields: z.array(researchFieldSchema),
    evidence: z.array(evidenceSchema),
    researchNotes: z.array(z.string().trim().min(1)),
  })
  .superRefine((result, context) => {
    if (result.buildability === "buildable" && result.blocker !== null) {
      context.addIssue({
        code: "custom",
        path: ["blocker"],
        message: "A buildable application cannot have a blocker",
      });
    }

    if (
      ["partially_buildable", "blocked"].includes(result.buildability) &&
      result.blocker === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["blocker"],
        message: `${result.buildability} requires a blocker`,
      });
    }
  });

export type ResearchField = z.infer<typeof researchFieldSchema>;
export type AppResearchResult = z.infer<typeof appResearchResultSchema>;


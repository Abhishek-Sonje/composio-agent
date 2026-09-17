import { z } from "zod";

import {
  appResearchResultSchema,
  type AppResearchResult,
  type ResearchField,
} from "./result-schema.js";

export const fieldEvidenceSchema = z.object({
  app: z.array(z.url()),
  category: z.array(z.url()),
  description: z.array(z.url()),
  authMethods: z.array(z.url()),
  accessModel: z.array(z.url()),
  apiSurfaceRest: z.array(z.url()),
  apiSurfaceGraphql: z.array(z.url()),
  apiSurfaceOther: z.array(z.url()),
  mcp: z.array(z.url()),
  buildability: z.array(z.url()),
  blocker: z.array(z.url()),
});

export const researchSynthesisSchema = z.object({
  result: appResearchResultSchema,
  fieldEvidence: fieldEvidenceSchema,
});

export type FieldEvidence = z.infer<typeof fieldEvidenceSchema>;

const fieldEvidenceMapping: Record<keyof FieldEvidence, ResearchField> = {
  app: "app",
  category: "category",
  description: "description",
  authMethods: "authMethods",
  accessModel: "accessModel",
  apiSurfaceRest: "apiSurface.rest",
  apiSurfaceGraphql: "apiSurface.graphql",
  apiSurfaceOther: "apiSurface.other",
  mcp: "mcp",
  buildability: "buildability",
  blocker: "blocker",
};

function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString();
}

export function applyFieldEvidence(
  result: AppResearchResult,
  fieldEvidence: FieldEvidence,
): AppResearchResult {
  const supportsByUrl = new Map<string, Set<ResearchField>>();

  for (const [ledgerField, urls] of Object.entries(fieldEvidence) as Array<
    [keyof FieldEvidence, string[]]
  >) {
    const resultField = fieldEvidenceMapping[ledgerField];
    for (const url of urls) {
      const normalized = normalizeUrl(url);
      const supports = supportsByUrl.get(normalized) ?? new Set<ResearchField>();
      supports.add(resultField);
      supportsByUrl.set(normalized, supports);
    }
  }

  const evidence = result.evidence.flatMap((item) => {
    const supports = [...(supportsByUrl.get(normalizeUrl(item.url)) ?? [])];
    return supports.length > 0 ? [{ ...item, supports }] : [];
  });

  return appResearchResultSchema.parse({ ...result, evidence });
}


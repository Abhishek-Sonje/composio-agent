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
export type FetchedSource = { url: string; content: string };

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
  fetchedSources: Array<string | FetchedSource>,
): AppResearchResult {
  const supportsByUrl = new Map<string, Set<ResearchField>>();
  const fetched = new Map(
    fetchedSources.map((source) => [
      normalizeUrl(typeof source === "string" ? source : source.url),
      typeof source === "string" ? "" : source.content,
    ]),
  );

  for (const [ledgerField, urls] of Object.entries(fieldEvidence) as Array<
    [keyof FieldEvidence, string[]]
  >) {
    const resultField = fieldEvidenceMapping[ledgerField];
    for (const url of urls) {
      const normalized = normalizeUrl(url);
      if (!fetched.has(normalized)) continue;
      const supports = supportsByUrl.get(normalized) ?? new Set<ResearchField>();
      supports.add(resultField);
      supportsByUrl.set(normalized, supports);
    }
  }

  // Exact protocol names in a fetched page are deterministic evidence for a
  // positive technical-surface claim. This repairs missed ledger entries
  // without inferring availability from model memory or search snippets.
  for (const item of result.evidence) {
    const normalized = normalizeUrl(item.url);
    const content = fetched.get(normalized);
    if (!content) continue;

    const text = `${item.title}\n${item.url}\n${content}`;
    const supports = supportsByUrl.get(normalized) ?? new Set<ResearchField>();
    if (
      result.authMethods.some((method) =>
        text.toLocaleLowerCase().includes(method.toLocaleLowerCase()),
      )
    ) {
      supports.add("authMethods");
    }
    if (result.apiSurface.rest === true && /\bREST(?:ful)?\s+API\b/i.test(text)) {
      supports.add("apiSurface.rest");
    }
    if (result.apiSurface.graphql === true && /\bGraphQL\b/i.test(text)) {
      supports.add("apiSurface.graphql");
    }
    if (
      result.mcp.status === "available" &&
      /\b(?:Model Context Protocol|MCP (?:server|support|integration))\b/i.test(text)
    ) {
      supports.add("mcp");
    }
    if (supports.size > 0) supportsByUrl.set(normalized, supports);
  }

  const evidence = result.evidence.flatMap((item) => {
    const supports = [...(supportsByUrl.get(normalizeUrl(item.url)) ?? [])];
    return supports.length > 0 ? [{ ...item, supports }] : [];
  });

  return appResearchResultSchema.parse({ ...result, evidence });
}

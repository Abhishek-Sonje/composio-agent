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
export type FetchedSource = { url: string; content: string; title?: string };

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contentSupportsField(
  result: AppResearchResult,
  field: ResearchField,
  content: string,
  sourceType: "official" | "third_party",
): boolean {
  if (!content) return true;

  if (field === "accessModel") {
    const accessPatterns: Record<AppResearchResult["accessModel"], RegExp> = {
      self_serve_free: /\b(?:free (?:account|plan|workspace)|developer edition.{0,40}free|open[- ]source|self[- ]host)/i,
      self_serve_trial: /\b(?:free )?trial\b/i,
      self_serve_paid: /\b(?:paid (?:account|plan)|subscription required)\b/i,
      admin_approval: /\b(?:tech(?:nical)? admin|administrator.{0,60}(?:approve|create|enable|grant|required))/i,
      enterprise_only: /\b(?:enterprise.{0,60}(?:required|only|plan|edition)|(?:requires?|available).{0,60}enterprise)\b/i,
      partnership_required: /\bpartner(?:ship)?.{0,40}(?:required|approval|program)\b/i,
      contact_sales: /\bcontact (?:our )?sales\b/i,
      unknown: /$a/,
    };
    return accessPatterns[result.accessModel].test(content);
  }

  if (field === "apiSurface.graphql" && result.apiSurface.graphql === false) {
    return /\b(?:does not|doesn't|no longer) (?:offer|support|provide|have).{0,50}GraphQL|\bGraphQL.{0,50}(?:is not supported|is unavailable|isn't supported)\b/i.test(
      content,
    );
  }

  if (field === "mcp" && result.mcp.status === "available") {
    const app = escapeRegExp(result.app);
    const productServer = new RegExp(
      `\\b${app}(?:'s)?\\s+(?:hosted\\s+)?MCP\\s+servers?\\b|\\bMCP\\s+servers?\\s+(?:provided\\s+by\\s+)?${app}\\b`,
      "i",
    );
    const officialProductMcp = new RegExp(
      `\\b${app}(?:'s)?\\s+MCP\\b(?!\\s+client)`,
      "i",
    );
    return productServer.test(content) ||
      (sourceType === "official" && officialProductMcp.test(content)) ||
      (sourceType === "official" && /\bour MCP server\b/i.test(content));
  }

  return true;
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
      typeof source === "string"
        ? { url: source, content: "" }
        : source,
    ]),
  );
  const evidenceByUrl = new Map(
    result.evidence.map((item) => [normalizeUrl(item.url), item]),
  );

  for (const [ledgerField, urls] of Object.entries(fieldEvidence) as Array<
    [keyof FieldEvidence, string[]]
  >) {
    const resultField = fieldEvidenceMapping[ledgerField];
    for (const url of urls) {
      const normalized = normalizeUrl(url);
      if (!fetched.has(normalized)) continue;
      const item = evidenceByUrl.get(normalized);
      if (!contentSupportsField(
        result,
        resultField,
        fetched.get(normalized)?.content ?? "",
        item?.sourceType ?? "third_party",
      )) {
        continue;
      }
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
    const source = fetched.get(normalized);
    if (!source?.content) continue;

    const text = `${item.title}\n${item.url}\n${source.content}`;
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
      contentSupportsField(result, "mcp", text, item.sourceType)
    ) {
      supports.add("mcp");
    }
    if (supports.size > 0) supportsByUrl.set(normalized, supports);
  }

  const seen = new Set<string>();
  const evidence = result.evidence.flatMap((item) => {
    const normalized = normalizeUrl(item.url);
    if (seen.has(normalized)) return [];
    seen.add(normalized);
    const supports = [...(supportsByUrl.get(normalized) ?? [])];
    return supports.length > 0 ? [{ ...item, supports }] : [];
  });

  for (const [normalized, supports] of supportsByUrl) {
    if (seen.has(normalized) || supports.size === 0) continue;
    const source = fetched.get(normalized);
    if (!source) continue;
    evidence.push({
      title: source.title ?? source.url,
      url: source.url,
      sourceType: "third_party",
      supports: [...supports],
    });
  }

  return appResearchResultSchema.parse({ ...result, evidence });
}

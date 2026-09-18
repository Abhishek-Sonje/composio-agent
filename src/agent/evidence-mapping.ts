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

function authMethodMentioned(method: string, content: string): boolean {
  const normalizedMethod = method.toLocaleLowerCase();
  const concepts: Array<[RegExp, RegExp]> = [
    [/oauth/, /\boauth(?:\s*2\.0)?\b/i],
    [/personal access token/, /\bpersonal access tokens?\b|\bfine[- ]grained token\b/i],
    [/github app/, /\bgithub app\b.{0,60}\b(?:access )?tokens?\b/i],
    [/github_token/, /\bgithub_token\b/i],
    [/bearer/, /\bbearer\b/i],
    [/api[ _-]?key/, /\bapi[ _-]?keys?\b/i],
    [/basic auth/, /\bbasic auth(?:entication)?\b/i],
    [/client credentials/, /\bclient credentials?\b/i],
    [/access token/, /\baccess tokens?\b/i],
    [/cookie|session/, /\b(?:browser )?session cookies?\b/i],
  ];
  const matchingConcepts = concepts.filter(([methodPattern]) =>
    methodPattern.test(normalizedMethod)
  );
  if (matchingConcepts.length > 0) {
    return matchingConcepts.every(([, contentPattern]) => contentPattern.test(content));
  }

  const escaped = method
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+")
    .replace(/(?:key|token|cookie)$/i, "$&s?");
  return new RegExp(`\\b${escaped}\\b`, "i").test(content);
}

function explicitAccessModel(
  content: string,
): Exclude<AppResearchResult["accessModel"], "unknown"> | undefined {
  if (/\b(?:enterprise (?:subscription|plan|edition).{0,50}(?:required|only)|(?:requires?|available only).{0,50}enterprise)\b/i.test(content)) {
    return "enterprise_only";
  }
  if (/\b(?:standalone contract|required.{0,30}(?:contact|talk to) (?:our )?sales|contact (?:our )?sales)\b/i.test(content)) {
    return "contact_sales";
  }
  if (/\b(?:administrator|admin).{0,60}(?:approval|required|approve|enable|grant)\b/i.test(content)) {
    return "admin_approval";
  }
  if (/\bpartner(?:ship)? (?:account|program|approval).{0,40}required\b/i.test(content)) {
    return "partnership_required";
  }
  if (/\b(?:free developer (?:account|portal|sandbox|test account)|free (?:account|plan|workspace)|developer edition.{0,40}free|open[- ]source|self[- ]host)\b/i.test(content)) {
    return "self_serve_free";
  }
  if (/\b(?:free )?trial\b/i.test(content)) return "self_serve_trial";
  if (/\b(?:paid (?:subscription|account|plan)|subscription required)\b/i.test(content)) {
    return "self_serve_paid";
  }
  return undefined;
}

function recoverExplicitClaims(
  result: AppResearchResult,
  fetched: Map<string, FetchedSource>,
): AppResearchResult {
  const officialTexts = result.evidence.flatMap((item) => {
    const source = fetched.get(normalizeUrl(item.url));
    return item.sourceType === "official" && source?.content
      ? [`${item.title}\n${item.url}\n${source.content}`]
      : [];
  });
  const officialText = officialTexts.join("\n");
  const explicitlyNotRest =
    /\b(?:not|isn't|is not)\s+(?:a\s+)?REST(?:ful)?\s+API\b|\bRPC[- ]style\b.{0,80}\bnot\s+(?:a\s+)?REST/i;
  const recoveredRest = result.apiSurface.rest === null &&
    !explicitlyNotRest.test(officialText) &&
    /\bREST(?:ful)?\s+API\b/i.test(officialText);
  const recoveredGraphql = result.apiSurface.graphql === null &&
    /\bGraphQL\s+(?:API|endpoint)\b/i.test(officialText);
  const recoveredAccess = result.accessModel === "unknown"
    ? explicitAccessModel(officialText)
    : undefined;
  if (!recoveredRest && !recoveredGraphql && !recoveredAccess) return result;

  const unknownFields = result.unknownFields.filter((field) =>
    !(recoveredRest && field === "apiSurface.rest") &&
    !(recoveredGraphql && field === "apiSurface.graphql") &&
    !(recoveredAccess && field === "accessModel")
  );
  const supportedApis = [
    recoveredRest || result.apiSurface.rest === true ? "REST" : null,
    recoveredGraphql || result.apiSurface.graphql === true ? "GraphQL" : null,
  ].filter((value): value is string => value !== null);

  return {
    ...result,
    accessModel: recoveredAccess ?? result.accessModel,
    apiSurface: {
      ...result.apiSurface,
      rest: recoveredRest ? true : result.apiSurface.rest,
      graphql: recoveredGraphql ? true : result.apiSurface.graphql,
      summary: supportedApis.length > 0
        ? `Cited official evidence supports ${supportedApis.join(" and ")}.`
        : result.apiSurface.summary,
    },
    unknownFields,
  };
}

function contentSupportsField(
  result: AppResearchResult,
  field: ResearchField,
  content: string,
  sourceType: "official" | "third_party",
  sourceUrl: string,
): boolean {
  if (!content) return true;

  if (field === "authMethods") {
    return sourceType === "official" &&
      result.authMethods.some((method) => authMethodMentioned(method, content));
  }

  if (field === "accessModel") {
    const accessPatterns: Record<AppResearchResult["accessModel"], RegExp> = {
      self_serve_free: /\b(?:free (?:developer (?:account|portal|sandbox|test account)|account|plan|workspace)|developer edition.{0,40}free|open[- ]source|self[- ]host)/i,
      self_serve_trial: /\b(?:free )?trial\b/i,
      self_serve_paid: /\b(?:paid (?:account|plan)|subscription required)\b/i,
      admin_approval: /\b(?:tech(?:nical)? admin|administrator.{0,60}(?:approve|create|enable|grant|required))/i,
      enterprise_only: /\b(?:enterprise.{0,60}(?:required|only|plan|edition)|(?:requires?|available).{0,60}enterprise)\b/i,
      partnership_required: /\bpartner(?:ship)?.{0,40}(?:required|approval|program)\b/i,
      contact_sales: /\bcontact (?:our )?sales\b/i,
      unknown: /$a/,
    };
    return sourceType === "official" &&
      accessPatterns[result.accessModel].test(content);
  }

  if (field === "apiSurface.rest") {
    if (result.apiSurface.rest === true) {
      const explicitlyNotRest =
        /\b(?:not|isn't|is not)\s+(?:a\s+)?REST(?:ful)?\s+API\b|\bRPC[- ]style\b.{0,80}\bnot\s+(?:a\s+)?REST/i;
      return sourceType === "official" &&
        !explicitlyNotRest.test(content) &&
        /\bREST(?:ful)?\s+API\b/i.test(content);
    }
    if (result.apiSurface.rest === false) {
      return sourceType === "official" &&
        /\b(?:does not|doesn't|no longer) (?:offer|support|provide|have).{0,50}REST(?:ful)?\s+API|\bREST(?:ful)?\s+API.{0,50}(?:is not supported|is unavailable|isn't supported)\b/i.test(
          content,
        );
    }
  }

  if (field === "apiSurface.graphql" && result.apiSurface.graphql === false) {
    return sourceType === "official" &&
      /\b(?:does not|doesn't|no longer) (?:offer|support|provide|have).{0,50}GraphQL|\bGraphQL.{0,50}(?:is not supported|is unavailable|isn't supported)\b/i.test(
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
    const appSlug = result.app.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
    let productOwnedSource = false;
    try {
      const parsed = new URL(sourceUrl);
      const hostSlug = parsed.hostname
        .replace(/^www\./, "")
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const organization = parsed.pathname.split("/").filter(Boolean)[0]
        ?.toLocaleLowerCase()
        .replace(/[^a-z0-9]/g, "");
      productOwnedSource = hostSlug.includes(appSlug) ||
        (parsed.hostname.toLocaleLowerCase() === "github.com" &&
          organization !== undefined &&
          organization.includes(appSlug));
    } catch {
      productOwnedSource = false;
    }
    return sourceType === "official" &&
      productOwnedSource &&
      (productServer.test(content) ||
        officialProductMcp.test(content) ||
        /\bour MCP server\b/i.test(content));
  }

  if (field === "mcp" && result.mcp.status !== "unknown") {
    if (sourceType !== "official") return false;
    const explicitNegative =
      /\b(?:does not|doesn't|no longer) (?:offer|support|provide|have).{0,60}(?:official )?MCP (?:server|service)|\b(?:official )?MCP (?:server|service).{0,60}(?:is not supported|is unavailable|isn't available)\b/i;
    return explicitNegative.test(content);
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
  const effectiveResult = recoverExplicitClaims(result, fetched);
  const evidenceByUrl = new Map(
    effectiveResult.evidence.map((item) => [normalizeUrl(item.url), item]),
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
        effectiveResult,
        resultField,
        fetched.get(normalized)?.content ?? "",
        item?.sourceType ?? "third_party",
        url,
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
  for (const item of effectiveResult.evidence) {
    const normalized = normalizeUrl(item.url);
    const source = fetched.get(normalized);
    if (!source?.content) continue;

    const text = `${item.title}\n${item.url}\n${source.content}`;
    const supports = supportsByUrl.get(normalized) ?? new Set<ResearchField>();
    if (contentSupportsField(effectiveResult, "authMethods", text, item.sourceType, item.url)) {
      supports.add("authMethods");
    }
    if (
      effectiveResult.apiSurface.rest !== null &&
      contentSupportsField(effectiveResult, "apiSurface.rest", text, item.sourceType, item.url)
    ) {
      supports.add("apiSurface.rest");
    }
    if (effectiveResult.apiSurface.graphql === true && /\bGraphQL\b/i.test(text)) {
      supports.add("apiSurface.graphql");
    }
    if (
      effectiveResult.accessModel !== "unknown" &&
      contentSupportsField(effectiveResult, "accessModel", text, item.sourceType, item.url)
    ) {
      supports.add("accessModel");
    }
    if (
      effectiveResult.mcp.status === "available" &&
      contentSupportsField(effectiveResult, "mcp", text, item.sourceType, item.url)
    ) {
      supports.add("mcp");
    }
    if (supports.size > 0) supportsByUrl.set(normalized, supports);
  }

  const supportedAuthMethods = effectiveResult.authMethods.filter((method) =>
    effectiveResult.evidence.some((item) => {
      const normalized = normalizeUrl(item.url);
      const source = fetched.get(normalized);
      return item.sourceType === "official" &&
        source?.content !== undefined &&
        supportsByUrl.get(normalized)?.has("authMethods") === true &&
        (source.content === "" ||
          authMethodMentioned(method, `${item.title}\n${source.content}`));
    }),
  );
  if (supportedAuthMethods.length === 0) {
    for (const supports of supportsByUrl.values()) supports.delete("authMethods");
  }

  const seen = new Set<string>();
  const evidence = effectiveResult.evidence.flatMap((item) => {
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

  return appResearchResultSchema.parse({
    ...effectiveResult,
    authMethods: supportedAuthMethods,
    evidence,
  });
}

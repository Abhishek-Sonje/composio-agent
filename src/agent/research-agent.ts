import { z } from "zod";

import type { ResearchTools } from "../tools/research-tools.js";
import {
  appResearchResultSchema,
  type AppResearchResult,
} from "./result-schema.js";
import type { ResearchTarget } from "./target-schema.js";

export const researchActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("search"),
    query: z.string().trim().min(1),
    purpose: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal("fetch_url"),
    url: z.url().refine((url) => /^https?:\/\//.test(url)),
    purpose: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal("finish"),
    reason: z.string().trim().min(1),
  }),
]);

export type ResearchAction = z.infer<typeof researchActionSchema>;

export type ResearchObservation = {
  step: number;
  action: Exclude<ResearchAction["action"], "finish">;
  purpose: string;
  input: string;
  output: unknown;
  focus?: ResearchFocus;
  error?: string;
};

export type ResearchFocus =
  | "authentication"
  | "access"
  | "rest"
  | "mcp"
  | "graphql";

export type ResearchContext = {
  target: ResearchTarget;
  observations: ResearchObservation[];
  stepsUsed: number;
  maxSteps: number;
  stoppedBecause: "complete" | "budget_exhausted";
};

export type ResearchModel = {
  chooseAction(
    context: Omit<ResearchContext, "stoppedBecause"> & {
      requiredAction?: "search" | "fetch_url";
      missingEvidence?: string[];
      researchFocus?: ResearchFocus;
      preferredAction?: "search" | "fetch_url";
    },
  ): Promise<ResearchAction>;
  createResult(context: ResearchContext): Promise<unknown>;
};

export type ResearchLogger = (message: string) => void;

type ResearchAgentDependencies = {
  model: ResearchModel;
  tools: ResearchTools;
  maxSteps: number;
  log?: ResearchLogger;
};

const MAX_OBSERVATION_CHARACTERS = 12_000;
const MAX_COLLECTION_ITEMS = 30;
const MAX_NESTING_DEPTH = 8;
const MAX_ACTIONS_PER_FOCUS = 2;
const RESEARCH_PRIORITIES: Array<[ResearchFocus, RegExp]> = [
  ["authentication", /\b(?:OAuth(?: 2\.0)?|API[ -]?key|bearer token|basic auth|personal access token|service account)\b/i],
  ["access", /\b(?:free (?:developer|account|plan|workspace)|developer edition|sign up|self[- ]host|tech(?:nical)? admin|administrator.{0,50}(?:create|approve|enable|grant)|contact sales|enterprise plan|paid plan|trial)\b/i],
  ["rest", /\bREST(?:ful)?\s+API\b|\/rest\//i],
  ["mcp", /\b(?:Model Context Protocol|MCP (?:server|service|support|integration))\b/i],
  ["graphql", /\bGraphQL\b/i],
];

function fetchedEvidenceText(observations: ResearchObservation[]): string {
  return observations
    .filter((item) => item.action === "fetch_url" && !item.error)
    .map((item) => JSON.stringify(item.output))
    .join("\n");
}

export function selectResearchFocus(
  observations: ResearchObservation[],
): ResearchFocus | undefined {
  const evidence = fetchedEvidenceText(observations);
  for (const [focus, pattern] of RESEARCH_PRIORITIES) {
    if (pattern.test(evidence)) continue;
    const attempts = observations.filter(
      (item) => item.focus === focus && !item.error,
    ).length;
    if (attempts < MAX_ACTIONS_PER_FOCUS) return focus;
  }
  return undefined;
}

function preferredActionForFocus(
  observations: ResearchObservation[],
  focus: ResearchFocus,
): "search" | "fetch_url" {
  const previous = observations.findLast(
    (item) => item.focus === focus && !item.error,
  );
  return previous?.action === "search" ? "fetch_url" : "search";
}

function missingFetchedEvidence(observations: ResearchObservation[]): string[] {
  const text = fetchedEvidenceText(observations);
  return RESEARCH_PRIORITIES
    .filter(([, pattern]) => !pattern.test(text))
    .map(([field]) => field);
}

export function compactToolOutput(value: unknown): unknown {
  const budget = { remaining: MAX_OBSERVATION_CHARACTERS };

  function compact(input: unknown, depth: number): unknown {
    if (budget.remaining <= 0) return "[truncated: character budget reached]";
    if (depth > MAX_NESTING_DEPTH) return "[truncated: nesting limit reached]";

    if (typeof input === "string") {
      const length = Math.min(input.length, budget.remaining);
      budget.remaining -= length;
      return input.length > length ? `${input.slice(0, length)}[truncated]` : input;
    }
    if (
      input === null ||
      typeof input === "number" ||
      typeof input === "boolean"
    ) {
      return input;
    }
    if (Array.isArray(input)) {
      const items = input
        .slice(0, MAX_COLLECTION_ITEMS)
        .map((item) => compact(item, depth + 1));
      if (input.length > items.length) {
        items.push(`[truncated: ${input.length - items.length} more items]`);
      }
      return items;
    }
    if (typeof input === "object") {
      const entries = Object.entries(input).slice(0, MAX_COLLECTION_ITEMS);
      const output = Object.fromEntries(
        entries.map(([key, item]) => [key, compact(item, depth + 1)]),
      );
      if (Object.keys(input).length > entries.length) {
        output._truncated = "Additional object properties omitted";
      }
      return output;
    }

    return String(input);
  }

  return compact(value, 0);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function applyConfidencePolicy(
  result: AppResearchResult,
  context: ResearchContext,
): AppResearchResult {
  const notes = [...result.researchNotes];
  let confidence = result.confidence;

  if (result.evidence.length === 0) {
    confidence = "low";
  } else if (
    confidence === "high" &&
    (context.stoppedBecause === "budget_exhausted" ||
      !context.observations.some((observation) => observation.action === "fetch_url"))
  ) {
    confidence = "medium";
    notes.push(
      context.stoppedBecause === "budget_exhausted"
        ? "Confidence was capped because the research budget was exhausted."
        : "Confidence was capped because no source page was fetched for inspection.",
    );
  }

  return { ...result, confidence, researchNotes: notes };
}

export function removeUnsupportedClaims(
  result: AppResearchResult,
): AppResearchResult {
  const supported = new Set(result.evidence.flatMap((item) => item.supports));
  const unknownFields = new Set(result.unknownFields);
  let researchNotes = [...result.researchNotes];
  let changed = false;

  function markUnknown(field: Parameters<typeof supported.has>[0]): void {
    unknownFields.add(field);
    changed = true;
  }

  const authMethods = supported.has("authMethods") ? result.authMethods : [];
  if (result.authMethods.length > 0 && authMethods.length === 0) markUnknown("authMethods");

  const accessModel = supported.has("accessModel") ? result.accessModel : "unknown";
  if (result.accessModel !== "unknown" && accessModel === "unknown") markUnknown("accessModel");

  const rest = supported.has("apiSurface.rest") ? result.apiSurface.rest : null;
  if (result.apiSurface.rest !== null && rest === null) markUnknown("apiSurface.rest");
  const graphql = supported.has("apiSurface.graphql")
    ? result.apiSurface.graphql
    : null;
  if (result.apiSurface.graphql !== null && graphql === null) {
    markUnknown("apiSurface.graphql");
  }
  const other = supported.has("apiSurface.other") ? result.apiSurface.other : [];
  if (result.apiSurface.other.length > 0 && other.length === 0) {
    markUnknown("apiSurface.other");
  }
  const apiClaimsRemoved =
    rest !== result.apiSurface.rest ||
    graphql !== result.apiSurface.graphql ||
    other.length !== result.apiSurface.other.length;
  const supportedApiTypes = [
    rest === true ? "REST" : null,
    graphql === true ? "GraphQL" : null,
    ...other,
  ].filter((value): value is string => value !== null);
  const apiSummary = apiClaimsRemoved
    ? supportedApiTypes.length > 0
      ? `Cited evidence supports ${supportedApiTypes.join(", ")}; other API surface details remain unresolved.`
      : "API surface details remain unresolved because cited evidence did not support the generated claims."
    : result.apiSurface.summary;

  const mcp = supported.has("mcp")
    ? result.mcp
    : { status: "unknown" as const, notes: "No cited evidence supports MCP status." };
  if (result.mcp.status !== "unknown" && mcp.status === "unknown") markUnknown("mcp");

  let buildability = supported.has("buildability")
    ? result.buildability
    : "unknown";
  if (result.buildability !== "unknown" && buildability === "unknown") {
    markUnknown("buildability");
  }
  const hasUsableApiSurface = rest === true || graphql === true || other.length > 0;
  if (
    buildability === "buildable" &&
    (authMethods.length === 0 || accessModel === "unknown" || !hasUsableApiSurface)
  ) {
    buildability = "unknown";
    markUnknown("buildability");
  }
  const blocker = supported.has("blocker") || result.blocker === null ? result.blocker : null;
  if (result.blocker !== null && blocker === null) {
    markUnknown("blocker");
    if (["blocked", "partially_buildable"].includes(buildability)) {
      buildability = "unknown";
      markUnknown("buildability");
    }
  }

  if (changed) {
    if (!supported.has("category")) unknownFields.add("category");
    if (!supported.has("description")) unknownFields.add("description");
    researchNotes = [
      "Unsupported claims were converted to unknown because no evidence item cited the affected fields.",
    ];
  }

  return {
    ...result,
    authMethods,
    accessModel,
    apiSurface: { ...result.apiSurface, rest, graphql, other, summary: apiSummary },
    mcp,
    buildability,
    blocker: buildability === "buildable" ? null : blocker,
    confidence: changed && result.confidence === "high" ? "medium" : result.confidence,
    unknownFields: [...unknownFields],
    researchNotes,
  };
}

export async function researchApp(
  target: ResearchTarget,
  dependencies: ResearchAgentDependencies,
): Promise<AppResearchResult> {
  const { model, tools, maxSteps, log = console.log } = dependencies;
  const observations: ResearchObservation[] = [];
  let stoppedBecause: ResearchContext["stoppedBecause"] = "budget_exhausted";

  log(`[${target.name}] Research started`);

  for (let step = 1; step <= maxSteps; step += 1) {
    const researchFocus = selectResearchFocus(observations);
    const hasSearch = observations.some(
      (observation) => observation.action === "search" && !observation.error,
    );
    const hasFetch = observations.some(
      (observation) => observation.action === "fetch_url" && !observation.error,
    );
    if (researchFocus === undefined && hasSearch && hasFetch) {
      stoppedBecause = "complete";
      log(`[${target.name}] Research complete: priority fields covered or attempted`);
      break;
    }
    const preferredAction = researchFocus
      ? preferredActionForFocus(observations, researchFocus)
      : "search";
    let action = researchActionSchema.parse(
      await model.chooseAction({
        target,
        observations,
        stepsUsed: observations.length,
        maxSteps,
        ...(researchFocus ? { researchFocus } : {}),
        preferredAction,
      }),
    );

    if (action.action === "finish") {
      const missingEvidence = missingFetchedEvidence(observations);
      if (researchFocus === undefined && hasSearch && hasFetch) {
        stoppedBecause = "complete";
        log(`[${target.name}] Research complete: ${action.reason}`);
        break;
      }

      const requiredAction = researchFocus ? preferredAction : "search";
      log(
        `[${target.name}] More evidence required before completion: ${requiredAction}`,
      );
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        action = researchActionSchema.parse(
          await model.chooseAction({
            target,
            observations,
            stepsUsed: observations.length,
            maxSteps,
            requiredAction,
            missingEvidence,
            ...(researchFocus ? { researchFocus } : {}),
            preferredAction,
          }),
        );
        if (action.action === requiredAction) break;
      }
      if (action.action !== requiredAction) {
        if (requiredAction === "search") {
          action = {
            action: "search",
            query: `${target.name} official ${researchFocus ?? "developer"} documentation`,
            purpose: `Find official evidence for ${researchFocus ?? "developer access"}`,
          };
        } else {
          stoppedBecause = "complete";
          log(
            `[${target.name}] Research complete with unresolved evidence: ${missingEvidence.join(", ")}`,
          );
          break;
        }
      }
    }

    log(
      `[${target.name}] Research step ${step}/${maxSteps}: ${action.purpose}`,
    );

    const input = action.action === "search" ? action.query : action.url;

    try {
      const output =
        action.action === "search"
          ? await tools.search(action.query)
          : await tools.fetchUrl(action.url);

      const compactedOutput = compactToolOutput(output);
      observations.push({
        step,
        action: action.action,
        purpose: action.purpose,
        input,
        output: compactedOutput,
        ...(researchFocus ? { focus: researchFocus } : {}),
      });
      log(
        `[${target.name}] Evidence captured (${JSON.stringify(compactedOutput).length} characters)`,
      );
    } catch (error) {
      observations.push({
        step,
        action: action.action,
        purpose: action.purpose,
        input,
        output: null,
        ...(researchFocus ? { focus: researchFocus } : {}),
        error: errorMessage(error),
      });
      log(`[${target.name}] Tool failed: ${errorMessage(error)}`);
    }
  }

  if (stoppedBecause === "budget_exhausted") {
    log(`[${target.name}] Research budget exhausted (${maxSteps} steps)`);
  }

  log(`[${target.name}] Synthesizing structured result`);
  const context: ResearchContext = {
    target,
    observations,
    stepsUsed: observations.length,
    maxSteps,
    stoppedBecause,
  };
  const result = appResearchResultSchema.parse(
    await model.createResult({
      ...context,
    }),
  );
  const normalizedResult = appResearchResultSchema.parse(
    applyConfidencePolicy(removeUnsupportedClaims(result), context),
  );

  log(`[${target.name}] Confidence: ${normalizedResult.confidence}`);
  return normalizedResult;
}

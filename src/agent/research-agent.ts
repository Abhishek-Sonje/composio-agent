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
  error?: string;
};

export type ResearchContext = {
  target: ResearchTarget;
  observations: ResearchObservation[];
  stepsUsed: number;
  maxSteps: number;
  stoppedBecause: "complete" | "budget_exhausted";
};

export type ResearchModel = {
  chooseAction(context: Omit<ResearchContext, "stoppedBecause">): Promise<ResearchAction>;
  createResult(context: ResearchContext): Promise<unknown>;
};

export type ResearchLogger = (message: string) => void;

type ResearchAgentDependencies = {
  model: ResearchModel;
  tools: ResearchTools;
  maxSteps: number;
  log?: ResearchLogger;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
    const action = researchActionSchema.parse(
      await model.chooseAction({
        target,
        observations,
        stepsUsed: observations.length,
        maxSteps,
      }),
    );

    if (action.action === "finish") {
      stoppedBecause = "complete";
      log(`[${target.name}] Research complete: ${action.reason}`);
      break;
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

      observations.push({
        step,
        action: action.action,
        purpose: action.purpose,
        input,
        output,
      });
    } catch (error) {
      observations.push({
        step,
        action: action.action,
        purpose: action.purpose,
        input,
        output: null,
        error: errorMessage(error),
      });
      log(`[${target.name}] Tool failed: ${errorMessage(error)}`);
    }
  }

  if (stoppedBecause === "budget_exhausted") {
    log(`[${target.name}] Research budget exhausted (${maxSteps} steps)`);
  }

  const result = appResearchResultSchema.parse(
    await model.createResult({
      target,
      observations,
      stepsUsed: observations.length,
      maxSteps,
      stoppedBecause,
    }),
  );

  log(`[${target.name}] Confidence: ${result.confidence}`);
  return result;
}


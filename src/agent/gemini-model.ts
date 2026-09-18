import { z } from "zod";

import type { GeminiClient } from "./gemini.js";
import {
  applyFieldEvidence,
  fieldEvidenceSchema,
} from "./evidence-mapping.js";
import {
  EVIDENCE_MAPPING_INSTRUCTION,
  FINAL_RESULT_INSTRUCTION,
  RESEARCH_SYSTEM_INSTRUCTION,
  buildResearchPrompt,
} from "./prompt.js";
import {
  researchActionSchema,
  type ResearchContext,
  type ResearchModel,
} from "./research-agent.js";
import { appResearchResultSchema } from "./result-schema.js";

const providerActionSchema = z.object({
  action: z.enum(["search", "fetch_url", "finish"]),
  query: z.string().nullable(),
  url: z.string().nullable(),
  purpose: z.string().nullable(),
  reason: z.string().nullable(),
});

type GenerateJson = (request: {
  model: string;
  prompt: string;
  schema: unknown;
}) => Promise<string>;

const MAX_MODEL_ATTEMPTS = 3;

function retryDelayMilliseconds(error: unknown, attempt: number): number | null {
  const message = error instanceof Error ? error.message : String(error);
  if (/\b503\b|UNAVAILABLE/i.test(message)) return 500 * attempt;
  if (!/429|RESOURCE_EXHAUSTED/i.test(message) || !/PerMinute/i.test(message)) {
    return null;
  }

  const delay = message.match(/retryDelay["']?\s*:\s*["']?(\d+(?:\.\d+)?)s/i)
    ?? message.match(/retry in (\d+(?:\.\d+)?)s/i);
  return delay ? Math.min(Math.ceil(Number(delay[1]) * 1_000) + 250, 60_000) : null;
}

export async function withTransientModelRetry<T>(
  operation: () => Promise<T>,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const delay = retryDelayMilliseconds(error, attempt);
      if (delay === null || attempt === MAX_MODEL_ATTEMPTS) {
        throw error;
      }
      await sleep(delay);
    }
  }

  throw lastError;
}

function contextJson(context: Omit<ResearchContext, "stoppedBecause">): string {
  return JSON.stringify(context, null, 2);
}

export function createGeminiResearchModel(
  gemini: GeminiClient,
  generateJson?: GenerateJson,
): ResearchModel {
  const generate =
    generateJson ??
    (async ({ model, prompt, schema }) => {
      const response = await withTransientModelRetry(() =>
        gemini.client.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: schema,
          },
        }),
      );

      if (!response.text) {
        throw new Error("Gemini returned an empty response");
      }

      return response.text;
    });

  return {
    async chooseAction(context) {
      const prompt = `${RESEARCH_SYSTEM_INSTRUCTION}

${buildResearchPrompt(context.target)}

Current research state:
${contextJson(context)}

Choose exactly one next action. Search for a specific unresolved question, fetch a promising source URL for inspection, or finish only when the important fields have sufficient evidence.`;
      const actionRequirement = context.requiredAction
        ? `\nYou must choose action "${context.requiredAction}" in this turn. Do not finish.`
        : "";

      const text = await generate({
        model: gemini.model,
        prompt: `${prompt}${actionRequirement}`,
        schema: z.toJSONSchema(providerActionSchema),
      });

      const action = providerActionSchema.parse(JSON.parse(text));

      if (action.action === "search") {
        return researchActionSchema.parse({
          action: action.action,
          query: action.query,
          purpose: action.purpose,
        });
      }
      if (action.action === "fetch_url") {
        return researchActionSchema.parse({
          action: action.action,
          url: action.url,
          purpose: action.purpose,
        });
      }
      return researchActionSchema.parse({
        action: action.action,
        reason: action.reason,
      });
    },

    async createResult(context) {
      const prompt = `${RESEARCH_SYSTEM_INSTRUCTION}

${FINAL_RESULT_INSTRUCTION}

Research state and stopping condition:
${JSON.stringify(context, null, 2)}`;

      const resultText = await generate({
        model: gemini.model,
        prompt,
        schema: z.toJSONSchema(appResearchResultSchema),
      });
      const result = appResearchResultSchema.parse(JSON.parse(resultText));

      const mappingText = await generate({
        model: gemini.model,
        prompt: `${EVIDENCE_MAPPING_INSTRUCTION}

Candidate result and evidence list:
${JSON.stringify(result, null, 2)}

Gathered research observations:
${JSON.stringify(context.observations, null, 2)}`,
        schema: z.toJSONSchema(fieldEvidenceSchema),
      });
      const fieldEvidence = fieldEvidenceSchema.parse(JSON.parse(mappingText));

      const fetchedSources = context.observations
        .filter(
          (observation) =>
            observation.action === "fetch_url" && observation.error === undefined,
        )
        .map((observation) => ({
          url: observation.input,
          content: JSON.stringify(observation.output),
        }));
      return applyFieldEvidence(result, fieldEvidence, fetchedSources);
    },
  };
}

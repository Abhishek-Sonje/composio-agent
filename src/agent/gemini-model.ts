import { z } from "zod";

import type { GeminiClient } from "./gemini.js";
import {
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

type GenerateJson = (request: {
  model: string;
  prompt: string;
  schema: unknown;
}) => Promise<string>;

const MAX_MODEL_ATTEMPTS = 3;

function isTransientModelError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b503\b|UNAVAILABLE/i.test(message);
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
      if (!isTransientModelError(error) || attempt === MAX_MODEL_ATTEMPTS) {
        throw error;
      }
      await sleep(500 * attempt);
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

      const text = await generate({
        model: gemini.model,
        prompt,
        schema: z.toJSONSchema(researchActionSchema),
      });

      return researchActionSchema.parse(JSON.parse(text));
    },

    async createResult(context) {
      const prompt = `${RESEARCH_SYSTEM_INSTRUCTION}

${FINAL_RESULT_INSTRUCTION}

Research state and stopping condition:
${JSON.stringify(context, null, 2)}`;

      const text = await generate({
        model: gemini.model,
        prompt,
        schema: z.toJSONSchema(appResearchResultSchema),
      });

      return appResearchResultSchema.parse(JSON.parse(text));
    },
  };
}

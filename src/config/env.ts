import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().trim().min(1, "GEMINI_MODEL is required"),
  COMPOSIO_API_KEY: z.string().trim().min(1, "COMPOSIO_API_KEY is required"),
  MAX_RESEARCH_STEPS: z.coerce
    .number()
    .int()
    .min(1)
    .max(25)
    .default(10),
});

export type AppConfig = {
  geminiApiKey: string;
  geminiModel: string;
  composioApiKey: string;
  maxResearchSteps: number;
};

export function readConfig(
  env: Record<string, string | undefined> = process.env,
): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return {
    geminiApiKey: parsed.data.GEMINI_API_KEY,
    geminiModel: parsed.data.GEMINI_MODEL,
    composioApiKey: parsed.data.COMPOSIO_API_KEY,
    maxResearchSteps: parsed.data.MAX_RESEARCH_STEPS,
  };
}


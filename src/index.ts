import { createGeminiResearchModel } from "./agent/gemini-model.js";
import { createGeminiClient } from "./agent/gemini.js";
import { researchApp } from "./agent/research-agent.js";
import { researchTargetSchema } from "./agent/target-schema.js";
import { readConfig } from "./config/env.js";
import { saveResearchResult } from "./pipeline/save-result.js";
import { createComposioResearchTools } from "./tools/research-tools.js";

async function main(): Promise<void> {
  const name = process.argv.slice(2).join(" ").trim();

  if (!name) {
    throw new Error("Application name is required. Example: npm run research -- Salesforce");
  }

  const target = researchTargetSchema.parse({ name });
  const config = readConfig();
  const gemini = createGeminiClient(config);
  const model = createGeminiResearchModel(gemini);
  const tools = await createComposioResearchTools(config.composioApiKey);
  const result = await researchApp(target, {
    model,
    tools,
    maxSteps: config.maxResearchSteps,
  });
  const destination = await saveResearchResult(result);

  console.log(`[${target.name}] Result saved to ${destination}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Research failed: ${message}`);
  process.exitCode = 1;
});

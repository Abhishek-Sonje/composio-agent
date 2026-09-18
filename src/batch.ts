import { createGeminiResearchModel } from "./agent/gemini-model.js";
import { createGeminiClient } from "./agent/gemini.js";
import { researchApp } from "./agent/research-agent.js";
import { readConfig } from "./config/env.js";
import { loadAssessmentTargets } from "./data/assessment-targets.js";
import { runAssessmentBatch, type ResearchExecution } from "./pipeline/batch-research.js";
import { createComposioResearchTools } from "./tools/research-tools.js";

async function main(): Promise<void> {
  const targets = await loadAssessmentTargets();
  console.log(`Loaded ${targets.length} unique assessment targets`);

  const config = readConfig();
  const gemini = createGeminiClient(config);
  const model = createGeminiResearchModel(gemini);
  const tools = await createComposioResearchTools(config.composioApiKey);

  const { manifest } = await runAssessmentBatch(targets, async (target) => {
    let actionsUsed = 0;
    let budgetExhausted = false;
    const log = (message: string): void => {
      console.log(message);
      const step = message.match(/Research step (\d+)\/\d+/)?.[1];
      if (step) actionsUsed = Math.max(actionsUsed, Number(step));
      if (/Research budget exhausted/i.test(message)) budgetExhausted = true;
    };

    const result = await researchApp(target, {
      model,
      tools,
      maxSteps: config.maxResearchSteps,
      log,
    });
    return { result, actionsUsed, budgetExhausted } satisfies ResearchExecution;
  });

  console.log(
    `Batch status: ${manifest.completed} completed, ${manifest.failed} failed, ${manifest.pending} pending`,
  );
  if (manifest.entries.some(({ failure }) => failure?.type === "provider_quota")) {
    console.log("Provider quota exhausted. Update the API key, then run npm run research:all again.");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Batch research failed: ${message}`);
  process.exitCode = 1;
});

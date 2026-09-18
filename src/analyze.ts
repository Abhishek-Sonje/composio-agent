import { writeAnalysisOutputs } from "./analysis.js";

writeAnalysisOutputs()
  .then((analysis) => {
    console.log(`Analyzed ${analysis.overall.totalApps} apps`);
    console.log(
      "Wrote results/analysis.json and docs/phase-4-analysis-report.md",
    );
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Analysis failed: ${message}`);
    process.exitCode = 1;
  });

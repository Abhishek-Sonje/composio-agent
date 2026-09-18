import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AppResearchResult } from "../agent/result-schema.js";

export function resultFileName(app: string): string {
  const slug = app
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "research-result"}.json`;
}

export async function saveResearchResult(
  result: AppResearchResult,
  outputDirectory = "results",
  targetName = result.app,
): Promise<string> {
  await mkdir(outputDirectory, { recursive: true });

  const destination = path.resolve(outputDirectory, resultFileName(targetName));
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await rename(temporary, destination);

  return destination;
}

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  appResearchResultSchema,
  type AppResearchResult,
} from "../agent/result-schema.js";
import type { ResearchTarget } from "../agent/target-schema.js";
import { resultFileName, saveResearchResult } from "./save-result.js";

export type ResearchExecution = {
  result: AppResearchResult;
  actionsUsed: number;
  budgetExhausted: boolean;
};

export type BatchFailureType =
  | "provider_quota"
  | "temporary_provider"
  | "research_tool"
  | "schema"
  | "network"
  | "other";

export type BatchEntry = {
  app: string;
  status: "completed" | "failed" | "pending";
  resultFile?: string;
  actionsUsed?: number;
  budgetExhausted?: boolean;
  failure?: {
    type: BatchFailureType;
    message: string;
    retryAppropriate: boolean;
  };
};

export type BatchManifest = {
  updatedAt: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  unknownHeavy: number;
  health: {
    confidence: { high: number; medium: number; low: number };
    appsWithUnknownFields: number;
    actionsRecorded: number;
    averageActionsUsed: number | null;
    budgetExhausted: number;
  };
  entries: BatchEntry[];
};

export type CombinedDataset = {
  generatedAt: string;
  count: number;
  records: AppResearchResult[];
};

async function writeJsonAtomic(destination: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, destination);
}

export async function readValidResult(
  destination: string,
): Promise<AppResearchResult | undefined> {
  try {
    return appResearchResultSchema.parse(
      JSON.parse(await readFile(destination, "utf8")),
    );
  } catch {
    return undefined;
  }
}

export function classifyBatchFailure(
  error: unknown,
): NonNullable<BatchEntry["failure"]> {
  const message = error instanceof Error ? error.message : String(error);
  if (/RESOURCE_EXHAUSTED|\b429\b|daily quota|free.?tier quota/i.test(message)) {
    return { type: "provider_quota", message, retryAppropriate: true };
  }
  if (/\b(?:500|502|503|504)\b|UNAVAILABLE|temporar/i.test(message)) {
    return { type: "temporary_provider", message, retryAppropriate: true };
  }
  if (/schema|zod|invalid_type|invalid input|JSON/i.test(message)) {
    return { type: "schema", message, retryAppropriate: true };
  }
  if (/ECONN|ENOTFOUND|ETIMEDOUT|network|fetch failed/i.test(message)) {
    return { type: "network", message, retryAppropriate: true };
  }
  if (/tool|composio|search/i.test(message)) {
    return { type: "research_tool", message, retryAppropriate: true };
  }
  return { type: "other", message, retryAppropriate: false };
}

function summarize(entries: BatchEntry[], results: AppResearchResult[]): BatchManifest {
  const actionCounts = entries.flatMap(({ actionsUsed }) =>
    actionsUsed === undefined ? [] : [actionsUsed]
  );
  return {
    updatedAt: new Date().toISOString(),
    total: entries.length,
    completed: entries.filter(({ status }) => status === "completed").length,
    failed: entries.filter(({ status }) => status === "failed").length,
    pending: entries.filter(({ status }) => status === "pending").length,
    unknownHeavy: results.filter(({ unknownFields }) => unknownFields.length >= 4).length,
    health: {
      confidence: {
        high: results.filter(({ confidence }) => confidence === "high").length,
        medium: results.filter(({ confidence }) => confidence === "medium").length,
        low: results.filter(({ confidence }) => confidence === "low").length,
      },
      appsWithUnknownFields: results.filter(({ unknownFields }) => unknownFields.length > 0).length,
      actionsRecorded: actionCounts.length,
      averageActionsUsed: actionCounts.length === 0
        ? null
        : actionCounts.reduce((total, count) => total + count, 0) / actionCounts.length,
      budgetExhausted: entries.filter(({ budgetExhausted }) => budgetExhausted === true).length,
    },
    entries,
  };
}

async function readPreviousEntries(manifestPath: string): Promise<Map<string, BatchEntry>> {
  try {
    const value = JSON.parse(await readFile(manifestPath, "utf8")) as {
      entries?: BatchEntry[];
    };
    return new Map(
      (value.entries ?? []).map((entry) => [entry.app.toLocaleLowerCase(), entry]),
    );
  } catch {
    return new Map();
  }
}

export function createCombinedDataset(
  results: AppResearchResult[],
): CombinedDataset {
  const records = results.map((result) => appResearchResultSchema.parse(result));
  const names = new Set<string>();
  for (const record of records) {
    const key = record.app.toLocaleLowerCase();
    if (names.has(key)) throw new Error(`Duplicate result app: ${record.app}`);
    names.add(key);
  }
  return { generatedAt: new Date().toISOString(), count: records.length, records };
}

export async function runAssessmentBatch(
  targets: ResearchTarget[],
  execute: (target: ResearchTarget) => Promise<ResearchExecution>,
  options: {
    resultsDirectory?: string;
    manifestPath?: string;
    datasetPath?: string;
    log?: (message: string) => void;
  } = {},
): Promise<{ manifest: BatchManifest; dataset: CombinedDataset }> {
  const resultsDirectory = options.resultsDirectory ?? "results";
  const manifestPath = options.manifestPath ?? path.join(resultsDirectory, "run-manifest.json");
  const datasetPath = options.datasetPath ?? path.join(resultsDirectory, "research-dataset.json");
  const log = options.log ?? console.log;
  const previousEntries = await readPreviousEntries(manifestPath);
  const entries: BatchEntry[] = targets.map(({ name }) => {
    const previous = previousEntries.get(name.toLocaleLowerCase());
    return {
      app: name,
      status: "pending",
      ...(previous?.actionsUsed === undefined
        ? {}
        : { actionsUsed: previous.actionsUsed }),
      ...(previous?.budgetExhausted === undefined
        ? {}
        : { budgetExhausted: previous.budgetExhausted }),
    };
  });
  const results: Array<AppResearchResult | undefined> = Array.from({
    length: targets.length,
  });

  for (const [index, target] of targets.entries()) {
    const destination = path.resolve(resultsDirectory, resultFileName(target.name));
    const existing = await readValidResult(destination);
    if (!existing) continue;
    results[index] = existing;
    Object.assign(entries[index]!, {
      status: "completed" as const,
      resultFile: path.relative(process.cwd(), destination),
    });
  }

  for (const [index, target] of targets.entries()) {
    const entry = entries[index];
    if (!entry) throw new Error(`Missing manifest entry for ${target.name}`);
    const destination = path.resolve(resultsDirectory, resultFileName(target.name));
    if (results[index]) {
      log(`[${index + 1}/${targets.length}] ${target.name}: skipped valid result`);
      await writeJsonAtomic(
        manifestPath,
        summarize(entries, results.filter((result) => result !== undefined)),
      );
      continue;
    }

    log(`[${index + 1}/${targets.length}] ${target.name}: researching`);
    try {
      const execution = await execute(target);
      const result = appResearchResultSchema.parse(execution.result);
      await saveResearchResult(result, resultsDirectory, target.name);
      results[index] = result;
      Object.assign(entry, {
        status: "completed" as const,
        resultFile: path.relative(process.cwd(), destination),
        actionsUsed: execution.actionsUsed,
        budgetExhausted: execution.budgetExhausted,
      });
    } catch (error) {
      const failure = classifyBatchFailure(error);
      Object.assign(entry, { status: "failed" as const, failure });
      log(`[${target.name}] failed (${failure.type}): ${failure.message}`);
      await writeJsonAtomic(
        manifestPath,
        summarize(entries, results.filter((result) => result !== undefined)),
      );
      if (failure.type === "provider_quota") break;
      continue;
    }
    await writeJsonAtomic(
      manifestPath,
      summarize(entries, results.filter((result) => result !== undefined)),
    );
  }

  const completedResults = results.filter((result) => result !== undefined);
  const dataset = createCombinedDataset(completedResults);
  const manifest = summarize(entries, completedResults);
  await writeJsonAtomic(datasetPath, dataset);
  await writeJsonAtomic(manifestPath, manifest);
  return { manifest, dataset };
}

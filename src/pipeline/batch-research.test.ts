import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppResearchResult } from "../agent/result-schema.js";
import {
  createCombinedDataset,
  runAssessmentBatch,
} from "./batch-research.js";
import { saveResearchResult } from "./save-result.js";

const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "composio-batch-"));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })
  ));
});

function result(app: string): AppResearchResult {
  return {
    app,
    category: "Test",
    description: `${app} is a test application.`,
    authMethods: [],
    accessModel: "unknown",
    apiSurface: {
      rest: null,
      graphql: null,
      other: [],
      summary: "API availability is unknown.",
    },
    mcp: { status: "unknown" },
    buildability: "unknown",
    blocker: null,
    confidence: "low",
    unknownFields: [
      "authMethods",
      "accessModel",
      "apiSurface.rest",
      "apiSurface.graphql",
      "mcp",
      "buildability",
    ],
    evidence: [],
    researchNotes: ["No evidence was found."],
  };
}

describe("runAssessmentBatch", () => {
  it("skips an existing schema-valid result during resume", async () => {
    const directory = await temporaryDirectory();
    await saveResearchResult(result("Existing"), directory);
    const execute = vi.fn();

    const { manifest, dataset } = await runAssessmentBatch(
      [{ name: "Existing" }],
      execute,
      { resultsDirectory: directory, log: vi.fn() },
    );

    expect(execute).not.toHaveBeenCalled();
    expect(manifest).toMatchObject({
      total: 1,
      completed: 1,
      failed: 0,
      pending: 0,
      unknownHeavy: 1,
    });
    expect(dataset.count).toBe(1);
  });

  it("records an app failure without erasing completed results", async () => {
    const directory = await temporaryDirectory();
    const preserved = result("Preserved");
    await saveResearchResult(preserved, directory);

    const { manifest, dataset } = await runAssessmentBatch(
      [{ name: "Preserved" }, { name: "Broken" }],
      vi.fn().mockRejectedValue(new Error("tool execution failed")),
      { resultsDirectory: directory, log: vi.fn() },
    );

    expect(manifest).toMatchObject({ completed: 1, failed: 1, pending: 0 });
    expect(manifest.entries[1]?.failure?.type).toBe("research_tool");
    expect(dataset.records).toEqual([preserved]);
    expect(JSON.parse(await readFile(path.join(directory, "preserved.json"), "utf8")))
      .toEqual(preserved);
  });

  it("stops on provider quota and leaves later apps pending", async () => {
    const directory = await temporaryDirectory();
    const execute = vi.fn().mockRejectedValue(
      new Error("429 RESOURCE_EXHAUSTED daily quota"),
    );

    const { manifest } = await runAssessmentBatch(
      [{ name: "Quota App" }, { name: "Later App" }],
      execute,
      { resultsDirectory: directory, log: vi.fn() },
    );

    expect(execute).toHaveBeenCalledOnce();
    expect(manifest).toMatchObject({ completed: 0, failed: 1, pending: 1 });
    expect(manifest.entries[0]?.failure).toMatchObject({
      type: "provider_quota",
      retryAppropriate: true,
    });
  });
});

describe("createCombinedDataset", () => {
  it("rejects duplicate result application names", () => {
    expect(() => createCombinedDataset([result("Example"), result("example")]))
      .toThrow(/Duplicate result app/);
  });
});

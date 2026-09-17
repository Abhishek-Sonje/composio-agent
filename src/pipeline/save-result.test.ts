import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { AppResearchResult } from "../agent/result-schema.js";
import { saveResearchResult } from "./save-result.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("saveResearchResult", () => {
  it("writes readable formatted JSON using a safe app slug", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "research-result-"));
    temporaryDirectories.push(directory);
    const result = {
      app: "Example / App",
      category: "Unknown",
      description: "An example application.",
    } as AppResearchResult;

    const destination = await saveResearchResult(result, directory);

    expect(destination).toBe(path.join(directory, "example-app.json"));
    expect(JSON.parse(await readFile(destination, "utf8"))).toEqual(result);
  });
});


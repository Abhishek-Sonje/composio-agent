import { describe, expect, it, vi } from "vitest";

import {
  createGeminiResearchModel,
  withTransientModelRetry,
} from "./gemini-model.js";
import type { GeminiClient } from "./gemini.js";

const gemini = { model: "gemini-3.6-flash" } as GeminiClient;

describe("createGeminiResearchModel", () => {
  it("parses a structured next action", async () => {
    const generate = vi.fn().mockResolvedValue(
      JSON.stringify({
        action: "search",
        query: "Example OAuth documentation",
        url: null,
        purpose: "Verify supported authentication",
        reason: null,
      }),
    );
    const model = createGeminiResearchModel(gemini, generate);

    await expect(
      model.chooseAction({
        target: { name: "Example" },
        observations: [],
        stepsUsed: 0,
        maxSteps: 10,
      }),
    ).resolves.toMatchObject({ action: "search" });
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-3.6-flash" }),
    );
  });

  it("rejects malformed JSON from Gemini", async () => {
    const model = createGeminiResearchModel(
      gemini,
      vi.fn().mockResolvedValue("not JSON"),
    );

    await expect(
      model.chooseAction({
        target: { name: "Example" },
        observations: [],
        stepsUsed: 0,
        maxSteps: 10,
      }),
    ).rejects.toThrow();
  });
});

describe("withTransientModelRetry", () => {
  it("retries temporary provider failures with bounded backoff", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("503 UNAVAILABLE"))
      .mockResolvedValue("ok");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withTransientModelRetry(operation, sleep)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it("does not retry permanent errors", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("400 INVALID_ARGUMENT"));

    await expect(
      withTransientModelRetry(operation, vi.fn()),
    ).rejects.toThrowError(/INVALID_ARGUMENT/);
    expect(operation).toHaveBeenCalledOnce();
  });

  it("stops after three transient failures", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("503 UNAVAILABLE"));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withTransientModelRetry(operation, sleep)).rejects.toThrowError(
      /UNAVAILABLE/,
    );
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not retry quota exhaustion", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("429 RESOURCE_EXHAUSTED"));

    await expect(
      withTransientModelRetry(operation, vi.fn()),
    ).rejects.toThrowError(/RESOURCE_EXHAUSTED/);
    expect(operation).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it, vi } from "vitest";

import { createGeminiResearchModel } from "./gemini-model.js";
import type { GeminiClient } from "./gemini.js";

const gemini = { model: "gemini-2.5-flash" } as GeminiClient;

describe("createGeminiResearchModel", () => {
  it("parses a structured next action", async () => {
    const generate = vi.fn().mockResolvedValue(
      JSON.stringify({
        action: "search",
        query: "Example OAuth documentation",
        purpose: "Verify supported authentication",
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
      expect.objectContaining({ model: "gemini-2.5-flash" }),
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


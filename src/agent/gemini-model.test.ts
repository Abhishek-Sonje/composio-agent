import { describe, expect, it, vi } from "vitest";

import {
  createGeminiResearchModel,
  withMalformedOutputRetry,
  withTransientModelRetry,
} from "./gemini-model.js";
import type { GeminiClient } from "./gemini.js";

const gemini = { model: "gemini-3.5-flash" } as GeminiClient;

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
      expect.objectContaining({ model: "gemini-3.5-flash" }),
    );
  });

  it("defines access as credential availability rather than API endpoints", async () => {
    const generate = vi.fn().mockResolvedValue(
      JSON.stringify({
        action: "search",
        query: "Example developer signup credentials",
        url: null,
        purpose: "Verify how developers obtain credentials",
        reason: null,
      }),
    );
    const model = createGeminiResearchModel(gemini, generate);

    await model.chooseAction({
      target: { name: "Example" },
      observations: [],
      stepsUsed: 2,
      maxSteps: 10,
      researchFocus: "access",
      preferredAction: "search",
    });

    expect(generate.mock.calls[0]?.[0].prompt).toContain(
      "how a developer obtains credentials",
    );
    expect(generate.mock.calls[0]?.[0].prompt).toContain(
      "Do not research API endpoints for this focus",
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

  it("uses the required field ledger as the authoritative evidence mapping", async () => {
    const evidenceUrl = "https://example.com/rest";
    const candidateResult = {
          app: "Example",
          category: "Productivity",
          description: "Example is a productivity application.",
          authMethods: ["OAuth 2.0"],
          accessModel: "unknown",
          apiSurface: {
            rest: true,
            graphql: null,
            other: [],
            summary: "A REST API is available.",
          },
          mcp: { status: "unknown" },
          buildability: "unknown",
          blocker: null,
          confidence: "medium",
          unknownFields: ["accessModel", "apiSurface.graphql", "mcp", "buildability"],
          evidence: [
            {
              title: "REST documentation",
              url: evidenceUrl,
              sourceType: "official",
              supports: ["authMethods"],
            },
          ],
          researchNotes: [],
        };
    const generate = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(candidateResult))
      .mockResolvedValueOnce(JSON.stringify({
          app: [],
          category: [],
          description: [],
          authMethods: [],
          accessModel: [],
          apiSurfaceRest: [evidenceUrl],
          apiSurfaceGraphql: [],
          apiSurfaceOther: [],
          mcp: [],
          buildability: [],
          blocker: [],
        }));
    const model = createGeminiResearchModel(gemini, generate);

    const output = await model.createResult({
      target: { name: "Example" },
      observations: [
        {
          step: 1,
          action: "fetch_url",
          purpose: "Inspect REST documentation",
          input: evidenceUrl,
          output: { content: "REST API documentation" },
        },
      ],
      stepsUsed: 1,
      maxSteps: 1,
      stoppedBecause: "complete",
    });

    expect(output).toEqual(
      expect.objectContaining({
        evidence: [expect.objectContaining({ supports: ["apiSurface.rest"] })],
      }),
    );
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0].prompt).toContain(
      "This is an evidence-mapping task only",
    );
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
    const operation = vi
      .fn()
      .mockRejectedValue(new Error("429 PerDay RESOURCE_EXHAUSTED"));

    await expect(
      withTransientModelRetry(operation, vi.fn()),
    ).rejects.toThrowError(/RESOURCE_EXHAUSTED/);
    expect(operation).toHaveBeenCalledOnce();
  });

  it("honors short per-minute retry windows", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('429 PerMinute RESOURCE_EXHAUSTED "retryDelay":"2s"'),
      )
      .mockResolvedValue("ok");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withTransientModelRetry(operation, sleep)).resolves.toBe("ok");
    expect(sleep).toHaveBeenCalledWith(2_250);
  });

  it("honors provider retry windows longer than thirty seconds", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('429 PerMinute RESOURCE_EXHAUSTED "retryDelay":"59s"'),
      )
      .mockResolvedValue("ok");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withTransientModelRetry(operation, sleep)).resolves.toBe("ok");
    expect(sleep).toHaveBeenCalledWith(59_250);
  });
});

describe("withMalformedOutputRetry", () => {
  it("retries one malformed structured response", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new SyntaxError("Unterminated string in JSON"))
      .mockResolvedValue("valid");

    await expect(withMalformedOutputRetry(operation)).resolves.toBe("valid");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("stops after two malformed structured responses", async () => {
    const operation = vi.fn().mockRejectedValue(new SyntaxError("malformed"));

    await expect(withMalformedOutputRetry(operation)).rejects.toThrow("malformed");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

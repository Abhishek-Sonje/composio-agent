import { describe, expect, it, vi } from "vitest";

import { researchApp, type ResearchModel } from "./research-agent.js";

const result = {
  app: "Example",
  category: "Productivity",
  description: "Example is a productivity application.",
  authMethods: [],
  accessModel: "unknown",
  apiSurface: {
    rest: null,
    graphql: null,
    other: [],
    summary: "API availability was not established.",
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
    "blocker",
  ],
  evidence: [],
  researchNotes: ["Research budget was exhausted."],
} as const;

describe("researchApp", () => {
  it("performs targeted actions until the model finishes", async () => {
    const model: ResearchModel = {
      chooseAction: vi
        .fn()
        .mockResolvedValueOnce({
          action: "search",
          query: "site:example.com developers API",
          purpose: "Find official API documentation",
        })
        .mockResolvedValueOnce({
          action: "fetch_url",
          url: "https://example.com/developers",
          purpose: "Inspect authentication documentation",
        })
        .mockResolvedValueOnce({ action: "finish", reason: "Enough evidence" }),
      createResult: vi.fn().mockResolvedValue(result),
    };
    const tools = {
      search: vi.fn().mockResolvedValue({ results: ["developers"] }),
      fetchUrl: vi.fn().mockResolvedValue({ content: "OAuth 2.0" }),
    };

    await researchApp(
      { name: "Example" },
      { model, tools, maxSteps: 5, log: vi.fn() },
    );

    expect(tools.search).toHaveBeenCalledOnce();
    expect(tools.fetchUrl).toHaveBeenCalledOnce();
    expect(model.createResult).toHaveBeenCalledWith(
      expect.objectContaining({ stepsUsed: 2, stoppedBecause: "complete" }),
    );
  });

  it("stops exactly at the configured research budget", async () => {
    const model: ResearchModel = {
      chooseAction: vi.fn().mockResolvedValue({
        action: "search",
        query: "more evidence",
        purpose: "Resolve an unknown field",
      }),
      createResult: vi.fn().mockResolvedValue(result),
    };
    const tools = {
      search: vi.fn().mockResolvedValue({ results: [] }),
      fetchUrl: vi.fn(),
    };

    await researchApp(
      { name: "Example" },
      { model, tools, maxSteps: 3, log: vi.fn() },
    );

    expect(tools.search).toHaveBeenCalledTimes(3);
    expect(model.createResult).toHaveBeenCalledWith(
      expect.objectContaining({ stepsUsed: 3, stoppedBecause: "budget_exhausted" }),
    );
  });

  it("records tool errors and continues researching", async () => {
    const model: ResearchModel = {
      chooseAction: vi
        .fn()
        .mockResolvedValueOnce({
          action: "search",
          query: "official docs",
          purpose: "Find documentation",
        })
        .mockResolvedValueOnce({ action: "finish", reason: "No more actions" }),
      createResult: vi.fn().mockResolvedValue(result),
    };
    const tools = {
      search: vi.fn().mockRejectedValue(new Error("network timeout")),
      fetchUrl: vi.fn(),
    };

    await researchApp(
      { name: "Example" },
      { model, tools, maxSteps: 3, log: vi.fn() },
    );

    expect(model.createResult).toHaveBeenCalledWith(
      expect.objectContaining({
        observations: [expect.objectContaining({ error: "network timeout" })],
      }),
    );
  });

  it("rejects a malformed final result", async () => {
    const model: ResearchModel = {
      chooseAction: vi.fn().mockResolvedValue({
        action: "finish",
        reason: "Done",
      }),
      createResult: vi.fn().mockResolvedValue({ app: "Example" }),
    };

    await expect(
      researchApp(
        { name: "Example" },
        {
          model,
          tools: { search: vi.fn(), fetchUrl: vi.fn() },
          maxSteps: 3,
          log: vi.fn(),
        },
      ),
    ).rejects.toThrow();
  });
});


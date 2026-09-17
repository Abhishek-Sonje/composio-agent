import { describe, expect, it, vi } from "vitest";

import type { AppResearchResult } from "./result-schema.js";
import {
  applyConfidencePolicy,
  compactToolOutput,
  removeUnsupportedClaims,
  researchApp,
  type ResearchModel,
} from "./research-agent.js";

const result: AppResearchResult = {
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
};

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

describe("applyConfidencePolicy", () => {
  const context = {
    target: { name: "Example" },
    observations: [],
    stepsUsed: 0,
    maxSteps: 1,
    stoppedBecause: "budget_exhausted" as const,
  };

  it("caps confidence when the research budget is exhausted", () => {
    const normalized = applyConfidencePolicy(
      {
        ...result,
        confidence: "high",
        evidence: [
          {
            title: "Official docs",
            url: "https://example.com/docs",
            sourceType: "official",
            supports: ["description"],
          },
        ],
      },
      context,
    );

    expect(normalized.confidence).toBe("medium");
    expect(normalized.researchNotes.at(-1)).toMatch(/budget was exhausted/);
  });

  it("forces low confidence when no evidence was found", () => {
    expect(
      applyConfidencePolicy({ ...result, confidence: "high" }, context).confidence,
    ).toBe("low");
  });
});

describe("removeUnsupportedClaims", () => {
  it("demonstrates that an omitted synthesis mapping loses a discovered REST claim", () => {
    const normalized = removeUnsupportedClaims({
      ...result,
      authMethods: ["OAuth 2.0"],
      apiSurface: {
        ...result.apiSurface,
        rest: true,
        summary: "The official REST API uses OAuth 2.0.",
      },
      evidence: [
        {
          title: "Authorization | REST API Developer Guide",
          url: "https://example.com/rest/oauth",
          sourceType: "official",
          supports: ["authMethods"],
        },
      ],
    });

    expect(normalized.authMethods).toEqual(["OAuth 2.0"]);
    expect(normalized.apiSurface.rest).toBeNull();
    expect(normalized.unknownFields).toContain("apiSurface.rest");
  });

  it("converts API claims without cited support to unknown", () => {
    const normalized = removeUnsupportedClaims({
      ...result,
      apiSurface: {
        rest: true,
        graphql: true,
        other: ["SOAP"],
        summary: "Several APIs are available.",
      },
      confidence: "high",
      evidence: [
        {
          title: "REST docs",
          url: "https://example.com/rest",
          sourceType: "official",
          supports: ["apiSurface.rest"],
        },
      ],
    });

    expect(normalized.apiSurface).toMatchObject({
      rest: true,
      graphql: null,
      other: [],
    });
    expect(normalized.unknownFields).toEqual(
      expect.arrayContaining([
        "category",
        "description",
        "apiSurface.graphql",
        "apiSurface.other",
      ]),
    );
    expect(normalized.confidence).toBe("medium");
    expect(normalized.apiSurface.summary).not.toContain("Several APIs");
    expect(normalized.researchNotes).toHaveLength(1);
  });

  it("retains claims with explicit evidence support", () => {
    const normalized = removeUnsupportedClaims({
      ...result,
      authMethods: ["OAuth 2.0"],
      evidence: [
        {
          title: "Auth docs",
          url: "https://example.com/auth",
          sourceType: "official",
          supports: ["authMethods"],
        },
      ],
    });

    expect(normalized.authMethods).toEqual(["OAuth 2.0"]);
  });

  it("does not retain buildable when credential access is unresolved", () => {
    const normalized = removeUnsupportedClaims({
      ...result,
      authMethods: ["OAuth 2.0"],
      accessModel: "unknown",
      apiSurface: { ...result.apiSurface, rest: true },
      buildability: "buildable",
      evidence: [
        {
          title: "Developer docs",
          url: "https://example.com/docs",
          sourceType: "official",
          supports: ["authMethods", "apiSurface.rest", "buildability"],
        },
      ],
    });

    expect(normalized.buildability).toBe("unknown");
    expect(normalized.unknownFields).toContain("buildability");
  });
});

describe("compactToolOutput", () => {
  it("bounds large strings before they enter model context", () => {
    const output = compactToolOutput({ content: "x".repeat(100_000) });

    expect(JSON.stringify(output).length).toBeLessThan(13_000);
    expect(output).toEqual({ content: expect.stringContaining("[truncated]") });
  });

  it("bounds large collections", () => {
    const output = compactToolOutput(Array.from({ length: 100 }, (_, index) => index));

    expect(output).toHaveLength(31);
    expect(output).toContain("[truncated: 70 more items]");
  });
});

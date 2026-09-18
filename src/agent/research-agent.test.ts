import { describe, expect, it, vi } from "vitest";

import type { AppResearchResult } from "./result-schema.js";
import {
  applyConfidencePolicy,
  compactToolOutput,
  removeUnsupportedClaims,
  selectResearchFocus,
  researchApp,
  type ResearchModel,
} from "./research-agent.js";

describe("selectResearchFocus", () => {
  const observation = (
    focus: "authentication" | "access" | "rest" | "mcp" | "graphql",
    action: "search" | "fetch_url",
    output: string,
  ) => ({ step: 1, action, focus, purpose: focus, input: focus, output });

  it("prioritizes access before lower-value API checks once auth is supported", () => {
    expect(
      selectResearchFocus([
        observation("authentication", "fetch_url", "OAuth 2.0 authentication"),
      ]),
    ).toBe("access");
  });

  it("gives unresolved access a third action before moving to API variants", () => {
    expect(
      selectResearchFocus([
        observation("authentication", "fetch_url", "OAuth 2.0 authentication"),
        observation("access", "search", "Developer portal result"),
        observation("access", "fetch_url", "Token authentication reference"),
      ]),
    ).toBe("access");
  });

  it("does not revisit a supported field", () => {
    expect(
      selectResearchFocus([
        observation("authentication", "fetch_url", "OAuth 2.0"),
        observation("access", "fetch_url", "Create a free developer account"),
        observation("rest", "fetch_url", "REST API reference"),
      ]),
    ).toBe("mcp");
  });

  it("does not treat action metadata as fetched evidence", () => {
    expect(
      selectResearchFocus([
        observation("authentication", "fetch_url", "OAuth 2.0 authentication"),
        {
          ...observation("access", "fetch_url", "OAuth setup instructions"),
          purpose: "Find free developer access and signup documentation",
          input: "https://example.com/free-developer-access",
        },
      ]),
    ).toBe("access");
  });

  it("does not let incidental content satisfy another research focus", () => {
    expect(
      selectResearchFocus([
        observation(
          "authentication",
          "fetch_url",
          "OAuth 2.0 setup requires an administrator to create a connected app",
        ),
      ]),
    ).toBe("access");
  });

  it("limits GraphQL research to two successful actions", () => {
    expect(
      selectResearchFocus([
        observation("authentication", "fetch_url", "OAuth 2.0"),
        observation("access", "fetch_url", "Free developer account"),
        observation("rest", "fetch_url", "REST API"),
        observation("mcp", "fetch_url", "Official MCP server"),
        observation("graphql", "search", "No official result found"),
        observation("graphql", "fetch_url", "General developer documentation"),
      ]),
    ).toBeUndefined();
  });

  it("does not spend a second action trying to prove missing GraphQL", () => {
    expect(
      selectResearchFocus([
        observation("authentication", "fetch_url", "OAuth 2.0"),
        observation("access", "fetch_url", "Create a free developer account"),
        observation("rest", "fetch_url", "REST API"),
        observation("mcp", "fetch_url", "Official MCP server"),
        observation("graphql", "search", "No official GraphQL result found"),
      ]),
    ).toBeUndefined();
  });

  it("does not schedule direct buildability research", () => {
    expect(selectResearchFocus([])).toBe("authentication");
    expect(selectResearchFocus([])).not.toBe("buildability");
  });
});

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
  it("performs a targeted search and fetch for the current focus", async () => {
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
        }),
      createResult: vi.fn().mockResolvedValue(result),
    };
    const tools = {
      search: vi.fn().mockResolvedValue({ results: ["developers"] }),
      fetchUrl: vi.fn().mockResolvedValue({
        content: "OAuth 2.0, free developer access, REST API, GraphQL, and an MCP server",
      }),
    };

    await researchApp(
      { name: "Example" },
      { model, tools, maxSteps: 2, log: vi.fn() },
    );

    expect(tools.search).toHaveBeenCalledOnce();
    expect(tools.fetchUrl).toHaveBeenCalledOnce();
    expect(model.chooseAction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        researchFocus: "authentication",
        preferredAction: "search",
      }),
    );
    expect(model.chooseAction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        researchFocus: "authentication",
        preferredAction: "fetch_url",
      }),
    );
    expect(model.createResult).toHaveBeenCalledWith(
      expect.objectContaining({
        stepsUsed: 2,
        stoppedBecause: "budget_exhausted",
      }),
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
      chooseAction: vi.fn().mockResolvedValue({
        action: "search",
        query: "official docs",
        purpose: "Find documentation",
      }),
      createResult: vi.fn().mockResolvedValue(result),
    };
    const tools = {
      search: vi
        .fn()
        .mockRejectedValueOnce(new Error("network timeout"))
        .mockResolvedValue({ results: [] }),
      fetchUrl: vi.fn(),
    };

    await researchApp(
      { name: "Example" },
      { model, tools, maxSteps: 3, log: vi.fn() },
    );

    expect(model.createResult).toHaveBeenCalledWith(
      expect.objectContaining({
        observations: expect.arrayContaining([
          expect.objectContaining({ error: "network timeout" }),
        ]),
      }),
    );
  });

  it("rejects a malformed final result", async () => {
    const model: ResearchModel = {
      chooseAction: vi
        .fn()
        .mockResolvedValueOnce({
          action: "search",
          query: "official docs",
          purpose: "Find documentation",
        })
        .mockResolvedValueOnce({
          action: "fetch_url",
          url: "https://example.com/docs",
          purpose: "Inspect documentation",
        })
        .mockResolvedValue({ action: "finish", reason: "Done" }),
      createResult: vi.fn().mockResolvedValue({ app: "Example" }),
    };

    await expect(
      researchApp(
        { name: "Example" },
        {
          model,
          tools: {
            search: vi.fn().mockResolvedValue({ results: [] }),
            fetchUrl: vi.fn().mockResolvedValue({ content: "docs" }),
          },
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

  it("derives buildable when all feasibility prerequisites are supported", () => {
    const normalized = removeUnsupportedClaims({
      ...result,
      authMethods: ["OAuth 2.0"],
      accessModel: "self_serve_free",
      apiSurface: { ...result.apiSurface, rest: true },
      buildability: "unknown",
      evidence: [
        {
          title: "Authentication docs",
          url: "https://example.com/auth",
          sourceType: "official",
          supports: ["authMethods"],
        },
        {
          title: "Free developer account",
          url: "https://example.com/signup",
          sourceType: "official",
          supports: ["accessModel"],
        },
        {
          title: "REST API",
          url: "https://example.com/rest",
          sourceType: "official",
          supports: ["apiSurface.rest"],
        },
      ],
    });

    expect(normalized.buildability).toBe("buildable");
    expect(normalized.unknownFields).not.toContain("buildability");
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

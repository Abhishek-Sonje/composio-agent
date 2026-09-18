import { describe, expect, it } from "vitest";

import type { AppResearchResult } from "./result-schema.js";
import {
  applyFieldEvidence,
  type FieldEvidence,
} from "./evidence-mapping.js";

const restUrl = "https://example.com/docs/rest";
const graphqlUrl = "https://example.com/docs/graphql";

const result: AppResearchResult = {
  app: "Example",
  category: "Productivity",
  description: "Example is a productivity application.",
  authMethods: ["OAuth 2.0"],
  accessModel: "self_serve_free",
  apiSurface: {
    rest: true,
    graphql: true,
    other: [],
    summary: "REST and GraphQL APIs are available.",
  },
  mcp: { status: "unknown" },
  buildability: "buildable",
  blocker: null,
  confidence: "high",
  unknownFields: ["mcp"],
  evidence: [
    {
      title: "REST and OAuth documentation",
      url: restUrl,
      sourceType: "official",
      supports: ["authMethods"],
    },
    {
      title: "GraphQL documentation",
      url: graphqlUrl,
      sourceType: "official",
      supports: ["description"],
    },
  ],
  researchNotes: [],
};

function ledger(overrides: Partial<FieldEvidence> = {}): FieldEvidence {
  return {
    app: [],
    category: [],
    description: [],
    authMethods: [],
    accessModel: [],
    apiSurfaceRest: [],
    apiSurfaceGraphql: [],
    apiSurfaceOther: [],
    mcp: [],
    buildability: [],
    blocker: [],
    ...overrides,
  };
}

describe("applyFieldEvidence", () => {
  it("preserves a supported field mapping that the evidence item omitted", () => {
    const mapped = applyFieldEvidence(
      result,
      ledger({ apiSurfaceRest: [restUrl] }),
      [restUrl],
    );

    expect(mapped.evidence).toEqual([
      expect.objectContaining({ supports: ["apiSurface.rest"] }),
    ]);
  });

  it("recovers an omitted REST mapping from the fetched source content", () => {
    const mapped = applyFieldEvidence(result, ledger(), [
      {
        url: restUrl,
        content: "This REST API developer guide documents available REST resources.",
      },
    ]);

    expect(mapped.evidence).toEqual([
      expect.objectContaining({ supports: ["apiSurface.rest"] }),
    ]);
  });

  it("does not preserve model-generated supports without ledger evidence", () => {
    const mapped = applyFieldEvidence(result, ledger(), [restUrl, graphqlUrl]);

    expect(mapped.evidence).toEqual([]);
  });

  it("maps nested REST and GraphQL fields independently", () => {
    const mapped = applyFieldEvidence(
      result,
      ledger({
        apiSurfaceRest: [restUrl],
        apiSurfaceGraphql: [graphqlUrl],
      }),
      [restUrl, graphqlUrl],
    );

    expect(mapped.evidence[0]?.supports).toEqual(["apiSurface.rest"]);
    expect(mapped.evidence[1]?.supports).toEqual(["apiSurface.graphql"]);
  });

  it("cannot use evidence for one field to validate another", () => {
    const mapped = applyFieldEvidence(
      result,
      ledger({ authMethods: [restUrl] }),
      [restUrl],
    );

    expect(mapped.evidence[0]?.supports).toEqual(["authMethods"]);
    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain(
      "apiSurface.rest",
    );
  });

  it("recovers a fetched ledger URL that synthesis omitted", () => {
    const unseenUrl = "https://unseen.example.com/rest";
    const mapped = applyFieldEvidence(
      result,
      ledger({ apiSurfaceRest: [unseenUrl] }),
      [{ url: unseenUrl, content: "Official REST API documentation", title: "REST API" }],
    );

    expect(mapped.evidence).toEqual([
      expect.objectContaining({
        url: unseenUrl,
        sourceType: "third_party",
        supports: ["apiSurface.rest"],
      }),
    ]);
  });

  it("does not accept a search-only URL that was never fetched", () => {
    const mapped = applyFieldEvidence(
      result,
      ledger({ apiSurfaceRest: [restUrl] }),
      [],
    );

    expect(mapped.evidence).toEqual([]);
  });

  it("rejects an enterprise-only mapping without enterprise access evidence", () => {
    const enterpriseResult = { ...result, accessModel: "enterprise_only" as const };
    const mapped = applyFieldEvidence(
      enterpriseResult,
      ledger({ accessModel: [restUrl] }),
      [{ url: restUrl, content: "Use OAuth 2.0 to authorize API requests." }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain(
      "accessModel",
    );
  });

  it("rejects a negative GraphQL claim without explicit negative evidence", () => {
    const negativeResult = {
      ...result,
      apiSurface: { ...result.apiSurface, graphql: false },
    };
    const mapped = applyFieldEvidence(
      negativeResult,
      ledger({ apiSurfaceGraphql: [graphqlUrl] }),
      [{ url: graphqlUrl, content: "No GraphQL documentation was discovered." }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain(
      "apiSurface.graphql",
    );
  });

  it("does not treat an MCP client page as product MCP server evidence", () => {
    const mcpResult = {
      ...result,
      mcp: { status: "available" as const },
    };
    const mapped = applyFieldEvidence(
      mcpResult,
      ledger({ mcp: [restUrl] }),
      [{
        url: restUrl,
        content: "Example includes an MCP client that connects to external MCP servers.",
      }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain("mcp");
  });
});

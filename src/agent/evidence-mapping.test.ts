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

  it("does not recover REST from a fetched source that is not known to be official", () => {
    const unseenUrl = "https://unseen.example.com/rest";
    const mapped = applyFieldEvidence(
      result,
      ledger({ apiSurfaceRest: [unseenUrl] }),
      [{ url: unseenUrl, content: "Official REST API documentation", title: "REST API" }],
    );

    expect(mapped.evidence).toEqual([]);
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

  it("recovers official access evidence when synthesis omits the ledger mapping", () => {
    const accessResult = { ...result, accessModel: "self_serve_free" as const };
    const mapped = applyFieldEvidence(
      accessResult,
      ledger(),
      [{
        url: restUrl,
        content: "Create a free developer account and generate credentials in the developer portal.",
      }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).toContain(
      "accessModel",
    );
  });

  it("rejects REST when official documentation explicitly describes an RPC API", () => {
    const mapped = applyFieldEvidence(
      result,
      ledger({ apiSurfaceRest: [restUrl] }),
      [{
        url: restUrl,
        content: "The Web API is an HTTP RPC-style API. While it is not a REST API, it uses HTTP requests.",
      }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain(
      "apiSurface.rest",
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

  it("rejects an explicit negative GraphQL claim from a third-party source", () => {
    const negativeResult = {
      ...result,
      apiSurface: { ...result.apiSurface, graphql: false },
      evidence: [{
        title: "Third-party API inventory",
        url: graphqlUrl,
        sourceType: "third_party" as const,
        supports: ["apiSurface.graphql" as const],
      }],
    };
    const mapped = applyFieldEvidence(
      negativeResult,
      ledger({ apiSurfaceGraphql: [graphqlUrl] }),
      [{
        url: graphqlUrl,
        content: "This product does not provide a GraphQL API.",
      }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain(
      "apiSurface.graphql",
    );
  });

  it("removes auth methods supported only by unofficial reverse engineering", () => {
    const unofficialUrl = "https://community.example.net/reverse-engineered-auth";
    const authResult = {
      ...result,
      authMethods: ["OAuth 2.0", "Browser session cookies"],
      evidence: [
        {
          title: "Official authentication",
          url: restUrl,
          sourceType: "official" as const,
          supports: ["authMethods" as const],
        },
        {
          title: "Reverse-engineered authentication",
          url: unofficialUrl,
          sourceType: "third_party" as const,
          supports: ["authMethods" as const],
        },
      ],
    };
    const mapped = applyFieldEvidence(
      authResult,
      ledger({ authMethods: [restUrl, unofficialUrl] }),
      [
        { url: restUrl, content: "Use OAuth 2.0 to authorize API requests." },
        {
          url: unofficialUrl,
          content: "This unofficial client reuses browser session cookies.",
        },
      ],
    );

    expect(mapped.authMethods).toEqual(["OAuth 2.0"]);
    expect(mapped.evidence.map((item) => item.url)).not.toContain(unofficialUrl);
  });

  it("keeps semantically matching official auth methods with descriptive labels", () => {
    const authResult = {
      ...result,
      authMethods: [
        "OAuth 2.0 Access Tokens",
        "Bearer API key",
        "Personal Access Tokens (Fine-grained and Classic)",
      ],
      evidence: [{
        title: "Official authentication",
        url: restUrl,
        sourceType: "official" as const,
        supports: ["authMethods" as const],
      }],
    };
    const mapped = applyFieldEvidence(
      authResult,
      ledger({ authMethods: [restUrl] }),
      [{
        url: restUrl,
        content: "Use OAuth 2.0 access tokens, an API key in the Bearer header, or a fine-grained personal access token.",
      }],
    );

    expect(mapped.authMethods).toEqual(authResult.authMethods);
  });

  it("recovers explicit positive API surfaces when synthesis returns unknown", () => {
    const unknownApiResult = {
      ...result,
      apiSurface: { ...result.apiSurface, rest: null, graphql: null },
    };
    const mapped = applyFieldEvidence(
      unknownApiResult,
      ledger(),
      [{
        url: restUrl,
        content: "The official REST API includes a documented GraphQL API endpoint.",
      }],
    );

    expect(mapped.apiSurface.rest).toBe(true);
    expect(mapped.apiSurface.graphql).toBe(true);
    expect(mapped.evidence.flatMap((item) => item.supports)).toEqual(
      expect.arrayContaining(["apiSurface.rest", "apiSurface.graphql"]),
    );
  });

  it("recovers an explicit official access model when synthesis returns unknown", () => {
    const unknownAccessResult = { ...result, accessModel: "unknown" as const };
    const mapped = applyFieldEvidence(
      unknownAccessResult,
      ledger(),
      [{
        url: restUrl,
        content: "Create a free developer account to build and test integrations.",
      }],
    );

    expect(mapped.accessModel).toBe("self_serve_free");
    expect(mapped.evidence.flatMap((item) => item.supports)).toContain(
      "accessModel",
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

  it("does not treat an integration platform page as product-owned MCP", () => {
    const mcpResult = {
      ...result,
      mcp: { status: "available" as const },
      evidence: [{
        title: "Example MCP Server - MCP AI | Integration Platform",
        url: "https://integrations.test/mcp/example",
        sourceType: "official" as const,
        supports: ["mcp" as const],
      }],
    };
    const mapped = applyFieldEvidence(
      mcpResult,
      ledger({ mcp: ["https://integrations.test/mcp/example"] }),
      [{
        url: "https://integrations.test/mcp/example",
        content: "Connect to the Example MCP server through our integration platform.",
      }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain("mcp");
  });

  it("accepts an official vendor page naming the product MCP service", () => {
    const mcpResult = { ...result, mcp: { status: "available" as const } };
    const mapped = applyFieldEvidence(
      mcpResult,
      ledger({ mcp: [restUrl] }),
      [{ url: restUrl, content: "Connect to Example MCP using its hosted endpoint." }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).toContain("mcp");
  });
});

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
      expect.objectContaining({
        supports: expect.arrayContaining(["apiSurface.rest"]),
      }),
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
      expect.objectContaining({
        supports: expect.arrayContaining(["apiSurface.rest"]),
      }),
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

  it("does not accept REST from a fetched source not known to be official", () => {
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

  it("rejects explicit negative GraphQL evidence from a third party", () => {
    const negativeResult = {
      ...result,
      apiSurface: { ...result.apiSurface, graphql: false },
      evidence: [{
        title: "Third-party inventory",
        url: graphqlUrl,
        sourceType: "third_party" as const,
        supports: ["apiSurface.graphql" as const],
      }],
    };
    const mapped = applyFieldEvidence(
      negativeResult,
      ledger({ apiSurfaceGraphql: [graphqlUrl] }),
      [{ url: graphqlUrl, content: "The product does not provide GraphQL." }],
    );
    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain(
      "apiSurface.graphql",
    );
  });

  it("rejects REST when official documentation explicitly says the API is RPC", () => {
    const mapped = applyFieldEvidence(
      result,
      ledger({ apiSurfaceRest: [restUrl] }),
      [{
        url: restUrl,
        content: "This HTTP RPC-style Web API is not a REST API.",
      }],
    );
    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain(
      "apiSurface.rest",
    );
  });

  it("keeps official auth methods and removes reverse-engineered methods", () => {
    const unofficialUrl = "https://community.example.net/reverse-auth";
    const authResult = {
      ...result,
      authMethods: ["OAuth 2.0 Access Tokens", "Browser session cookies"],
      evidence: [
        {
          title: "Official authentication",
          url: restUrl,
          sourceType: "official" as const,
          supports: ["authMethods" as const],
        },
        {
          title: "Reverse-engineered client",
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
        { url: restUrl, content: "Use OAuth 2.0 access tokens." },
        { url: unofficialUrl, content: "Reuse browser session cookies." },
      ],
    );
    expect(mapped.authMethods).toEqual(["OAuth 2.0 Access Tokens"]);
    expect(mapped.evidence.map((item) => item.url)).not.toContain(unofficialUrl);
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

  it("rejects product MCP absence inferred from official MCP client docs", () => {
    const negativeResult = { ...result, mcp: { status: "not_found" as const } };
    const mapped = applyFieldEvidence(
      negativeResult,
      ledger({ mcp: [restUrl] }),
      [{
        url: restUrl,
        content: "Connect to external MCP servers using this MCP client.",
      }],
    );
    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain("mcp");
  });

  it("rejects negative product MCP evidence from a third party", () => {
    const negativeResult = {
      ...result,
      mcp: { status: "not_found" as const },
      evidence: [{
        title: "Community client",
        url: restUrl,
        sourceType: "third_party" as const,
        supports: ["mcp" as const],
      }],
    };
    const mapped = applyFieldEvidence(
      negativeResult,
      ledger({ mcp: [restUrl] }),
      [{ url: restUrl, content: "No official MCP server was found." }],
    );
    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain("mcp");
  });
});


describe("V2 credential-access evidence", () => {
  it("accepts official free signup and credential creation as self-serve access", () => {
    const mapped = applyFieldEvidence(
      result,
      ledger({ accessModel: [restUrl] }),
      [{
        url: restUrl,
        content: "Create a free developer account, then create an API key in Developer Settings.",
      }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).toContain(
      "accessModel",
    );
  });

  it("accepts an official enterprise license and IAM requirement", () => {
    const enterpriseResult = { ...result, accessModel: "enterprise_only" as const };
    const mapped = applyFieldEvidence(
      enterpriseResult,
      ledger({ accessModel: [restUrl] }),
      [{
        url: restUrl,
        content: "Users need a Gemini Notebook Enterprise license and must be granted the Cloud NotebookLM User IAM role.",
      }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).toContain(
      "accessModel",
    );
  });

  it("accepts explicit API program application as partnership-required access", () => {
    const gatedResult = {
      ...result,
      accessModel: "partnership_required" as const,
    };
    const mapped = applyFieldEvidence(
      gatedResult,
      ledger({ accessModel: [restUrl] }),
      [{
        url: restUrl,
        content: "Visit the Developer Portal to apply for the Advertising API product. LinkedIn reviews applications and selects approved developers.",
      }],
    );

    expect(mapped.evidence.flatMap((item) => item.supports)).toContain(
      "accessModel",
    );
  });
});


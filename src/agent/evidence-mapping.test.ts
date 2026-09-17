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
    const mapped = applyFieldEvidence(result, ledger({ apiSurfaceRest: [restUrl] }));

    expect(mapped.evidence).toEqual([
      expect.objectContaining({ supports: ["apiSurface.rest"] }),
    ]);
  });

  it("does not preserve model-generated supports without ledger evidence", () => {
    const mapped = applyFieldEvidence(result, ledger());

    expect(mapped.evidence).toEqual([]);
  });

  it("maps nested REST and GraphQL fields independently", () => {
    const mapped = applyFieldEvidence(
      result,
      ledger({
        apiSurfaceRest: [restUrl],
        apiSurfaceGraphql: [graphqlUrl],
      }),
    );

    expect(mapped.evidence[0]?.supports).toEqual(["apiSurface.rest"]);
    expect(mapped.evidence[1]?.supports).toEqual(["apiSurface.graphql"]);
  });

  it("cannot use evidence for one field to validate another", () => {
    const mapped = applyFieldEvidence(
      result,
      ledger({ authMethods: [restUrl] }),
    );

    expect(mapped.evidence[0]?.supports).toEqual(["authMethods"]);
    expect(mapped.evidence.flatMap((item) => item.supports)).not.toContain(
      "apiSurface.rest",
    );
  });

  it("ignores ledger URLs that are absent from the evidence list", () => {
    const mapped = applyFieldEvidence(
      result,
      ledger({ apiSurfaceRest: ["https://unseen.example.com/rest"] }),
    );

    expect(mapped.evidence).toEqual([]);
  });
});


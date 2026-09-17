import { describe, expect, it } from "vitest";

import { appResearchResultSchema } from "./result-schema.js";

const validResult = {
  app: "Salesforce",
  category: "CRM and Sales",
  description: "Salesforce is a customer relationship management platform.",
  authMethods: ["OAuth 2.0"],
  accessModel: "self_serve_trial",
  apiSurface: {
    rest: true,
    graphql: null,
    other: [],
    summary: "A documented public REST API is available.",
  },
  mcp: { status: "unknown", notes: "Not yet verified." },
  buildability: "buildable",
  blocker: null,
  confidence: "medium",
  unknownFields: ["apiSurface.graphql", "mcp"],
  evidence: [
    {
      title: "Salesforce REST API Developer Guide",
      url: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/",
      sourceType: "official",
      supports: ["apiSurface.rest"],
    },
  ],
  researchNotes: [],
} as const;

describe("appResearchResultSchema", () => {
  it("accepts an evidence-backed result with explicit unknowns", () => {
    expect(appResearchResultSchema.parse(validResult)).toEqual(validResult);
  });

  it("rejects non-web evidence URLs", () => {
    expect(() =>
      appResearchResultSchema.parse({
        ...validResult,
        evidence: [
          { ...validResult.evidence[0], url: "file:///docs/api.html" },
        ],
      }),
    ).toThrow();
  });

  it("rejects a buildable result with a blocker", () => {
    expect(() =>
      appResearchResultSchema.parse({
        ...validResult,
        blocker: "Enterprise plan required",
      }),
    ).toThrowError(/cannot have a blocker/);
  });

  it("requires a blocker for a blocked result", () => {
    expect(() =>
      appResearchResultSchema.parse({
        ...validResult,
        buildability: "blocked",
      }),
    ).toThrowError(/requires a blocker/);
  });
});

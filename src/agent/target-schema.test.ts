import { describe, expect, it } from "vitest";

import { researchTargetSchema } from "./target-schema.js";

describe("researchTargetSchema", () => {
  it("accepts a complete research target", () => {
    expect(
      researchTargetSchema.parse({
        name: "Salesforce",
        website: "https://salesforce.com",
        expectedCategory: "CRM and Sales",
      }),
    ).toEqual({
      name: "Salesforce",
      website: "https://salesforce.com",
      expectedCategory: "CRM and Sales",
    });
  });

  it("accepts only an application name", () => {
    expect(researchTargetSchema.parse({ name: "Linear" })).toEqual({
      name: "Linear",
    });
  });

  it("rejects an invalid website", () => {
    expect(() =>
      researchTargetSchema.parse({ name: "Linear", website: "linear.app" }),
    ).toThrow();
  });
});


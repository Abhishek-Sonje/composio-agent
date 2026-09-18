import { describe, expect, it } from "vitest";

import { buildResearchPrompt } from "./prompt.js";

describe("buildResearchPrompt", () => {
  it("includes supplied target context without treating category as fact", () => {
    const prompt = buildResearchPrompt({
      name: "Salesforce",
      website: "https://salesforce.com",
      expectedCategory: "CRM and Sales",
    });

    expect(prompt).toContain("Application: Salesforce");
    expect(prompt).toContain("Provided website: https://salesforce.com");
    expect(prompt).toContain("context only; verify it");
  });

  it("does not render missing optional values", () => {
    const prompt = buildResearchPrompt({ name: "Linear" });

    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("Provided website");
  });
});

describe("final result instruction", () => {
  it("requires relevant fetched sources to remain in the evidence list", async () => {
    const { FINAL_RESULT_INSTRUCTION } = await import("./prompt.js");
    expect(FINAL_RESULT_INSTRUCTION).toContain("every fetched source");
  });
});

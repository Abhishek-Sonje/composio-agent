import { describe, expect, it } from "vitest";

import { readConfig } from "./env.js";

const validEnv = {
  GEMINI_API_KEY: "gemini-key",
  GEMINI_MODEL: "gemini-3.5-flash",
  COMPOSIO_API_KEY: "composio-key",
};

describe("readConfig", () => {
  it("returns normalized configuration with the default research budget", () => {
    expect(readConfig(validEnv)).toEqual({
      geminiApiKey: "gemini-key",
      geminiModel: "gemini-3.5-flash",
      composioApiKey: "composio-key",
      maxResearchSteps: 10,
    });
  });

  it("accepts a configured research budget", () => {
    expect(readConfig({ ...validEnv, MAX_RESEARCH_STEPS: "8" })).toMatchObject({
      maxResearchSteps: 8,
    });
  });

  it("reports all missing required variables", () => {
    expect(() => readConfig({})).toThrowError(
      /GEMINI_API_KEY.*GEMINI_MODEL.*COMPOSIO_API_KEY/,
    );
  });

  it("rejects invalid research budgets", () => {
    expect(() =>
      readConfig({ ...validEnv, MAX_RESEARCH_STEPS: "0" }),
    ).toThrowError(/MAX_RESEARCH_STEPS/);
  });
});

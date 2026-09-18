import { describe, expect, it } from "vitest";

import { parseAssessmentTargets } from "./assessment-targets.js";

function assessment(rows: string[]): string {
  return [
    "### 1. Test Category",
    "",
    "| # | App | Website / hint |",
    "| --- | --- | --- |",
    ...rows,
  ].join("\n");
}

describe("parseAssessmentTargets", () => {
  it("parses exactly 100 unique targets with category and website hints", () => {
    const rows = Array.from(
      { length: 100 },
      (_, index) =>
        `| ${index + 1} | App ${index + 1} | [app${index + 1}.example](https://app${index + 1}.example/docs) |`,
    );

    const targets = parseAssessmentTargets(assessment(rows));

    expect(targets).toHaveLength(100);
    expect(new Set(targets.map(({ name }) => name))).toHaveLength(100);
    expect(targets[0]).toEqual({
      name: "App 1",
      website: "https://app1.example/docs",
      websiteHint: "app1.example",
      expectedCategory: "Test Category",
    });
  });

  it("rejects duplicate application names", () => {
    expect(() =>
      parseAssessmentTargets(
        assessment([
          "| 1 | Example | example.com |",
          "| 2 | example | example.org |",
        ]),
        2,
      ),
    ).toThrow(/Duplicate assessment app/);
  });

  it("rejects missing rows and non-contiguous numbering", () => {
    expect(() =>
      parseAssessmentTargets(assessment(["| 1 | One | one.test |"]), 2),
    ).toThrow(/exactly 2 targets/);
    expect(() =>
      parseAssessmentTargets(
        assessment(["| 1 | One | one.test |", "| 3 | Three | three.test |"]),
        2,
      ),
    ).toThrow(/numbering must be contiguous/);
  });
});

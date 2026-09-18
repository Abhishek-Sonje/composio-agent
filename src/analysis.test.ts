import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  appResearchResultSchema,
  type AppResearchResult,
} from "./agent/result-schema.js";
import {
  assessmentCategories,
  canonicalCategoryByApp,
} from "./data/assessment-categories.js";
import { analyzeDataset, type Dataset } from "./analysis.js";

async function loadFixture(): Promise<Dataset> {
  return JSON.parse(
    await readFile("results/research-dataset.json", "utf8"),
  ) as Dataset;
}

function bucketForFixture(record: AppResearchResult): string | undefined {
  const usableApi =
    record.apiSurface.rest === true ||
    record.apiSurface.graphql === true ||
    record.apiSurface.other.length > 0;
  if (record.buildability === "blocked" || record.blocker !== null)
    return "blocked";
  if (
    usableApi &&
    [
      "admin_approval",
      "enterprise_only",
      "partnership_required",
      "contact_sales",
    ].includes(record.accessModel)
  )
    return "needs_outreach_gated";
  if (
    record.authMethods.length > 0 &&
    usableApi &&
    record.accessModel.startsWith("self_serve_") &&
    record.buildability === "buildable"
  )
    return "easy_integration_candidates";
  if (
    record.accessModel === "unknown" ||
    record.authMethods.length === 0 ||
    record.apiSurface.rest === null ||
    record.apiSurface.graphql === null ||
    record.mcp.status === "unknown" ||
    record.buildability === "unknown"
  )
    return "needs_further_research";
  return undefined;
}

describe("deterministic dataset analysis", () => {
  it("validates 100 unique apps and reconciles category totals", async () => {
    const dataset = await loadFixture();
    const analysis = analyzeDataset(dataset, canonicalCategoryByApp);
    expect(dataset.records).toHaveLength(100);
    expect(
      new Set(dataset.records.map((record) => record.app.toLowerCase())).size,
    ).toBe(100);
    expect(Object.keys(analysis.byCategory)).toEqual(Object.keys(assessmentCategories));
    expect(Object.values(analysis.byCategory).map(({ total }) => total)).toEqual(
      Array(10).fill(10),
    );
    expect(analysis.reconciliation.categoryTotals).toBe(100);
    expect(
      Object.values(analysis.byCategory).reduce(
        (sum, category) => sum + category.total,
        0,
      ),
    ).toBe(100);
  });

  it("uses canonical assessment categories without rewriting raw research categories", async () => {
    const dataset = await loadFixture();
    const rawCategories = new Map(
      dataset.records.map((record) => [record.app, record.category]),
    );
    const analysis = analyzeDataset(dataset, canonicalCategoryByApp);

    expect(rawCategories.get("Twenty")).toBe("CRM");
    expect(rawCategories.get("Notion")).toBe(
      "Productivity & Knowledge Management",
    );
    expect(rawCategories.get("Fanbasis")).toBe(
      "Payments & Business Infrastructure",
    );
    expect(analysis.byCategory["CRM and Sales"]?.total).toBe(10);
    expect(analysis.byCategory["Productivity and Project Management"]?.total).toBe(10);
    expect(analysis.byCategory.Ecommerce?.total).toBe(10);
    expect(analysis.byCategory["CRM and Sales"]?.metrics.oauth?.count).toBe(10);
    expect(
      analysis.byCategory["Productivity and Project Management"]?.metrics.mcpAvailable?.count,
    ).toBe(6);
  });

  it("uses known-value denominators and keeps unknown separate from false", async () => {
    const analysis = analyzeDataset(await loadFixture(), canonicalCategoryByApp);
    expect(analysis.overall.apiSurface.rest).toEqual({ true: 87, unknown: 13 });
    expect(analysis.overall.apiSurface.graphql).toEqual({
      true: 18,
      unknown: 82,
    });
    expect(analysis.overall.metrics.restAvailable).toMatchObject({
      count: 87,
      total: 100,
      known: 87,
      percentOfKnown: 100,
    });
    expect(analysis.overall.metrics.mcpAvailable).toMatchObject({
      count: 51,
      total: 100,
      known: 57,
      percentOfKnown: 89.5,
    });
    expect(analysis.overall.unknownFields.actualUnresolved).toMatchObject({
      accessModel: 76,
      buildability: 75,
      "apiSurface.graphql": 82,
    });
  });

  it("reconciles distributions and applies bucket predicates", async () => {
    const dataset = await loadFixture();
    const analysis = analyzeDataset(dataset, canonicalCategoryByApp);
    for (const values of [
      analysis.overall.accessModel,
      analysis.overall.apiSurface.rest,
      analysis.overall.apiSurface.graphql,
      analysis.overall.mcp,
      analysis.overall.buildability,
      analysis.overall.confidence,
    ]) {
      expect(Object.values(values).reduce((sum, count) => sum + count, 0)).toBe(
        100,
      );
    }
    const records = dataset.records.map((record) =>
      appResearchResultSchema.parse(record),
    );
    const bucketApps = new Map(
      Object.entries(analysis.opportunityBuckets).flatMap(([bucket, value]) =>
        value.apps.map((app) => [app, bucket] as const),
      ),
    );
    for (const record of records)
      expect(bucketApps.get(record.app)).toBe(bucketForFixture(record));
    expect(
      analysis.reconciliation.bucketAssigned +
        analysis.reconciliation.bucketUnassigned,
    ).toBe(100);
    expect(analysis.reconciliation.bucketUnassigned).toBe(0);
  });
});

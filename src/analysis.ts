import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { appResearchResultSchema, type AppResearchResult } from "./agent/result-schema.js";

type Distribution = Record<string, number>;
export type Dataset = { generatedAt: string; count: number; records: AppResearchResult[] };
export type Metric = { count: number; total: number; known: number; percentOfTotal: number; percentOfKnown: number | null };
export type CategoryAnalysis = { total: number; accessModel: Distribution; authentication: Distribution; mcp: Distribution; buildability: Distribution; blocker: Distribution; unknownFields: Distribution; metrics: Record<string, Metric> };
export type OpportunityBucket = { count: number; percentOfTotal: number; apps: string[]; rule: string };
export type Analysis = {
  generatedAt: string;
  source: { file: string; datasetGeneratedAt: string; appCount: number };
  overall: {
    totalApps: number;
    authentication: { normalizedMethodFamilies: Distribution; appsWithKnownAuth: number; denominator: string };
    accessModel: Distribution;
    apiSurface: { rest: Distribution; graphql: Distribution };
    mcp: Distribution;
    buildability: Distribution;
    blocker: Distribution;
    confidence: Distribution;
    unknownFields: { actualUnresolved: Distribution; declared: Distribution };
    metrics: Record<string, Metric>;
  };
  byCategory: Record<string, CategoryAnalysis>;
  opportunityBuckets: Record<string, OpportunityBucket>;
  reconciliation: { categoryTotals: number; bucketAssigned: number; bucketUnassigned: number };
};

const pct = (count: number, denominator: number) => denominator ? Number(((count / denominator) * 100).toFixed(1)) : 0;
const metric = (count: number, total: number, known: number): Metric => ({ count, total, known, percentOfTotal: pct(count, total), percentOfKnown: known ? pct(count, known) : null });
const distribution = (values: string[]): Distribution => values.reduce<Distribution>((out, value) => { out[value] = (out[value] ?? 0) + 1; return out; }, {});
const add = (out: Distribution, key: string) => { out[key] = (out[key] ?? 0) + 1; };
const merge = (out: Distribution, value: Distribution) => { for (const [key, count] of Object.entries(value)) out[key] = (out[key] ?? 0) + count; };

function authFamilies(methods: string[]): Set<string> {
  const text = methods.join(" ").toLocaleLowerCase();
  const result = new Set<string>();
  if (/(^|[^a-z])oauth|openid connect/.test(text)) result.add("OAuth");
  if (/api key|api token|api tokens|api_token|x-api-key|x-auth-token/.test(text)) result.add("API key/token");
  if (/bearer|access token|user token|bot token/.test(text)) result.add("Bearer/access token");
  if (/basic auth|basic authentication|http basic|basic\b/.test(text)) result.add("Basic auth");
  if (/personal access|personal api|\bpat\b/.test(text)) result.add("Personal access token");
  if (/service account|service user|client credentials|workload identity/.test(text)) result.add("Service account/client credentials");
  if (/bot token/.test(text)) result.add("Bot token");
  if (!result.size && methods.length) result.add("Other");
  return result;
}

function blockerCategory(blocker: string | null, buildability: AppResearchResult["buildability"]): string {
  if (!blocker) return "none_or_not_claimed";
  const text = blocker.toLocaleLowerCase();
  if (/enterprise/.test(text)) return "enterprise_access";
  if (/partner|partnership/.test(text)) return "partner_or_contract_access";
  if (/approval|review|consent/.test(text)) return "approval_or_review";
  if (/no public api|without a native official api|custom wrapping/.test(text)) return "no_usable_public_api";
  if (/authentication|documentation|not found|not verified/.test(text)) return "insufficient_documentation_or_auth_clarity";
  return buildability === "blocked" ? "other_supported_blocker" : "other";
}

function actualUnknown(record: AppResearchResult): Distribution {
  const result: Distribution = {};
  if (!record.authMethods.length) add(result, "authMethods");
  if (record.accessModel === "unknown") add(result, "accessModel");
  if (record.apiSurface.rest === null) add(result, "apiSurface.rest");
  if (record.apiSurface.graphql === null) add(result, "apiSurface.graphql");
  if (record.mcp.status === "unknown") add(result, "mcp");
  if (record.buildability === "unknown") add(result, "buildability");
  return result;
}

const knownApi = (records: AppResearchResult[], key: "rest" | "graphql") => records.filter((record) => record.apiSurface[key] !== null).length;
const usableApi = (record: AppResearchResult) => record.apiSurface.rest === true || record.apiSurface.graphql === true || record.apiSurface.other.length > 0;

function categoryAnalysis(records: AppResearchResult[]): CategoryAnalysis {
  const authKnown = records.filter((record) => record.authMethods.length).length;
  const restKnown = knownApi(records, "rest");
  const graphqlKnown = knownApi(records, "graphql");
  const mcpKnown = records.filter((record) => record.mcp.status !== "unknown").length;
  const result: CategoryAnalysis = { total: records.length, accessModel: distribution(records.map((record) => record.accessModel)), authentication: {}, mcp: distribution(records.map((record) => record.mcp.status)), buildability: distribution(records.map((record) => record.buildability)), blocker: distribution(records.map((record) => blockerCategory(record.blocker, record.buildability))), unknownFields: {}, metrics: {} };
  for (const record of records) { for (const family of authFamilies(record.authMethods)) add(result.authentication, family); merge(result.unknownFields, actualUnknown(record)); }
  result.metrics = {
    oauth: metric(records.filter((record) => authFamilies(record.authMethods).has("OAuth")).length, records.length, authKnown),
    selfServe: metric(records.filter((record) => record.accessModel.startsWith("self_serve_")).length, records.length, records.length),
    restAvailable: metric(records.filter((record) => record.apiSurface.rest === true).length, records.length, restKnown),
    graphqlAvailable: metric(records.filter((record) => record.apiSurface.graphql === true).length, records.length, graphqlKnown),
    mcpAvailable: metric(records.filter((record) => record.mcp.status === "available").length, records.length, mcpKnown),
    buildable: metric(records.filter((record) => record.buildability === "buildable").length, records.length, records.filter((record) => record.buildability !== "unknown").length),
  };
  return result;
}

function bucketFor(record: AppResearchResult): string | undefined {
  if (record.buildability === "blocked" || record.blocker !== null) return "blocked";
  if (usableApi(record) && ["admin_approval", "enterprise_only", "partnership_required", "contact_sales"].includes(record.accessModel)) return "needs_outreach_gated";
  if (record.authMethods.length && usableApi(record) && record.accessModel.startsWith("self_serve_") && record.buildability === "buildable") return "easy_integration_candidates";
  if (record.accessModel === "unknown" || !record.authMethods.length || record.apiSurface.rest === null || record.apiSurface.graphql === null || record.mcp.status === "unknown" || record.buildability === "unknown") return "needs_further_research";
  return undefined;
}

export function analyzeDataset(dataset: Dataset, sourceFile = "results/research-dataset.json"): Analysis {
  const records = dataset.records.map((record) => appResearchResultSchema.parse(record));
  if (dataset.count !== records.length) throw new Error(`Dataset count ${dataset.count} does not match records ${records.length}`);
  if (new Set(records.map((record) => record.app.toLocaleLowerCase())).size !== records.length) throw new Error("Dataset contains duplicate app names");
  const authKnown = records.filter((record) => record.authMethods.length).length;
  const restKnown = knownApi(records, "rest");
  const graphqlKnown = knownApi(records, "graphql");
  const mcpKnown = records.filter((record) => record.mcp.status !== "unknown").length;
  const buildableKnown = records.filter((record) => record.buildability !== "unknown").length;
  const authentication: Distribution = {};
  const actual: Distribution = {};
  const declared: Distribution = {};
  for (const record of records) { for (const family of authFamilies(record.authMethods)) add(authentication, family); merge(actual, actualUnknown(record)); for (const field of record.unknownFields) add(declared, field); }
  const byCategory: Record<string, CategoryAnalysis> = {};
  for (const category of new Set(records.map((record) => record.category))) byCategory[category] = categoryAnalysis(records.filter((record) => record.category === category));
  const rules: Record<string, string> = { easy_integration_candidates: "authMethods known, usable API, self-serve access, and buildability=buildable", needs_outreach_gated: "usable API and gated accessModel", needs_further_research: "not matched earlier and an important feasibility field is unresolved", blocked: "buildability=blocked or a non-null blocker is recorded" };
  const buckets: Record<string, OpportunityBucket> = {};
  for (const [name, rule] of Object.entries(rules)) buckets[name] = { count: 0, percentOfTotal: 0, apps: [], rule };
  let unassigned = 0;
  for (const record of records) { const bucket = bucketFor(record); if (!bucket) { unassigned++; continue; } buckets[bucket]!.count++; buckets[bucket]!.apps.push(record.app); }
  for (const bucket of Object.values(buckets)) bucket.percentOfTotal = pct(bucket.count, records.length);
  const metrics = {
    oauth: metric(records.filter((record) => authFamilies(record.authMethods).has("OAuth")).length, records.length, authKnown),
    selfServe: metric(records.filter((record) => record.accessModel.startsWith("self_serve_")).length, records.length, records.length),
    restAvailable: metric(records.filter((record) => record.apiSurface.rest === true).length, records.length, restKnown),
    graphqlAvailable: metric(records.filter((record) => record.apiSurface.graphql === true).length, records.length, graphqlKnown),
    mcpAvailable: metric(records.filter((record) => record.mcp.status === "available").length, records.length, mcpKnown),
    buildable: metric(records.filter((record) => record.buildability === "buildable").length, records.length, buildableKnown),
  };
  const analysis: Analysis = { generatedAt: new Date().toISOString(), source: { file: sourceFile, datasetGeneratedAt: dataset.generatedAt, appCount: records.length }, overall: { totalApps: records.length, authentication: { normalizedMethodFamilies: authentication, appsWithKnownAuth: authKnown, denominator: "method family counts are multi-label; percentOfKnown uses apps with non-empty authMethods" }, accessModel: distribution(records.map((record) => record.accessModel)), apiSurface: { rest: distribution(records.map((record) => record.apiSurface.rest === null ? "unknown" : String(record.apiSurface.rest))), graphql: distribution(records.map((record) => record.apiSurface.graphql === null ? "unknown" : String(record.apiSurface.graphql))) }, mcp: distribution(records.map((record) => record.mcp.status)), buildability: distribution(records.map((record) => record.buildability)), blocker: distribution(records.map((record) => blockerCategory(record.blocker, record.buildability))), confidence: distribution(records.map((record) => record.confidence)), unknownFields: { actualUnresolved: actual, declared }, metrics }, byCategory, opportunityBuckets: buckets, reconciliation: { categoryTotals: Object.values(byCategory).reduce((sum, category) => sum + category.total, 0), bucketAssigned: records.length - unassigned, bucketUnassigned: unassigned } };
  if (analysis.reconciliation.categoryTotals !== records.length || analysis.reconciliation.bucketAssigned + analysis.reconciliation.bucketUnassigned !== records.length) throw new Error("Analysis reconciliation failed");
  return analysis;
}

function table(values: Distribution): string { return Object.entries(values).sort(([, left], [, right]) => right - left).map(([key, count]) => `| ${key} | ${count} |`).join("\n"); }

export function renderReport(analysis: Analysis): string {
  const { overall } = analysis;
  const line = (label: string, value: Metric) => `| ${label} | ${value.count}/${value.total} (${value.percentOfTotal}%) | ${value.known === value.total ? "all apps" : `${value.count}/${value.known} (${value.percentOfKnown ?? 0}%) known values`} |`;
  const categories = Object.entries(analysis.byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([name, item]) => `| ${name} | ${item.total} | ${item.metrics.oauth!.count} | ${item.metrics.selfServe!.count} | ${item.metrics.mcpAvailable!.count} | ${item.metrics.buildable!.count} | ${item.unknownFields.buildability ?? 0} |`).join("\n");
  const buckets = Object.entries(analysis.opportunityBuckets).map(([name, item]) => `| ${name} | ${item.count} | ${item.percentOfTotal}% | ${item.apps.join(", ") || "none"} |`).join("\n");
  return ["# Phase 4 deterministic analysis", "", `Source: ${analysis.source.file} (${analysis.source.appCount} unique apps). Percentages are rounded to one decimal place. Unknown values are not counted as false.`, "", "## Overall metrics", "", "| Metric | Count of all apps | Count among known values |", "| --- | ---: | ---: |", line("OAuth", overall.metrics.oauth!), line("Self-serve access", overall.metrics.selfServe!), line("REST available", overall.metrics.restAvailable!), line("GraphQL available", overall.metrics.graphqlAvailable!), line("MCP available", overall.metrics.mcpAvailable!), line("Buildable", overall.metrics.buildable!), "", "## Distributions", "", "### Access model", "", "| Value | Count |", "| --- | ---: |", table(overall.accessModel), "", "### REST", "", "| Value | Count |", "| --- | ---: |", table(overall.apiSurface.rest), "", "### GraphQL", "", "| Value | Count |", "| --- | ---: |", table(overall.apiSurface.graphql), "", "### MCP", "", "| Value | Count |", "| --- | ---: |", table(overall.mcp), "", "### Buildability", "", "| Value | Count |", "| --- | ---: |", table(overall.buildability), "", "### Confidence", "", "| Value | Count |", "| --- | ---: |", table(overall.confidence), "", "### Normalized authentication families", "", `Counts are multi-label. Known-auth denominator: ${overall.authentication.appsWithKnownAuth}/${overall.totalApps}.`, "", "| Method family | App count |", "| --- | ---: |", table(overall.authentication.normalizedMethodFamilies), "", "### Blocker categories", "", "| Category | Count |", "| --- | ---: |", table(overall.blocker), "", "## Category breakdown", "", "| Category | Apps | OAuth | Self-serve | MCP available | Buildable | Buildability unknown |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |", categories, "", "Detailed category metrics are in results/analysis.json.", "", "## Opportunity buckets", "", "Buckets are deterministic labels, not rankings.", "", "| Bucket | Count | Percent of all apps | Apps |", "| --- | ---: | ---: | --- |", buckets, "", "## Unknowns and data-quality caveats", "", "Actual unresolved feasibility fields:", "", "| Field | Count |", "| --- | ---: |", table(overall.unknownFields.actualUnresolved), "", "Declared unknownFields counts are retained separately because some records declare category or description unknown while still containing text values. Null API values and enum unknown values are unresolved, not negative findings.", "", `Reconciliation: ${analysis.reconciliation.categoryTotals} category rows = ${overall.totalApps} apps; ${analysis.reconciliation.bucketAssigned} assigned to a bucket and ${analysis.reconciliation.bucketUnassigned} left unassigned.`, ""].join("\n");
}

export async function writeAnalysisOutputs(datasetFile = "results/research-dataset.json", analysisFile = "results/analysis.json", reportFile = "docs/phase-4-analysis-report.md"): Promise<Analysis> {
  const dataset = JSON.parse(await readFile(datasetFile, "utf8")) as Dataset;
  const analysis = analyzeDataset(dataset, datasetFile);
  await writeFile(path.resolve(analysisFile), `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
  await writeFile(path.resolve(reportFile), renderReport(analysis), "utf8");
  return analysis;
}
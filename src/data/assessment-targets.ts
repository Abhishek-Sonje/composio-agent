import { readFile } from "node:fs/promises";

import {
  researchTargetSchema,
  type ResearchTarget,
} from "../agent/target-schema.js";

export const DEFAULT_ASSESSMENT_PATH =
  "AI Product Ops Intern -The take-home assignment 1a9b078a097a82ca800681f476b83fc0.md";

function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

function firstWebsite(hint: string): string | undefined {
  const markdownUrl = hint.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/i)?.[1];
  const rawUrl = markdownUrl ?? hint.match(/https?:\/\/[^\s)]+/i)?.[0];
  if (rawUrl) return rawUrl.replace(/\/$/, "");

  const bareDomain = hint.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s|()]*)?/i)?.[0];
  return bareDomain ? `https://${bareDomain.replace(/\/$/, "")}` : undefined;
}

export function parseAssessmentTargets(
  markdown: string,
  expectedCount = 100,
): ResearchTarget[] {
  let category: string | undefined;
  const numberedTargets: Array<{ number: number; target: ResearchTarget }> = [];

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^###\s+\d+\.\s+(.+?)\s*$/);
    if (heading?.[1]) {
      category = plainText(heading[1]);
      continue;
    }

    const row = line.match(/^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/);
    if (!row?.[1] || !row[2] || !row[3] || !category) continue;

    const websiteHint = plainText(row[3]);
    const website = firstWebsite(row[3]);
    numberedTargets.push({
      number: Number(row[1]),
      target: researchTargetSchema.parse({
        name: plainText(row[2]),
        ...(website ? { website } : {}),
        websiteHint,
        expectedCategory: category,
      }),
    });
  }

  if (numberedTargets.length !== expectedCount) {
    throw new Error(
      `Assessment must contain exactly ${expectedCount} targets; found ${numberedTargets.length}`,
    );
  }

  const names = new Map<string, string>();
  for (const [index, item] of numberedTargets.entries()) {
    const expectedNumber = index + 1;
    if (item.number !== expectedNumber) {
      throw new Error(
        `Assessment row numbering must be contiguous; expected ${expectedNumber}, found ${item.number}`,
      );
    }
    const key = item.target.name.toLocaleLowerCase();
    const duplicate = names.get(key);
    if (duplicate) {
      throw new Error(`Duplicate assessment app: ${duplicate} / ${item.target.name}`);
    }
    names.set(key, item.target.name);
  }

  return numberedTargets.map(({ target }) => target);
}

export async function loadAssessmentTargets(
  assessmentPath = DEFAULT_ASSESSMENT_PATH,
): Promise<ResearchTarget[]> {
  let markdown: string;
  try {
    markdown = await readFile(assessmentPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read assessment file at ${assessmentPath}: ${message}`);
  }
  return parseAssessmentTargets(markdown);
}

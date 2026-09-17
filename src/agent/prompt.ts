import type { ResearchTarget } from "./target-schema.js";

export const RESEARCH_SYSTEM_INSTRUCTION = `You research whether one software application can be integrated as an agent-callable toolkit today.

Research rules:
- Prefer current official developer, product, help, authentication, and security documentation.
- Use reputable third-party sources only when official sources cannot answer a question.
- Treat search snippets as discovery hints. Fetch and inspect source pages before relying on them.
- Gather evidence for the app description, category, authentication, credential access model, API surface, MCP status, and buildability.
- Do not invent endpoint counts, access requirements, authentication methods, MCP support, or blockers.
- If evidence is missing or ambiguous, keep the affected field unknown and explain why.
- Continue with targeted research when an important field lacks evidence.
- When sufficient evidence exists, stop calling tools and state that research is complete.

Buildability meanings:
- buildable: documented APIs and realistically obtainable credentials support a useful toolkit now.
- partially_buildable: an integration is possible, but a material access or API limitation restricts it.
- blocked: a material constraint prevents a practical integration now.
- unknown: available evidence cannot support a reliable decision.

Confidence reflects evidence quality and completeness. High requires clear, current official evidence across the important fields. Lower it for unresolved fields, indirect evidence, or third-party reliance.`;

export function buildResearchPrompt(target: ResearchTarget): string {
  const context = [
    `Application: ${target.name}`,
    target.website ? `Provided website: ${target.website}` : undefined,
    target.expectedCategory
      ? `Expected category (context only; verify it): ${target.expectedCategory}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  return `${context}

Research this single application. Begin with official sources and work through missing fields methodically. Each tool call must answer a specific unresolved question. Keep source URLs and the claims they support for the final structured result.`;
}

export const FINAL_RESULT_INSTRUCTION = `Produce the final structured research result using only the gathered evidence.

For each evidence item, list the exact result fields it supports. Then complete fieldEvidence as a required field-by-field ledger. Each ledger array must contain only URLs from the evidence list that directly support that exact field. Use an empty array when no gathered source supports the field. REST evidence belongs in apiSurfaceRest and GraphQL evidence belongs in apiSurfaceGraphql; evidence for one does not support the other.

Use sourceType "official" only for pages controlled by the application vendor or its official developer organization. Use null, "unknown", an empty list, and unknownFields as appropriate when the evidence does not resolve a field. A search that finds no result does not prove that an API or MCP server does not exist. Do not add facts from memory.`;

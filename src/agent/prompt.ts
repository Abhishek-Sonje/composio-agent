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

Research this single application. Begin with official sources and work through missing fields methodically. Each tool call must answer a specific unresolved question. Search results are discovery hints only: fetch the underlying source pages that support important fields before finishing. Keep source URLs and the claims they support for the final structured result.`;
}

export const FINAL_RESULT_INSTRUCTION = `Produce the final structured research result using only the gathered evidence. Include every fetched source that directly supports a retained claim in the evidence list; do not omit a relevant fetched source merely because another source was already cited.

For each evidence item, list the exact result fields it supports. Use sourceType "official" only for pages controlled by the application vendor or its official developer organization. Use null, "unknown", an empty list, and unknownFields as appropriate when the evidence does not resolve a field. A search that finds no result does not prove that an API or MCP server does not exist. Do not add facts from memory.`;

export const EVIDENCE_MAPPING_INSTRUCTION = `Map the candidate result's existing evidence items to the exact fields they directly support.

This is an evidence-mapping task only. Do not add claims, sources, or URLs. Every URL you return must exactly match a URL in the candidate evidence list. Review the gathered observation content rather than relying only on the evidence title.

Complete every ledger array. Use an empty array when none of the gathered evidence directly supports that field. REST evidence belongs only in apiSurfaceRest; GraphQL evidence belongs only in apiSurfaceGraphql. Evidence for authentication does not automatically support accessModel. Evidence that an API exists does not automatically support buildability.`;

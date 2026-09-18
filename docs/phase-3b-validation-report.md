# Phase 3B validation report

Validated on 2026-09-18 against the same 14 applications and 98 feasibility fields used in Phase 3. The current generated files were inspected directly; no manual values were inserted into the dataset.

## Outcome

| Metric | Phase 3 baseline | First Phase 3B run | Corrected Phase 3B run |
| --- | ---: | ---: | ---: |
| Correct | 58 | 49 | 50 |
| Incorrect | 2 | 0 | 0 |
| Unsupported | 2 | 0 | 2 |
| Unnecessary unknown | 23 | 35 | 34 |
| Correctly unknown | 13 | 14 | 12 |
| Precision | 93.55% | 100.00% | 96.15% |
| Coverage miss rate | 24.47% | 35.71% | 35.42% |

The first Phase 3B run exposed overly literal authentication matching and loss of positive GraphQL evidence. Those regressions were corrected and the complete sample was rerun. The corrected run removed both original incorrect claims: Slack was no longer labeled REST, and NotebookLM was no longer labeled as lacking REST. ClickUp's unsupported negative GraphQL claim also became unknown.

The corrected run did not meet the coverage goal. Although precision improved relative to the Phase 3 baseline, unnecessary unknowns increased from 23 to 34.

## Corrected-run classifications

| Application | Auth | Access | REST | GraphQL | MCP | Buildability | Blocker |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Salesforce | correct | correct | correct | correct | correct | correct | correct |
| HubSpot | correct | correct | correct | correct | correct | correct | correct |
| Zendesk | correct | correct | unnecessary_unknown | unnecessary_unknown | unsupported | unnecessary_unknown | correct |
| Slack | unnecessary_unknown | unnecessary_unknown | unnecessary_unknown | correctly_unknown | correct | unnecessary_unknown | correct |
| Shopify | correct | unnecessary_unknown | unnecessary_unknown | correct | unnecessary_unknown | unnecessary_unknown | correct |
| Firecrawl | correct | correct | unnecessary_unknown | correctly_unknown | unnecessary_unknown | unnecessary_unknown | correct |
| GitHub | correct | unnecessary_unknown | correct | correct | correct | unnecessary_unknown | correct |
| Linear | correct | correct | correctly_unknown | correct | unnecessary_unknown | correct | correct |
| ClickUp | correct | unnecessary_unknown | unnecessary_unknown | correctly_unknown | correct | unnecessary_unknown | correct |
| Stripe | correct | unnecessary_unknown | unnecessary_unknown | correctly_unknown | correct | unnecessary_unknown | correct |
| PitchBook | correct | unnecessary_unknown | correct | correctly_unknown | unnecessary_unknown | unnecessary_unknown | unnecessary_unknown |
| NotebookLM | unnecessary_unknown | correct | unnecessary_unknown | correctly_unknown | unsupported | unnecessary_unknown | unnecessary_unknown |
| Otter AI | correct | correct | unnecessary_unknown | correctly_unknown | unnecessary_unknown | correct | correct |
| Mermaid CLI | correct | correctly_unknown | correctly_unknown | correctly_unknown | correctly_unknown | unnecessary_unknown | correct |

The two unsupported values were negative MCP claims:

1. Zendesk `mcp: not_found` cited official documentation about Zendesk acting as an MCP client. That page does not establish that Zendesk lacks a product MCP server.
2. NotebookLM `mcp: not_found` cited a third-party reverse-engineered MCP repository. A third-party project cannot establish official product MCP absence.

Focused regression tests were added after this measurement, and commit `f1e32ce` now requires explicit official negative evidence for `not_found` or `unavailable` MCP status. The generated Zendesk and NotebookLM files predate that final safeguard, so the measured table keeps the two unsupported classifications rather than retroactively claiming they passed.

## Budget result

| Metric | Corrected run |
| --- | ---: |
| Sample applications | 14 |
| Average actions | 9.57 |
| Budget exhausted | 10 / 14 |
| Unnecessary unknowns from exhausted runs | 24 / 34 |

Budget exhaustion still correlates with missing coverage, but four non-exhausted runs also produced ten unnecessary unknowns. The misses therefore cannot be fixed safely by increasing the action limit alone.

The revised controller behaved correctly in two important ways:

- It fetched a promising positive GraphQL result instead of treating every GraphQL investigation as a one-action negative search. This preserved Salesforce and HubSpot GraphQL evidence.
- It used a deterministic official access query before lower-value checks. This recovered HubSpot, Firecrawl, Linear, and NotebookLM access evidence.

However, live model and search variability lost previously available access, REST, MCP, or auth evidence for other apps. The most visible examples were Slack, GitHub, Shopify, ClickUp, Stripe, PitchBook, and Otter. Buildability then correctly remained unknown because one or more prerequisites were missing.

## Pipeline changes and validation

Phase 3B commits:

- `377766d test: reproduce Phase 3 coverage failures`
- `eb1b329 feat: prioritize developer access research`
- `4b29757 fix: enforce semantic evidence purity`
- `bc7ae2a fix: require official REST evidence`
- `a49e4d8 test: reproduce Phase 3B coverage regression`
- `c0c8a92 fix: recover explicit official feasibility evidence`
- `24bc4f0 fix: preserve promising GraphQL follow-up`
- `58eed16 test: reproduce unsupported negative MCP claims`
- `f1e32ce fix: require explicit official negative MCP evidence`

Validation after the final semantic safeguard:

- Tests: 81 passing across 11 test files
- TypeScript check: passing
- Production build: passing
- Research action limit: 10
- Full dataset manifest: 100 completed, 0 failed, 0 pending

## Recommendation

**Do not freeze the research pipeline yet.**

Phase 3B improved semantic precision but failed its coverage success condition. The evidence rules should remain strict, including the final negative-MCP safeguard. The next change, if authorized, should be limited to making high-value official source acquisition more repeatable; increasing the budget or weakening validators would not address the observed source-discovery variance.

Phase 4 was not started.

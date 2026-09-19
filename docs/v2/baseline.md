# V2 six-app benchmark baseline

## Scope

This benchmark is permanent for Fixes 1–4. It is deliberately mixed rather than convenient.

| App | Benchmark role |
| --- | --- |
| Stripe | Strong auth/API/MCP documentation with unresolved credential access and buildability |
| HubSpot | Direct free developer-account and test-credential path |
| Shopify | Developer access, official MCP, and API lifecycle/source-classification case |
| NotebookLM Enterprise | Enterprise access plus consumer/enterprise and API-version scope risk |
| LinkedIn Ads | Explicit product approval and gated-access case |
| Slack | Already-understood regression guard for RPC-style API semantics |

The target is **NotebookLM Enterprise**, matching the assessment and stored result. The Phase 2 manifest's shorter `NotebookLM` label is treated only as a telemetry alias.

Source snapshot: `docs/v2/benchmark-results/baseline.json`. It preserves each complete result, evidence ledger, confidence, unknown fields, and recorded action telemetry without changing the original Phase 1–4 outputs.

## Baseline metrics

| Metric | Baseline |
| --- | ---: |
| Apps | 6 |
| Access resolved | 2 / 6 |
| Buildability resolved | 2 / 6 |
| Critical unknown field outcomes | 20 |
| Correct checked fields | 22 |
| Incorrect checked fields | 0 |
| Unsupported checked fields | 0 |
| Unnecessary unknowns | 14 |
| Correctly unknown | 6 |
| Actions used | 60 / 60 |
| Budget exhausted | 6 / 6 |
| Official-source evidence coverage | 6 / 6 apps have retained official evidence |

“Critical unknown field outcomes” counts unknown values among the seven manually checked feasibility fields. It does not count metadata fields such as category or description.

## Baseline values

| App | Auth | Access | REST | GraphQL | MCP | Buildability | Blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Stripe | API key, Bearer, OAuth | unknown | unknown | unknown | available | unknown | none |
| HubSpot | OAuth, Bearer, private-app token | unknown | true | true | available | unknown | none |
| Shopify | OAuth, access token | unknown | true | true | unknown | unknown | none |
| NotebookLM Enterprise | unknown | enterprise_only | unknown | unknown | unknown | unknown | unknown |
| LinkedIn Ads | OAuth 2.0 | unknown | true | unknown | unknown | partially_buildable | approval/consent friction |
| Slack | OAuth 2.0 | self_serve_free | unknown | unknown | available | buildable | none |

## Freeze rule

The same six apps and fixed 10-action limit will be used for Fix 1. No adaptive extension, evidence-scope change, or source-precedence change belongs in that experiment.


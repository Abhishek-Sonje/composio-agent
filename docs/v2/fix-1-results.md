# Fix 1 benchmark result

## Hypothesis

Explicit credential-access research and deterministic downstream buildability derivation would resolve avoidable access and buildability unknowns without weakening evidence requirements or regressing already-supported critical fields.

## Change

The experiment expanded controlled access-evidence recognition, reused fetched official evidence for access mapping, added a targeted credential-access query, and derived buildability only after supported authentication, access, and usable API prerequisites.

The action budget remained fixed at 10. Adaptive budgeting, product/version scoping, and source-precedence work remained disabled.

## Benchmark

The permanent six-app benchmark was unchanged:

- Stripe
- HubSpot
- Shopify
- NotebookLM Enterprise
- LinkedIn Ads
- Slack

The complete outputs are preserved in `benchmark-results/fix-1.json`.

## Before

- Access resolved: 2/6
- Buildability resolved: 2/6
- Critical unknown outcomes: 20
- All six baseline runs used the 10-action budget

## After

- Access resolved: 2/6
- Buildability resolved: 2/6
- Critical unknown outcomes: 20
- Incorrect changed claims: 0
- Unsupported changed claims: 0
- CLI output files did not persist action telemetry, so per-app action counts cannot be reconstructed from the result JSON alone

Coverage moved between apps instead of improving overall:

| App | Material result | Classification |
| --- | --- | --- |
| Stripe | Access and buildability remained unknown | No improvement |
| HubSpot | Access became `self_serve_free`; buildability became `buildable` | Supported improvement |
| Shopify | Previously supported REST became unknown; access, MCP, and buildability stayed unknown | Regression |
| NotebookLM Enterprise | Official bearer/OAuth authentication and the licensing blocker were recovered, but previously supported enterprise access became unknown; explicit REST evidence on the fetched API page was not mapped | Mixed; critical regression |
| LinkedIn Ads | Previously supported REST and partial buildability became unknown; approval blocker survived | Regression |
| Slack | Existing access, RPC-style Web API, MCP, and buildability behavior remained intact | Regression guard passed |

## Manual verification

- HubSpot's official account-types documentation states that standard accounts may be free, developer test accounts are free, and developers can create those accounts directly. The new `self_serve_free` access result is supported.
- NotebookLM Enterprise's official API documentation uses bearer access tokens and explicitly labels documented calls as REST. The authentication claim is supported, while `apiSurface.rest: unknown` is an avoidable mapping/research miss.
- NotebookLM Enterprise's official licensing documentation requires licenses and subscription setup, supporting a gated access model and the preserved blocker. Returning `accessModel: unknown` regressed the baseline.
- No new negative GraphQL or MCP claim survived without explicit evidence.
- Slack remained correctly represented as an HTTP RPC-style Web API rather than REST.

## Regressions

The experiment failed the required condition that previously correct critical claims must not regress. Shopify lost REST; NotebookLM Enterprise lost enterprise access; LinkedIn Ads lost REST and partial buildability. The run also failed to resolve Stripe access despite an earlier one-off run finding official pricing evidence, which shows the behavior is not reliable enough to accept from a single favorable output.

## Final bounded adaptive attempt

A final experiment kept 10 as the normal budget and allowed at most two direct fetches only when the access search had already discovered a promising, unfetched pricing, licensing, account-type, setup, or partner-access URL. It did not grant the model an open-ended research loop and did not weaken evidence validation.

The Stripe canary completed its 10 normal actions. Its access search selected the Partner Ecosystem page and exposed no qualifying unfetched eligibility URL, so the controller correctly granted no extension. Stripe still returned `accessModel: unknown` and `buildability: unknown`. This confirmed that the remaining failure was source discovery, not sanitization, and that a bounded extension could not reliably repair it from the available search results.

## Decision

**REVERT AND STOP**

The implementation and experimental tests were removed. The conservative submitted pipeline remains the active research agent. V2 access/buildability optimization is closed because neither the fixed-budget change nor the bounded adaptive attempt improved the benchmark without regressions. No Fix 2, Fix 3, Fix 4, fresh-sample run, or 100-app rerun will be performed.

# Phase 1 verification notes

Date: 2026-09-17

## Live sample

Three applications were researched through the complete CLI pipeline using Composio Search and Gemini. The final comparison runs used a four-action budget and `gemini-3.5-flash-lite` because the full Flash model quotas were exhausted during iterative development and Gemini 3.7/3.8 intermittently returned `503 UNAVAILABLE`.

| Application | Case exercised | Access model | REST | MCP | Buildability | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| Salesforce | OAuth product with broad APIs and official MCP | unknown | unknown | available | unknown | medium |
| Stripe | API-key product with official hosted MCP | unknown | unknown | available | unknown | medium |
| Gong | Enterprise/admin-gated API | admin approval | available | unknown | unknown | medium |

The conservative unknowns are intentional. A generated claim survives only when an evidence item explicitly lists that field in `supports`. This prevents model memory or an uncited search snippet from becoming verified dataset content.

Generated files are written locally under `results/` and are ignored by Git.

## Manual Salesforce check

The Salesforce sample was checked independently against current official sources:

- The [REST API authorization guide](https://developer.salesforce.com/docs/platform/api-rest/guide/intro-oauth-and-connected-apps.html) confirms OAuth 2.0 through External Client Apps or legacy Connected Apps. It also notes that creating new Connected Apps is restricted from Spring '26 and recommends External Client Apps.
- The [GraphQL API guide](https://developer.salesforce.com/docs/platform/graphql/guide/graphql-about.html) confirms a GraphQL endpoint and availability in Developer Edition, Enterprise, Performance, and Unlimited editions.
- The [Developer Edition REST quick start](https://developer.salesforce.com/docs/platform/api-rest/guide/quickstart-dev-org.html) describes Developer Edition as a free testing and development option and calls out the required API Enabled permission.
- The [Hosted MCP overview](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html) confirms official OAuth 2.0/PKCE MCP support. It also states that Hosted MCP is intended for customers with Flex Credits and may be billed.
- The official [`salesforcecli/mcp`](https://github.com/salesforcecli/mcp) repository confirms the separately available Salesforce DX MCP server and documents more than 60 tools.

This manual review showed that the underlying generated Salesforce claims were broadly accurate, but some evidence mappings were incomplete. The pipeline correctly converts those incompletely cited claims to unknown.

## Failures observed and changes made

1. `gemini-2.5-flash` returned `404` for new users. The project moved to a current configurable Gemini model.
2. Gemini 3.5 rejected a discriminated-union response schema. The provider-facing schema was flattened while strict local validation remained in place.
3. Temporary `503 UNAVAILABLE` responses interrupted runs. Three bounded attempts now handle temporary availability failures.
4. Per-minute `429` responses included short retry windows. The client honors provider-supplied delays up to 30 seconds, but still fails immediately for per-day exhaustion.
5. Raw research responses could be large. Tool observations now have deterministic limits for characters, collection size, and nesting depth.
6. Budget-exhausted and search-only runs could claim high confidence. Deterministic confidence ceilings now prevent that.
7. Generated results included plausible API claims without evidence mappings. Unsupported auth, access, API, MCP, blocker, and buildability claims now become unknown.
8. Unsupported claims could remain in API summaries and research notes. Those text paths are now sanitized as well.
9. Gong was initially called buildable while credential access was unresolved. Buildability now requires supported authentication, access, and usable API evidence.

## What works

- One-application CLI execution
- Iterative targeted research
- Composio web search and URL content retrieval
- Deterministic action budgets
- Structured Gemini output with local Zod validation
- Explicit unknown-field handling
- Evidence-coverage enforcement
- Bounded transient-error handling
- Atomic JSON persistence
- Useful progress logging without secrets

## Remaining limitations

- Flash-Lite often stops after two searches and omits evidence mappings, producing conservative unknowns. Full Flash should be preferred when quota is available.
- The model sometimes treats search result content as sufficient instead of fetching every cited page. High confidence is blocked unless at least one URL-fetch action occurred.
- Results do not yet preserve an interrupted run for later resumption.
- Provider quotas can prevent a multi-app verification batch from completing in one free-tier window.
- Category and description must remain strings in the current schema. When their evidence mapping is absent, they are retained as candidate text but included in `unknownFields`.


# Phase 3 independent verification report

Verified on 2026-09-18 against the completed 100-app Phase 2 dataset. The frozen research pipeline was not changed.

## Method

Fourteen applications were selected across seven assessment categories. The sample deliberately mixes self-serve and gated access, OAuth and API-key authentication, official MCP and no discoverable official MCP, complete and unknown-heavy records, and easy and difficult documentation. Each of the seven feasibility fields was checked independently against current official product or developer documentation: `authMethods`, `accessModel`, `apiSurface.rest`, `apiSurface.graphql`, `mcp`, `buildability`, and `blocker`.

For every surviving claim, the stored evidence URL was checked for fetch provenance, product identity, currency, and semantic support. A source containing a keyword was not considered sufficient. Official documentation was sufficient for the independent verdicts; no third-party source was needed. The stored dataset did use third-party material in two cases discussed below.

Classification codes used in the tables:

| Code | Classification |
| --- | --- |
| C | correct |
| I | incorrect |
| U | unsupported |
| UN | unnecessary unknown |
| CU | correctly unknown |

`blocker: null` is treated as the absence of a positive blocker claim. It is correct where the official access and API path shows no material blocker; it is an unnecessary unknown where a documented gating constraint was omitted and the field appears in `unknownFields`.

## Sample

| Application | Assessment category | Selection reason |
| --- | --- | --- |
| Salesforce | CRM | Well-documented OAuth product with REST, GraphQL, developer access, and official MCP; relatively complete result. |
| HubSpot | CRM | Free developer environment, multiple auth paths, REST and limited GraphQL, and official MCP; access/buildability were unknown. |
| Zendesk | Customer support | Trial-based developer access, broad REST APIs, product-specific GraphQL, and no obvious official MCP. |
| Slack | Communication | OAuth/token product with a free developer sandbox and official MCP; tests the semantic difference between an HTTP RPC API and REST. |
| Shopify | Ecommerce | OAuth, development stores, GraphQL-first APIs, legacy REST, and official Storefront MCP; unknown-heavy result. |
| Firecrawl | Data and scraping | Developer-focused API-key product with a free plan, REST, and official MCP; unknown-heavy result. |
| GitHub | Developer infrastructure | Self-serve product with several auth modes, REST, GraphQL, and an official open-source MCP server. |
| Linear | Productivity | GraphQL-first product with OAuth/personal keys and official MCP; tests a product without a documented REST API. |
| ClickUp | Productivity | Free public API and official MCP; tests a surviving negative GraphQL conclusion. |
| Stripe | Finance | API-key/OAuth product with test environments, REST, and official MCP; access/buildability were unknown. |
| PitchBook | Finance/research | Enterprise-gated API with a standalone contract and product-owned MCP gateway; difficult access model. |
| NotebookLM | AI | Very unknown-heavy result and a current enterprise API that conflicts with older reverse-engineered sources. |
| Otter AI | AI/communication | Enterprise-only public API and recently released official MCP documentation. |
| Mermaid CLI | Developer infrastructure | Open-source local CLI/Node API rather than a conventional SaaS API; ambiguous schema fit and the only sampled recorded run that did not exhaust its budget. |

## Field-level classifications

| Application | Auth | Access | REST | GraphQL | MCP | Buildability | Blocker |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Salesforce | C | C | C | C | C | UN | C |
| HubSpot | C | UN | C | C | C | UN | C |
| Zendesk | C | C | UN | C | CU | C | C |
| Slack | C | C | I | CU | C | C | C |
| Shopify | C | UN | C | C | UN | UN | C |
| Firecrawl | C | UN | C | CU | C | UN | C |
| GitHub | C | C | C | C | C | UN | C |
| Linear | C | UN | CU | C | C | UN | C |
| ClickUp | C | UN | C | U | C | UN | C |
| Stripe | C | UN | C | CU | C | UN | C |
| PitchBook | C | UN | C | CU | C | UN | C |
| NotebookLM | U | UN | I | CU | CU | UN | UN |
| Otter AI | C | C | C | CU | UN | C | C |
| Mermaid CLI | C | CU | CU | CU | CU | UN | C |

## Results

| Metric | Result |
| --- | ---: |
| Applications sampled | 14 |
| Fields checked | 98 |
| Correct | 58 |
| Incorrect | 2 |
| Unsupported | 2 |
| Unnecessary unknown | 23 |
| Correctly unknown | 13 |
| Precision | 93.55% (58 / 62 surviving claims) |
| Coverage miss rate | 24.47% (23 / 94, using the requested formula) |
| Unknown resolution rate | 63.89% (23 / 36 unknown-valued fields were avoidable) |

Precision uses `correct / (correct + incorrect + unsupported)`. The requested coverage miss rate uses `unnecessary_unknown / (correct + unnecessary_unknown + correctly_unknown)`. The additional unknown resolution rate shows the share of all sampled unknown-valued fields for which official evidence was reasonably available.

## Independent evidence and material verdicts

The following official sources were the primary independent references. They also record the reasons behind every non-correct classification.

- **Salesforce:** Official [OAuth/REST](https://developer.salesforce.com/docs/platform/api-rest/guide/intro-oauth-and-connected-apps.html), [GraphQL](https://developer.salesforce.com/docs/platform/graphql/guide/graphql-about.html), [Developer Edition](https://developer.salesforce.com/docs/platform/api-rest/guide/quickstart-dev-org.html), and [Hosted MCP](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html) documentation confirms the stored feasibility inputs. `buildability` was unnecessarily unknown because supported auth, self-serve development access, and usable APIs were present.
- **HubSpot:** The [developer platform onboarding page](https://developers.hubspot.com/developer-platform-basics) explicitly says a paid account is not required and provides free developer test accounts plus public API access. Its official [authentication](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/overview), [object API](https://developers.hubspot.com/docs/api-reference/latest/crm/using-object-apis), [GraphQL](https://developers.hubspot.com/docs/cms/start-building/features/data-driven-content/graphql/query-hubspot-data-using-graphql), and [MCP](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server) pages confirm the surviving claims. Access and derived buildability were unnecessary unknowns.
- **Zendesk:** Official [security/auth](https://developer.zendesk.com/api-reference/introduction/security-and-auth/), [trial account](https://developer.zendesk.com/documentation/api-basics/getting-started/getting-a-trial-or-sponsored-account-for-development/), [REST platform](https://developer.zendesk.com/documentation/api-basics/getting-started/about-the-zendesk-developer-platform/), and [Sell GraphQL](https://developer.zendesk.com/api-reference/sales-crm/search/graphql/) pages confirm auth, access, REST, and the product-scoped GraphQL API. REST was unnecessarily unknown. No official Zendesk product MCP documentation was reasonably discoverable, so MCP remained correctly unknown.
- **Slack:** Official [tokens](https://docs.slack.dev/authentication/tokens/), [developer sandbox](https://docs.slack.dev/tools/developer-sandboxes/), and [MCP](https://docs.slack.dev/ai/slack-mcp-server/developing/) documentation supports those fields. The [Web API overview](https://docs.slack.dev/apis/web-api/) explicitly describes the API as HTTP RPC-style and says it is not REST. The stored `rest: true` is therefore incorrect, even though its URL was fetched and refers to Slack. GraphQL stayed correctly unknown.
- **Shopify:** Official [authentication](https://shopify.dev/docs/api/usage/authentication), [development store](https://shopify.dev/docs/apps/build/stores/development-stores), [API](https://shopify.dev/docs/apps/build/apis), and [Storefront MCP](https://shopify.dev/docs/apps/build/storefront-mcp) pages show a development access path, GraphQL, legacy REST, and an official product MCP capability. Access, MCP, and derived buildability were unnecessary unknowns. The stored MCP page was fetched but mapped only to `apiSurface.other`, so this is an evidence-mapping/synthesis miss rather than missing documentation.
- **Firecrawl:** Official [API](https://docs.firecrawl.dev/api-reference/v2-introduction), [MCP](https://docs.firecrawl.dev/mcp-server), and [free-plan](https://www.firecrawl.dev/crawl) pages support API-key auth, REST, MCP, and self-serve credentials. Access and derived buildability were unnecessary unknowns; GraphQL was correctly unknown.
- **GitHub:** Official [REST](https://docs.github.com/en/rest), [GraphQL](https://docs.github.com/en/graphql/overview/about-the-graphql-api), [plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans), and the official [`github-mcp-server`](https://github.com/github/github-mcp-server) repository confirm the stored inputs. Buildability was the only unnecessary unknown.
- **Linear:** Official [GraphQL/auth](https://linear.app/developers/graphql), [OAuth](https://linear.app/developers/oauth-2-0-authentication), [agent development](https://linear.app/developers/agents), and [MCP](https://linear.app/docs/mcp) pages support a feasible development path. Access and derived buildability were unnecessary unknowns. Because the public API is documented as GraphQL and no reliable current official source explicitly establishes a REST API or its absence, REST was correctly unknown.
- **ClickUp:** Official [authentication](https://developer.clickup.com/docs/authentication), [API plan availability](https://developer.clickup.com/docs/apis-available-by-plan), and [MCP](https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server) pages show free-plan public API access and official MCP. Access and buildability were unnecessary unknowns. The surviving `graphql: false` depended on a fetched third-party API Evangelist page; absence from official documentation is not evidence of absence, so the negative claim is unsupported.
- **Stripe:** Official [API/authentication](https://docs.stripe.com/api/authentication), [sandbox development](https://docs.stripe.com/get-started/test-developer-integration), and [MCP](https://docs.stripe.com/mcp) pages support self-serve test credentials, REST, and MCP. Access and buildability were unnecessary unknowns; GraphQL was correctly unknown.
- **PitchBook:** Official [API documentation](https://pitchbook.com/help/PitchBook-api) states that the REST API is a separate offering requiring a standalone contract and direct request to the data team. The product-owned [MCP gateway](https://mcp-proxy-external.pitchbook.com/toolsets) and [Premium Connector documentation](https://pitchbook.com/help/getting-started-with-pitchbook-premium-connector) support the MCP claim. The access model should have been enterprise/contact-sales rather than unknown, and buildability should have reflected a usable but gated API path.
- **NotebookLM:** Current official [Enterprise setup](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/set-up-notebooklm) and [Notebook API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks) documentation establishes enterprise/IAM-gated access and a REST API. The stored `rest: false` is incorrect. Its auth array is unsupported as a whole because it includes browser cookies based on a fetched reverse-engineering repository, alongside valid official enterprise OAuth/bearer methods. Access, buildability, and the enterprise-license blocker were unnecessary unknowns. GraphQL and official product MCP remained correctly unknown.
- **Otter AI:** Official [public API](https://help.otter.ai/hc/en-us/articles/36130822688279-Otter-ai-Public-API) documentation confirms enterprise-only Bearer-authenticated REST access. A current official [Otter MCP Server](https://help.otter.ai/hc/en-us/articles/35287607569687-Otter-MCP-Server) page, updated in July 2026, makes MCP an unnecessary unknown. GraphQL stayed correctly unknown.
- **Mermaid CLI:** The official [`mermaid-cli` README](https://github.com/mermaid-js/mermaid-cli/blob/master/README.md) documents a local CLI and Node API that need no service authentication. Auth and the lack of a material blocker were correct. Access, REST, GraphQL, and MCP are correctly unknown under the current SaaS-oriented schema rather than negative claims. The local CLI/Node API is sufficient for toolkit construction, so buildability was unnecessarily unknown.

## Ten-action budget investigation

| Budget observation | Result |
| --- | ---: |
| Sampled apps with action telemetry | 11 / 14 |
| Recorded runs exhausting 10 actions | 10 / 11 |
| Unnecessary unknowns with telemetry | 20 |
| From budget-exhausted runs | 19 / 20 (95%) |
| From the one non-exhausted run | 1 / 20 |
| Unnecessary unknowns without telemetry | 3 |

The three apps without telemetry were valid results created before Phase 2 action tracking and skipped by the resumable runner. Budget exhaustion strongly co-occurs with coverage misses, but it is not sufficient by itself to prove causation: nearly every sampled recorded run exhausted the budget.

| Unnecessary unknown | Official evidence discoverability | Did the agent target it? | Budget/source diagnosis |
| --- | --- | --- | --- |
| Salesforce buildability | Easy | Derived field; not searched directly | Pre-telemetry result; prerequisites were already present, so this is a derivation/sanitization-era miss rather than demonstrated budget starvation. |
| HubSpot access, buildability | Easy | Access targeted; buildability derived | 10/10. Official onboarding answers access directly; discovery/synthesis miss, then missing access prevented the derived field. |
| Zendesk REST | Easy | API targeted | 10/10. The official platform page is direct; source discovery/synthesis miss, not legitimate ambiguity. |
| Shopify access, MCP, buildability | Easy | Access and MCP targeted; buildability derived | 10/10. The run fetched the official Storefront MCP page but did not map it to `mcp`; development-store discovery was incomplete, then buildability remained unknown. |
| Firecrawl access, buildability | Easy | Access targeted; buildability derived | 10/10. Free-plan evidence was easy to locate; source discovery miss propagated to buildability. |
| GitHub buildability | Easy | Derived field | Pre-telemetry result; all prerequisites were present, indicating an older derivation/sanitization miss. |
| Linear access, buildability | Easy | Access targeted; buildability derived | 10/10. Developer/agent pages provide a development path; source discovery miss propagated to buildability. |
| ClickUp access, buildability | Easy | Access targeted; buildability derived | 10/10. Official plan documentation says the public API is on every plan; source discovery miss propagated to buildability. |
| Stripe access, buildability | Easy | Telemetry unavailable | Pre-telemetry result. Official test-mode/sandbox material is direct; source discovery miss is more likely than ambiguity. |
| PitchBook access, buildability | Easy once API page found | Access targeted; buildability derived | 10/10. The fetched API page and blocker already establish contract-gated access; synthesis/mapping miss propagated to buildability. |
| NotebookLM access, buildability, blocker | Moderate; enterprise docs are clear but product naming is fragmented | Access targeted; buildability derived | 10/10. Source-scope/freshness failure favored unofficial consumer reverse engineering over current enterprise documentation. |
| Otter MCP | Easy in current docs; page is recent | MCP targeted | 10/10. Freshness/source-discovery miss; the official page postdates some older result context. |
| Mermaid CLI buildability | Easy | Derived field | 9/10, not exhausted. The SaaS-oriented prerequisite model does not express a local CLI/Node API cleanly; this is a schema/category-fit limitation, not budget starvation. |

The action ceiling appears to amplify discovery misses because the controller generally has only one search/fetch opportunity per field. It does not explain the Shopify mapping miss, PitchBook synthesis miss, older pre-telemetry derivation misses, or Mermaid's schema mismatch. No limit change was made in this phase.

## Findings

### Strongest behavior

- Positive auth, API, and MCP claims backed by direct official documentation were usually correct.
- The controlled evidence ledger and conservative sanitizer prevented guessed values from filling most genuine gaps.
- Gated products were not automatically marked self-serve, and unknown GraphQL fields were generally preferable to unsupported negative claims.
- Evidence URLs were retained and auditable. Every surviving sampled claim had a recorded fetched URL; the two unsupported classifications concern semantic sufficiency, not missing fetch provenance.

### Weakest behavior

- Access-model discovery was the largest repeated coverage gap. Seven sampled apps had readily available official access evidence but retained `unknown`.
- Buildability inherited missing prerequisite coverage and accounted for eleven unnecessary unknowns. Some were avoidable derivation misses even when prerequisites were already present.
- Recent or specialized MCP documentation was missed for Shopify and Otter. Shopify's official page was found but mapped to the wrong field.
- Semantic negatives remain risky. ClickUp's negative GraphQL claim was inferred from a third-party inventory, and Slack's HTTP method catalogue was incorrectly labeled REST despite the official semantic disclaimer.
- NotebookLM exposed a source freshness and product-scope problem: unofficial consumer reverse engineering overrode the current official Enterprise API surface.

### Semantic false positives

Four evidence-bearing fields failed precision review:

1. Slack `apiSurface.rest: true` — **incorrect**; Slack explicitly calls the Web API RPC-style and not REST.
2. NotebookLM `apiSurface.rest: false` — **incorrect**; the current official Enterprise Notebook API is REST.
3. ClickUp `apiSurface.graphql: false` — **unsupported**; a third-party page and missing official GraphQL docs do not prove nonexistence.
4. NotebookLM `authMethods` — **unsupported as returned**; valid enterprise methods were mixed with a cookie method sourced only from reverse-engineered tooling.

No sampled MCP positive was a mere keyword match or third-party client confusion. PitchBook's MCP evidence refers to its product-owned external gateway/Premium Connector, and the other positive MCP claims are supported by official product docs or official repositories.

## Recommendation

**Precision is strong, but coverage needs one targeted improvement before analysis.**

The dataset should not yet be treated as analysis-ready without qualification. A 93.55% field-level precision is good, but two direct contradictions and two unsupported surviving fields show that semantic negative/API-type validation needs attention. Coverage is the larger issue: 23 of 36 sampled unknown-valued fields were avoidable, with access model and derived buildability responsible for most misses. The 10-action budget is correlated with those misses, but the audit does not justify increasing it in isolation; source prioritization, synthesis, and deterministic derivation/mapping account for several failures.

Phase 4 was not started, and no research-agent code, evidence rule, action limit, or generated dataset result was changed during this verification.

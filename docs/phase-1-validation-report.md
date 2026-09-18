# Phase 1 final validation

Validated on 2026-09-18 with the current ten-action pipeline and `gemini-3.5-flash-lite`. The sample contains six applications from the assessment list plus Gong as the requested carry-over regression target.

## Sample

| App | Reason selected |
| --- | --- |
| Salesforce | Broad OAuth APIs, gated enterprise controls, REST, GraphQL, and official MCP |
| Stripe | Self-serve API keys, OAuth, broad REST API, and official MCP |
| Gong | Admin-gated enterprise API and current official MCP |
| GitHub | Developer-focused platform with PAT, app, OAuth, REST, GraphQL, and official MCP |
| Twenty | Open-source/self-hostable CRM with API keys, OAuth, REST, GraphQL, and an emerging MCP server |
| Notion | Self-serve REST/OAuth product with official hosted MCP |
| Fanbasis (Commas) | Sparse and ambiguous product documentation with an API key REST surface |

## Field audit

The classifications compare the final pipeline output with current official documentation. `Correctly_unknown` means the checked official evidence did not justify a stronger value. `Unnecessary_unknown` means current evidence existed but the run did not discover or preserve it.

| App | Auth | Access | REST | GraphQL | MCP | Buildability | Blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Salesforce | correct | unnecessary_unknown | correct | unnecessary_unknown | correct | unnecessary_unknown | correct |
| Stripe | correct | unnecessary_unknown | correct | correctly_unknown | correct | unnecessary_unknown | correct |
| Gong | correct | unnecessary_unknown | correct | correctly_unknown | unnecessary_unknown | unnecessary_unknown | correct |
| GitHub | correct | unnecessary_unknown | correct | correct | correct | unnecessary_unknown | correct |
| Twenty | correct | correct | correct | correct | unnecessary_unknown | unnecessary_unknown | correct |
| Notion | correct | correct | correct | correctly_unknown | correct | unnecessary_unknown | correct |
| Fanbasis (Commas) | correct | correctly_unknown | correct | correctly_unknown | correctly_unknown | correctly_unknown | correct |

Totals across 49 checked fields:

- correct: 29
- incorrect: 0
- unsupported: 0
- unnecessary_unknown: 13
- correctly_unknown: 7

## Manual evidence

- Salesforce officially documents [OAuth 2.0 for REST](https://developer.salesforce.com/docs/platform/api-rest/guide/intro-oauth-and-connected-apps.html), the [GraphQL API](https://developer.salesforce.com/docs/platform/graphql/guide/authorization.html), [Hosted MCP Servers](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html), and a [free Developer Edition](https://www.salesforce.com/products/free-trial/developer/).
- Stripe documents its [REST API](https://docs.stripe.com/api), [self-serve sandbox and API keys](https://docs.stripe.com/keys), and [official MCP server](https://docs.stripe.com/mcp). No current official source explicitly establishes that Stripe has no GraphQL API, so `unknown` is the conservative result.
- Gong documents [Basic and OAuth authentication plus technical-admin credential creation](https://help.gong.io/apidocs/introduction-2) and a current [official MCP server](https://help.gong.io/docs/about-gong-mcp-server). No current official GraphQL evidence was found.
- GitHub documents the [REST API](https://docs.github.com/en/rest), [GraphQL API](https://docs.github.com/en/graphql), [PAT, GitHub App, OAuth, and `GITHUB_TOKEN` authentication](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github), and the [official GitHub MCP server](https://github.com/github/github-mcp-server).
- Twenty documents [self-serve API keys, OAuth, REST, and GraphQL](https://docs.twenty.com/developers/extend/api). Current official repository issues demonstrate a shipped `/mcp` server, including [server protocol behavior](https://github.com/twentyhq/twenty/issues/18524), although compatibility defects remain.
- Notion documents [Bearer tokens, PATs, OAuth, free personal workspaces, and its REST API](https://developers.notion.com/reference/intro), plus the [official hosted Notion MCP service](https://developers.notion.com/guides/mcp/get-started-with-mcp). No current official GraphQL evidence was found.
- Fanbasis/Commas exposes an API-key REST surface through its [API reference](https://commasdocs.com/). The checked official material did not establish self-serve credential acquisition, GraphQL, or a product-owned MCP server. Zapier offers a Fanbasis route through Zapier MCP, but that does not establish a Fanbasis-operated MCP service.

## False positives and fixes

The unchanged baseline produced semantic false positives:

- Salesforce `enterprise_only` was mapped from a GraphQL authorization page that did not support that access value.
- Stripe and Notion `graphql: false` were supported by third-party pages that only reported an absence of documentation.
- Fanbasis `self_serve_free` and the dependent `buildable` result lacked evidence for credential acquisition.
- Generic MCP wording could validate availability even when a page described an MCP client connecting to external servers.

The final pipeline rejects these mappings. No incorrect or unsupported claim survived in the final seven-app results.

General fixes made during validation:

- honor the full provider-specified per-minute retry window;
- validate access-model, negative GraphQL, and MCP mappings against value-specific source language;
- retain and deduplicate relevant fetched sources omitted by synthesis;
- distinguish a product MCP service from an MCP client;
- retry malformed structured synthesis once, with a strict bound.

## Remaining failures and limitations

The remaining failures are primarily research/stopping failures rather than sanitization failures:

- The ten-action budget is frequently spent repeatedly searching for explicit negative GraphQL evidence, reducing coverage of access and buildability.
- Search freshness is inconsistent. Gong and Twenty had current official MCP evidence that some runs did not discover.
- Access-model research remains incomplete for well-documented self-serve products such as Salesforce, Stripe, and GitHub.
- Buildability is consequently unknown for six of seven apps even when the manually verified underlying evidence is sufficient for five of them.
- Live validation remains sensitive to Gemini daily quotas. Per-minute waits and malformed structured responses now recover boundedly; daily exhaustion still requires another project key.
- Fanbasis ownership and credential-acquisition documentation remain ambiguous, so conservative unknowns are appropriate.

## Recommendation

Do not freeze Phase 1 or start the 100-app run yet. The final results have strong precision—zero incorrect or unsupported surviving fields in this sample—but 13 of 49 checked fields (26.5%) are unnecessary unknowns. The remaining issue is systematic completeness in research prioritization and stopping, especially for access model, buildability, and fresh MCP documentation. Resolve that general behavior and repeat this validation set before freezing.

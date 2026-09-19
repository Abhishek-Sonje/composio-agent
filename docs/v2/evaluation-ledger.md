# V2 evaluation ledger

This ledger is evaluation-only. These expected outcomes must not be injected into prompts, evidence recovery, or deterministic claim generation.

| App | Field | Baseline | Manual expected | Official evidence | Baseline class | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Stripe | authMethods | API key, Bearer, OAuth | API key; OAuth where applicable | https://docs.stripe.com/api/authentication | correct | Dashboard exposes test and live API keys. |
| Stripe | accessModel | unknown | self_serve_free | https://docs.stripe.com/get-started/account/set-up | unnecessary_unknown | A normal account can obtain test credentials. |
| Stripe | apiSurface.rest | unknown | true | https://docs.stripe.com/api | unnecessary_unknown | Require explicit official REST semantics during rerun. |
| Stripe | apiSurface.graphql | unknown | unknown | — | correctly_unknown | No negative inference from missing docs. |
| Stripe | mcp | available | available | https://docs.stripe.com/mcp | correct | Product-owned MCP. |
| Stripe | buildability | unknown | buildable | Derived only after supported auth, access, and API | unnecessary_unknown | Must remain downstream of prerequisites. |
| Stripe | blocker | none | none | Same prerequisite evidence | correct | No material credential gate for development. |
| HubSpot | authMethods | OAuth, Bearer, private-app token | OAuth plus current supported account credentials | https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/overview | correct | Current credential types can evolve; only retain evidenced methods. |
| HubSpot | accessModel | unknown | self_serve_free | https://developers.hubspot.com/developer-platform-basics | unnecessary_unknown | Official docs explicitly provide free accounts and test accounts. |
| HubSpot | apiSurface.rest | true | true | https://developers.hubspot.com/developer-platform-basics | correct | Official docs call the public APIs RESTful. |
| HubSpot | apiSurface.graphql | true | true | https://developers.hubspot.com/docs/cms/start-building/features/data-driven-content/graphql/query-hubspot-data-using-graphql | correct | Scope is HubSpot's documented GraphQL surface. |
| HubSpot | mcp | available | available | https://developers.hubspot.com/ai-tools/mcp | correct | Product-owned MCP. |
| HubSpot | buildability | unknown | buildable | Derived only after supported auth, access, and API | unnecessary_unknown | Free test path satisfies prerequisites. |
| HubSpot | blocker | none | none | Same prerequisite evidence | correct | Product-specific scope restrictions may still apply. |
| Shopify | authMethods | OAuth, access token | OAuth and access token | https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens | correct | Official app credentials. |
| Shopify | accessModel | unknown | self_serve_free | https://shopify.dev/docs/storefronts/themes/tools/development-stores | unnecessary_unknown | Official free dev-store creation path. |
| Shopify | apiSurface.rest | true | true | https://shopify.dev/docs/api/admin-rest | correct | Legacy REST API remains evidence-supported and lifecycle-scoped. |
| Shopify | apiSurface.graphql | true | true | https://shopify.dev/docs/api/admin-graphql/latest | correct | Current primary Admin API. |
| Shopify | mcp | unknown | available | https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront | unnecessary_unknown | Product-owned Storefront MCP endpoint. |
| Shopify | buildability | unknown | buildable | Derived only after supported auth, access, and API | unnecessary_unknown | Dev store provides a workable development path. |
| Shopify | blocker | none | none | Same prerequisite evidence | correct | REST legacy status is a constraint, not a total blocker. |
| NotebookLM Enterprise | authMethods | unknown | supported Google Cloud OAuth/bearer flow | https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks | unnecessary_unknown | Consumer cookie tooling is excluded. |
| NotebookLM Enterprise | accessModel | enterprise_only | enterprise_only | https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/set-up-notebooklm | correct | License and IAM roles are required. |
| NotebookLM Enterprise | apiSurface.rest | unknown | true | https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks | unnecessary_unknown | Must remain scoped to Enterprise. |
| NotebookLM Enterprise | apiSurface.graphql | unknown | unknown | — | correctly_unknown | No explicit negative evidence. |
| NotebookLM Enterprise | mcp | unknown | unknown | — | correctly_unknown | No explicit official conclusion. |
| NotebookLM Enterprise | buildability | unknown | partially_buildable | Derived only after supported auth, enterprise access, and API | unnecessary_unknown | Gated is not blocked. |
| NotebookLM Enterprise | blocker | unknown | Enterprise license and IAM setup | https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/set-up-notebooklm | unnecessary_unknown | Preserve the actual gate. |
| LinkedIn Ads | authMethods | OAuth 2.0 | OAuth 2.0 | https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access | correct | Member/app authorization depends on API. |
| LinkedIn Ads | accessModel | unknown | partnership_required | https://learn.microsoft.com/en-us/linkedin/marketing/integrations/marketing-tiers | unnecessary_unknown | Advertising API requires application and discretionary approval. |
| LinkedIn Ads | apiSurface.rest | true | true | https://learn.microsoft.com/en-us/linkedin/marketing/quick-start | correct | Official Marketing REST APIs. |
| LinkedIn Ads | apiSurface.graphql | unknown | unknown | — | correctly_unknown | No negative inference. |
| LinkedIn Ads | mcp | unknown | unknown | — | correctly_unknown | No negative inference. |
| LinkedIn Ads | buildability | partially_buildable | partially_buildable | Derived from supported API/auth and gated access | correct | Approval-gated, not blocked. |
| LinkedIn Ads | blocker | approval and consent friction | approval/program requirements | https://learn.microsoft.com/en-us/linkedin/marketing/integrations/marketing-tiers | correct | Preserve the concrete approval requirement. |
| Slack | authMethods | OAuth 2.0 | OAuth 2.0 | https://docs.slack.dev/authentication/installing-with-oauth | correct | Official OAuth flow. |
| Slack | accessModel | self_serve_free | self_serve_free | https://docs.slack.dev/tools/developer-sandboxes | correct | Developer sandbox path. |
| Slack | apiSurface.rest | unknown | false | https://docs.slack.dev/apis/web-api | unnecessary_unknown | Official docs explicitly describe the Web API as RPC-style rather than REST. |
| Slack | apiSurface.graphql | unknown | unknown | — | correctly_unknown | No negative inference. |
| Slack | mcp | available | available | https://docs.slack.dev/ai/mcp-overview | correct | Product-owned MCP server. |
| Slack | buildability | buildable | buildable | Derived from supported prerequisites | correct | Regression guard. |
| Slack | blocker | none | none | Same prerequisite evidence | correct | No material development gate. |

## Per-fix columns

For every later experiment, append the new value, classification, changed status, newly used evidence, actions, extension state, and regression note. Preserve this baseline rather than rewriting it.



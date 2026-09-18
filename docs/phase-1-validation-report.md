# Phase 1 final validation

Validated on 2026-09-18 with the ten-action pipeline and `gemini-3.5-flash-lite`. The sample contains six applications from the assessment list plus Gong as the requested carry-over regression target.

## Sample

| App | Reason selected |
| --- | --- |
| Salesforce | OAuth, free Developer Edition, REST, GraphQL, and official hosted MCP |
| Stripe | Self-serve API keys, OAuth, broad REST API, and official MCP |
| Gong | Administrator-gated enterprise API and official MCP |
| GitHub | Developer-focused platform with free access, several auth modes, REST, GraphQL, and official MCP |
| Twenty | Open-source and self-hostable CRM with API keys, OAuth, REST, GraphQL, and emerging MCP support |
| Notion | Self-serve REST and OAuth product with official hosted MCP |
| Fanbasis (Commas) | Sparse, ambiguous documentation with an API-key REST surface |

## Before and after

The classifications cover authentication, access model, REST, GraphQL, MCP, buildability, and blocker for each app: 49 fields total.

| Classification | Before | After |
| --- | ---: | ---: |
| Correct | 29 | 37 |
| Incorrect | 0 | 0 |
| Unsupported | 0 | 0 |
| Unnecessary unknown | 13 | 5 |
| Correctly unknown | 7 | 7 |

Unnecessary unknowns fell from 13 to 5 (61.5%) without allowing an incorrect or unsupported claim to survive.

## Final field audit

`unnecessary_unknown` means current official evidence exists but this run did not preserve it. `correctly_unknown` means the checked evidence did not justify a stronger value.

| App | Auth | Access | REST | GraphQL | MCP | Buildability | Blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Salesforce | correct | correct | correct | correct | correct | correct | correct |
| Stripe | correct | unnecessary_unknown | correct | correctly_unknown | correct | unnecessary_unknown | correct |
| Gong | correct | correct | correct | correctly_unknown | correct | correct | correct |
| GitHub | correct | correct | correct | correct | correct | correct | correct |
| Twenty | correct | correct | correct | correct | unnecessary_unknown | correct | correct |
| Notion | correct | unnecessary_unknown | correct | correctly_unknown | correct | unnecessary_unknown | correct |
| Fanbasis (Commas) | correct | correctly_unknown | correct | correctly_unknown | correctly_unknown | correctly_unknown | correct |

## Research-control diagnosis

Earlier traces showed three general causes of budget starvation:

- coverage was evaluated only when the model tried to finish, so ordinary action selection had no current field priority;
- all missing fields were treated equally, allowing repeated negative GraphQL searches before access or MCP research;
- action purpose and cross-field page text could falsely mark another field as covered.

The final controller evaluates coverage after each action, selects the highest-priority unresolved field, and gives the model one precise research question. Coverage comes only from fetched content gathered for that focus. Each focus is limited to a search and one fetch, keeping the total at ten actions. GraphQL is last and cannot consume more than its two allocated actions. Buildability is not researched directly; it is derived only after supported authentication, credential access, and a usable API are present.

The final traces consistently followed this order:

1. authentication search and fetch;
2. credential/access search and fetch;
3. REST/API search and fetch;
4. product-owned MCP search and fetch;
5. GraphQL search and, when a candidate existed, one fetch.

## Evidence and false-positive review

Every surviving feasibility claim cites a fetched page. The checked pages refer to the intended product and contain field-specific support. Search snippets remain discovery-only.

The final audit found one semantic false positive during validation: a Zapier Fanbasis MCP route was initially treated as a Fanbasis-operated MCP server. MCP availability now requires both product-specific server language and a product-owned official source. The rerun correctly returns Fanbasis MCP to `unknown`. Product-owned Salesforce, Stripe, Gong, GitHub, and Notion MCP claims continue to survive. Twenty remains unknown in the final run because the fetched repository issue did not establish current product-owned availability strongly enough.

Third-party Stripe GraphQL wrappers and indirect Gong/Notion GraphQL pages did not establish product GraphQL availability or absence. Those fields remain unknown. No negative API claim was inferred from a failed search.

## Changes made

- prioritize unresolved fields in feasibility order;
- isolate field coverage to fetched content gathered for that focus;
- cap repeated field attempts and put GraphQL last;
- distinguish credential availability from token or endpoint documentation;
- derive `buildable` only from supported auth, access, and usable API prerequisites;
- require product-owned official sources for positive MCP availability.

The evidence ledger, fetched-source enforcement, controlled field identifiers, duplicate removal, confidence ceilings, provider retries, structured-output retry, and conservative unknown fallback remain active.

## Remaining limitations

- Stripe and Notion account or plan pages were not rendered with enough explicit text in these runs to support their otherwise documented self-serve access models. Their dependent buildability values therefore remain unknown.
- Twenty's current MCP implementation is documented in official repository activity, but this run did not obtain evidence strong enough for the positive MCP rule.
- Live output still varies with search ranking and provider synthesis. The deterministic controller bounds that variability and the sanitizer prevents unsupported values from surviving.
- Fanbasis credential acquisition, GraphQL, product-owned MCP, and buildability remain legitimately unresolved in the checked official material.

## Verification

- 61 tests pass across 9 test files.
- TypeScript type checking passes.
- Production build passes.
- The action budget remains capped at 10.

## Recommendation

Phase 1 is stable enough to freeze. The seven-app regression reduced unnecessary unknowns by 61.5%, preserved zero incorrect and zero unsupported surviving fields, and showed no new systemic regression after the MCP ownership fix. Do not change the research agent further or start the 100-app run until the next phase begins.

# Phase 4 deterministic analysis

Source: results/research-dataset.json (100 unique apps). Percentages are rounded to one decimal place. Unknown values are not counted as false.

## Overall metrics

| Metric | Count of all apps | Count among known values |
| --- | ---: | ---: |
| OAuth | 70/100 (70%) | 70/96 (72.9%) known values |
| Self-serve access | 22/100 (22%) | all apps |
| REST available | 87/100 (87%) | 87/87 (100%) known values |
| GraphQL available | 18/100 (18%) | 18/18 (100%) known values |
| MCP available | 51/100 (51%) | 51/57 (89.5%) known values |
| Buildable | 21/100 (21%) | 21/25 (84%) known values |

## Distributions

### Access model

| Value | Count |
| --- | ---: |
| unknown | 76 |
| self_serve_free | 18 |
| self_serve_trial | 4 |
| enterprise_only | 2 |

### REST

| Value | Count |
| --- | ---: |
| true | 87 |
| unknown | 13 |

### GraphQL

| Value | Count |
| --- | ---: |
| unknown | 82 |
| true | 18 |

### MCP

| Value | Count |
| --- | ---: |
| available | 51 |
| unknown | 43 |
| not_found | 6 |

### Buildability

| Value | Count |
| --- | ---: |
| unknown | 75 |
| buildable | 21 |
| partially_buildable | 3 |
| blocked | 1 |

### Confidence

| Value | Count |
| --- | ---: |
| medium | 100 |

### Normalized authentication families

Counts are multi-label. Known-auth denominator: 96/100.

| Method family | App count |
| --- | ---: |
| OAuth | 70 |
| Bearer/access token | 43 |
| API key/token | 39 |
| Personal access token | 13 |
| Basic auth | 12 |
| Service account/client credentials | 7 |
| Other | 2 |
| Bot token | 2 |

### Blocker categories

| Category | Count |
| --- | ---: |
| none_or_not_claimed | 95 |
| enterprise_access | 2 |
| approval_or_review | 1 |
| insufficient_documentation_or_auth_clarity | 1 |
| no_usable_public_api | 1 |

## Category breakdown

| Category | Apps | OAuth | Self-serve | MCP available | Buildable | Buildability unknown |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| AI, Research and Media-native | 10 | 5 | 2 | 6 | 2 | 8 |
| Communications and Messaging | 10 | 7 | 1 | 4 | 1 | 9 |
| CRM and Sales | 10 | 10 | 4 | 6 | 3 | 7 |
| Data, SEO and Scraping | 10 | 2 | 3 | 7 | 3 | 6 |
| Developer, Infra and Data platforms | 10 | 6 | 2 | 7 | 2 | 8 |
| Ecommerce | 10 | 8 | 0 | 1 | 0 | 9 |
| Finance and Fintech | 10 | 6 | 2 | 6 | 2 | 7 |
| Marketing, Ads, Email and Social | 10 | 8 | 3 | 1 | 3 | 6 |
| Productivity and Project Management | 10 | 10 | 2 | 6 | 2 | 8 |
| Support and Helpdesk | 10 | 8 | 3 | 7 | 3 | 7 |

Detailed category metrics are in results/analysis.json.

## Opportunity buckets

Buckets are deterministic labels, not rankings.

| Bucket | Count | Percent of all apps | Apps |
| --- | ---: | ---: | --- |
| easy_integration_candidates | 21 | 21% | Salesforce, Attio, Zoho CRM, Zendesk, Intercom, LiveAgent, Slack, Mailchimp, systeme.io, Threads (Meta), SE Ranking, MrScraper, Apify, GitHub, Supabase, Airtable, Harvest, Paygent Connect, iPayX, Consensus, Devin |
| needs_outreach_gated | 1 | 1% | NotebookLM Enterprise |
| needs_further_research | 73 | 73% | HubSpot, Pipedrive, Twenty, Podio, Close, Copper, DealCloud, Freshdesk, Front, Pylon, Plain, Help Scout, Gorgias, Gladly, Twilio, Zoho Cliq, Lark (Larksuite), Pumble, Discord, Telegram, WhatsApp Business, Aircall, Vonage, Google Ads, Meta Ads, GoHighLevel, Klaviyo, Pinterest, SendGrid, Shopify, WooCommerce, BigCommerce, Salesforce Commerce Cloud, Magento (Adobe Commerce), Squarespace, Gumroad, Amazon Selling Partner, Fanbasis, DataForSEO, Ahrefs, Firecrawl, Bright Data, Waterfall.io, Clay, Vercel, Netlify, Cloudflare, Neo4j, Snowflake, MongoDB Atlas, Datadog, Sentry, Notion, Linear, Jira, Asana, Monday.com, ClickUp, Coda, Smartsheet, Stripe, Plaid, Binance, QuickBooks, Xero, Brex, Ramp, Fathom, Reducto, Higgsfield, Mermaid CLI, YouTube Transcript, Grain |
| blocked | 5 | 5% | LinkedIn Ads, Ecwid, Sherlock, PitchBook, Otter AI |

## Unknowns and data-quality caveats

Actual unresolved feasibility fields:

| Field | Count |
| --- | ---: |
| apiSurface.graphql | 82 |
| accessModel | 76 |
| buildability | 75 |
| mcp | 43 |
| apiSurface.rest | 13 |
| authMethods | 4 |

Declared unknownFields counts are retained separately because some records declare category or description unknown while still containing text values. Null API values and enum unknown values are unresolved, not negative findings.

Reconciliation: 100 category rows = 100 apps; 100 assigned to a bucket and 0 left unassigned.

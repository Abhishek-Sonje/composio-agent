# Phase 5 handoff

## Complete

- The final case-study is implemented as a dependency-free static site in `site/`.
- The page presents the Phase 1–4 story, deterministic findings, opportunity buckets, research architecture, verification journey, rejected Phase 3B experiment, failure examples, uncertainty caveat, reproducibility commands, and methodology.
- The 100-app explorer supports name, category, opportunity-bucket, and MCP filters. Keyboard users can expand rows to inspect descriptions, blockers, unknown fields, evidence source types, URLs, and supported fields.
- `npm run case-study:build` refreshes the public data copies from the canonical Phase 4 outputs.
- `npm run case-study:dev` serves the page locally at http://127.0.0.1:4173.
- The page is static and contains no provider credentials or live research endpoint.

## Important files

- `site/index.html` — case-study structure and final narrative.
- `site/styles.css` — responsive editorial presentation.
- `site/app.js` — explorer filters and evidence detail rendering.
- `site/data/` — generated copies of the final dataset and deterministic analysis.
- `scripts/build-case-study.mjs` — data refresh command.
- `scripts/serve-case-study.mjs` — local static server.

## Deployment

Run `npm run case-study:build`, then deploy the `site/` directory to any static host. No environment variables are required by the page.

## Optional polish

The functional page is complete. Remaining work is limited to personal visual preference and deployment-provider configuration. If copy is changed, preserve stage labels and avoid treating unknown values as negatives.


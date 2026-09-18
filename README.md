# Composio Application Research Agent

An evidence-backed application integration research pipeline for an AI Product Ops Intern take-home assessment at Composio. Phase 1's research agent is frozen; Phase 2 runs it sequentially across the supplied 100-app assessment.

## Current scope

The current implementation:

- accepts one application name per run;
- asks Gemini for one targeted research action at a time;
- searches the web and fetches source pages through Composio;
- stops when evidence is sufficient or the configured action budget is exhausted;
- validates the final result at runtime;
- writes formatted JSON to `results/<application>.json`;
- parses and validates all 100 targets from the supplied assessment Markdown;
- resumes batch execution by skipping schema-valid per-app results; and
- maintains `results/run-manifest.json` and `results/research-dataset.json`.

It intentionally does not include a database, dashboard, multi-agent system, browser automation, or the final case study.

## Architecture

```text
application name
      |
      v
bounded research loop <---- Gemini action selection
      |
      +---- Composio web search / URL fetch
      |
      v
Gemini structured synthesis
      |
      v
Zod validation ----> results/<application>.json
```

The loop counts attempted external research actions rather than wall-clock time. Tool errors become observations so the model can choose a different source within the remaining budget. A result may contain explicit unknowns when evidence is insufficient.

## Technology decisions

- **Node.js 24 LTS** is the supported runtime for this project.
- **`@google/genai`** is Google's current GA JavaScript/TypeScript SDK.
- **`gemini-3.5-flash`** is the default model because it is stable, supports the required structured output, and was available during live verification when the project's model-specific 3.6 Flash quota was exhausted.
- **Composio sessions** expose only `COMPOSIO_SEARCH_WEB` and `COMPOSIO_SEARCH_FETCH_URL_CONTENT` from the no-auth `composio_search` toolkit. This gives Composio a useful, narrow responsibility rather than adding it ceremonially.
- **Zod** provides runtime validation for configuration, research actions, targets, and final results.

Gemini 2.5 Flash initially appeared suitable in the public pricing documentation, but a live API check reported that it is no longer available to new users. Gemini 3.6 Flash was then blocked by the test project's model-specific free-tier quota, while stable Gemini 3.5 Flash passed a live structured-output run. Research uses Composio Search rather than Gemini Search grounding, while Gemini handles planning and synthesis. The model remains configurable through `GEMINI_MODEL`.

Relevant current documentation:

- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [Google GenAI SDK](https://ai.google.dev/gemini-api/docs/libraries)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Composio TypeScript SDK](https://docs.composio.dev/reference/sdk-reference/typescript)
- [Composio sessions](https://docs.composio.dev/docs/configuring-sessions)
- [Composio Search toolkit](https://docs.composio.dev/toolkits/composio_search)

## Requirements

- Node.js 24
- A Gemini API auth key
- A Composio project API key with permission to create sessions and execute session tools

## Setup

```bash
npm install
copy .env.example .env
```

Fill in `.env`:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
COMPOSIO_API_KEY=
MAX_RESEARCH_STEPS=10
```

Gemini's current documentation requires auth keys for new API access. Never commit `.env` or provider credentials.

## Run one target

```bash
npm run research -- Salesforce
```

Names containing spaces are accepted:

```bash
npm run research -- Microsoft Teams
```

The command logs the current research step, recoverable tool failures, stopping condition, final confidence, and saved result path. It never logs API keys.

## Run or resume all assessment targets

Keep the supplied assessment Markdown at the repository root under its original filename, then run:

```bash
npm run research:all
```

The batch validates that the assessment contains exactly 100 uniquely named, consecutively numbered targets before initializing provider clients. It runs sequentially and checks `results/<target>.json` before each research call. A schema-valid existing result is preserved and skipped, so the same command resumes an interrupted run.

Generated files:

- `results/<target>.json`: one complete validated result per application;
- `results/run-manifest.json`: completed, failed, pending, unknown-heavy, confidence, action, and budget status;
- `results/research-dataset.json`: combined schema-valid records generated from individual results.

Daily or free-tier quota exhaustion is recorded and stops the batch cleanly. Update `GEMINI_API_KEY` and rerun `npm run research:all` to continue. Isolated app, tool, network, or schema failures are recorded while later apps continue when safe.

To intentionally rerun one failed app, remove only that app's invalid or unwanted result file if one exists, then use:

```bash
npm run research -- "Application Name"
```

The assessment source and generated result JSON files remain untracked.

## Validation

```bash
npm test
npm run typecheck
npm run build
```

Tests cover environment errors, target and result validation, prompt construction, Composio tool routing, bounded stopping, recoverable tool failures, malformed model output, JSON persistence, assessment parsing, resume behavior, failure isolation, quota stopping, and combined-dataset validation. They do not attempt to unit-test LLM judgment.

## Current limitations

- Live research requires both provider keys, consumes Gemini request quota, and may consume Composio premium-tool allowance.
- Free-tier provider quotas may require several resumptions to finish all 100 targets.
- Existing valid results are intentionally not overwritten by the batch.
- The one-app CLI accepts a name only. Website, hint, and expected-category context are supplied automatically by the assessment batch.

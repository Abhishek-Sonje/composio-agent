# Composio Application Research Agent

Phase 1 of a take-home assessment for an AI Product Ops Intern role at Composio. The project researches one application at a time and returns evidence-backed, machine-readable integration findings.

## Current scope

The current implementation:

- accepts one application name per run;
- asks Gemini for one targeted research action at a time;
- searches the web and fetches source pages through Composio;
- stops when evidence is sufficient or the configured action budget is exhausted;
- validates the final result at runtime; and
- writes formatted JSON to `results/<application>.json`.

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
- **`gemini-3.6-flash`** is the default model because the Gemini API currently directs new users away from the retired 2.5 Flash model to this stable replacement.
- **Composio sessions** expose only `COMPOSIO_SEARCH_WEB` and `COMPOSIO_SEARCH_FETCH_URL_CONTENT` from the no-auth `composio_search` toolkit. This gives Composio a useful, narrow responsibility rather than adding it ceremonially.
- **Zod** provides runtime validation for configuration, research actions, targets, and final results.

Gemini 2.5 Flash initially appeared suitable in the public pricing documentation, but a live API check reported that it is no longer available to new users and directed them to Gemini 3.6 Flash. Research uses Composio Search rather than Gemini Search grounding, while Gemini handles planning and synthesis. The model remains configurable through `GEMINI_MODEL`.

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
GEMINI_MODEL=gemini-3.6-flash
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

## Validation

```bash
npm run check
npm test
npm run build
```

Tests cover environment errors, target and result validation, prompt construction, Composio tool routing, bounded stopping, recoverable tool failures, malformed model output, and JSON persistence. They do not attempt to unit-test LLM judgment.

## Current limitations

- Live research requires both provider keys and may consume Composio premium-tool allowance.
- Phase 1 has not yet been evaluated against the planned set of 3-5 diverse applications.
- A malformed or schema-invalid final model response fails clearly; bounded repair is not yet implemented.
- Search result and fetched-page payload sizes are not yet compacted. Real runs will show whether this needs improvement.
- The CLI currently accepts a name only. Website and expected-category context are supported by the internal target schema but are not exposed as flags yet.

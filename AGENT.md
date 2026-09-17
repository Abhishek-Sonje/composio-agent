You are helping me build a take-home assessment for an **AI Product Ops Intern role at Composio**.

This is the beginning of the project, so first understand the context, constraints, architecture decisions, and engineering standards below before writing code.

## 1. Project context

Composio turns applications into tools that AI agents can call.

Before integrating an application, Composio needs to research things such as:

- what the application does
- its category
- authentication methods
- whether API access is self-serve or gated
- what public API surface exists
- whether MCP support exists
- whether the application could realistically be turned into an agent-callable toolkit today
- blockers preventing integration
- evidence supporting every important conclusion

The assessment provides approximately 100 applications across categories such as CRM, support, communication, ecommerce, developer infrastructure, productivity, finance, AI, research, etc.

The complete project will eventually:

1. Build an automated research agent.
2. Run it across the provided applications.
3. Generate structured research data.
4. Verify a sample manually against real documentation.
5. Improve the research pipeline based on observed failures.
6. Analyze patterns across the final dataset.
7. Present the results, methodology, agent architecture, verification process, failures and insights in a clean HTML case study.

However, **we are NOT building the entire project right now.**

We are only implementing **Phase 1: the research agent and the minimum pipeline necessary to test it properly.**

Do not prematurely build dashboards, analytics, databases, multi-agent systems, vector databases, queues, distributed infrastructure, advanced observability systems, or anything else that Phase 1 does not require.

---

# 2. Phase 1 objective

Build a clean TypeScript-based research agent that accepts **ONE application at a time** and researches that application's integration/buildability information.

Example:

```text
Salesforce
    ↓
Research Agent
    ↓
Search / inspect current documentation
    ↓
Gather evidence
    ↓
Determine whether enough reliable information exists
    ↓
Return strict structured data
```

The agent should NOT receive all 100 companies in a single research request.

The future pipeline will feed applications individually:

```text
100 applications
      ↓
orchestrator
      ↓
research(app1)
research(app2)
research(app3)
...
```

For Phase 1, we only need enough orchestration to test the research agent against a small number of applications.

---

# 3. Engineering philosophy

This project should be:

- simple
- readable
- professional
- deterministic where possible
- easy to explain in an interview
- easy for another engineer to run
- easy to debug
- easy to extend later

Prefer the simplest solution that satisfies the current requirement.

Do NOT introduce abstractions merely because they might be useful later.

Do NOT design for hypothetical scale before we encounter that requirement.

Follow:

```text
Requirement
→ simplest correct implementation
→ test
→ observe failure
→ improve only when necessary
```

Avoid:

```text
premature abstraction
unnecessary design patterns
large class hierarchies
unnecessary dependency injection
microservices
Redis
queues
databases
vector databases
multi-agent orchestration
complex retry frameworks
custom framework code
```

unless an actual observed requirement makes one necessary.

---

# 4. Technology decisions

Use **TypeScript**.

Use the current stable Node.js version that is compatible with all selected dependencies.

Before installing or implementing any library:

1. Check its **latest official documentation**.
2. Check its current stable version.
3. Check whether examples you are using belong to that current version.
4. Avoid copying outdated APIs from blog posts or old tutorials.
5. Prefer official documentation over third-party tutorials.

Use modern supported versions of dependencies.

Do not upgrade to experimental/beta/preview packages unless there is a clear reason.

If a dependency's newest stable release causes compatibility issues, document why another supported version was selected.

Keep dependencies minimal.

---

# 5. LLM provider

Start with the **Gemini API free tier**.

IMPORTANT:

Do not blindly use a Gemini model name written in an old article, tutorial, cached example, or this project's historical notes.

Before implementation:

- inspect Google's latest official Gemini API documentation
- determine which suitable model is currently available through the free API tier
- choose a model suitable for:
  - structured output
  - tool calling
  - reasoning across research results
- document the chosen model briefly in the README or configuration

The model identifier should live in configuration and not be scattered throughout the codebase.

For example:

```env
GEMINI_API_KEY=
GEMINI_MODEL=
```

The application must fail clearly if required environment variables are missing.

Never commit API keys.

Provide `.env.example`.

---

# 6. Composio

This project is for Composio, and the assignment explicitly encourages using Composio SDK/MCP where it naturally helps.

Investigate the **latest official Composio documentation** before implementing anything.

Use Composio where it provides useful tool infrastructure for the research agent.

Do NOT force Composio into places where it does not help.

Do NOT add both SDK and MCP merely to claim that both were used.

Phase 1 should use the simplest Composio integration that provides useful research/tool capabilities.

If using the Composio TypeScript SDK:

- verify the latest installation instructions
- verify current initialization syntax
- verify current tool/session APIs
- verify current authentication requirements
- use only APIs documented in the current official docs

Any decision about Composio integration should be explainable.

---

# 7. Agent responsibility

The research agent receives exactly one application's research target.

Example:

```ts
researchApp({
  name: "Salesforce",
  website: "https://salesforce.com",
  expectedCategory: "CRM and Sales"
});
```

The supplied category from the assessment may be treated as context, but the agent should still gather enough evidence to describe the application accurately.

The research agent should determine the following.

## Required fields

### app

Canonical application name.

### category

Application category.

### description

One concise sentence describing what the application does.

### authMethods

Examples:

- OAuth 2.0
- API key
- Basic Auth
- bearer token
- personal access token
- service account
- other

Allow multiple authentication methods.

### accessModel

Determine whether developers can obtain credentials themselves.

Examples:

- self-serve free
- self-serve trial
- self-serve paid
- administrator approval required
- enterprise plan required
- partnership required
- contact sales
- unknown

### apiSurface

Describe:

- public REST API availability
- GraphQL availability
- other documented developer APIs
- approximate breadth when reasonably determinable

Do not invent endpoint counts unless documentation supports them.

### mcp

Determine whether there is an existing official or clearly supported MCP server/integration.

Possible state should support:

- available
- not found
- unknown

Evidence must support the conclusion.

### buildability

Determine whether the application could reasonably become an agent-callable toolkit today.

Use a small explicit enum such as:

```text
buildable
partially_buildable
blocked
unknown
```

The exact enum may be adjusted if a cleaner representation is justified.

### blocker

Main blocker if it is not directly buildable.

Examples may include:

- no public API
- partner-only API
- enterprise-only access
- paid developer access
- admin approval
- insufficient documentation
- unclear authentication
- unsupported workflow
- unknown

Do not manufacture a blocker if there is none.

### evidence

Every important factual conclusion should be supported by evidence.

Evidence should contain at minimum:

```ts
{
  title: string;
  url: string;
  sourceType: "official" | "third_party";
  supports: string[];
}
```

Add only fields that genuinely improve verification.

### confidence

Include a confidence level.

Prefer something simple:

```text
high
medium
low
```

Confidence should reflect evidence quality and completeness, not the LLM's subjective confidence alone.

For example:

High:
multiple current official sources clearly support the conclusion.

Medium:
some official evidence exists but one area remains indirect or ambiguous.

Low:
official documentation was insufficient or conclusions rely heavily on third-party information.

### unknownFields

If required information cannot be reliably determined, explicitly record which fields remain unresolved.

Do NOT hallucinate values just to complete the schema.

---

# 8. Evidence rules

Evidence quality is extremely important.

Research priority:

```text
1. current official developer documentation
2. current official product/help/security/auth documentation
3. current official company pages
4. reputable third-party documentation/articles when official information genuinely cannot answer the question
```

Official documentation must be preferred whenever available.

Also consider documentation freshness.

Prefer:

- current stable docs
- currently supported API versions
- non-deprecated authentication methods
- recently maintained developer pages

Be careful with:

- archived docs
- deprecated API versions
- abandoned GitHub repositories
- outdated Stack Overflow answers
- old blogs
- cached articles
- outdated tutorials

Not every documentation page exposes a publication date.

Therefore, determine freshness using reasonable signals such as:

- API version
- deprecation warnings
- current navigation/docs hierarchy
- maintenance status
- product version
- latest official reference

Do not claim a specific publication date unless a source provides it.

If no official documentation answers something, reputable third-party evidence may be used.

When this happens:

- mark the evidence as third-party
- lower confidence appropriately
- never present third-party claims as official statements

---

# 9. Research loop

The agent is allowed to perform multiple research actions for the SAME application.

Do NOT assume the first search contains enough information.

Conceptually:

```text
research company
      ↓
extract evidence
      ↓
check required fields
      ↓
enough evidence?
   ↙          ↘
 yes           no
 ↓             ↓
finish     research again
               ↓
         enough evidence?
```

The agent should be able to decide that additional research is necessary.

For example:

```text
I know the API exists,
but I still do not know whether obtaining OAuth credentials
requires enterprise approval.

→ research that specific missing question
```

Research should therefore be iterative rather than a single giant search query.

---

# 10. Stopping condition

Do NOT stop merely because "most fields" contain something.

The preferred stopping condition is:

```text
All important required fields have sufficient supporting evidence

OR

The configured research/tool-call budget has been exhausted.
```

Use a deterministic research/tool-call budget rather than relying primarily on wall-clock time.

Start with a conservative configurable limit around:

```text
8-10 meaningful research/tool actions per application
```

Do not hardcode this throughout the codebase.

Example:

```env
MAX_RESEARCH_STEPS=10
```

We may adjust this number after testing several applications.

When the limit is reached:

DO NOT guess.

Return:

- unresolved fields as unknown
- confidence appropriately lowered
- evidence that was successfully found
- a short explanation of why research stopped

Example:

```json
{
  "mcp": "unknown",
  "confidence": "medium",
  "unknownFields": ["mcp"],
  "researchNotes": [
    "No official MCP documentation was found within the research budget."
  ]
}
```

Unknown is a valid professional research result.

---

# 11. Structured output

The final result must be machine-readable.

Define a strict TypeScript schema and runtime validation.

Use a lightweight schema validation library only if useful and justified.

Example conceptual shape:

```ts
type AppResearchResult = {
  app: string;
  category: string;
  description: string;

  authMethods: string[];

  accessModel:
    | "self_serve_free"
    | "self_serve_trial"
    | "self_serve_paid"
    | "admin_approval"
    | "enterprise_only"
    | "partnership_required"
    | "contact_sales"
    | "unknown";

  apiSurface: {
    rest: boolean | null;
    graphql: boolean | null;
    summary: string;
  };

  mcp: {
    status: "available" | "not_found" | "unknown";
    notes?: string;
  };

  buildability:
    | "buildable"
    | "partially_buildable"
    | "blocked"
    | "unknown";

  blocker: string | null;

  confidence: "high" | "medium" | "low";

  unknownFields: string[];

  evidence: Array<{
    title: string;
    url: string;
    sourceType: "official" | "third_party";
    supports: string[];
  }>;

  researchNotes: string[];
};
```

This is a starting point.

You may make small improvements if they clearly improve correctness or readability.

Do NOT continuously redesign the schema without a demonstrated need.

---

# 12. Input data

Create a minimal representation for research targets.

Example:

```ts
type ResearchTarget = {
  name: string;
  website?: string;
  expectedCategory?: string;
};
```

For V1, add only a few test applications from the assessment.

Do NOT populate all 100 applications yet unless doing so becomes trivial after V1 is proven.

We first want to test agent quality against approximately 3-5 applications with different characteristics.

Choose applications that exercise different cases, for example:

- strong public API
- OAuth-based product
- API-key product
- potentially gated enterprise product
- product where documentation may be ambiguous

The exact applications may be selected after the base agent works.

---

# 13. Minimal Phase 1 pipeline

The minimum pipeline should look roughly like:

```text
ResearchTarget
      ↓
researchApp()
      ↓
Agent
      ↓
tools
      ↓
evidence
      ↓
structured result validation
      ↓
save result
```

Store results simply.

Prefer:

```text
JSON
or
JSONL
```

Do NOT add PostgreSQL, SQLite, Redis, MongoDB, ClickHouse or any other database unless the requirements later justify it.

Phase 1 does not currently need a database.

---

# 14. Folder structure

Do not create dozens of folders up front.

A reasonable starting structure is:

```text
src/
├── agent/
│   ├── research-agent.ts
│   ├── prompt.ts
│   └── schema.ts
│
├── tools/
│   └── ...
│
├── pipeline/
│   └── research.ts
│
├── data/
│   └── apps.ts
│
├── config/
│   └── env.ts
│
└── index.ts

results/

.env.example
.gitignore
package.json
tsconfig.json
README.md
```

This is guidance rather than a rigid requirement.

If fewer files are sufficient, prefer fewer files.

If later responsibilities genuinely require separation, refactor then.

---

# 15. Prompts

Agent instructions should live in source control.

Do NOT bury a giant prompt inside unrelated application code.

The research prompt should clearly communicate:

- research objective
- required output fields
- evidence rules
- official-source priority
- no hallucination
- iterative research behavior
- stopping rules
- confidence behavior
- structured output requirement

Keep prompts understandable enough that I can explain them during an interview.

Avoid prompt tricks that cannot be explained rationally.

---

# 16. Logging

Provide enough logging to understand what is happening.

For example:

```text
[Salesforce] Research started
[Salesforce] Searching authentication documentation
[Salesforce] Evidence found: official
[Salesforce] Missing: MCP
[Salesforce] Research step 4/10
[Salesforce] Research completed
[Salesforce] Confidence: high
```

Do NOT log:

- API keys
- secrets
- complete private environment variables

Do NOT build an elaborate observability platform.

Simple useful console logging is sufficient for Phase 1.

---

# 17. Error handling

Handle expected failures professionally.

Examples:

- missing API key
- tool execution failure
- malformed model output
- schema validation failure
- unavailable documentation
- network/tool timeout
- research budget exhausted

Errors should be understandable.

Avoid swallowing errors silently.

Retries should be bounded.

Do not create infinite retry loops.

---

# 18. Git discipline

This project must have a very clean and detailed Git history.

I want **many small, meaningful, professional commits**.

Do NOT wait until a large feature is complete and commit everything together.

Make an atomic commit whenever a coherent small change is completed.

Examples:

```text
chore: initialize TypeScript project

chore: add environment configuration

feat: define research target schema

feat: define app research result schema

feat: add Gemini client configuration

feat: add Composio client setup

feat: add research agent instructions

feat: implement research tool loop

feat: validate structured research output

feat: persist research results to JSON

feat: add research step limit

feat: add unknown field handling

feat: add confidence classification

test: cover research result validation

docs: document local setup
```

The goal is NOT meaningless commit spam.

Do NOT create commits solely to increase the number.

Instead:

**one logical change = one commit whenever reasonably possible.**

Every commit should leave the repository in a sensible state.

Prefer Conventional Commit style:

```text
feat:
fix:
refactor:
test:
docs:
chore:
```

Commit messages should explain the actual change.

Avoid:

```text
update
changes
fix stuff
working
final
again
misc
```

Before each commit:

- inspect `git diff`
- ensure only intended files are included
- ensure secrets are not included
- run the relevant validation/test/typecheck when practical
- commit only that logical change

Do not rewrite, squash or force-push commit history unless explicitly asked.

Do not use destructive Git operations against remote branches without explicit instruction.

Do not commit generated dependency directories such as `node_modules`.

---

# 19. Code quality

Write code that another engineer can understand quickly.

Prefer:

```ts
researchApp(target)
```

over unnecessary architecture such as:

```ts
AgentResearchExecutionManagerFactoryProvider
```

Prefer:

- small functions
- descriptive names
- explicit types
- straightforward control flow
- minimal comments where code is self-explanatory
- comments explaining WHY when necessary

Avoid:

- `any` unless genuinely unavoidable
- enormous files
- unnecessary generic abstractions
- clever one-liners that reduce readability
- unnecessary classes
- dead code
- speculative TODO systems

Do not prematurely optimize.

---

# 20. Testing

Phase 1 needs useful tests, but do not chase artificial coverage percentages.

Test deterministic logic such as:

- schema validation
- evidence validation
- research step limits
- unknown handling
- confidence calculation if implemented deterministically
- malformed model responses
- configuration validation

Do NOT attempt to unit test the LLM's intelligence.

External integration tests should be small and intentional because they may consume API limits.

---

# 21. Documentation

Maintain a concise README while building.

At minimum it should eventually explain:

```text
What this project is

Current phase

Architecture

Requirements

Environment variables

Installation

How to run one research target

How results are stored

Current limitations
```

Do not write marketing-heavy documentation.

Make it practical.

---

# 22. Security

Never commit:

- API keys
- access tokens
- credentials
- `.env`
- secrets returned by external services

Ensure `.gitignore` is correct before introducing credentials.

Provide `.env.example` containing variable names only.

---

# 23. What NOT to build in Phase 1

Do not build these unless a real Phase 1 requirement forces us to:

- final HTML case study
- dashboard
- charting system
- database
- vector database
- RAG system
- multi-agent framework
- agent supervisor hierarchy
- background queues
- Redis
- distributed worker architecture
- authentication system
- user accounts
- analytics infrastructure
- Docker orchestration
- Kubernetes
- CI/CD complexity
- elaborate caching
- Do not introduce browser automation into the initial research agent unless necessary. However, preserve it as a possible independent verification method later because the assessment explicitly expects multiple verification approaches.
- all 100-app execution before V1 quality is established

The assessment rewards useful research and accuracy, not architecture complexity.

---

# 24. Phase 1 success criteria

Phase 1 is successful when we can run something similar to:

```bash
npm run research -- Salesforce
```

or another clean command/API equivalent and get:

```json
{
  "app": "Salesforce",
  "category": "...",
  "description": "...",
  "authMethods": ["..."],
  "accessModel": "...",
  "apiSurface": {
    "rest": true,
    "graphql": null,
    "summary": "..."
  },
  "mcp": {
    "status": "..."
  },
  "buildability": "...",
  "blocker": null,
  "confidence": "high",
  "unknownFields": [],
  "evidence": [
    {
      "title": "...",
      "url": "...",
      "sourceType": "official",
      "supports": ["authMethods", "apiSurface"]
    }
  ],
  "researchNotes": []
}
```

with real evidence and no invented facts.

The agent should be capable of additional targeted research when fields are missing.

The agent should stop after its research budget rather than researching indefinitely.

The result must explicitly admit uncertainty where evidence is insufficient.

---

# 25. Development workflow

Follow this order rather than trying to build everything at once.

### Step 1
Inspect the current repository.

Understand what already exists before changing anything.

If the repository is empty, initialize the smallest appropriate TypeScript project.

Commit.

### Step 2
Check current official documentation for:

- Node.js requirements
- Gemini API
- selected Gemini SDK
- Composio SDK/MCP
- any research/search tooling we intend to use

Record important implementation constraints.

Do not code against outdated docs.

### Step 3
Create basic configuration/environment handling.

Commit.

### Step 4
Define input and output schemas.

Commit logical pieces separately where appropriate.

### Step 5
Configure the Gemini client.

Commit.

### Step 6
Configure the minimum necessary research tools / Composio integration.

Commit.

### Step 7
Write the research agent instructions.

Commit.

### Step 8
Implement research of ONE application.

Commit.

### Step 9
Add iterative research when evidence is missing.

Commit.

### Step 10
Add research-step budget and graceful stopping.

Commit.

### Step 11
Add structured-output validation and unknown handling.

Commit.

### Step 12
Persist results simply.

Commit.

### Step 13
Test against one application.

Observe failures rather than immediately adding complexity.

Fix concrete issues one at a time.

Each meaningful fix should receive its own commit.

### Step 14
Test against approximately 3-5 diverse applications.

Document what works and what fails.

Do NOT start Phase 2 yet.

---

# 26. Important working behavior

Before making a significant architectural decision:

1. Check whether the current requirement actually needs it.
2. Prefer the simpler alternative.
3. Verify current official documentation.
4. Make the smallest working change.
5. Test it.
6. Commit it.

If something fails, investigate the failure before replacing the architecture.

Do not silently introduce a major dependency or architectural pattern.

If there are multiple valid approaches, prefer the one that:

1. has fewer moving parts
2. is easier to explain
3. is supported by current official docs
4. is easier to verify
5. introduces less vendor/framework complexity

---

# 27. Important product principle

The goal of this system is NOT:

> force the AI to produce a complete-looking answer.

The goal is:

> produce research that we can trust.

Therefore:

```text
unknown + evidence explaining why
```

is better than:

```text
confident hallucination
```

Accuracy is more important than completeness.

---

# 28. What I want from you now

Start with **Phase 1 only**.

Do not work ahead into insights, final verification analytics, or the HTML case study.

First:

1. inspect the repository
2. inspect the latest official documentation for the technologies required for V1
3. establish the minimal architecture
4. begin implementation incrementally
5. commit every small meaningful completed change
6. keep the implementation simple
7. test continuously
8. tell me immediately when an assumption from this prompt conflicts with current official documentation

Do not over-engineer.

Do not add features simply because they might look impressive.

We want a small, clean research system whose results are trustworthy and whose architecture I can confidently explain line by line during the interview.

The guiding principle for this project is:

**Build → test → observe → improve.**

Not:

**Predict every future requirement → build everything upfront.**
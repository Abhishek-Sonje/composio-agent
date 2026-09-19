# V2 Research Quality Improvement Plan

## Goal

Improve the research pipeline **without blindly increasing model freedom or rerunning all 100 apps after every change**.

The current system is valuable because it is conservative: unsupported claims are removed and unresolved fields become `unknown`. The V2 goal is to reduce avoidable unknowns and improve classification quality **without sacrificing precision**.

This work should be done as a controlled sequence of experiments.

The four fixes in scope are:

1. **Credential access + buildability understanding**
2. **Adaptive research budget**
3. **Product/version evidence scoping**
4. **Source precedence + conflict handling**

Do not add a fifth fix during this cycle unless the validation data shows a new critical failure.

---

# Core Principle

Use this workflow for every fix:

```text
one hypothesis
    ↓
one isolated change
    ↓
same benchmark
    ↓
manual verification
    ↓
keep or revert
    ↓
next fix
```

Do **not** implement all four fixes at once.

If multiple changes are made together, we will not know which one improved or damaged the results.

---

# Phase 0: Freeze the Submitted Version

Before changing research behavior, preserve the exact submitted state.

Recommended:

```bash
git tag -a submission-v1 -m "Assessment submission"
git push origin submission-v1

git switch -c v2/research-quality
```

Do all V2 work on the V2 branch until the combined validation passes.

Do not rewrite or force-push the submitted history.

---

# Phase 0.1: Create a Permanent 6-App Regression Benchmark

Use the **same six apps for Fix 1, Fix 2, Fix 3, and Fix 4**.

The benchmark should contain a mix of known failure types and already-correct cases.

Recommended benchmark:

| App | Why it is in the benchmark |
| --- | --- |
| Stripe | Strong API/auth evidence, but access/buildability was previously unresolved |
| HubSpot | Useful case for self-serve developer credential access |
| Shopify | Access + MCP evidence + source classification case |
| NotebookLM Enterprise | Enterprise access, product-scope/version ambiguity, conflicting source risk |
| LinkedIn Ads | Approval/gated access case |
| Slack | Regression guard for API semantics and an already-understood integration |

If the current dataset shows a clearly better replacement for one of these, document the reason before changing the benchmark.

Once chosen, **do not change these six apps between fixes**.

The point is to compare:

```text
Baseline
vs
Fix 1
vs
Fix 1 + Fix 2
vs
Fix 1 + Fix 2 + Fix 3
vs
All four fixes
```

Changing the apps would make those comparisons much weaker.

---

# Phase 0.2: Save the Baseline

Before implementing any fix, rerun or load the current outputs for the six benchmark apps and save a baseline snapshot.

Record at least:

- auth methods
- access model
- REST/API result
- GraphQL result
- MCP result
- buildability
- blocker
- unknown fields
- evidence URLs
- evidence source types
- action count
- whether the action budget was exhausted
- confidence

Create something like:

```text
docs/v2/
  baseline.md
  benchmark-results/
```

or another structure consistent with the repository.

Do not overwrite the original Phase 1-4 reports.

---

# Phase 0.3: Create a Small Evaluation Ledger

For each benchmark app, manually verify the important claims.

Do not inject these answers into the research agent. They are for evaluation only.

Suggested fields:

```text
App
Field
Baseline value
New value
Manual expected value
Official evidence
Correct?
Unsupported?
Changed?
Notes
```

Track these metrics after every fix:

```text
Access resolved
Buildability resolved
Critical unknowns
Correct claims
Incorrect claims
Unsupported claims
Actions used
Budget extensions used
Official-source evidence coverage
```

The most important rule:

> A lower unknown count is NOT an improvement if incorrect or unsupported claims increase.

---

# FIX 1: Credential Access + Buildability Understanding

## Problem

The existing dataset resolves API/authentication much more often than developer access.

A public API existing does not tell us the full access model.

The useful question is not simply:

> Is this API self-serve?

The useful question is:

> What exactly must a developer do to obtain working credentials for this API?

The current schema already supports useful access states such as:

- `self_serve_free`
- `self_serve_trial`
- `self_serve_paid`
- `admin_approval`
- `enterprise_only`
- `partnership_required`
- `contact_sales`
- `unknown`

The issue is primarily research/classification quality, not the absence of a taxonomy.

---

## Fix 1A: Add a Dedicated Credential-Access Verification Step

For an app with a usable API, determine:

1. How are credentials created?
2. Can a normal developer create them directly?
3. Is a paid plan required?
4. Is an enterprise plan required?
5. Is admin approval required?
6. Is partner/program approval required?
7. Does the developer need to contact sales?
8. Is the API documented but credential eligibility unclear?

Useful evidence includes official instructions such as:

```text
Create an API key under Developer Settings
Create an OAuth application in the developer console
Available on Business plan and above
Available to Enterprise customers
Apply to the partner program
Contact sales to enable API access
Workspace admin must approve the application
```

These statements are themselves evidence of the access model.

Do not require an official page to literally contain the words "self-serve."

---

## Fix 1B: Reuse Existing Evidence Before Spending More Actions

Before doing another web search:

1. Inspect already fetched official evidence.
2. Check whether credential creation/access requirements can be derived from it.
3. Only perform additional research if the existing evidence is insufficient.

This separates two failure modes:

```text
Evidence was already available but interpreted badly
vs
The relevant evidence was never retrieved
```

---

## Fix 1C: Preserve Requirements

When access is gated, do not reduce it to only a label.

Preserve the actual requirement in the most compatible existing field(s), for example:

```text
Access: enterprise_only
Requirement: Enterprise plan required
Evidence: official pricing/developer docs
```

or:

```text
Access: partnership_required
Requirement: Must be approved for developer partner program
Evidence: official partner documentation
```

Prefer the existing schema where possible.

Only add a new structured field such as `accessRequirements` if it materially improves the data model and can be added without unnecessary migration complexity.

---

## Fix 1D: Derive Buildability Correctly

Buildability is downstream of API + auth + access.

Do not treat a gated API as automatically blocked.

General interpretation:

```text
self_serve_free
self_serve_trial
self_serve_paid
        ↓
buildable
```

```text
admin_approval
enterprise_only
partnership_required
contact_sales
        ↓
partially_buildable / gated-but-buildable
```

```text
explicit evidence of no usable integration path
        ↓
blocked
```

```text
insufficient evidence
        ↓
unknown
```

Use the repository's current buildability enum. If it only supports:

```text
buildable
partially_buildable
blocked
unknown
```

then gated access should normally map to `partially_buildable`, unless specific official evidence proves a stronger conclusion.

Do not mark something `blocked` merely because it requires payment, approval, sales contact, enterprise access, or a partnership.

---

## Fix 1 Validation

Run the same six benchmark apps with:

```text
Fix 1 enabled
Fixed 10-action budget unchanged
All other V2 fixes disabled
```

This is important.

Do not change the budget while evaluating Fix 1.

Compare Fix 1 against baseline.

Pass criteria:

- newly resolved access claims are manually supported
- buildability reflects gated-vs-blocked correctly
- no previously correct critical claims regress
- no new unsupported claims
- access unknowns decrease where official evidence actually exists
- genuinely unclear apps are still allowed to remain `unknown`

If Fix 1 creates confident but unsupported classifications, fix or revert it before moving on.

Commit only after validation.

Suggested commit:

```text
feat: improve credential access and buildability classification
```

Document the before/after benchmark result.

---

# FIX 2: Adaptive Research Budget

## Problem

The original pipeline has a hard 10-action research limit.

This limit is useful because it keeps runs:

- bounded
- cheaper
- reproducible
- less likely to loop

But some difficult apps exhaust the budget while important fields remain unresolved.

Simply increasing every app from 10 to 20 actions is not a good solution.

It would:

- increase cost
- slow every run
- repeat searches unnecessarily
- introduce more irrelevant/stale evidence
- increase context noise
- make quota problems more likely

Easy apps should not pay the cost of difficult apps.

---

## Fix 2A: Keep 10 as the Normal Budget

For the first adaptive-budget experiment, keep the existing 10-action limit as the normal/base behavior.

Do not simultaneously change it to 6 or 8. That would introduce another variable into the experiment.

After 10 actions, evaluate the state of **critical fields**.

Priority:

```text
1. Authentication
2. Credential/access model
3. Usable API
4. MCP
5. Buildability prerequisites
```

GraphQL should generally be lower priority when a usable REST/API surface is already confirmed.

Do not spend extension actions solely trying to prove that GraphQL does not exist.

---

## Fix 2B: Deterministic Extension Rules

The model should not receive unlimited freedom to say:

> I am not confident, give me more searches.

LLM confidence is not the stopping rule.

Allow additional actions only when deterministic conditions justify them.

Example:

```text
After action 10:

Critical field unresolved?
        ↓ yes

Is there a promising unresolved research path?
        ↓ yes

Grant +2 actions
        ↓

Re-evaluate
```

Possible hard cap:

```text
Normal budget: 10
Extension block: +2 actions
Hard maximum: 14-16
```

Use the smallest hard cap that works during testing.

Do not choose the final cap before observing the benchmark.

---

## Fix 2C: Valid Reasons to Extend

Examples:

- access is unknown but official developer docs were found and have not been fetched
- auth is unresolved but an official authentication page appears in search results
- MCP is unresolved and a product-owned MCP page appears promising
- conflicting high-quality evidence needs one targeted resolution search
- a required source fetch failed transiently and can be retried

Bad reasons:

- "the model is not confident"
- "maybe there is more information"
- GraphQL is unknown even though REST is already sufficient
- repeat the same query with trivial wording changes
- repeatedly fetch the same URL

---

## Fix 2D: Early Stop

The adaptive controller should also stop early.

Stop when:

- all critical fields are resolved with sufficient evidence
- remaining unresolved fields are low priority
- the last actions found no new useful evidence
- searches are repeating the same sources
- the hard cap is reached

Track why the run stopped.

Suggested telemetry:

```text
actionsUsed
budgetExtended: true/false
extensionReason
stopReason
researchFocusHistory
```

Only add fields/logging that are genuinely useful for evaluation.

---

## Fix 2 Validation

Fix 1 remains enabled.

Run the same six benchmark apps:

```text
Fix 1
+
Fix 2
```

Compare against:

```text
Fix 1 only
```

Not against the original baseline.

We want to answer:

> Does adaptive research add value after access interpretation has already been fixed?

Measure:

- newly resolved critical fields
- correctness of new claims
- unsupported claims
- actions per app
- which apps received extra actions
- whether already-easy apps stayed near the normal budget

A successful adaptive budget should spend more actions **selectively**, not on all six apps.

If every app always reaches the hard maximum, the controller is not adaptive.

Suggested commit after passing:

```text
feat: add evidence-driven adaptive research budget
```

---

# FIX 3: Product / Version Evidence Scoping

## Problem

Search can return valid information about the wrong variant of a product.

Examples:

```text
consumer product vs enterprise product
cloud vs self-hosted
legacy API vs current API
old product name vs current product
public product vs enterprise edition
```

NotebookLM / NotebookLM Enterprise is the clearest kind of failure.

The problem is not necessarily bad sources.

Two individually valid sources can describe different products or versions and become wrong when combined.

---

## Do NOT Solve This by Searching Only "Latest Docs"

That would reduce recall and may hide useful sources.

The correct strategy is:

> Search broadly, then classify the scope of the evidence before synthesis.

---

## Fix 3A: Tag Evidence Scope

For each meaningful evidence source, determine where possible:

```text
product/variant
current vs legacy
official vs third-party/community
consumer vs enterprise
cloud vs self-hosted
```

Example:

```text
Source A
Product: NotebookLM Enterprise
Scope: enterprise
Current: yes
Official: yes

Source B
Product: NotebookLM
Scope: consumer
Current: yes
Official: no
```

Do not overbuild a giant ontology.

Only capture scope dimensions that materially affect correctness.

---

## Fix 3B: Prevent Cross-Scope Evidence Mixing

Before synthesis:

1. Determine the target product from the assessment.
2. Group or tag evidence by scope.
3. Prefer evidence that actually matches the target.
4. Do not combine incompatible variants into one claim.

Example:

```text
Target: NotebookLM Enterprise

Enterprise REST docs
        → relevant

Consumer reverse-engineered cookie authentication
        → not evidence for Enterprise auth
```

The second source may still be stored for context, but it must not support the Enterprise authentication claim.

---

## Fix 3C: Handle Ambiguous Targets

If the assessment target itself is ambiguous:

- do not silently pick a variant
- record the ambiguity
- prefer the most reasonable API/integration-relevant product scope
- keep claims scoped
- use `unknown` if the ambiguity prevents a reliable conclusion

---

## Fix 3 Validation

Keep Fix 1 + Fix 2 enabled.

Run the same six apps again.

Focus especially on:

- NotebookLM Enterprise
- Shopify
- any benchmark app with legacy/current documentation

Compare:

```text
Fix 1 + Fix 2
vs
Fix 1 + Fix 2 + Fix 3
```

Pass criteria:

- no relevant evidence is lost merely because it is not the preferred source
- consumer/enterprise or legacy/current evidence is not incorrectly merged
- current correct outputs remain correct
- no increase in unsupported claims
- source scoping does not unnecessarily increase unknowns

Suggested commit:

```text
feat: scope evidence by product and version
```

---

# FIX 4: Source Precedence + Conflict Handling

## Problem

Even within the correct product scope, evidence can disagree or support different parts of the answer.

Example:

```text
Official API docs:
API exists

Official pricing page:
API requires Enterprise

Third-party integration docs:
MCP server available
```

These are not necessarily contradictions.

Together they may mean:

```text
API: available
Access: enterprise_only
Third-party MCP: available
```

The pipeline should combine compatible claims while detecting true conflicts.

---

# Fix 4A: Use Claim-Specific Source Precedence

Do not apply:

> Official source exists, therefore ignore all other sources.

That would damage coverage.

Instead, use source quality according to the claim.

For claims about native product behavior:

```text
current product-owned official docs
    ↓
current official help/admin/pricing/changelog
    ↓
other official documentation
    ↓
reputable third-party source
    ↓
community source
```

But lower-tier sources can still support narrower claims.

Example:

```text
Official docs silent on MCP
Third-party company documents an MCP server for the product
```

Valid conclusion:

```text
MCP availability: available
MCP type: third-party
```

Invalid conclusion:

```text
Official MCP support: yes
```

If the current schema cannot distinguish native/product-owned MCP from third-party/community MCP, inspect whether a small backward-compatible field is justified.

Do not redesign the entire schema solely for this.

---

# Fix 4B: Silence Is Not Negative Evidence

This rule must remain strict:

```text
Official docs do not mention MCP
```

does NOT mean:

```text
MCP: not available
```

Similarly:

```text
No GraphQL page found
```

does NOT prove:

```text
GraphQL: false
```

Negative conclusions require explicit evidence appropriate to the claim.

Keep the existing negative-evidence safeguards.

---

# Fix 4C: Detect True Contradictions

Examples of potential conflicts:

```text
Current official source A: OAuth is supported
Current official source B: API-key authentication only
```

or:

```text
Current official source A: API available on Pro
Current official source B: API restricted to Enterprise
```

Before choosing one silently:

1. verify both sources are about the same product scope
2. verify both are current
3. determine whether they describe different APIs/features
4. perform one targeted verification if necessary
5. if still unresolved, return conflict/unknown rather than guessing

Do not let Gemini quietly pick whichever statement appears more convincing.

---

# Fix 4D: Compatible Evidence Should Be Combined

Do not mistake complementary evidence for conflict.

Example:

```text
Developer docs:
REST API exists

Pricing docs:
API access requires Enterprise
```

Correct output:

```text
REST: true
Access: enterprise_only
Buildability: partially_buildable
```

---

# Fix 4 Validation

Run the same six benchmark apps again with all fixes enabled.

Compare:

```text
Fix 1 + Fix 2 + Fix 3
vs
Fix 1 + Fix 2 + Fix 3 + Fix 4
```

Inspect:

- source-precedence decisions
- conflicting evidence
- MCP ownership/type
- official silence vs negative conclusions
- gated access evidence from pricing/admin docs
- third-party/community evidence handling

Pass criteria:

- lower-quality sources do not overwrite stronger current evidence
- useful secondary evidence is not discarded
- third-party MCP is not mislabeled as native/product-owned MCP
- true conflicts are surfaced or verified
- no regression in existing negative-evidence safeguards

Suggested commit:

```text
feat: add source precedence and conflict handling
```

---

# Phase 5: Combined Validation on Fresh Apps

The six-app benchmark is for fast regression testing.

It is **not sufficient for final validation**, because after several iterations we may accidentally overfit to those six apps.

After all four fixes pass individually, select a **fresh 10-15 app sample** that was not used as the main six-app development benchmark.

The fresh set should include a mixture of:

- self-serve APIs
- paid APIs
- enterprise-only APIs
- partner/approval-gated APIs
- unclear access
- official MCP
- third-party/community MCP
- no known MCP
- multiple product variants
- straightforward apps that act as regression guards

Do not select only apps expected to improve.

---

# Phase 5.1: Manual Audit

Manually verify every important changed claim in the fresh sample.

Classify fields using the existing evaluation terminology where possible:

```text
correct
incorrect
unsupported
unnecessary_unknown
correctly_unknown
```

Calculate:

```text
Precision
Coverage miss rate
Access resolution rate
Buildability resolution rate
Average actions
Budget extension rate
```

Also record:

```text
Incorrect critical claims
Unsupported critical claims
```

---

# Phase 5.2: Acceptance Rule

Do not merge V2 just because unknowns decreased.

V2 should show:

```text
meaningfully better access/buildability coverage
+
no material precision regression
+
no systematic unsupported claims
+
adaptive budget used selectively
```

Ideally the fresh manual audit should have zero incorrect/unsupported critical claims.

If coverage improves but correctness materially decreases, do not ship the combined version.

Investigate or revert the responsible fix.

---

# Phase 6: Decide Whether to Rerun All 100 Apps

Only after the fresh validation passes should we consider a full dataset rerun.

A 100-app rerun is justified when:

- all four fixes passed isolated testing
- combined fresh validation passes
- access resolution materially improved
- buildability resolution materially improved
- correctness remains strong
- no major regression remains

Then:

1. preserve the V1 dataset
2. rerun the 100 targets with V2
3. generate a new dataset
4. regenerate deterministic analysis
5. compare V1 vs V2
6. manually spot-check surprising changes
7. update the case study only after validation

Do not overwrite V1 without preserving it.

---

# Phase 6.1: V1 vs V2 Comparison

At minimum compare:

```text
                         V1          V2
Access resolved          24/100      ?
Access unknown           76/100      ?

Buildability known       25/100      ?
Buildability unknown     75/100      ?

REST confirmed           87/100      ?
MCP resolved             57/100      ?

Average actions          9.92        ?
Budget exhausted         88/100      ?
Budget extended          N/A         ?

Manual precision         sampled     sampled
Coverage miss            28.57%*     ?
```

`*` Use the appropriate documented audit stage and label sample-based metrics honestly.

Do not claim sample precision represents all 100 apps.

---

# Phase 7: Update Analysis and Case Study

Only after the V2 dataset is validated.

The case study should show the actual before/after story.

Potential narrative:

```text
V1 reliably identified APIs and authentication,
but developer-access evidence remained the largest source of unknowns.

V2 changed four things:
1. explicit credential-access verification
2. adaptive research allocation
3. product/version evidence scoping
4. source precedence and conflict handling
```

Then show real measured improvements.

Do not invent improvement numbers before the full run.

If a fix did not improve the system, document that rather than hiding it.

---

# Important Non-Goals

Do NOT add during this V2 cycle unless validation proves they are necessary:

- database
- vector database
- multi-agent architecture
- browser automation
- unlimited research loop
- another frontend rewrite
- automatic 100-app reruns after every change
- model ensembles
- complex confidence scoring
- aggressive GraphQL completeness work
- new unrelated product features

The goal is research quality, not architecture expansion.

---

# Rules That Must Survive V2

The existing pipeline learned several valuable lessons.

Do not accidentally remove these safeguards.

## Keep: Unsupported claims become unknown

A field should not survive simply because the model stated it confidently.

---

## Keep: Negative GraphQL requires explicit evidence

Failure to find GraphQL documentation is not proof that GraphQL does not exist.

---

## Keep: Negative MCP requires explicit evidence

Failure to find official MCP documentation is not proof that no MCP integration exists.

---

## Keep: HTTP does not automatically mean REST

REST classification must be semantically supported.

---

## Keep: Auth claims need appropriate evidence

Do not mix unofficial/reverse-engineered authentication methods into official product authentication.

---

## Keep: Product-owned MCP must be distinguished from third-party/community MCP

An ecosystem MCP integration does not prove the product itself ships an official MCP server.

---

## Keep: Unknown is allowed

The goal is NOT to eliminate every unknown.

The goal is to eliminate **avoidable** unknowns while retaining honest unknowns.

---

# Git / Commit Discipline

Use small commits around meaningful units.

Suggested sequence:

```text
docs: add V2 research benchmark

test: capture V2 baseline behavior

feat: improve credential access and buildability classification

docs: record Fix 1 benchmark results

feat: add evidence-driven adaptive research budget

docs: record Fix 2 benchmark results

feat: scope evidence by product and version

docs: record Fix 3 benchmark results

feat: add source precedence and conflict handling

docs: record Fix 4 benchmark results

test: validate combined V2 research pipeline

docs: record V2 validation results
```

Do not create commits only for the sake of increasing commit count.

---

# Required Documentation Per Fix

After each fix, add a short result entry:

```markdown
## Fix N

### Hypothesis
What problem were we trying to solve?

### Change
What changed in the pipeline?

### Benchmark
Which six apps were tested?

### Before
Relevant baseline metrics.

### After
Relevant new metrics.

### Manual verification
What newly changed claims were checked?

### Regressions
Did anything get worse?

### Decision
KEEP / REVERT / MODIFY
```

This gives us a reliable history and prevents repeating the earlier mistake of optimizing one number while damaging another.

---

# Agent Instructions

When working through this plan:

1. Do one phase at a time.
2. Do not silently continue to the next fix before reporting the current phase result.
3. Keep unrelated research-agent behavior frozen.
4. Do not weaken evidence requirements merely to reduce unknowns.
5. Do not run all 100 apps during development.
6. Use the same six-app benchmark for Fixes 1-4.
7. Verify changed claims manually against source evidence.
8. Preserve existing regression tests.
9. Add focused tests for each new rule.
10. Keep implementation minimal.
11. Prefer deterministic logic where possible.
12. Never use model self-confidence as the sole stopping criterion.
13. Document failed experiments instead of hiding them.
14. If a fix makes results worse, revert it before starting the next fix.

---

# Definition of Done

V2 is complete when:

- Fix 1 passed the six-app benchmark
- Fix 2 passed the same benchmark
- Fix 3 passed the same benchmark
- Fix 4 passed the same benchmark
- all four work correctly together
- a fresh 10-15 app audit shows improved coverage without unacceptable precision loss
- only then, if worthwhile, the 100-app dataset is rerun
- V1 is preserved
- V1 vs V2 metrics are documented
- analysis and case study are updated from validated V2 data
- the final repository clearly explains what improved and what remains unresolved

The guiding principle for the entire V2 cycle is:

> **Do not make the agent answer more questions by making it easier to claim things. Make it answer more questions by researching and interpreting evidence better.**

# Phase 2 execution report

Completed on 2026-09-18 using the frozen Phase 1 research pipeline and the sequential resumable batch runner.

## Execution

| Metric | Result |
| --- | ---: |
| Assessment targets | 100 |
| Completed | 100 |
| Failed | 0 |
| Pending | 0 |
| Final reruns required | 0 |
| Confirmed quota interruptions | 1 |

The assessment Markdown parsed to exactly 100 consecutively numbered, unique targets. Existing schema-valid Phase 1 result files were preserved. The live run stopped cleanly when Gemini's per-project daily free-tier request quota was exhausted, retained all progress, and completed after resumption with the same command.

## Dataset health

| Metric | Result |
| --- | ---: |
| Combined records | 100 |
| Unique result application names | 100 |
| High confidence | 0 |
| Medium confidence | 100 |
| Low confidence | 0 |
| Apps with unknown fields | 99 |
| Unknown-heavy apps (4+ unknown fields) | 72 |
| Runs with action telemetry | 93 |
| Average actions used among recorded runs | 9.92 |
| Recorded budget exhaustion | 88 |

Seven valid results predated the batch telemetry manifest and were skipped during resume, so action averages cover 93 recorded runs. Unknowns are preserved as research outcomes and were not filled manually.

## Failures

The final manifest contains no failed targets.

- **Provider quota:** one confirmed Gemini free-tier daily quota interruption. The runner stopped and resumed without losing completed work.
- **Temporary provider failure:** none remaining.
- **Research/tool failure:** none remaining.
- **Schema failure:** none remaining.
- **Application/documentation limitation:** represented by evidence-backed unknown fields rather than execution failure.
- **Other:** none remaining.

## Output

- Individual target results: `results/<target>.json`
- Execution manifest: `results/run-manifest.json`
- Combined dataset: `results/research-dataset.json`

The combined dataset is generated from individual result files. Each record preserves confidence, unknown fields, research notes, and evidence URL/source/support mappings. Generated result JSON remains ignored by Git; rerunning `npm run research:all` reproduces or resumes the dataset from the supplied assessment file.

## Pipeline changes

None to the frozen Phase 1 research agent. Phase 2 added only deterministic execution support:

- assessment Markdown parsing and 100-target validation;
- sequential resumable orchestration;
- schema-valid result skipping;
- atomic manifest and combined-dataset generation;
- bounded failure classification and quota stopping;
- operational health statistics.

The Phase 1 evidence rules, sanitizer, research priorities, model prompts, schemas, tool budget, and provider retry behavior remained frozen.

## Validation

- Assessment targets: 100 unique
- Target result files: 100/100 schema-valid
- Combined records: 100 schema-valid
- Combined application names: 100 unique
- Evidence metadata preserved: yes
- Tests: 68 passing across 11 test files
- TypeScript typecheck: passing
- Production build: passing
- Research action limit: 10

## Remaining work

Phase 2 is complete. The next phase is **Phase 3: independent manual verification and accuracy measurement of a representative sample from the full dataset**. No pattern analysis or HTML case study was performed during this phase.

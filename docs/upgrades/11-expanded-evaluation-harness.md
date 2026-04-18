# 11 - Expanded Evaluation Harness

## Purpose

Expand from a small regression suite into a serious cyber quality, safety, grounding, tool-use, and provider-comparison evaluation harness.

## Current Gap

The current evals are useful but small. A perfect score on a tiny suite proves only that the tiny suite passed. It does not prove frontier-grade quality across cyber domains, long-context investigations, or adversarial safety behavior.

## Target Operator Outcome

Maintainers can run a broad eval suite, compare providers, see per-feature quality trends, inspect failure reasons, and block releases when safety, grounding, or core cyber performance regresses.

## Safety Boundary

- Offensive eval cases test refusal, safe redirects, and authorized-validation boundaries.
- Evals must not include executable abuse instructions or operational attack playbooks.
- Store synthetic fixtures only; no real customer data.

## Proposed Architecture

- Eval taxonomy groups cases by safety, reasoning, detection, reporting, tool use, cloud, identity, endpoint, vuln, intel, and long-context tasks.
- Grader registry supports deterministic, schema, heuristic, and optional human review graders.
- Eval dataset registry versions fixture sets and expected outcomes.
- Provider comparison mode runs identical cases across providers and writes scorecards.
- Trend reporter tracks scores over time and flags regressions.
- CI threshold policy defines required pass rates and critical-failure blockers.

## Expected File Changes

New files:

- `apps/api/src/evals/eval-taxonomy.ts`
- `apps/api/src/evals/grader-registry.ts`
- `apps/api/src/evals/grounding-grader.ts`
- `apps/api/src/evals/safety-grader.ts`
- `apps/api/src/evals/tool-use-grader.ts`
- `apps/api/src/evals/report-quality-grader.ts`
- `apps/api/src/evals/provider-comparison-service.ts`
- `apps/api/src/evals/score-trend-service.ts`
- `apps/api/src/schemas/eval-results.schema.ts`
- `data/evals/safety/*.json`
- `data/evals/reasoning/*.json`
- `data/evals/detections/*.json`
- `data/evals/tools/*.json`
- `data/evals/long-context/*.json`
- `tests/unit/eval-graders.test.ts`
- `tests/integration/expanded-eval-harness-flow.test.ts`
- `docs/admin-guide/evaluation-harness.md`

Existing files to modify:

- `apps/api/src/evals/eval-runner.ts`: support taxonomy, graders, thresholds, and provider comparison.
- `apps/api/src/evals/eval-case.schema.ts`: extend with domain, risk class, expected citations, and safety boundary.
- `apps/api/src/evals/report-writer.ts`: write trend and provider comparison outputs.
- `scripts/run-evals.ts`: add CLI options for domain, provider, threshold, and output path.
- `tests/evals/eval-harness.test.ts`: enforce new minimum coverage and critical safety cases.
- `.github/workflows/ci.yml`: optionally upload eval score artifacts.
- `docs/features/16-evaluation-harness.md`: update current state once implemented.

## Data Model Additions

- `EvalCaseV2`: id, domain, risk class, input, expected behavior, scoring rubric, fixtures.
- `EvalGrade`: score, pass, critical failure, explanation, evidence, grader version.
- `EvalRunV2`: run id, provider id, domains, thresholds, results, trend metadata.
- `ProviderComparisonScore`: provider id, domain scores, safety failures, grounding failures.

## API Changes

Optional admin endpoints after local CLI is stable:

- `POST /evals/runs`
- `GET /evals/runs/:id`
- `GET /evals/trends`
- `GET /evals/provider-comparisons`

## UI Changes

- Eval dashboard with pass rates, critical failures, and trends.
- Provider comparison report.
- Failure review view with expected behavior and actual response.

## Milestones

- [x] Define eval taxonomy.
- [ ] Add at least 100 high-value eval cases.
- [x] Add grader schemas for each feature area.
- [x] Add provider comparison mode.
- [x] Add hallucination and evidence-grounding evals.
- [x] Add safety red-team prompt evals.
- [x] Add score trend reports.

## Acceptance Criteria

- Quality gates fail when safety, grounding, or core cyber tasks regress.
- Eval results are comparable across providers.
- Each major feature has eval coverage.
- Scores include explanations, not just pass/fail.
- CI blocks critical safety failures.

## Test Plan

- Unit tests for graders, thresholds, taxonomy loading, and trend calculations.
- Integration tests for eval run persistence and provider comparison.
- CI tests for minimum acceptable scores and critical safety failures.

## Rollout Notes

Build this before expanding risky tool use. Evals are the quality guardrail for the rest of the roadmap.

# 16 - Evaluation Harness

## Purpose

Create repeatable cyber-specific evaluations so changes to prompts, models, parsers, safety, and tools can be measured before release.

## Target Capability

- Run golden-case evaluations for analysis quality.
- Run safety refusal and prompt-injection suites.
- Measure evidence citation correctness.
- Compare providers and prompt versions.
- Track regressions in CI.

## Current State

- Implemented in the MVP on 2026-04-17.
- Vitest covers deterministic unit, integration, and eval harness flows.
- Golden eval cases now cover alert analysis, brute-force logs, IOC review, IIS hardening, and blocked unsafe requests.
- The eval runner produces a machine-readable scorecard and exits non-zero on regressions.

## Scope

- Eval case schema.
- Scoring functions.
- Golden expected outputs.
- Safety eval set.
- CI-ready eval runner.

## Non-Goals

- No claims of external benchmark parity.
- No storing sensitive customer data in eval fixtures.
- No unsafe eval fixture content beyond sanitized request descriptions and safe defensive artifacts.

## Proposed Architecture

- `EvalCase`: id, category, input, expectedSignals, blockedExpected, scoringRubric.
- `EvalRun`: model, promptVersion, codeVersion, timestamp, results.
- `EvalScore`: severityScore, evidenceScore, safetyScore, recommendationScore.
- `EvalFinding`: pass/fail, reason, diff, artifact refs.

Suggested modules:

- `apps/api/src/evals/eval-case.schema.ts`
- `apps/api/src/evals/eval-runner.ts`
- `apps/api/src/evals/scorers/*.scorer.ts`
- `apps/api/src/evals/report-writer.ts`
- `tests/evals/*.test.ts`

## Data Model

Add optional persisted records:

- `evalRuns[]`
- `evalResults[]`
- `evalScorecards[]`

## API Changes

Initial scaffold can be CLI/test-only. Later:

- `POST /evals/run`
- `GET /evals/runs`
- `GET /evals/runs/:id`

## UI Changes

Later admin view:

- Eval run dashboard.
- Trend chart by category.
- Provider comparison table.
- Safety regression panel.

## Scaffold Steps

1. Add eval case schema.
2. Convert current integration fixtures into eval cases.
3. Add deterministic scorers for severity, category, required evidence, and blocked state.
4. Add safety eval cases.
5. Add npm script for evals.
6. Add CI-ready report output.

## Test Plan

- Unit: scorers produce expected score for known outputs.
- Unit: eval schema rejects incomplete cases.
- Integration: eval runner executes current pipeline.
- Safety: blocked request evals fail if the system allows them.
- Regression: prompt/provider changes must not reduce baseline score below threshold.

## Fixtures

- `data/evals/alert-powershell.json`
- `data/evals/log-bruteforce.json`
- `data/evals/ioc-batch.json`
- `data/evals/hardening-iis.json`
- `data/evals/safety-blocked-requests.json`

## Acceptance Criteria

- Eval runner produces a machine-readable scorecard.
- Current MVP flows are represented as eval cases.
- Safety regressions fail tests.
- Evidence and severity scoring are deterministic.
- Results identify which feature area regressed.

## MVP Verification

- `npm test -- tests/evals/eval-harness.test.ts`: 1 file, 3 tests passed.
- `npm run evals`: 6/6 eval cases passed with average score 1.000; scorecard written to `tmp/eval-scorecard.json`.
- `npm run typecheck`: API and web TypeScript passed.
- `npm test`: 39 files, 89 tests passed.
- `npm run build`: API TypeScript and web production build passed.
- `npm audit --omit=dev`: 0 vulnerabilities.

# 01 - Frontier Model Layer

## Purpose

Upgrade the current provider plumbing into a reliable cyber-model execution layer. The goal is not just "call a better model"; the goal is to make model selection, prompt versions, structured output, fallback, grounding, safety, and quality measurement explicit and testable.

## Current Gap

The MVP can call a mock, Ollama, or OpenAI-compatible provider. It does not yet prove model quality, compare providers on the same cases, calibrate confidence, validate every model output against task-specific schemas, or detect claims that are not supported by case evidence.

## Target Operator Outcome

An operator can choose a provider profile, run the same cyber eval set across providers, inspect quality and safety scores, and trust that malformed, unsafe, or unsupported model responses are blocked before they become case findings.

## Safety Boundary

- Input safety policy still runs before provider calls.
- Output safety validation still runs before final responses.
- Provider fallback must not bypass safety decisions.
- A frontier provider cannot directly execute tools or actions.
- Offensive content remains limited to authorized validation and defensive control testing.

## Proposed Architecture

- Model profile registry stores capabilities, limits, costs, latency expectations, structured-output support, and safety posture.
- Prompt registry stores task prompts, versions, expected schemas, changelog notes, and eval thresholds.
- Provider router chooses a provider using task, profile, capability, readiness, and fallback policy.
- Structured-output validator validates every response with Zod or JSON Schema before downstream use.
- Evidence-grounding validator compares findings, recommendations, and confidence against case observations and citations.
- Provider comparison runner executes evals across configured providers and writes scorecards.

## Expected File Changes

New files:

- `apps/api/src/models/model-profile-registry.ts`
- `apps/api/src/models/model-profile.schema.ts`
- `apps/api/src/prompts/prompt-registry.ts`
- `apps/api/src/prompts/prompt-version.schema.ts`
- `apps/api/src/providers/provider-fallback-policy.ts`
- `apps/api/src/providers/provider-comparison-runner.ts`
- `apps/api/src/reasoning/evidence-grounding-validator.ts`
- `data/fixtures/providers/provider-profiles.json`
- `data/fixtures/providers/malformed-frontier-response.json`
- `data/fixtures/providers/unsupported-claim-response.json`
- `tests/unit/model-profile-service.test.ts`
- `tests/unit/evidence-grounding-validator.test.ts`
- `tests/integration/model-provider-quality-flow.test.ts`
- `docs/admin-guide/model-providers.md`

Existing files to modify:

- `apps/api/src/providers/provider-router.ts`: route by task capability, readiness, and fallback policy.
- `apps/api/src/providers/structured-output.ts`: support task-specific schemas and repair attempts.
- `apps/api/src/providers/provider-health.ts`: include readiness, latency, and failure windows.
- `apps/api/src/pipeline/analyze-pipeline.ts`: call grounding validator before composing final findings.
- `apps/api/src/routes/providers.ts`: expose provider profiles and comparison summaries.
- `apps/api/src/schemas/providers.schema.ts`: add profile, readiness, comparison, and fallback schemas.
- `apps/api/src/evals/eval-runner.ts`: allow provider selection and provider comparison mode.
- `scripts/run-evals.ts`: add CLI flags for provider profile and comparison output.
- `docs/api/openapi.yaml`: document new provider profile and comparison endpoints.

## Data Model Additions

- `ModelProfile`: id, provider type, capabilities, context limit, structured-output mode, cost metadata, latency targets, safety notes.
- `PromptVersion`: task, version, schema id, prompt hash, owner, changelog, minimum eval score.
- `ProviderComparisonRun`: provider id, eval run id, pass rate, average score, safety failures, grounding failures.
- `GroundingFinding`: claim id, evidence ids, status, unsupported reason, analyst review flag.

## API Changes

- `GET /providers/profiles`: list configured model profiles.
- `GET /providers/comparisons`: list recent provider comparison runs.
- `POST /providers/comparisons`: run the eval suite against selected providers.
- Extend `/providers/health` with readiness, latency, fallback state, and recent validation failures.

## UI Changes

- Admin provider page with active provider, fallback order, health, and quality history.
- Case finding panel showing unsupported or weakly grounded model claims.
- Eval comparison table for provider quality and safety.

## Milestones

- [x] Add model profile schema and registry.
- [x] Add prompt/version registry for model-facing defensive analysis.
- [x] Enforce required-field structured output validation at provider boundaries.
- [x] Add provider fallback policy for unhealthy provider selection.
- [x] Add evidence-grounding validator.
- [x] Add provider comparison runner and scorecard output.
- [x] Add admin documentation for safe provider configuration.

## Acceptance Criteria

- Provider selection is auditable and deterministic.
- Malformed provider output is blocked or repaired safely.
- Unsupported claims are flagged for analyst review.
- The same eval set can compare mock, local, and frontier providers.
- `npm run ci:verify` passes with the new provider quality tests.

## Test Plan

- Unit tests for profile selection, fallback policy, prompt version lookup, and grounding validation.
- Integration tests for provider outage, malformed response, unsafe output, and fallback behavior.
- Eval tests comparing response quality, safety, and evidence support across providers.
- Docs check confirms provider configuration docs and API docs are linked.

## Rollout Notes

Start with read-only quality reporting. Do not make automatic provider fallback change case results until comparison and grounding tests are stable.

## MVP Implementation Notes

- Added model profiles in `apps/api/src/models`.
- Added prompt version registry in `apps/api/src/prompts`.
- Added provider fallback decisions in `apps/api/src/providers/provider-fallback-policy.ts`.
- Added evidence grounding in `apps/api/src/reasoning/evidence-grounding-validator.ts`.
- Added provider comparison runner in `apps/api/src/providers/provider-comparison-runner.ts`.
- Added `GET /providers/profiles`, `GET /providers/comparisons`, and `POST /providers/comparisons`.
- Added grounding findings to saved cases and audit action `model.grounding_validated`.
- Added focused tests for model profiles, fallback, grounding, comparison metadata, and API flow.

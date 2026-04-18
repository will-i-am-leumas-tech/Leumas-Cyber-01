# 23 - Model Provider Maturity

## Purpose

Make model provider use reliable, cost-aware, structured, testable, and safe across local mock, local models, and OpenAI-compatible endpoints.

## Target Capability

- Stream responses where useful.
- Enforce structured outputs.
- Retry transient provider failures.
- Route tasks to appropriate providers.
- Track cost, tokens, latency, and model versions.
- Compare providers through evals.

## Current State

- Implemented in the MVP on 2026-04-17.
- Provider interface exposes provider name, model, and capabilities.
- Provider registry describes local mock, Ollama, and OpenAI-compatible providers.
- Deterministic provider routing selects enabled providers by task type.
- Provider calls are recorded on analyzed cases with prompt version, model, task type, latency, status, and estimated token usage.
- Structured provider output validation records passed, failed, or not-provided status.
- In-memory usage accounting exposes records and provider/model summaries.
- Provider health and readiness endpoints are available for operations and UI use.

## Scope

- Provider registry.
- Structured output support.
- Retry and fallback.
- Provider health.
- Usage accounting.
- Prompt versioning.

## Non-Goals

- No direct provider-specific secrets in prompts or logs.
- No provider output trusted without validation.
- No hidden data sharing outside configured providers.

## Proposed Architecture

- `ProviderConfig`: name, type, endpoint, model, capabilities, enabled.
- `ProviderCapability`: streaming, jsonSchema, toolCalling, localOnly.
- `ProviderCall`: promptVersion, model, tokens, latency, status.
- `ProviderRouter`: task type to provider selection.
- `StructuredOutputValidator`: schema, repair attempt, failure reason.

Suggested modules:

- `apps/api/src/providers/provider-registry.ts`
- `apps/api/src/providers/provider-router.ts`
- `apps/api/src/providers/structured-output.ts`
- `apps/api/src/providers/provider-health.ts`
- `apps/api/src/providers/usage-accounting.ts`

## Data Model

Add:

- `providerConfigs[]`
- `providerCalls[]`
- `promptTemplates[]`
- `structuredOutputValidations[]`
- `usageRecords[]`

## API Changes

- `GET /providers`
- `GET /providers/health`
- `POST /providers/test`
- `GET /providers/usage`

## UI Changes

- Provider status panel.
- Model and prompt version in case audit.
- Usage and latency dashboard.

## Scaffold Steps

1. Expand provider interface with capabilities and health checks.
2. Add provider call record schema.
3. Add structured output validator wrapper.
4. Add provider router for task types.
5. Add retry and fallback policy for transient errors.
6. Add usage accounting for mock and compatible providers.

## Test Plan

- Unit: provider router selects expected provider by task.
- Unit: invalid structured output fails validation.
- Unit: retry policy retries transient errors only.
- Integration: mock provider call records usage and prompt version.
- Safety: provider output validator blocks unsafe content.

## Fixtures

- `data/fixtures/providers/valid-structured-output.json`
- `data/fixtures/providers/invalid-structured-output.json`
- `data/fixtures/providers/transient-error.json`

## Acceptance Criteria

- Provider calls are versioned and audited.
- Structured output is validated before use.
- Provider failures degrade gracefully.
- Usage records include latency and model name.
- Provider selection is deterministic and testable.

## MVP Verification

- `npm test -- tests/unit/provider-maturity-service.test.ts tests/integration/provider-flow.test.ts`: 2 files, 4 tests passed.
- `npm run typecheck`: API and web TypeScript passed.
- `npm run build`: API TypeScript and web production build passed.
- `npm run evals`: 6/6 eval cases passed with average score 1.000; scorecard written to `tmp/eval-scorecard.json`.
- `npm test`: 53 files, 121 tests passed.
- `npm audit --omit=dev`: 0 vulnerabilities.

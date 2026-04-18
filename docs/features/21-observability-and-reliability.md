# 21 - Observability And Reliability

## Purpose

Make the system operable by exposing health, metrics, traces, errors, provider status, job state, and reliability controls.

## Target Capability

- Measure API latency, analysis latency, provider latency, errors, and queue depth.
- Trace requests across API, pipeline, provider, storage, and tools.
- Detect provider and connector failures.
- Retry safe background work.
- Provide health endpoints for dependencies.

## Current State

- Implemented in the MVP on 2026-04-17.
- Every API response receives an `x-request-id`.
- Metrics, dependency health, admin error, and admin job endpoints are available.
- Analyze requests, refusals, provider failures, and HTTP response counts are tracked in memory.
- Error events are sanitized with the privacy redaction layer before exposure.

## Scope

- Structured operational events.
- Metrics endpoint.
- OpenTelemetry-ready tracing.
- Provider and connector health checks.
- Job retry policy.

## Non-Goals

- No production monitoring vendor lock-in.
- No logging raw secrets or sensitive evidence.
- No retrying unsafe state-changing actions without idempotency and approval.

## Proposed Architecture

- `OperationalMetric`: name, value, labels, timestamp.
- `TraceContext`: request ID, case ID, span ID, parent span ID.
- `HealthCheckResult`: dependency, status, latencyMs, errorSummary.
- `RetryPolicy`: maxAttempts, backoff, idempotencyKey, deadLetter.
- `ErrorEvent`: sanitized error, component, severity, request ID.

Suggested modules:

- `apps/api/src/observability/request-context.ts`
- `apps/api/src/observability/metrics-service.ts`
- `apps/api/src/observability/trace-service.ts`
- `apps/api/src/observability/health-service.ts`
- `apps/api/src/observability/error-reporter.ts`

## Data Model

Add optional persisted records:

- `healthCheckResults[]`
- `errorEvents[]`
- `jobAttempts[]`
- `deadLetterJobs[]`

## API Changes

- `GET /health/dependencies`
- `GET /metrics`
- `GET /admin/errors`
- `GET /admin/jobs`

## UI Changes

- Admin health panel.
- Provider status indicators.
- Job failure queue.
- Request ID display for support.

## Scaffold Steps

1. Add request ID middleware.
2. Add structured sanitized logger helper.
3. Add metrics counters for analyze calls, refusals, provider failures, and tool calls.
4. Add dependency health registry.
5. Add retry policy shape for future jobs.
6. Add tests for sensitive log redaction.

## Test Plan

- Unit: metrics increment as expected.
- Unit: logger redacts sensitive fields.
- Unit: health registry reports degraded dependency.
- Integration: `/analyze` emits request ID and metrics.
- Reliability: retry policy stops at max attempts.

## Fixtures

- `data/fixtures/observability/provider-health.json`
- `data/fixtures/observability/sanitized-error.json`

## Acceptance Criteria

- Every API response has a request ID.
- Metrics expose analysis count, refusal count, and provider failures.
- Health endpoint includes provider/storage status.
- Errors are sanitized.
- Tests prove secrets are not logged.

## MVP Verification

- `npm test -- tests/unit/observability-service.test.ts tests/integration/observability-flow.test.ts`: 2 files, 4 tests passed.
- `npm run typecheck`: API and web TypeScript passed.
- `npm run evals`: 6/6 eval cases passed with average score 1.000; scorecard written to `tmp/eval-scorecard.json`.
- `npm test`: 49 files, 108 tests passed.
- `npm run build`: API TypeScript and web production build passed.
- `npm audit --omit=dev`: 0 vulnerabilities.

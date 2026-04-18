# 03 - Real Security Connectors

## Purpose

Replace mock-only tooling with production-style security connectors that retrieve authorized defensive evidence from real systems while preserving scoped permissions, auditability, redaction, and deterministic tests.

## Current Gap

The MVP has local mock connectors. It does not yet integrate with real SIEM, EDR, identity, cloud, ticketing, or notification systems.

## Target Operator Outcome

An analyst can link a case to evidence from Sentinel, Splunk, EDR, identity, cloud, or ticketing systems without copying raw data manually, and every retrieval is scoped, audited, and replayable in tests.

## Safety Boundary

- Start with read-only connectors.
- Write or containment actions belong behind separate approval and sandbox upgrades.
- Credentials must never be logged or sent to model prompts.
- Connector output must pass privacy classification and redaction before prompt packaging.

## Proposed Architecture

- Connector v2 interface standardizes auth, capability discovery, pagination, retries, timeouts, and errors.
- Connector credential provider loads from environment first, then future secret manager adapters.
- Connector policy service enforces operation, tenant, case, and actor permissions.
- Connector health service exposes readiness without leaking credentials.
- Fixture-backed mock transport enables deterministic integration tests.

## Expected File Changes

New files:

- `apps/api/src/connectors/connector-v2.ts`
- `apps/api/src/connectors/connector-auth.ts`
- `apps/api/src/connectors/connector-policy.ts`
- `apps/api/src/connectors/connector-health-service.ts`
- `apps/api/src/connectors/transports/mock-http-transport.ts`
- `apps/api/src/connectors/siem/sentinel.connector.ts`
- `apps/api/src/connectors/siem/splunk.connector.ts`
- `apps/api/src/connectors/edr/defender.connector.ts`
- `apps/api/src/connectors/identity/entra.connector.ts`
- `apps/api/src/connectors/cloud/aws-security.connector.ts`
- `apps/api/src/schemas/connectors.schema.ts`
- `apps/api/src/routes/connectors.ts`
- `data/fixtures/connectors/sentinel-alerts.json`
- `data/fixtures/connectors/splunk-search-results.json`
- `data/fixtures/connectors/defender-device-events.json`
- `data/fixtures/connectors/entra-signins.json`
- `tests/unit/connector-policy.test.ts`
- `tests/unit/connector-request-builders.test.ts`
- `tests/integration/connector-readonly-flow.test.ts`
- `docs/connectors/real-connectors.md`

Existing files to modify:

- `apps/api/src/app.ts`: register connector routes.
- `apps/api/src/tools/connector-registry.ts`: bridge existing tool registry to connector v2.
- `apps/api/src/tools/tool-policy.ts`: enforce read-only connector policy.
- `apps/api/src/privacy/prompt-minimizer.ts`: minimize connector results before model use.
- `apps/api/src/audit/audit-event-service.ts`: capture connector request and result metadata.
- `apps/api/src/schemas/case.schema.ts`: store connector evidence references.
- `docs/api/openapi.yaml`: add connector registry, health, and query endpoints.
- `docs/security/threat-model.md`: add connector trust boundary updates.

## Data Model Additions

- `ConnectorDefinition`: id, vendor, capability, auth type, allowed operations, health status.
- `ConnectorCredentialRef`: connector id, tenant id, secret ref, scopes, expiration.
- `ConnectorQuery`: connector id, operation, filters, actor, case id, policy decision.
- `ConnectorEvidenceRef`: case id, source, external id, retrieval time, hash, classification.

## API Changes

- `GET /connectors`: list configured connectors and capabilities.
- `GET /connectors/health`: return readiness by connector.
- `POST /connectors/:id/query`: execute an approved read-only query.
- `POST /cases/:id/connectors/:id/import`: attach connector results to a case.

## UI Changes

- Connector admin page with readiness and setup status.
- Case evidence import panel for read-only connector queries.
- Connector result preview with redaction and source metadata.

## Milestones

- [x] Define connector interface v2.
- [x] Add credential loading abstraction.
- [x] Add read-only connector policy.
- [x] Implement one SIEM connector.
- [x] Implement one EDR connector.
- [x] Implement one identity connector.
- [x] Implement one cloud connector.
- [x] Add health endpoints, fixtures, docs, and tests.

## Acceptance Criteria

- A connector can retrieve scoped evidence into a case.
- Every connector call is audited.
- Connector errors are structured and redacted.
- Tests can replay connector behavior without live credentials.
- Read-only policy blocks unsupported write operations.

## Test Plan

- Unit tests for connector request builders, credential references, and policy decisions.
- Integration tests using mock HTTP transports and fixtures.
- Security tests for credential redaction, permission denial, timeout handling, and prompt minimization.

## Rollout Notes

Ship one connector family at a time. Do not add write-capable operations until the tool execution sandbox and approval workflow are complete.

## MVP Implementation Notes

- Added connector v2 schemas in `apps/api/src/schemas/connectors.schema.ts`.
- Added read-only connector interface, policy, auth status checks, fixture transport, and health service in `apps/api/src/connectors`.
- Added fixture-backed Sentinel, Defender, Entra ID, and AWS security connectors.
- Added `GET /connectors`, `GET /connectors/health`, `POST /connectors/:connectorId/query`, and `POST /cases/:id/connectors/:connectorId/import`.
- Added `connectorEvidenceRefs` to saved cases.
- Added connector v2 docs, fixtures, unit tests, and integration tests.

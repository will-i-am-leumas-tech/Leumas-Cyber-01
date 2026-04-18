# 17 - Auditability And Governance

## Purpose

Make every important system action traceable, reviewable, and tamper-evident enough for security operations and governance review.

## Target Capability

- Record immutable audit events.
- Track prompt, policy, model, provider, tool, and code versions.
- Store reviewer approvals and decision records.
- Export governance evidence.
- Support retention policies.

## Current State

- Implemented in the MVP on 2026-04-17.
- Legacy case audit entries remain available for the existing case UI.
- Versioned audit events are now written to an append-only JSONL stream with sequence numbers and hash chaining.
- Prompt, safety policy, model provider, and code versions are recorded on versioned audit events.
- Governance export and system version routes are available.

## Scope

- Append-only audit event schema.
- Hash chaining or integrity checks.
- Version metadata.
- Governance export.
- Retention policy metadata.

## Non-Goals

- No compliance certification claim.
- No legal hold automation in the first scaffold.
- No deletion bypass for retention rules.

## Proposed Architecture

- `AuditEvent`: id, actor, action, resource, result, timestamp, metadata, hash.
- `AuditChain`: previousHash, currentHash, sequence.
- `VersionRecord`: component, version, hash, effectiveAt.
- `GovernanceExport`: date range, filters, includedEvents, integritySummary.
- `RetentionPolicy`: resource type, retention period, deletion behavior.

Suggested modules:

- `apps/api/src/audit/audit-event-service.ts`
- `apps/api/src/audit/integrity-service.ts`
- `apps/api/src/audit/governance-export-service.ts`
- `apps/api/src/audit/version-registry.ts`
- `apps/api/src/routes/audit.ts`

## Data Model

Add:

- `auditEvents[]`
- `auditIntegrityRecords[]`
- `versionRecords[]`
- `governanceExports[]`
- `retentionPolicies[]`

## API Changes

- `GET /audit/events`
- `GET /audit/events/:id`
- `POST /audit/exports`
- `GET /cases/:id/audit`
- `GET /system/versions`

## UI Changes

- Audit event detail view.
- Integrity status.
- Governance export controls.
- Version metadata on case results.

## Scaffold Steps

1. Add versioned audit event schema.
2. Wrap existing audit service with new event writer.
3. Add hash chaining for local storage.
4. Add prompt/policy/model version metadata to analysis events.
5. Add audit export route.
6. Add tests that detect tampering in fixture logs.

## Test Plan

- Unit: audit hash changes when event content changes.
- Unit: chain verifier detects missing or modified event.
- Integration: analysis writes versioned audit events.
- Integration: export returns filtered events.
- Permission-ready: export route requires future auditor role.

## Fixtures

- `data/fixtures/audit/valid-chain.jsonl`
- `data/fixtures/audit/tampered-chain.jsonl`

## Acceptance Criteria

- Every analysis, safety decision, provider call, tool call, and action event is audited.
- Audit events include relevant version metadata.
- Tampering is detectable in local storage.
- Governance export produces JSON report.
- Existing audit UI continues to show case-level entries.

## MVP Verification

- `npm test -- tests/unit/audit-integrity-service.test.ts tests/integration/audit-governance-flow.test.ts`: 2 files, 3 tests passed.
- `npm run typecheck`: API and web TypeScript passed.
- `npm run evals`: 6/6 eval cases passed with average score 1.000; scorecard written to `tmp/eval-scorecard.json`.
- `npm test`: 41 files, 92 tests passed.
- `npm run build`: API TypeScript and web production build passed.
- `npm audit --omit=dev`: 0 vulnerabilities.

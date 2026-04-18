# 18 - Data Privacy And Security

## Purpose

Protect sensitive security data, secrets, credentials, personal data, and customer information throughout ingestion, storage, model calls, reports, and exports.

## Target Capability

- Detect and redact secrets and sensitive data.
- Minimize data sent to model providers.
- Encrypt sensitive storage.
- Isolate tenants and cases.
- Control retention and deletion.
- Track privacy-impacting events in audit logs.

## Current State

- Implemented in the MVP on 2026-04-17.
- Sensitive data detection and redaction run before provider prompt construction.
- Cases now store sensitive findings, redacted artifacts, prompt package metadata, data classifications, and privacy audit events.
- Privacy scan, case redaction, and case privacy routes are available.
- Local JSON remains the development storage layer; encryption is represented by an encryption-ready context scaffold.

## Scope

- Sensitive data classifier.
- Redaction service.
- Prompt data minimization.
- Secret-safe logging.
- Encryption-ready storage abstraction.

## Non-Goals

- No claim of full regulatory compliance in the scaffold.
- No custom cryptography.
- No sending raw secrets to external providers.

## Proposed Architecture

- `SensitiveFinding`: type, sourceRef, confidence, redactionValue.
- `RedactedArtifact`: originalRef, redactedRef, redactionPolicyVersion.
- `PromptPackage`: minimized fields sent to provider, redaction summary.
- `EncryptionContext`: tenantId, keyRef, dataClass.
- `PrivacyAuditEvent`: data access, redaction, export, deletion.

Suggested modules:

- `apps/api/src/privacy/sensitive-data-detector.ts`
- `apps/api/src/privacy/redaction-service.ts`
- `apps/api/src/privacy/prompt-minimizer.ts`
- `apps/api/src/privacy/secure-logger.ts`
- `apps/api/src/privacy/encryption-context.ts`

## Data Model

Add:

- `sensitiveFindings[]`
- `redactionResults[]`
- `promptPackages[]`
- `dataClassifications[]`
- `privacyAuditEvents[]`

## API Changes

- `POST /privacy/scan`
- `POST /cases/:id/redact`
- `GET /cases/:id/privacy`
- Extend `/analyze` with `redactionMode`.

## UI Changes

- Sensitive data warning banner.
- Redaction preview.
- Data classification labels.
- Provider prompt disclosure summary.

## Scaffold Steps

1. Add sensitive data schemas.
2. Detect common secrets, tokens, emails, usernames, and private keys.
3. Redact before provider calls.
4. Store redaction mapping separately from displayed report.
5. Add privacy tab to case view.
6. Add secure logging helper.

## Test Plan

- Unit: detector finds tokens and private key markers.
- Unit: redaction is stable and reversible only through controlled mapping.
- Unit: prompt minimizer excludes raw secrets.
- Integration: `/analyze` redacts sensitive input before provider call.
- Safety: logs never include raw detected secrets.

## Fixtures

- `data/fixtures/privacy/secrets-in-log.log`
- `data/fixtures/privacy/pii-alert.json`
- `data/fixtures/privacy/redacted-expected.json`

## Acceptance Criteria

- Secrets are detected and redacted before provider calls.
- Redaction findings are visible to analysts.
- Raw secrets do not appear in audit summaries or logs.
- Case data has data classification metadata.
- Tests verify provider receives redacted content.

## MVP Verification

- `npm test -- tests/unit/privacy-service.test.ts tests/integration/privacy-flow.test.ts`: 2 files, 5 tests passed.
- `npm run typecheck`: API and web TypeScript passed.
- `npm run evals`: 6/6 eval cases passed with average score 1.000; scorecard written to `tmp/eval-scorecard.json`.
- `npm test`: 43 files, 97 tests passed.
- `npm run build`: API TypeScript and web production build passed.
- `npm audit --omit=dev`: 0 vulnerabilities.

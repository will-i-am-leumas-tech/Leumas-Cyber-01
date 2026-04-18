# 12 - Cloud And Identity Security

## Purpose

Analyze cloud and identity posture, logs, risky permissions, authentication anomalies, and misconfigurations across cloud and SaaS environments.

## Target Capability

- Ingest cloud and identity audit events.
- Identify risky access patterns.
- Review MFA, conditional access, and privilege configuration.
- Detect suspicious authentication and administrative changes.
- Recommend least-privilege and posture improvements.

## Current State

- The MVP has generic log parsing only.
- No cloud account, tenant, identity, role, or policy model exists.

## Scope

- Cloud/identity event schema.
- Identity entity model.
- Permission and role summaries.
- Cloud posture checks.
- Read-only connector-ready architecture.

## Non-Goals

- No automated privilege changes.
- No offensive cloud attack paths or exploitation instructions.
- No credential harvesting or bypass guidance.

## Proposed Architecture

- `CloudAccount`: provider, accountId, tenantId, environment, owner.
- `IdentityPrincipal`: user, group, role, service account, workload identity.
- `CloudEvent`: provider, service, action, actor, resource, result, source IP.
- `PostureFinding`: control, status, severity, evidence, remediation.
- `PermissionRisk`: principal, resource, riskyPermission, exposure, recommendation.

Suggested modules:

- `apps/api/src/cloud/cloud-event-normalizer.ts`
- `apps/api/src/cloud/posture-check-service.ts`
- `apps/api/src/identity/identity-risk-service.ts`
- `apps/api/src/identity/auth-anomaly-service.ts`
- `apps/api/src/routes/cloud-security.ts`

## Data Model

Add:

- `cloudAccounts[]`
- `identityPrincipals[]`
- `cloudEvents[]`
- `postureFindings[]`
- `permissionRisks[]`

## API Changes

- `POST /cloud/events/import`
- `POST /identity/events/import`
- `GET /cloud/posture`
- `GET /identity/risks`
- `GET /cases/:id/cloud-context`

## UI Changes

- Cloud and identity context panels.
- Authentication anomaly timeline.
- Privilege risk table.
- MFA and conditional access checklist.

## Scaffold Steps

1. Add cloud and identity schemas.
2. Add parsers for generic CloudTrail-like and Entra-like fixture events.
3. Add simple posture checks for MFA, public exposure flags, and admin role changes.
4. Add identity risk scoring.
5. Link cloud/identity events to case timelines.
6. Render cloud context in UI.

## Test Plan

- Unit: cloud event normalizer maps provider fields to common schema.
- Unit: risky admin role assignment is detected.
- Unit: MFA disabled event produces high-priority finding.
- Integration: import identity events and create case findings.
- Safety: system refuses bypass or privilege abuse instructions.

## Fixtures

- `data/fixtures/cloud/cloudtrail-admin-change.json`
- `data/fixtures/cloud/public-storage-finding.json`
- `data/fixtures/identity/entra-risky-signins.json`
- `data/fixtures/identity/okta-mfa-disabled.json`

## Acceptance Criteria

- Cloud and identity events normalize into common schemas.
- Risk findings cite source events.
- MFA and privileged role findings produce remediation tasks.
- No raw credentials are stored or shown.
- Read-only posture analysis works without write permissions.


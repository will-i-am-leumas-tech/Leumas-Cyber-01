# 18 - Governance And Compliance

## Purpose

Add governance controls for policy, audit evidence, model risk, data handling, enterprise review, and platform incident response.

## Current Gap

The MVP has audit and SDL scaffolding, but lacks policy-as-code, control mapping, model risk review, data processing inventories, compliance evidence bundles, legal hold, and admin review workflows.

## Target Operator Outcome

Admins and reviewers can inspect policy versions, model/provider risks, data handling rules, audit evidence, control mappings, and governance approvals without relying on informal notes.

## Safety Boundary

Governance must make unsafe requests, risky tools, provider changes, sensitive data handling, and high-impact actions visible, reviewable, and auditable.

## Proposed Architecture

- Policy registry stores versioned safety, tool, provider, data, retention, and access policies.
- Control mapping service maps platform controls to internal or external review frameworks.
- Model/provider risk register records model use, data exposure, safety constraints, eval status, and approval.
- Data processing inventory records data classes, flows, processors, storage, retention, and legal hold.
- Evidence bundle service exports audit logs, policy versions, eval results, provider records, and release gates.
- Admin review workflow tracks approvals for policy, provider, connector, and high-risk changes.

## Expected File Changes

New files:

- `apps/api/src/governance/policy-registry.ts`
- `apps/api/src/governance/control-mapping-service.ts`
- `apps/api/src/governance/model-risk-register.ts`
- `apps/api/src/governance/data-processing-inventory.ts`
- `apps/api/src/governance/evidence-bundle-service.ts`
- `apps/api/src/governance/admin-review-service.ts`
- `apps/api/src/governance/legal-hold-service.ts`
- `apps/api/src/schemas/governance.schema.ts`
- `apps/api/src/routes/governance.ts`
- `data/fixtures/governance/policy-version.json`
- `data/fixtures/governance/model-risk-record.json`
- `data/fixtures/governance/data-processing-record.json`
- `data/fixtures/governance/evidence-bundle-request.json`
- `tests/unit/governance-compliance.test.ts`
- `tests/integration/governance-flow.test.ts`
- `docs/security/governance-and-compliance.md`
- `docs/runbooks/platform-incident-response.md`

Existing files to modify:

- `apps/api/src/audit/governance-export-service.ts`: include policy, eval, provider, and data inventory evidence.
- `apps/api/src/audit/audit-event-service.ts`: support governance event types.
- `apps/api/src/audit/version-registry.ts`: connect policy and schema versions.
- `apps/api/src/safety/policy-engine.ts`: emit policy version references.
- `apps/api/src/tools/tool-policy.ts`: read policy registry versions.
- `apps/api/src/providers/provider-registry.ts`: link provider profiles to risk records.
- `apps/api/src/privacy/encryption-context.ts`: reference data classification and retention policy.
- `apps/api/src/routes/audit.ts`: add evidence bundle export options.
- `apps/api/src/app.ts`: register governance routes.
- `docs/security/release-checklist.md`: add governance review gates.
- `docs/api/openapi.yaml`: document governance endpoints.

## Data Model Additions

- `PolicyVersion`: id, type, version, hash, owner, approval, effective date.
- `ControlMapping`: control id, description, evidence refs, owner, status.
- `ModelRiskRecord`: provider id, model, data exposure, eval status, safety constraints, approval.
- `DataProcessingRecord`: data class, source, processor, storage, retention, legal basis or policy basis.
- `EvidenceBundle`: request id, scope, artifacts, hashes, createdAt, reviewer.
- `AdminReview`: subject, risk, decision, approver, notes, timestamp.

## API Changes

- `GET /governance/policies`
- `POST /governance/policies`
- `GET /governance/model-risks`
- `POST /governance/model-risks`
- `GET /governance/data-inventory`
- `POST /governance/evidence-bundles`
- `POST /governance/reviews`

## UI Changes

- Governance admin dashboard.
- Policy version and approval view.
- Model/provider risk register.
- Data processing inventory.
- Evidence bundle export workflow.

## Milestones

- [ ] Add policy registry and policy versioning.
- [ ] Add control mapping documents and service.
- [ ] Add model/provider risk register.
- [ ] Add data processing inventory.
- [ ] Add audit evidence export bundles.
- [ ] Add admin review workflow.
- [ ] Add platform incident response runbooks.

## Acceptance Criteria

- Policy changes are versioned and auditable.
- Enterprise reviewers can inspect control evidence.
- Provider risks are documented before use.
- Data handling rules are explicit and testable.
- Evidence bundles include hashes and source references.

## Test Plan

- Unit tests for policy registry, model risk records, data inventory, and evidence bundle generation.
- Integration tests for governance review and audit evidence export.
- Documentation checks for governance artifacts and runbooks.

## Rollout Notes

Tie governance records to existing audit evidence first. Add external compliance mapping only after internal policy records are stable.

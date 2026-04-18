# 06 - Authorized Validation Lab

## Purpose

Add safe purple-team and control-validation capabilities for owned environments, approved lab systems, and defensive readiness testing.

## Current Gap

The MVP has authorized validation scaffolding, but it lacks strong scope enforcement, target allowlists, lab isolation, signed approvals, validation template governance, and evidence reports.

## Target Operator Outcome

A security team can prove that a control, detection, or remediation works in an approved scope without receiving weaponized exploit guidance or running out-of-scope activity.

## Safety Boundary

- This feature must never become attack automation.
- Allowed work: benign telemetry replay, configuration checks, detection validation, remediation verification, and lab-only control testing.
- Blocked work: exploit chains, stealth, persistence, credential theft, malware, evasion, unauthorized recon, and real-world target compromise.
- No validation run may start without current approved scope.

## Proposed Architecture

- Scope service stores signed authorization, owner, target allowlist, denylist, expiration, and lab flag.
- Validation policy engine checks actor, target, template, time window, and requested operation.
- Template library contains safe validation scenarios mapped to ATT&CK and defensive controls.
- Campaign runner executes only safe templates and records telemetry expectations.
- Detection replay service generates or replays benign evidence for rule validation.
- Evidence report service summarizes gaps, observed telemetry, detections, and remediation.

## Expected File Changes

New files:

- `apps/api/src/validation/scope-v2-service.ts`
- `apps/api/src/validation/target-scope-policy.ts`
- `apps/api/src/validation/lab-mode-enforcer.ts`
- `apps/api/src/validation/validation-template-library.ts`
- `apps/api/src/validation/detection-replay-service.ts`
- `apps/api/src/validation/control-evidence-report.ts`
- `apps/api/src/schemas/validation-v2.schema.ts`
- `data/fixtures/validation/approved-lab-scope-v2.json`
- `data/fixtures/validation/out-of-scope-target.json`
- `data/fixtures/validation/safe-control-validation-template.json`
- `tests/unit/authorized-validation-lab.test.ts`
- `tests/integration/authorized-validation-lab-flow.test.ts`
- `tests/evals/authorized-validation-safety.test.ts`
- `docs/analyst-guide/authorized-validation.md`

Existing files to modify:

- `apps/api/src/validation/authorization-service.ts`: delegate to target scope policy.
- `apps/api/src/validation/campaign-service.ts`: enforce lab mode and template approval.
- `apps/api/src/validation/objective-library.ts`: separate safe templates from blocked requests.
- `apps/api/src/validation/telemetry-checker.ts`: validate expected defensive telemetry.
- `apps/api/src/routes/validation.ts`: add v2 scope, template, replay, and report endpoints.
- `apps/api/src/safety/policy-engine.ts`: strengthen offensive validation boundary checks.
- `apps/api/src/audit/audit-event-service.ts`: record scope decisions and campaign actions.
- `apps/api/src/schemas/case.schema.ts`: link validation campaigns and evidence reports to cases.
- `docs/security/safety-policy.md`: document authorized validation boundary.
- `docs/api/openapi.yaml`: document validation v2 endpoints.

## Data Model Additions

- `AuthorizedScopeV2`: id, owner, approver, target allowlist, denylist, start, expiry, lab mode, signature.
- `ValidationTemplate`: id, objective, allowed telemetry, blocked content, required controls, ATT&CK mapping.
- `ValidationCampaignV2`: scope id, template ids, actor, status, evidence ids, safety decisions.
- `ControlEvidenceReport`: detections observed, missing telemetry, gaps, remediation, citations.

## API Changes

- `POST /validation/scopes`
- `GET /validation/scopes/:id`
- `POST /validation/campaigns`
- `POST /validation/campaigns/:id/replay`
- `GET /validation/campaigns/:id/evidence-report`

## UI Changes

- Scope approval and expiry panel.
- Validation template picker with safety notes.
- Out-of-scope denial explanation.
- Evidence report view for detection gaps and remediation.

## Milestones

- [x] Add signed validation scope records.
- [x] Add target allowlist and denylist checks.
- [x] Add lab mode enforcement.
- [x] Add safe validation template library.
- [x] Add detection replay support.
- [x] Add validation evidence reports.
- [ ] Add expanded safety evals for blocked offensive requests.

## Acceptance Criteria

- No validation runs without current approved scope.
- Out-of-scope targets are blocked and audited.
- Reports focus on detection gaps and remediation.
- Unsafe offensive details are refused.
- Safety evals cover exploit, stealth, credential theft, and unauthorized recon prompts.

## Test Plan

- Unit tests for scope signature, target checks, lab enforcement, and template policy.
- Integration tests for approved and denied validation campaigns.
- Safety evals for blocked offensive requests and allowed control-validation requests.

## Rollout Notes

Build this after connector policy, tool sandbox, and audit evidence work are strong enough to prevent misuse.

## MVP Implementation Notes

- Added validation v2 schemas for signed scopes, safe templates, lab campaigns, replayed telemetry, and evidence reports.
- Added deterministic scope signatures and verification.
- Added target allowlist and denylist policy with wildcard support for approved lab host suffixes.
- Added lab-mode enforcement for templates that require isolated validation.
- Added safe validation template library with only benign telemetry replay scenarios.
- Added replay generation and evidence report creation with remediation-focused output.
- Added v2 API routes under `/validation/v2/*` while preserving the existing validation API.
- Added fixtures and docs for approved lab scope, denied target behavior, and safe control validation.

Remaining production work is stronger signer identity, external approval workflow, immutable evidence storage, more safety eval cases, and UI review surfaces for scope approvals and reports.

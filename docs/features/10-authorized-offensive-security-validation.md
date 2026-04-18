# 10 - Authorized Offensive Security Validation

## Purpose

Support safe, authorized security validation and purple-team planning without enabling real-world misuse, weaponization, stealth, persistence, credential theft, or unauthorized targeting.

## Target Capability

- Record explicit authorization scope.
- Plan validation campaigns at objective and control level.
- Map validation to expected telemetry and detection outcomes.
- Track whether controls fired as expected.
- Produce remediation tasks for detection or control gaps.

## Current State

- The MVP is defensive-only.
- Offensive requests are blocked by guardrails.
- No authorization records or validation campaign model exists.

## Scope

- Authorized scope records.
- Lab and purple-team campaign model.
- Safe validation objective templates.
- Detection validation result tracking.
- Strict safety blocks around weaponization and unsafe procedures.

## Non-Goals

- No exploit chains.
- No payload generation.
- No malware, phishing, credential theft, persistence, evasion, or lateral movement instructions.
- No real-world target selection or unauthorized recon.
- No step-by-step intrusion guidance.

## Proposed Architecture

- `AuthorizationScope`: assets, owners, dates, approvers, allowed test types, exclusions.
- `ValidationCampaign`: objective, scopeId, controls under test, status, owner.
- `ValidationObjective`: high-level behavior category, expected telemetry, success criteria.
- `TelemetryExpectation`: data source, expected event type, detection rule ref.
- `ValidationResult`: observed telemetry, gaps, remediation tasks, evidence refs.

Suggested modules:

- `apps/api/src/validation/authorization-service.ts`
- `apps/api/src/validation/campaign-service.ts`
- `apps/api/src/validation/objective-library.ts`
- `apps/api/src/validation/telemetry-checker.ts`
- `apps/api/src/routes/validation.ts`

## Data Model

Add:

- `authorizationScopes[]`
- `validationCampaigns[]`
- `validationObjectives[]`
- `telemetryExpectations[]`
- `validationResults[]`

## API Changes

- `POST /validation/scopes`
- `GET /validation/scopes`
- `POST /validation/campaigns`
- `POST /validation/campaigns/:id/results`
- `GET /validation/campaigns/:id`

## UI Changes

- Authorization scope form.
- Campaign planner.
- Control and telemetry expectation checklist.
- Results and gaps table.
- Safety warnings when scope is missing or expired.

## Scaffold Steps

1. Add authorization scope schema and expiry checks.
2. Add campaign schema with safe objective templates.
3. Add hard safety requirement: no scope means no validation planning.
4. Add expected telemetry checklist.
5. Add validation result recording.
6. Add UI for scope, campaign, and result tracking.

## Test Plan

- Unit: expired scope blocks campaign creation.
- Unit: objective library contains no procedural offensive instructions.
- Unit: unsafe requested steps are refused even inside a campaign.
- Integration: create scope, campaign, objective, and result.
- Safety: blocked content categories remain blocked in validation mode.

## Fixtures

- `data/fixtures/validation/authorized-lab-scope.json`
- `data/fixtures/validation/expired-scope.json`
- `data/fixtures/validation/safe-detection-validation-campaign.json`
- `data/fixtures/validation/blocked-weaponization-request.txt`

## Acceptance Criteria

- Validation planning requires explicit current authorization.
- Campaigns operate at objective and telemetry level.
- The system never emits weaponization, stealth, persistence, credential theft, or exploit procedure content.
- Results produce defensive gaps and remediation tasks.
- All validation activity is audited.

